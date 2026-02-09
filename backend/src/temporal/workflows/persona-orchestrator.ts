/**
 * Persona Orchestrator Workflow
 *
 * Designed for long-running background persona execution:
 * - Clarifying phase for goal refinement
 * - No real-time streaming (background task)
 * - Progress tracking instead of token events
 * - Persona instance status updates
 * - Full tool access (all built-in + integrations)
 * - Higher iteration limits for complex tasks
 */

import {
    proxyActivities,
    continueAsNew,
    defineSignal,
    setHandler,
    condition
} from "@temporalio/workflow";
import type { JsonObject } from "@flowmaestro/shared";
import { SpanType } from "../core/types";
import { createWorkflowLogger } from "../core/workflow-logger";
import { isPersonaWorkflowTool } from "./persona-tools";
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
const {
    updatePersonaInstanceProgress,
    updatePersonaInstanceStatus,
    updatePersonaClarificationState,
    getPersonaClarificationState,
    addPersonaMessage,
    summarizeThreadContext,
    createPersonaDeliverable
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "2 minutes", // Longer timeout for summarization
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
// Signals
// =============================================================================

/**
 * Signal for receiving user messages during clarification or execution
 */
export const personaUserMessageSignal = defineSignal<[string]>("personaUserMessage");

/**
 * Signal for skipping clarification phase
 */
export const skipClarificationSignal = defineSignal("skipClarification");

/**
 * Signal for gracefully cancelling the persona workflow
 */
export const cancelPersonaSignal = defineSignal("cancelPersona");

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
    skipClarification?: boolean; // Skip clarification phase
    // For continue-as-new
    serializedThread?: SerializedThread;
    iterations?: number;
    accumulatedCredits?: number;
    reservedCredits?: number;
    clarificationComplete?: boolean;
    toolFailureCounts?: Record<string, number>; // Persist tool failure counts across continue-as-new
    startedAt?: number; // Workflow start timestamp for duration tracking
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

interface ClarificationState {
    complete: boolean;
    exchangeCount: number;
    maxExchanges: number;
    skipped: boolean;
}

// =============================================================================
// Clarification Tool and Prompt Builder
// =============================================================================

/**
 * Tool definition for signaling clarification is complete.
 * This is used during the clarification phase only.
 */
function getClarificationCompleteTool(): {
    id: string;
    name: string;
    description: string;
    type: "builtin";
    schema: JsonObject;
    config: { functionName: string };
} {
    return {
        id: "builtin-clarification_complete",
        name: "clarification_complete",
        description:
            "Call this tool when you have gathered enough information from the user and are ready to begin the main task. Do NOT call this if you still have unanswered questions that are critical to completing the task.",
        type: "builtin",
        schema: {
            type: "object",
            properties: {
                summary: {
                    type: "string",
                    description:
                        "Brief summary of what you understood from the clarification discussion"
                },
                key_requirements: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of key requirements you gathered"
                },
                ready: {
                    type: "boolean",
                    description: "Must be true to proceed with the task"
                }
            },
            required: ["summary", "ready"]
        },
        config: {
            functionName: "clarification_complete"
        }
    };
}

function buildClarificationSystemPrompt(personaName: string, taskDescription: string): string {
    return `You are ${personaName}, beginning a new task. Before starting work, you need to clarify the requirements with the user.

## Your Task
${taskDescription}

## Instructions
Ask 2-4 focused clarifying questions to ensure you understand:
1. The specific scope and boundaries of the task
2. Any preferences for deliverable format or style
3. Key priorities or constraints you should know about
4. Any specific resources, data, or context you should use

Keep your questions concise and actionable. After the user responds, either ask follow-up questions if critical information is still missing, or confirm your understanding and proceed.

## Signaling Completion
When you have gathered enough information to proceed with the task, you MUST call the \`clarification_complete\` tool with:
- \`summary\`: A brief summary of what you understood
- \`ready\`: Set to \`true\` to confirm you're ready

Do NOT call this tool if you still have critical unanswered questions.`;
}

/**
 * Check if the LLM called the clarification_complete tool with ready=true
 */
function checkClarificationComplete(
    toolCalls: Array<{ name: string; arguments: Record<string, unknown> }> | undefined,
    content?: string
): { complete: boolean; summary?: string; viaText?: boolean } {
    // Check tool call first (preferred method)
    if (toolCalls && toolCalls.length > 0) {
        const clarificationCall = toolCalls.find((tc) => tc.name === "clarification_complete");
        if (clarificationCall && clarificationCall.arguments?.ready === true) {
            return {
                complete: true,
                summary: clarificationCall.arguments?.summary as string | undefined
            };
        }
    }

    // Check text content for readiness indicators (fallback)
    if (content) {
        const readyPatterns = [
            /i (?:now )?(?:fully )?understand/i,
            /ready to (?:proceed|start|begin)/i,
            /let'?s (?:proceed|start|begin|get started)/i,
            /have (?:enough|sufficient|all the) (?:information|context|details)/i,
            /clear on (?:the|your) requirements/i,
            /i have all (?:the )?(?:information|details) i need/i
        ];

        const textIndicatesReady = readyPatterns.some((pattern) => pattern.test(content));
        if (textIndicatesReady) {
            return { complete: true, viaText: true };
        }
    }

    return { complete: false };
}

/**
 * Handle persona workflow control tools directly
 *
 * These tools (update_progress, deliverable_create) are workflow control mechanisms,
 * not general-purpose tools. They're handled directly instead of via executeToolCall.
 *
 * Note: task_complete is handled separately in the main loop as it triggers workflow completion.
 */
async function handlePersonaWorkflowTool(
    toolCall: { name: string; id: string; arguments: Record<string, unknown> },
    personaInstanceId: string,
    logger: ReturnType<typeof createWorkflowLogger>
): Promise<{ success: boolean; message?: string; error?: string; [key: string]: unknown }> {
    const args = toolCall.arguments;

    switch (toolCall.name) {
        case "update_progress": {
            const currentStep = args.current_step as string;
            const completedSteps = (args.completed_steps as string[]) || [];
            const remainingSteps = (args.remaining_steps as string[]) || [];
            const percentage = args.percentage as number | undefined;
            const message = args.message as string | undefined;

            // Calculate step counts
            const completedCount = completedSteps.length;
            const remainingCount = remainingSteps.length;
            const totalSteps = completedCount + remainingCount + 1; // +1 for current step
            const currentStepNumber = completedCount + 1;

            // Calculate percentage if not provided
            let calculatedPercentage = percentage ?? 0;
            if (percentage === undefined && totalSteps > 0) {
                calculatedPercentage = Math.round((completedCount / totalSteps) * 100);
            }

            await updatePersonaInstanceProgress({
                personaInstanceId,
                progress: {
                    current_step: currentStepNumber,
                    total_steps: totalSteps,
                    current_step_name: currentStep,
                    percentage: calculatedPercentage,
                    message: message || `Working on: ${currentStep}`
                }
            });

            logger.debug("Progress updated via workflow tool", {
                currentStep,
                percentage: calculatedPercentage
            });

            return {
                success: true,
                message: "Progress updated successfully",
                current_step: currentStep,
                percentage: calculatedPercentage
            };
        }

        case "deliverable_create": {
            const name = args.name as string;
            const type = args.type as string;
            const content = args.content as string;
            const description = args.description as string | undefined;
            const fileExtension = args.file_extension as string | undefined;

            const result = await createPersonaDeliverable({
                personaInstanceId,
                name,
                type,
                content,
                description,
                fileExtension
            });

            if (result.success) {
                logger.info("Deliverable created via workflow tool", {
                    name: result.name,
                    id: result.id
                });

                return {
                    success: true,
                    message: `Deliverable "${result.name}.${result.fileExtension}" created successfully. The user can now download this file.`,
                    id: result.id,
                    name: result.name,
                    file_extension: result.fileExtension,
                    file_size_bytes: result.fileSizeBytes
                };
            } else {
                return {
                    success: false,
                    error: result.error || "Failed to create deliverable"
                };
            }
        }

        case "task_complete": {
            // task_complete is handled separately in the main loop
            // This case shouldn't be reached, but return success for safety
            return {
                success: true,
                message: "Task completion acknowledged",
                task_completed: true
            };
        }

        default: {
            logger.warn("Unknown persona workflow tool", { toolName: toolCall.name });
            return {
                success: false,
                error: `Unknown workflow tool: ${toolCall.name}`
            };
        }
    }
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
        skipClarification: inputSkipClarification = false,
        serializedThread,
        iterations = 0,
        accumulatedCredits: previousCredits = 0,
        reservedCredits: previousReserved = 0,
        clarificationComplete: inputClarificationComplete = false,
        startedAt: inputStartedAt
    } = input;

    // Track workflow start time for duration limits (captured once on first run)
    const workflowStartTime = inputStartedAt ?? Date.now();

    // Credit tracking state
    let reservedCredits = previousReserved;
    let accumulatedCredits = previousCredits;

    // Clarification state
    let clarificationComplete = inputClarificationComplete || inputSkipClarification;
    let pendingUserMessage: string | null = null;
    let skipClarificationRequested = inputSkipClarification;

    // Cancellation state
    let cancellationRequested = false;

    const logger = createWorkflowLogger({
        executionId,
        workflowName: "PersonaOrchestrator",
        userId
    });

    logger.info("Starting persona orchestrator", {
        personaInstanceId,
        threadId,
        iteration: iterations,
        clarificationComplete
    });

    // Set up signal handlers
    setHandler(personaUserMessageSignal, (message: string) => {
        logger.info("Received user message signal", { messageLength: message.length });
        pendingUserMessage = message;
    });

    setHandler(skipClarificationSignal, () => {
        logger.info("Received skip clarification signal");
        skipClarificationRequested = true;
        clarificationComplete = true;
    });

    setHandler(cancelPersonaSignal, () => {
        logger.info("Received cancellation signal");
        cancellationRequested = true;
    });

    // Load persona configuration (includes all tools)
    const persona = await getPersonaConfig({
        personaInstanceId,
        userId,
        workspaceId
    });

    // Get current clarification state from database (only on first run)
    let clarificationState: ClarificationState | null = null;
    if (iterations === 0 && !clarificationComplete) {
        clarificationState = await getPersonaClarificationState({ personaInstanceId });
        if (clarificationState) {
            clarificationComplete = clarificationState.complete || clarificationState.skipped;
        }
    }

    // Update persona instance status (only on first run)
    if (iterations === 0) {
        const initialStatus = clarificationComplete ? "running" : "clarifying";
        try {
            await updatePersonaInstanceStatus({
                personaInstanceId,
                status: initialStatus,
                startedAt: clarificationComplete ? new Date() : undefined
            });
        } catch (error) {
            logger.warn("Failed to update persona status", {
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

        // Add system prompt based on whether we're in clarification mode
        const systemPromptContent = clarificationComplete
            ? persona.system_prompt
            : buildClarificationSystemPrompt(persona.name, initialMessage || "Task not specified");

        const systemMessage: ThreadMessage = {
            id: `sys-${Date.now()}`,
            role: "system",
            content: systemPromptContent,
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

    // =============================================================================
    // CLARIFICATION PHASE
    // =============================================================================

    if (!clarificationComplete && iterations === 0) {
        logger.info("Entering clarification phase");

        const maxClarificationExchanges = clarificationState?.maxExchanges || 3;
        let clarificationExchanges = clarificationState?.exchangeCount || 0;

        // Clarification loop
        while (!clarificationComplete && clarificationExchanges < maxClarificationExchanges) {
            // Check for cancellation
            if (cancellationRequested) {
                logger.info("Cancellation requested during clarification");
                await updatePersonaInstanceStatus({
                    personaInstanceId,
                    status: "cancelled",
                    completionReason: "cancelled",
                    completedAt: new Date()
                });

                if (reservedCredits > 0) {
                    await finalizeCredits({
                        workspaceId,
                        userId,
                        reservedAmount: reservedCredits,
                        actualAmount: accumulatedCredits,
                        operationType: "persona_execution",
                        operationId: executionId,
                        description: `Persona: ${persona.name} (cancelled during clarification)`,
                        metadata: {
                            personaInstanceId,
                            personaName: persona.name,
                            cancelled: true
                        }
                    });
                }

                return {
                    success: false,
                    serializedThread: messageState,
                    iterations: 0,
                    error: "Cancelled by user during clarification",
                    totalCreditsUsed: accumulatedCredits
                };
            }

            // Check if skip was requested
            if (skipClarificationRequested) {
                logger.info("Clarification skipped by user request");
                await updatePersonaClarificationState({
                    personaInstanceId,
                    skipped: true,
                    complete: true
                });
                clarificationComplete = true;
                break;
            }

            // Generate clarifying questions (LLM call with clarification_complete tool)
            logger.info("Generating clarifying questions", { exchange: clarificationExchanges });

            // Provide only the clarification_complete tool during this phase
            const clarificationTool = getClarificationCompleteTool();

            let clarificationResponse: LLMResponse;
            try {
                clarificationResponse = await callLLM({
                    model: persona.model,
                    provider: persona.provider,
                    connectionId: persona.connection_id,
                    messages: messageState.messages,
                    tools: [clarificationTool], // Only clarification_complete tool
                    temperature: persona.temperature,
                    maxTokens: 1024, // Shorter for clarification
                    executionId,
                    threadId
                });

                // Track credit usage
                if (clarificationResponse.usage) {
                    const callCredits = await calculateLLMCredits({
                        model: persona.model,
                        inputTokens: clarificationResponse.usage.promptTokens,
                        outputTokens: clarificationResponse.usage.completionTokens
                    });
                    accumulatedCredits += callCredits;
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown LLM error";
                logger.error(
                    "Clarification LLM call failed",
                    error instanceof Error ? error : new Error(errorMessage)
                );

                // Continue without clarification on error
                clarificationComplete = true;
                break;
            }

            // Add assistant message
            const assistantMessage: ThreadMessage = {
                id: `asst-clarify-${Date.now()}-${clarificationExchanges}`,
                role: "assistant",
                content: clarificationResponse.content,
                tool_calls: clarificationResponse.tool_calls,
                timestamp: new Date()
            };
            messageState.messages.push(assistantMessage);

            // Save the clarification message to the database
            await addPersonaMessage({
                personaInstanceId,
                threadId,
                message: assistantMessage
            });

            // Check if persona called clarification_complete tool with ready=true
            // or signaled readiness via text content
            const clarificationCheck = checkClarificationComplete(
                clarificationResponse.tool_calls,
                clarificationResponse.content
            );
            if (clarificationCheck.complete) {
                if (clarificationCheck.viaText) {
                    logger.info("Persona signaled ready via text content");
                } else {
                    logger.info("Persona signaled ready via clarification_complete tool", {
                        summary: clarificationCheck.summary
                    });
                }

                // Add a tool result message to acknowledge the tool call
                if (clarificationResponse.tool_calls?.length) {
                    const toolCall = clarificationResponse.tool_calls.find(
                        (tc) => tc.name === "clarification_complete"
                    );
                    if (toolCall) {
                        const toolResultMessage: ThreadMessage = {
                            id: `tool-clarify-${Date.now()}`,
                            role: "tool",
                            content: JSON.stringify({
                                success: true,
                                message:
                                    "Clarification complete. Proceeding to main task execution."
                            }),
                            tool_name: "clarification_complete",
                            tool_call_id: toolCall.id,
                            timestamp: new Date()
                        };
                        messageState.messages.push(toolResultMessage);
                    }
                }

                await updatePersonaClarificationState({
                    personaInstanceId,
                    complete: true,
                    exchangeCount: clarificationExchanges + 1
                });
                clarificationComplete = true;
                break;
            }

            // Wait for user response
            logger.info("Waiting for user response");

            // Wait up to 24 hours for a response, checking periodically
            const gotResponse = await condition(
                () =>
                    pendingUserMessage !== null ||
                    skipClarificationRequested ||
                    cancellationRequested,
                "24 hours"
            );

            if (!gotResponse) {
                // Timeout - proceed with what we have
                logger.info("Clarification timeout, proceeding with available info");
                await updatePersonaClarificationState({
                    personaInstanceId,
                    complete: true,
                    exchangeCount: clarificationExchanges + 1
                });
                clarificationComplete = true;
                break;
            }

            if (skipClarificationRequested) {
                logger.info("Clarification skipped via signal");
                await updatePersonaClarificationState({
                    personaInstanceId,
                    skipped: true,
                    complete: true
                });
                clarificationComplete = true;
                break;
            }

            if (pendingUserMessage) {
                // Validate and add user response
                const userContent = pendingUserMessage;
                pendingUserMessage = null;

                const safetyResult = await validateInput({
                    content: userContent,
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

                if (safetyResult.shouldProceed) {
                    const userMessage: ThreadMessage = {
                        id: `user-clarify-${Date.now()}-${clarificationExchanges}`,
                        role: "user",
                        content: safetyResult.content,
                        timestamp: new Date()
                    };
                    messageState.messages.push(userMessage);

                    // Save user message
                    await addPersonaMessage({
                        personaInstanceId,
                        threadId,
                        message: userMessage
                    });

                    clarificationExchanges++;

                    // Update exchange count in database
                    await updatePersonaClarificationState({
                        personaInstanceId,
                        exchangeCount: clarificationExchanges
                    });
                }
            }
        }

        // If we've exhausted exchanges, mark complete and proceed
        if (!clarificationComplete) {
            logger.info("Max clarification exchanges reached, proceeding");
            await updatePersonaClarificationState({
                personaInstanceId,
                complete: true,
                exchangeCount: clarificationExchanges
            });
            clarificationComplete = true;
        }

        // Update status to running and rebuild system prompt for execution
        await updatePersonaInstanceStatus({
            personaInstanceId,
            status: "running",
            startedAt: new Date()
        });

        // Replace system prompt with full execution prompt
        const systemMessageIndex = messageState.messages.findIndex((m) => m.role === "system");
        if (systemMessageIndex >= 0) {
            messageState.messages[systemMessageIndex] = {
                ...messageState.messages[systemMessageIndex],
                content: persona.system_prompt
            };
        }

        logger.info("Clarification phase complete, starting execution");
    }

    // =============================================================================
    // MAIN EXECUTION LOOP
    // =============================================================================

    const maxIterations = persona.max_iterations || 100;
    let currentIterations = iterations;
    const CONTINUE_AS_NEW_THRESHOLD = 50;
    const PROGRESS_UPDATE_INTERVAL = 5;

    // Track tool failure counts - only blacklist after MAX_TOOL_FAILURES consecutive failures
    const MAX_TOOL_FAILURES = 3;
    // Initialize from input (for continue-as-new) or empty
    const toolFailureCounts = new Map<string, number>(
        Object.entries(input.toolFailureCounts || {})
    );

    // Track consecutive no-tool responses to prevent premature implicit completion
    // After MAX_NO_TOOL_RESPONSES, we'll force completion with a warning
    const MAX_NO_TOOL_RESPONSES = 3;
    let consecutiveNoToolResponses = 0;

    // Main execution loop (ReAct pattern for background execution)
    while (currentIterations < maxIterations) {
        // Check for cancellation
        if (cancellationRequested) {
            logger.info("Cancellation requested, stopping execution");

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
                status: "cancelled",
                completionReason: "cancelled",
                completedAt: new Date(),
                iterationCount: currentIterations,
                accumulatedCostCredits: accumulatedCredits,
                progress: {
                    current_step: currentIterations,
                    total_steps: maxIterations,
                    percentage: Math.round((currentIterations / maxIterations) * 100),
                    current_step_name: "Cancelled",
                    message: "Execution cancelled by user"
                }
            });

            if (personaRunSpanId) {
                await endSpan({
                    spanId: personaRunSpanId,
                    error: new Error("Cancelled by user")
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
                    description: `Persona: ${persona.name} (cancelled)`,
                    metadata: {
                        personaInstanceId,
                        personaName: persona.name,
                        iterations: currentIterations,
                        cancelled: true
                    }
                });
            }

            return {
                success: false,
                serializedThread: messageState,
                iterations: currentIterations,
                error: "Cancelled by user",
                totalCreditsUsed: accumulatedCredits
            };
        }

        // Check duration limit
        if (persona.max_duration_hours) {
            const elapsedHours = (Date.now() - workflowStartTime) / (1000 * 60 * 60);
            if (elapsedHours > persona.max_duration_hours) {
                logger.info("Duration limit exceeded", {
                    elapsedHours: elapsedHours.toFixed(2),
                    limit: persona.max_duration_hours
                });

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
                        error: new Error("Duration limit exceeded")
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
                        description: `Persona: ${persona.name} (duration limit exceeded)`,
                        metadata: {
                            personaInstanceId,
                            personaName: persona.name,
                            iterations: currentIterations,
                            failureReason: "max_duration"
                        }
                    });
                }

                return {
                    success: false,
                    serializedThread: messageState,
                    iterations: currentIterations,
                    error: `Duration limit exceeded (${elapsedHours.toFixed(2)}h > ${persona.max_duration_hours}h)`,
                    totalCreditsUsed: accumulatedCredits
                };
            }
        }

        logger.info("Persona iteration", { iteration: currentIterations, maxIterations });

        // Check for incoming user messages during execution
        if (pendingUserMessage) {
            const userContent = pendingUserMessage;
            pendingUserMessage = null;

            const safetyResult = await validateInput({
                content: userContent,
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

            if (safetyResult.shouldProceed) {
                const userMessage: ThreadMessage = {
                    id: `user-exec-${Date.now()}-${currentIterations}`,
                    role: "user",
                    content: safetyResult.content,
                    timestamp: new Date()
                };
                messageState.messages.push(userMessage);

                await addPersonaMessage({
                    personaInstanceId,
                    threadId,
                    message: userMessage
                });
            }
        }

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

            // Use smart summarization to preserve important context
            const summarizedMessages: ThreadMessage[] = await summarizeThreadContext({
                messages: messageState.messages,
                maxMessages: persona.memory_config.max_messages,
                personaName: persona.name,
                model: persona.model,
                provider: persona.provider
            });

            const summarizedState: SerializedThread = {
                messages: summarizedMessages,
                savedMessageIds: summarizedMessages.map((m: ThreadMessage) => m.id),
                metadata: messageState.metadata
            };

            return continueAsNew<typeof personaOrchestratorWorkflow>({
                executionId,
                personaInstanceId,
                userId,
                workspaceId,
                threadId,
                serializedThread: summarizedState,
                iterations: currentIterations,
                accumulatedCredits,
                reservedCredits,
                clarificationComplete: true,
                toolFailureCounts: Object.fromEntries(toolFailureCounts),
                startedAt: workflowStartTime
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

        // Filter out tools that have failed too many times
        const availableTools = persona.available_tools.filter(
            (tool) => (toolFailureCounts.get(tool.name) || 0) < MAX_TOOL_FAILURES
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

                // Check cost limit
                if (persona.max_cost_credits && accumulatedCredits > persona.max_cost_credits) {
                    logger.info("Cost limit exceeded", {
                        accumulated: accumulatedCredits,
                        limit: persona.max_cost_credits
                    });

                    await endSpan({ spanId: iterationSpanId });

                    await updatePersonaInstanceStatus({
                        personaInstanceId,
                        status: "failed",
                        completionReason: "max_cost",
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
                            description: `Persona: ${persona.name} (cost limit exceeded)`,
                            metadata: {
                                personaInstanceId,
                                personaName: persona.name,
                                iterations: currentIterations,
                                failureReason: "max_cost"
                            }
                        });
                    }

                    return {
                        success: false,
                        serializedThread: messageState,
                        iterations: currentIterations,
                        error: `Cost limit exceeded (${accumulatedCredits} > ${persona.max_cost_credits} credits)`,
                        totalCreditsUsed: accumulatedCredits
                    };
                }
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

        // Check if done (explicit task_complete call or no tool calls)
        const hasToolCalls = llmResponse.tool_calls && llmResponse.tool_calls.length > 0;
        const taskCompleteCall = llmResponse.tool_calls?.find((tc) => tc.name === "task_complete");

        // Handle explicit task completion via tool call
        if (taskCompleteCall) {
            const completionSummary =
                (taskCompleteCall.arguments?.summary as string) || "Task completed";

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

            logger.info("Persona completed task via task_complete tool", {
                summary: completionSummary.substring(0, 100)
            });

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
                    message: completionSummary
                }
            });

            await endSpan({
                spanId: iterationSpanId,
                output: { completed: true, viaTaskCompleteTool: true, summary: completionSummary }
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
                        success: true,
                        completedViaToolCall: true
                    }
                });
            }

            return {
                success: true,
                serializedThread: messageState,
                iterations: currentIterations,
                finalMessage: completionSummary,
                totalCreditsUsed: accumulatedCredits
            };
        }

        // Handle implicit completion (no tool calls)
        // Instead of completing immediately, give the LLM a chance to continue
        if (!hasToolCalls) {
            consecutiveNoToolResponses++;

            logger.info("No tool calls in response", {
                consecutiveNoToolResponses,
                maxAllowed: MAX_NO_TOOL_RESPONSES
            });

            // If we've hit the threshold, force completion with a warning
            if (consecutiveNoToolResponses >= MAX_NO_TOOL_RESPONSES) {
                logger.warn(
                    "Persona completed without explicit task_complete after multiple prompts",
                    { consecutiveNoToolResponses }
                );

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

                await updatePersonaInstanceStatus({
                    personaInstanceId,
                    status: "completed",
                    completionReason: "success", // Implicit completion is still considered a success
                    completedAt: new Date(),
                    iterationCount: currentIterations,
                    accumulatedCostCredits: accumulatedCredits,
                    progress: {
                        current_step: currentIterations,
                        total_steps: currentIterations,
                        percentage: 100,
                        current_step_name: "Completed",
                        message: "Task completed (no further actions taken)"
                    }
                });

                await endSpan({
                    spanId: iterationSpanId,
                    output: { completed: true, implicit: true, finalMessage: llmResponse.content }
                });

                if (personaRunSpanId) {
                    await endSpan({
                        spanId: personaRunSpanId,
                        output: { success: true, iterations: currentIterations, implicit: true }
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
                            success: true,
                            implicitCompletion: true
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

            // Not at threshold yet - inject a reminder and continue
            const reminderMessage: ThreadMessage = {
                id: `system-reminder-${Date.now()}`,
                role: "system",
                content:
                    "You responded without using any tools. If you have completed your task and created all deliverables, please call the task_complete tool with a summary of your work. Otherwise, continue working by using the appropriate tools to make progress on the task.",
                timestamp: new Date()
            };
            messageState.messages.push(reminderMessage);

            await endSpan({
                spanId: iterationSpanId,
                output: { noToolCalls: true, reminderInjected: true }
            });

            currentIterations++;
            continue; // Continue to next iteration
        }

        // Reset counter when tools are used
        consecutiveNoToolResponses = 0;

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
                let toolResult: Record<string, unknown>;

                // Handle persona workflow tools directly (not via executeToolCall)
                if (isPersonaWorkflowTool(toolCall.name)) {
                    toolResult = await handlePersonaWorkflowTool(
                        toolCall,
                        personaInstanceId,
                        logger
                    );
                } else {
                    // Execute regular tools via activity
                    toolResult = (await executeToolCall({
                        executionId,
                        toolCall,
                        availableTools: persona.available_tools,
                        userId,
                        workspaceId,
                        metadata: {
                            personaInstanceId
                        }
                    })) as Record<string, unknown>;
                }

                // Reset failure count on success
                toolFailureCounts.delete(toolCall.name);

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

                // Increment failure count
                const currentFailures = (toolFailureCounts.get(toolCall.name) || 0) + 1;
                toolFailureCounts.set(toolCall.name, currentFailures);
                const isBlacklisted = currentFailures >= MAX_TOOL_FAILURES;

                logger.error(
                    "Tool execution failed",
                    error instanceof Error ? error : new Error(errorMessage),
                    {
                        toolName: toolCall.name,
                        failureCount: currentFailures,
                        isBlacklisted
                    }
                );

                // Provide informative error message to the LLM
                const toolMessage: ThreadMessage = {
                    id: `tool-${Date.now()}-${toolCall.id}`,
                    role: "tool",
                    content: JSON.stringify({
                        error: errorMessage,
                        failure_count: currentFailures,
                        max_failures: MAX_TOOL_FAILURES,
                        is_blacklisted: isBlacklisted,
                        suggestion: isBlacklisted
                            ? `This tool has failed ${currentFailures} times and is now disabled. Please try an alternative approach or use a different tool.`
                            : `Tool failed (attempt ${currentFailures}/${MAX_TOOL_FAILURES}). You may retry or try a different approach.`
                    }),
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
