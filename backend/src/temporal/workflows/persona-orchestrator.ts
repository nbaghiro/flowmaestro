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
import {
    parsePersonaResponse,
    hasCompletionSignal,
    hasClarificationCompleteSignal,
    getDeliverableSignals,
    getProgressSignals
} from "./persona-signals";
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

// Real-time event emission activities
const {
    emitPersonaStarted,
    emitPersonaProgress,
    emitPersonaDeliverable,
    emitPersonaCompleted,
    emitPersonaFailed
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "10 seconds",
    retry: {
        maximumAttempts: 2
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
When you have gathered enough information to proceed with the task, include this signal block in your response:

\`\`\`workflow-signal
{
    "type": "clarification_complete",
    "summary": "Brief summary of what you understood from the clarification",
    "key_requirements": ["requirement 1", "requirement 2"],
    "ready": true
}
\`\`\`

Set "ready" to true only when you have all critical information needed to proceed.`;
}

/**
 * Check if the LLM signaled clarification is complete
 */
function checkClarificationComplete(content: string): {
    complete: boolean;
    summary?: string;
    viaText?: boolean;
} {
    // Parse for clarification_complete signal (preferred method)
    const parsed = parsePersonaResponse(content);
    const clarificationSignal = hasClarificationCompleteSignal(parsed.signals);

    if (clarificationSignal) {
        return {
            complete: true,
            summary: clarificationSignal.summary
        };
    }

    // Check text content for readiness indicators (fallback)
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

    return { complete: false };
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

            // Emit started event if skipping clarification and going straight to running
            if (clarificationComplete) {
                await emitPersonaStarted({
                    instanceId: personaInstanceId,
                    personaName: persona.name,
                    taskTitle: initialMessage || null
                });
            }
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

            // Emit failed event for real-time updates
            await emitPersonaFailed({
                instanceId: personaInstanceId,
                error: errorMessage
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

            // Emit failed event for real-time updates
            await emitPersonaFailed({
                instanceId: personaInstanceId,
                error: errorMessage
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

                // Emit failed event for real-time updates
                const safetyError = `Input blocked by safety check: ${blockReasons}`;
                await emitPersonaFailed({
                    instanceId: personaInstanceId,
                    error: safetyError
                });

                throw new Error(safetyError);
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

            // Generate clarifying questions (LLM call - signals parsed from response)
            logger.info("Generating clarifying questions", { exchange: clarificationExchanges });

            let clarificationResponse: LLMResponse;
            try {
                clarificationResponse = await callLLM({
                    model: persona.model,
                    provider: persona.provider,
                    connectionId: persona.connection_id,
                    messages: messageState.messages,
                    tools: [], // No tools during clarification - uses signals
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

            // Parse response for signals (remove signal blocks from displayed content)
            const parsedClarification = parsePersonaResponse(clarificationResponse.content);

            // Add assistant message (with signal blocks removed for clean display)
            const assistantMessage: ThreadMessage = {
                id: `asst-clarify-${Date.now()}-${clarificationExchanges}`,
                role: "assistant",
                content: parsedClarification.textContent || clarificationResponse.content,
                timestamp: new Date()
            };
            messageState.messages.push(assistantMessage);

            // Save the clarification message to the database
            await addPersonaMessage({
                personaInstanceId,
                threadId,
                message: assistantMessage
            });

            // Check if persona signaled clarification is complete
            const clarificationCheck = checkClarificationComplete(clarificationResponse.content);
            if (clarificationCheck.complete) {
                if (clarificationCheck.viaText) {
                    logger.info("Persona signaled ready via text content");
                } else {
                    logger.info("Persona signaled ready via clarification_complete signal", {
                        summary: clarificationCheck.summary
                    });
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

        // Emit started event after clarification completes
        await emitPersonaStarted({
            instanceId: personaInstanceId,
            personaName: persona.name,
            taskTitle: initialMessage || null
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
            const progress = {
                current_step: currentIterations,
                total_steps: maxIterations,
                percentage: Math.round((currentIterations / maxIterations) * 100),
                current_step_name: "Processing",
                message: "Processing task..."
            };

            try {
                await updatePersonaInstanceProgress({
                    personaInstanceId,
                    iterationCount: currentIterations,
                    accumulatedCostCredits: accumulatedCredits,
                    progress
                });

                // Emit progress event for real-time updates
                await emitPersonaProgress({
                    instanceId: personaInstanceId,
                    progress,
                    iterationCount: currentIterations,
                    accumulatedCost: accumulatedCredits
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
                    const costError = `Cost limit exceeded (${accumulatedCredits} > ${persona.max_cost_credits} credits)`;
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

                    // Emit failed event for real-time updates
                    await emitPersonaFailed({
                        instanceId: personaInstanceId,
                        error: costError
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
                        error: costError,
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

            // Emit failed event for real-time updates
            await emitPersonaFailed({
                instanceId: personaInstanceId,
                error: errorMessage
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

            // Emit failed event for real-time updates
            const outputSafetyError = `Output blocked by safety check: ${blockReasons}`;
            await emitPersonaFailed({
                instanceId: personaInstanceId,
                error: outputSafetyError
            });

            throw new Error(outputSafetyError);
        }

        // ===== Parse response for workflow signals =====
        const parsedResponse = parsePersonaResponse(outputSafetyResult.content);

        if (parsedResponse.parseErrors.length > 0) {
            logger.warn("Signal parse errors (non-fatal)", {
                errors: parsedResponse.parseErrors
            });
        }

        // Handle progress signals
        const progressSignals = getProgressSignals(parsedResponse.signals);
        for (const progressSignal of progressSignals) {
            const completedCount = progressSignal.completed_steps?.length || 0;
            const remainingCount = progressSignal.remaining_steps?.length || 0;
            const totalSteps = completedCount + remainingCount + 1; // +1 for current step

            await updatePersonaInstanceProgress({
                personaInstanceId,
                progress: {
                    current_step: completedCount + 1,
                    total_steps: totalSteps > 0 ? totalSteps : 0,
                    current_step_name: progressSignal.current_step,
                    percentage:
                        progressSignal.percentage ??
                        Math.round((completedCount / totalSteps) * 100),
                    message: progressSignal.message
                }
            });

            logger.debug("Progress updated via signal", {
                currentStep: progressSignal.current_step,
                percentage: progressSignal.percentage
            });
        }

        // Handle deliverable signals
        const deliverableSignals = getDeliverableSignals(parsedResponse.signals);
        for (const deliverableSignal of deliverableSignals) {
            const result = await createPersonaDeliverable({
                personaInstanceId,
                name: deliverableSignal.name,
                type: deliverableSignal.deliverable_type,
                content: deliverableSignal.content,
                description: deliverableSignal.description,
                fileExtension: deliverableSignal.file_extension
            });

            if (result.success) {
                logger.info("Deliverable created via signal", {
                    name: result.name,
                    id: result.id
                });

                // Emit deliverable event for real-time updates
                await emitPersonaDeliverable({
                    instanceId: personaInstanceId,
                    deliverable: {
                        id: result.id ?? "",
                        name: result.name ?? deliverableSignal.name,
                        type: deliverableSignal.deliverable_type,
                        description: deliverableSignal.description || null
                    }
                });
            } else {
                logger.warn("Failed to create deliverable via signal", {
                    name: deliverableSignal.name,
                    error: result.error
                });
            }
        }

        // Check for completion signal
        const completionSignal = hasCompletionSignal(parsedResponse.signals);

        // Add assistant message with cleaned content (signal blocks removed)
        const assistantMessage: ThreadMessage = {
            id: `asst-${Date.now()}-${currentIterations}`,
            role: "assistant",
            content: parsedResponse.textContent,
            tool_calls: llmResponse.tool_calls,
            timestamp: new Date()
        };
        messageState.messages.push(assistantMessage);

        // Handle completion via signal (new approach)
        if (completionSignal) {
            const completionSummary = completionSignal.summary || "Task completed";

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

            logger.info("Persona completed task via completion signal", {
                summary: completionSummary.substring(0, 100),
                deliverablesCreated: completionSignal.deliverables_created
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

            // Emit completed event for real-time updates
            const durationSeconds = Math.round((Date.now() - workflowStartTime) / 1000);
            await emitPersonaCompleted({
                instanceId: personaInstanceId,
                completionReason: "success",
                deliverableCount: completionSignal.deliverables_created?.length || 0,
                durationSeconds,
                totalCost: accumulatedCredits
            });

            await endSpan({
                spanId: iterationSpanId,
                output: { completed: true, viaCompletionSignal: true, summary: completionSummary }
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
                        completedViaSignal: true
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

        // Check for implicit completion (no tool calls AND no signals)
        const hasToolCalls = llmResponse.tool_calls && llmResponse.tool_calls.length > 0;

        // Handle implicit completion (no tool calls AND no signals)
        // Instead of completing immediately, give the LLM a chance to continue
        const hasSignals = parsedResponse.signals.length > 0;

        if (!hasToolCalls && !hasSignals) {
            consecutiveNoToolResponses++;

            logger.info("No tool calls or signals in response", {
                consecutiveNoToolResponses,
                maxAllowed: MAX_NO_TOOL_RESPONSES
            });

            // If we've hit the threshold, force completion with a warning
            if (consecutiveNoToolResponses >= MAX_NO_TOOL_RESPONSES) {
                logger.warn(
                    "Persona completed without explicit completion signal after multiple prompts",
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

                // Emit completed event for real-time updates
                const implicitDurationSeconds = Math.round((Date.now() - workflowStartTime) / 1000);
                await emitPersonaCompleted({
                    instanceId: personaInstanceId,
                    completionReason: "success",
                    deliverableCount: 0,
                    durationSeconds: implicitDurationSeconds,
                    totalCost: accumulatedCredits
                });

                await endSpan({
                    spanId: iterationSpanId,
                    output: {
                        completed: true,
                        implicit: true,
                        finalMessage: parsedResponse.textContent
                    }
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
                    finalMessage: parsedResponse.textContent,
                    totalCreditsUsed: accumulatedCredits
                };
            }

            // Not at threshold yet - inject a reminder and continue
            const reminderMessage: ThreadMessage = {
                id: `system-reminder-${Date.now()}`,
                role: "system",
                content:
                    "You responded without using any tools or workflow signals. If you have completed your task and created all deliverables, please include a completion signal in your response. Otherwise, continue working by using the appropriate tools to make progress on the task.",
                timestamp: new Date()
            };
            messageState.messages.push(reminderMessage);

            await endSpan({
                spanId: iterationSpanId,
                output: { noToolCalls: true, noSignals: true, reminderInjected: true }
            });

            currentIterations++;
            continue; // Continue to next iteration
        }

        // Reset counter when tools are used or signals are present
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
                // Execute tool via activity
                const toolResult = (await executeToolCall({
                    executionId,
                    toolCall,
                    availableTools: persona.available_tools,
                    userId,
                    workspaceId,
                    metadata: {
                        personaInstanceId
                    }
                })) as Record<string, unknown>;

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
