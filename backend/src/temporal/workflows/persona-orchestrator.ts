/**
 * Persona Orchestrator Workflow
 *
 * Designed for long-running background persona execution:
 * - No real-time streaming (background task)
 * - Progress tracking instead of token events
 * - Persona instance status updates
 * - Full tool access (all built-in + integrations)
 * - Higher iteration limits for complex tasks
 */

import { proxyActivities, continueAsNew } from "@temporalio/workflow";
import type { JsonObject } from "@flowmaestro/shared";
import { SpanType } from "../core/types";
import { createWorkflowLogger } from "../core/workflow-logger";
import type { SerializedThread } from "../../services/agents/ThreadManager";
import type { ThreadMessage } from "../../storage/models/AgentExecution";
import type * as activities from "../activities";
import type { LLMResponse } from "./agent-orchestrator";

// Proxy activities with longer timeouts for background work
const {
    getPersonaConfig,
    callLLM,
    executeToolCall,
    saveThreadIncremental,
    validateInput,
    validateOutput,
    createSpan,
    endSpan,
    updateThreadTokens
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "30 minutes", // Longer for complex tool calls
    retry: {
        maximumAttempts: 3,
        backoffCoefficient: 2
    }
});

// Persona-specific activities
const { updatePersonaInstanceProgress, updatePersonaInstanceStatus } = proxyActivities<
    typeof activities
>({
    startToCloseTimeout: "30 seconds",
    retry: {
        maximumAttempts: 3
    }
});

// Credit activities
const { shouldAllowExecution, reserveCredits, finalizeCredits, calculateLLMCredits } =
    proxyActivities<typeof activities>({
        startToCloseTimeout: "30 seconds",
        retry: {
            maximumAttempts: 3
        }
    });

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface PersonaOrchestratorInput {
    executionId: string;
    personaInstanceId: string;
    userId: string;
    workspaceId: string;
    threadId: string;
    initialMessage?: string; // Optional initial task clarification
    // For continue-as-new
    serializedThread?: SerializedThread;
    iterations?: number;
    accumulatedCredits?: number;
    reservedCredits?: number;
}

export interface PersonaOrchestratorResult {
    success: boolean;
    serializedThread: SerializedThread;
    iterations: number;
    finalMessage?: string;
    error?: string;
    totalCreditsUsed?: number;
}

interface WorkflowMessageState {
    messages: ThreadMessage[];
    savedMessageIds: string[];
    metadata: JsonObject;
}

// =============================================================================
// Main Workflow
// =============================================================================

export async function personaOrchestratorWorkflow(
    input: PersonaOrchestratorInput
): Promise<PersonaOrchestratorResult> {
    const {
        executionId,
        personaInstanceId,
        userId,
        workspaceId,
        threadId,
        initialMessage,
        serializedThread,
        iterations = 0,
        accumulatedCredits: previousCredits = 0,
        reservedCredits: previousReserved = 0
    } = input;

    // Credit tracking state
    let reservedCredits = previousReserved;
    let accumulatedCredits = previousCredits;

    const logger = createWorkflowLogger({
        executionId,
        workflowName: "PersonaOrchestrator",
        userId
    });

    logger.info("Starting persona orchestrator", {
        personaInstanceId,
        threadId,
        iteration: iterations
    });

    // Load persona configuration (includes all tools)
    const persona = await getPersonaConfig({
        personaInstanceId,
        userId,
        workspaceId
    });

    // Update persona instance status to running (only on first run)
    if (iterations === 0) {
        try {
            await updatePersonaInstanceStatus({
                personaInstanceId,
                status: "running",
                startedAt: new Date()
            });
        } catch (error) {
            logger.warn("Failed to update persona status to running", {
                error: error instanceof Error ? error.message : "Unknown"
            });
        }
    }

    // Credit check and reservation (only on first run)
    if (iterations === 0) {
        logger.info("Checking credits for persona execution");

        // Personas are long-running, estimate higher credit usage
        const estimatedCredits = Math.ceil(persona.max_iterations * 15 * 1.2);

        const allowed = await shouldAllowExecution({
            workspaceId,
            estimatedCredits
        });

        if (!allowed) {
            const errorMessage = `Insufficient credits for persona execution. Estimated need: ${estimatedCredits} credits`;
            logger.warn("Insufficient credits", { estimatedCredits });

            await updatePersonaInstanceStatus({
                personaInstanceId,
                status: "failed",
                completionReason: "max_cost",
                completedAt: new Date()
            });

            return {
                success: false,
                serializedThread: { messages: [], savedMessageIds: [], metadata: {} },
                iterations: 0,
                error: errorMessage
            };
        }

        const reserved = await reserveCredits({
            workspaceId,
            estimatedCredits
        });

        if (!reserved) {
            const errorMessage = "Failed to reserve credits for persona execution";
            logger.error("Credit reservation failed");

            await updatePersonaInstanceStatus({
                personaInstanceId,
                status: "failed",
                completionReason: "failed",
                completedAt: new Date()
            });

            return {
                success: false,
                serializedThread: { messages: [], savedMessageIds: [], metadata: {} },
                iterations: 0,
                error: errorMessage
            };
        }

        reservedCredits = estimatedCredits;
        logger.info("Credits reserved for persona", { reservedCredits });
    }

    // Create span for persona execution
    let personaRunSpanId: string | undefined = undefined;
    if (iterations === 0) {
        const spanContext = await createSpan({
            traceId: executionId,
            parentSpanId: undefined,
            name: `Persona: ${persona.name}`,
            spanType: SpanType.AGENT_RUN,
            entityId: personaInstanceId,
            input: { personaInstanceId, threadId, initialMessage },
            attributes: {
                userId,
                personaName: persona.name,
                model: persona.model,
                provider: persona.provider,
                mode: "persona"
            }
        });
        personaRunSpanId = spanContext.spanId;
    }

    // Initialize message state
    let messageState: WorkflowMessageState;

    if (serializedThread) {
        // Restoring from continue-as-new
        messageState = {
            messages: serializedThread.messages,
            savedMessageIds: serializedThread.savedMessageIds,
            metadata: serializedThread.metadata
        };
    } else {
        // First run
        messageState = {
            messages: [],
            savedMessageIds: [],
            metadata: {}
        };

        // Add system prompt
        const systemMessage: ThreadMessage = {
            id: `sys-${Date.now()}`,
            role: "system",
            content: persona.system_prompt,
            timestamp: new Date()
        };
        messageState.messages.push(systemMessage);
        messageState.savedMessageIds.push(systemMessage.id);

        // Add initial message if provided
        if (initialMessage) {
            const safetyResult = await validateInput({
                content: initialMessage,
                context: {
                    userId,
                    agentId: personaInstanceId,
                    executionId,
                    threadId,
                    direction: "input",
                    messageRole: "user"
                },
                config: persona.safety_config
            });

            if (!safetyResult.shouldProceed) {
                const blockReasons = safetyResult.violations
                    .filter((v) => v.action === "block")
                    .map((v) => v.message || v.type)
                    .join(", ");

                await updatePersonaInstanceStatus({
                    personaInstanceId,
                    status: "failed",
                    completionReason: "failed",
                    completedAt: new Date()
                });

                throw new Error(`Input blocked by safety check: ${blockReasons}`);
            }

            const userMessage: ThreadMessage = {
                id: `user-${Date.now()}`,
                role: "user",
                content: safetyResult.content,
                timestamp: new Date()
            };
            messageState.messages.push(userMessage);
        }
    }

    const maxIterations = persona.max_iterations || 100;
    let currentIterations = iterations;
    const CONTINUE_AS_NEW_THRESHOLD = 50;
    const PROGRESS_UPDATE_INTERVAL = 5; // Update progress every 5 iterations

    // Track failed tools
    const failedToolNames = new Set<string>();

    // Main execution loop (ReAct pattern for background execution)
    while (currentIterations < maxIterations) {
        logger.info("Persona iteration", { iteration: currentIterations, maxIterations });

        // Continue-as-new every 50 iterations
        if (currentIterations > 0 && currentIterations % CONTINUE_AS_NEW_THRESHOLD === 0) {
            logger.info("Continue-as-new triggered", { iteration: currentIterations });

            const unsavedMessages = getUnsavedMessages(messageState);
            if (unsavedMessages.length > 0) {
                await saveThreadIncremental({
                    executionId,
                    threadId,
                    messages: unsavedMessages
                });
                unsavedMessages.forEach((msg) => messageState.savedMessageIds.push(msg.id));
            }

            const summarizedState = summarizeMessageState(
                messageState,
                persona.memory_config.max_messages
            );

            return continueAsNew<typeof personaOrchestratorWorkflow>({
                executionId,
                personaInstanceId,
                userId,
                workspaceId,
                threadId,
                serializedThread: summarizedState,
                iterations: currentIterations,
                accumulatedCredits,
                reservedCredits
            });
        }

        // Update progress periodically
        if (currentIterations > 0 && currentIterations % PROGRESS_UPDATE_INTERVAL === 0) {
            try {
                await updatePersonaInstanceProgress({
                    personaInstanceId,
                    iterationCount: currentIterations,
                    accumulatedCostCredits: accumulatedCredits,
                    progress: {
                        current_step: currentIterations,
                        total_steps: maxIterations,
                        percentage: Math.round((currentIterations / maxIterations) * 100),
                        current_step_name: "Processing",
                        message: "Processing task..."
                    }
                });
            } catch (error) {
                logger.warn("Failed to update progress", {
                    error: error instanceof Error ? error.message : "Unknown"
                });
            }
        }

        // Create iteration span
        const iterationContext = await createSpan({
            traceId: executionId,
            parentSpanId: personaRunSpanId,
            name: `Iteration ${currentIterations + 1}`,
            spanType: SpanType.AGENT_ITERATION,
            entityId: personaInstanceId,
            input: { iteration: currentIterations },
            attributes: { iteration: currentIterations, maxIterations }
        });
        const iterationSpanId = iterationContext.spanId;

        // Filter out failed tools
        const availableTools = persona.available_tools.filter(
            (tool) => !failedToolNames.has(tool.name)
        );

        // Call LLM (no streaming for background execution)
        let llmResponse: LLMResponse;
        try {
            llmResponse = await callLLM({
                model: persona.model,
                provider: persona.provider,
                connectionId: persona.connection_id,
                messages: messageState.messages,
                tools: availableTools,
                temperature: persona.temperature,
                maxTokens: persona.max_tokens,
                executionId,
                threadId
            });

            // Track credit usage
            if (llmResponse.usage) {
                const callCredits = await calculateLLMCredits({
                    model: persona.model,
                    inputTokens: llmResponse.usage.promptTokens,
                    outputTokens: llmResponse.usage.completionTokens
                });
                accumulatedCredits += callCredits;
            }

            // Update thread tokens
            try {
                await updateThreadTokens({
                    threadId,
                    executionId,
                    usage: llmResponse.usage,
                    provider: persona.provider,
                    model: persona.model
                });
            } catch (_error) {
                logger.warn("Failed to update thread tokens");
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown LLM error";
            logger.error(
                "LLM call failed",
                error instanceof Error ? error : new Error(errorMessage)
            );

            await endSpan({
                spanId: iterationSpanId,
                error: error instanceof Error ? error : new Error(errorMessage)
            });

            await updatePersonaInstanceStatus({
                personaInstanceId,
                status: "failed",
                completionReason: "failed",
                completedAt: new Date()
            });

            // Finalize credits
            if (reservedCredits > 0) {
                await finalizeCredits({
                    workspaceId,
                    userId,
                    reservedAmount: reservedCredits,
                    actualAmount: accumulatedCredits,
                    operationType: "persona_execution",
                    operationId: executionId,
                    description: `Persona: ${persona.name} (LLM failed)`,
                    metadata: {
                        personaInstanceId,
                        personaName: persona.name,
                        iterations: currentIterations,
                        failureReason: "llm_call_failed"
                    }
                });
            }

            return {
                success: false,
                serializedThread: messageState,
                iterations: currentIterations,
                error: errorMessage,
                totalCreditsUsed: accumulatedCredits
            };
        }

        // Safety validation on output
        const outputSafetyResult = await validateOutput({
            content: llmResponse.content,
            context: {
                userId,
                agentId: personaInstanceId,
                executionId,
                threadId,
                direction: "output",
                messageRole: "assistant"
            },
            config: persona.safety_config
        });

        if (!outputSafetyResult.shouldProceed) {
            const blockReasons = outputSafetyResult.violations
                .filter((v) => v.action === "block")
                .map((v) => v.message || v.type)
                .join(", ");

            await updatePersonaInstanceStatus({
                personaInstanceId,
                status: "failed",
                completionReason: "failed",
                completedAt: new Date()
            });

            throw new Error(`Output blocked by safety check: ${blockReasons}`);
        }

        // Add assistant message
        const assistantMessage: ThreadMessage = {
            id: `asst-${Date.now()}-${currentIterations}`,
            role: "assistant",
            content: outputSafetyResult.content,
            tool_calls: llmResponse.tool_calls,
            timestamp: new Date()
        };
        messageState.messages.push(assistantMessage);

        // Check if done (no tool calls)
        const hasToolCalls = llmResponse.tool_calls && llmResponse.tool_calls.length > 0;

        if (!hasToolCalls) {
            // Persona task completed
            const unsavedMessages = getUnsavedMessages(messageState);
            if (unsavedMessages.length > 0) {
                await saveThreadIncremental({
                    executionId,
                    threadId,
                    messages: unsavedMessages,
                    markCompleted: true
                });
                unsavedMessages.forEach((msg) => messageState.savedMessageIds.push(msg.id));
            }

            logger.info("Persona completed task successfully");

            await updatePersonaInstanceStatus({
                personaInstanceId,
                status: "completed",
                completionReason: "success",
                completedAt: new Date(),
                iterationCount: currentIterations,
                accumulatedCostCredits: accumulatedCredits,
                progress: {
                    current_step: currentIterations,
                    total_steps: currentIterations,
                    percentage: 100,
                    current_step_name: "Completed",
                    message: "Task completed successfully"
                }
            });

            await endSpan({
                spanId: iterationSpanId,
                output: { completed: true, finalMessage: llmResponse.content }
            });

            if (personaRunSpanId) {
                await endSpan({
                    spanId: personaRunSpanId,
                    output: { success: true, iterations: currentIterations }
                });
            }

            // Finalize credits
            if (reservedCredits > 0) {
                await finalizeCredits({
                    workspaceId,
                    userId,
                    reservedAmount: reservedCredits,
                    actualAmount: accumulatedCredits,
                    operationType: "persona_execution",
                    operationId: executionId,
                    description: `Persona: ${persona.name}`,
                    metadata: {
                        personaInstanceId,
                        personaName: persona.name,
                        iterations: currentIterations,
                        success: true
                    }
                });
            }

            return {
                success: true,
                serializedThread: messageState,
                iterations: currentIterations,
                finalMessage: llmResponse.content,
                totalCreditsUsed: accumulatedCredits
            };
        }

        // Execute tool calls
        for (const toolCall of llmResponse.tool_calls!) {
            logger.info("Executing tool", { toolName: toolCall.name });

            const toolContext = await createSpan({
                traceId: executionId,
                parentSpanId: iterationSpanId,
                name: `Tool: ${toolCall.name}`,
                spanType: SpanType.TOOL_EXECUTION,
                entityId: personaInstanceId,
                input: { toolName: toolCall.name, arguments: toolCall.arguments },
                attributes: { toolName: toolCall.name, toolCallId: toolCall.id }
            });
            const toolSpanId = toolContext.spanId;

            try {
                const toolResult = await executeToolCall({
                    executionId,
                    toolCall,
                    availableTools: persona.available_tools,
                    userId,
                    workspaceId
                });

                const toolMessage: ThreadMessage = {
                    id: `tool-${Date.now()}-${toolCall.id}`,
                    role: "tool",
                    content: JSON.stringify(toolResult),
                    tool_name: toolCall.name,
                    tool_call_id: toolCall.id,
                    timestamp: new Date()
                };
                messageState.messages.push(toolMessage);

                await endSpan({
                    spanId: toolSpanId,
                    output: toolResult,
                    attributes: { success: true }
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown tool error";
                logger.error(
                    "Tool execution failed",
                    error instanceof Error ? error : new Error(errorMessage),
                    {
                        toolName: toolCall.name
                    }
                );

                failedToolNames.add(toolCall.name);

                const toolMessage: ThreadMessage = {
                    id: `tool-${Date.now()}-${toolCall.id}`,
                    role: "tool",
                    content: JSON.stringify({ error: errorMessage }),
                    tool_name: toolCall.name,
                    tool_call_id: toolCall.id,
                    timestamp: new Date()
                };
                messageState.messages.push(toolMessage);

                await endSpan({
                    spanId: toolSpanId,
                    error: error instanceof Error ? error : new Error(errorMessage)
                });
            }
        }

        // Save periodically (every 10 iterations)
        if (currentIterations > 0 && currentIterations % 10 === 0) {
            const unsavedMessages = getUnsavedMessages(messageState);
            if (unsavedMessages.length > 0) {
                await saveThreadIncremental({
                    executionId,
                    threadId,
                    messages: unsavedMessages
                });
                unsavedMessages.forEach((msg) => messageState.savedMessageIds.push(msg.id));
            }
        }

        await endSpan({
            spanId: iterationSpanId,
            output: { toolCallCount: llmResponse.tool_calls?.length || 0 }
        });

        currentIterations++;
    }

    // Max iterations reached
    const maxIterError = `Max iterations (${maxIterations}) reached`;
    logger.info("Max iterations reached", { maxIterations });

    const unsavedMessages = getUnsavedMessages(messageState);
    if (unsavedMessages.length > 0) {
        await saveThreadIncremental({
            executionId,
            threadId,
            messages: unsavedMessages
        });
    }

    await updatePersonaInstanceStatus({
        personaInstanceId,
        status: "timeout",
        completionReason: "max_duration",
        completedAt: new Date(),
        iterationCount: currentIterations,
        accumulatedCostCredits: accumulatedCredits
    });

    if (personaRunSpanId) {
        await endSpan({
            spanId: personaRunSpanId,
            error: new Error(maxIterError)
        });
    }

    // Finalize credits
    if (reservedCredits > 0) {
        await finalizeCredits({
            workspaceId,
            userId,
            reservedAmount: reservedCredits,
            actualAmount: accumulatedCredits,
            operationType: "persona_execution",
            operationId: executionId,
            description: `Persona: ${persona.name} (max iterations)`,
            metadata: {
                personaInstanceId,
                personaName: persona.name,
                iterations: currentIterations,
                failureReason: "max_iterations_reached"
            }
        });
    }

    return {
        success: false,
        serializedThread: messageState,
        iterations: currentIterations,
        error: maxIterError,
        totalCreditsUsed: accumulatedCredits
    };
}

// =============================================================================
// Helper Functions
// =============================================================================

function getUnsavedMessages(state: WorkflowMessageState): ThreadMessage[] {
    const savedIds = new Set(state.savedMessageIds);
    return state.messages.filter((msg) => !savedIds.has(msg.id));
}

function summarizeMessageState(state: WorkflowMessageState, maxMessages: number): SerializedThread {
    if (state.messages.length <= maxMessages) {
        return {
            messages: state.messages,
            savedMessageIds: state.savedMessageIds,
            metadata: state.metadata
        };
    }

    const systemPrompt = state.messages.find((msg) => msg.role === "system");
    const recentMessages = state.messages.slice(-(maxMessages - 1));

    const summarizedMessages = systemPrompt
        ? [systemPrompt, ...recentMessages.filter((msg) => msg.id !== systemPrompt.id)]
        : recentMessages;

    const keptMessageIds = new Set(summarizedMessages.map((m) => m.id));
    const savedIds = state.savedMessageIds.filter((id) => keptMessageIds.has(id));

    return {
        messages: summarizedMessages,
        savedMessageIds: savedIds,
        metadata: state.metadata
    };
}
