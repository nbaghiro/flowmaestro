/**
 * Agent Orchestrator Workflow
 */

import {
    proxyActivities,
    condition,
    defineSignal,
    setHandler,
    continueAsNew
} from "@temporalio/workflow";
import type { JsonObject } from "@flowmaestro/shared";
import { SpanType } from "../core/types";
import { createWorkflowLogger } from "../core/workflow-logger";
import type { SerializedThread } from "../../services/agents/ThreadManager";
import type { Tool } from "../../storage/models/Agent";
import type { ThreadMessage, ToolCall } from "../../storage/models/AgentExecution";
import type * as activities from "../activities";

// Proxy activities
const {
    getAgentConfig,
    callLLM,
    executeToolCall,
    saveThreadIncremental,
    validateInput,
    validateOutput,
    createSpan,
    endSpan,
    updateThreadTokens
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "10 minutes",
    retry: {
        maximumAttempts: 3,
        backoffCoefficient: 2
    }
});

// Event emission activities (non-retryable)
const {
    emitAgentExecutionStarted,
    emitAgentMessage,
    emitAgentThinking,
    emitAgentToolCallStarted,
    emitAgentToolCallCompleted,
    emitAgentToolCallFailed,
    emitAgentExecutionCompleted,
    emitAgentExecutionFailed
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "5 seconds",
    retry: {
        maximumAttempts: 1
    }
});

// Signal for receiving user messages
export const userMessageSignal = defineSignal<[string]>("userMessage");

export interface AgentOrchestratorInput {
    executionId: string;
    agentId: string;
    userId: string;
    threadId: string; // Thread this execution belongs to
    initialMessage?: string;
    // Override agent's default connection/model
    connectionId?: string;
    model?: string;
    // For continue-as-new with ThreadManager
    serializedThread?: SerializedThread;
    iterations?: number;
}

export interface AgentOrchestratorResult {
    success: boolean;
    serializedThread: SerializedThread;
    iterations: number;
    finalMessage?: string;
    error?: string;
}

export interface AgentConfig {
    id: string;
    name: string;
    model: string;
    provider: string;
    connection_id: string | null;
    system_prompt: string;
    temperature: number;
    max_tokens: number;
    max_iterations: number;
    available_tools: Tool[];
    memory_config: {
        type: "buffer" | "summary" | "vector";
        max_messages: number;
    };
    safety_config: {
        enablePiiDetection: boolean;
        enablePromptInjectionDetection: boolean;
        enableContentModeration: boolean;
        piiRedactionEnabled: boolean;
        piiRedactionPlaceholder?: string;
        promptInjectionAction: "allow" | "block" | "redact" | "warn";
        contentModerationThreshold?: number;
    };
}

export interface LLMResponse {
    content: string;
    tool_calls?: ToolCall[];
    requiresUserInput?: boolean;
    isComplete?: boolean;
    // Token usage for cost tracking and observability
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/**
 * Token buffer for deterministic token accumulation in workflow
 */
interface TokenBuffer {
    messageId: string;
    tokens: Array<{ sequence: number; token: string }>;
    sequenceCounter: number;
    startTime: number;
}

/**
 * Message state for workflow (deterministic, plain objects only)
 */
interface WorkflowMessageState {
    messages: ThreadMessage[];
    savedMessageIds: string[];
    metadata: JsonObject;

    // NEW: Token buffering for streaming
    currentTokenBuffer: TokenBuffer | null;
    lastEmittedSequence: number;
}

/**
 * Agent Orchestrator Workflow
 *
 * - Uses ThreadManager pattern for message handling
 * - Incremental persistence (only save new messages)
 * - Source tracking (memory vs new messages)
 * - Better serialization for continue-as-new
 * - Multi-format conversion support
 */
export async function agentOrchestratorWorkflow(
    input: AgentOrchestratorInput
): Promise<AgentOrchestratorResult> {
    const {
        executionId,
        agentId,
        userId,
        threadId,
        initialMessage,
        serializedThread,
        iterations = 0
    } = input;

    // Create workflow logger
    const logger = createWorkflowLogger({
        executionId,
        workflowName: "AgentOrchestrator",
        userId
    });

    logger.info("Starting agent orchestrator", { agentId, threadId, iteration: iterations });

    // Load agent configuration
    const agent = await getAgentConfig({ agentId, userId });

    // Create AGENT_RUN span for entire execution (only on first run, not continue-as-new)
    let agentRunSpanId: string | undefined = undefined;
    if (iterations === 0) {
        const agentRunContext = await createSpan({
            traceId: executionId,
            parentSpanId: undefined,
            name: `Agent: ${agent.name}`,
            spanType: SpanType.AGENT_RUN,
            entityId: agentId,
            input: {
                agentId,
                threadId,
                initialMessage
            },
            attributes: {
                userId,
                agentName: agent.name,
                model: agent.model,
                provider: agent.provider
            }
        });
        agentRunSpanId = agentRunContext.spanId;
    }

    // Initialize message state (deterministic - just plain objects)
    let messageState: WorkflowMessageState;

    if (serializedThread) {
        // Restoring from continue-as-new
        messageState = {
            messages: serializedThread.messages,
            savedMessageIds: serializedThread.savedMessageIds,
            metadata: serializedThread.metadata,
            currentTokenBuffer: null,
            lastEmittedSequence: 0
        };
    } else {
        // First run - initialize
        messageState = {
            messages: [],
            savedMessageIds: [],
            metadata: {},
            currentTokenBuffer: null,
            lastEmittedSequence: 0
        };

        // Add system prompt
        const systemMessage: ThreadMessage = {
            id: `sys-${Date.now()}`,
            role: "system",
            content: agent.system_prompt,
            timestamp: new Date()
        };
        messageState.messages.push(systemMessage);
        messageState.savedMessageIds.push(systemMessage.id); // System message is "saved"

        // Add initial user message if provided
        if (initialMessage) {
            // Safety check: Validate user input
            const safetyResult = await validateInput({
                content: initialMessage,
                context: {
                    userId,
                    agentId,
                    executionId,
                    threadId,
                    direction: "input",
                    messageRole: "user"
                },
                config: agent.safety_config
            });

            // If safety check blocks, fail the execution
            if (!safetyResult.shouldProceed) {
                const blockReasons = safetyResult.violations
                    .filter((v) => v.action === "block")
                    .map((v) => v.message || v.type)
                    .join(", ");

                await emitAgentExecutionFailed({
                    executionId,
                    threadId,
                    error: `Input blocked by safety check: ${blockReasons}`
                });

                throw new Error(`Input blocked by safety check: ${blockReasons}`);
            }

            // Use potentially redacted content
            const userMessage: ThreadMessage = {
                id: `user-${Date.now()}`,
                role: "user",
                content: safetyResult.content,
                timestamp: new Date()
            };
            messageState.messages.push(userMessage);
        }

        // Emit execution started event
        await emitAgentExecutionStarted({
            executionId,
            agentId,
            agentName: agent.name
        });
    }

    // Set up signal handler for user messages
    let pendingUserMessage: string | null = null;
    setHandler(userMessageSignal, (message: string) => {
        logger.info("Received user message via signal");
        pendingUserMessage = message;
    });

    const maxIterations = agent.max_iterations || 100;
    let currentIterations = iterations;
    const CONTINUE_AS_NEW_THRESHOLD = 50;

    // Main agent loop (ReAct pattern)
    // Track tools that have failed - exclude them from subsequent LLM calls
    const failedToolNames = new Set<string>();

    while (currentIterations < maxIterations) {
        logger.info("Agent iteration", { iteration: currentIterations, maxIterations });

        // Create AGENT_ITERATION span for this iteration
        const iterationContext = await createSpan({
            traceId: executionId,
            parentSpanId: agentRunSpanId,
            name: `Iteration ${currentIterations + 1}`,
            spanType: SpanType.AGENT_ITERATION,
            entityId: agentId,
            input: {
                iteration: currentIterations,
                messageCount: messageState.messages.length
            },
            attributes: {
                iteration: currentIterations,
                maxIterations
            }
        });
        const iterationSpanId = iterationContext.spanId;

        // Continue-as-new every 50 iterations to prevent history bloat
        if (currentIterations > 0 && currentIterations % CONTINUE_AS_NEW_THRESHOLD === 0) {
            logger.info("Continue-as-new triggered", { iteration: currentIterations });

            // Save incremental messages before continue-as-new
            const unsavedMessages = getUnsavedMessages(messageState);
            if (unsavedMessages.length > 0) {
                await saveThreadIncremental({
                    executionId,
                    threadId,
                    messages: unsavedMessages
                });
                // Mark as saved
                unsavedMessages.forEach((msg) => messageState.savedMessageIds.push(msg.id));
            }

            // Summarize history if needed (keep last N messages)
            const summarizedState = summarizeMessageState(
                messageState,
                agent.memory_config.max_messages
            );

            return continueAsNew<typeof agentOrchestratorWorkflow>({
                executionId,
                agentId,
                userId,
                threadId,
                serializedThread: summarizedState,
                iterations: currentIterations,
                // Preserve override values across continue-as-new
                ...(input.connectionId && { connectionId: input.connectionId }),
                ...(input.model && { model: input.model })
            });
        }

        // Emit thinking event
        await emitAgentThinking({ executionId, threadId });

        // Create MODEL_GENERATION span for LLM call
        const modelGenContext = await createSpan({
            traceId: executionId,
            parentSpanId: iterationSpanId,
            name: `${agent.provider}:${agent.model}`,
            spanType: SpanType.MODEL_GENERATION,
            entityId: agentId,
            input: {
                model: agent.model,
                provider: agent.provider,
                messageCount: messageState.messages.length
            },
            attributes: {
                model: agent.model,
                provider: agent.provider,
                temperature: agent.temperature,
                maxTokens: agent.max_tokens
            }
        });
        const modelGenSpanId = modelGenContext.spanId;

        // Call LLM with thread messages and available tools
        // Use override connection/model if provided, otherwise use agent's defaults
        // Filter out tools that have failed to prevent retry loops
        const availableTools = agent.available_tools.filter(
            (tool) => !failedToolNames.has(tool.name)
        );

        let llmResponse: LLMResponse;
        try {
            llmResponse = await callLLM({
                model: input.model || agent.model,
                provider: agent.provider,
                connectionId: input.connectionId || agent.connection_id,
                messages: messageState.messages,
                tools: availableTools,
                temperature: agent.temperature,
                maxTokens: agent.max_tokens,
                executionId: input.executionId,
                threadId
            });

            // End MODEL_GENERATION span with success and token usage
            await endSpan({
                spanId: modelGenSpanId,
                output: {
                    content: llmResponse.content,
                    hasToolCalls: !!(llmResponse.tool_calls && llmResponse.tool_calls.length > 0)
                },
                attributes: {
                    responseLength: llmResponse.content.length,
                    toolCallCount: llmResponse.tool_calls?.length || 0,
                    // Token usage for cost tracking
                    ...(llmResponse.usage && {
                        promptTokens: llmResponse.usage.promptTokens,
                        completionTokens: llmResponse.usage.completionTokens,
                        totalTokens: llmResponse.usage.totalTokens
                    })
                }
            });

            // Update token usage for thread (pass usage to avoid zeros when spans are lagging)
            try {
                await updateThreadTokens({
                    threadId,
                    executionId,
                    usage: llmResponse.usage,
                    provider: agent.provider,
                    model: agent.model
                });
            } catch (error) {
                logger.error(
                    "Failed to update thread tokens",
                    error instanceof Error ? error : new Error(String(error))
                );
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown LLM error";
            logger.error(
                "LLM call failed",
                error instanceof Error ? error : new Error(errorMessage)
            );

            // End MODEL_GENERATION span with error
            await endSpan({
                spanId: modelGenSpanId,
                error: error instanceof Error ? error : new Error(errorMessage)
            });

            // End AGENT_ITERATION span with error
            await endSpan({
                spanId: iterationSpanId,
                error: error instanceof Error ? error : new Error(errorMessage),
                attributes: {
                    failureReason: "llm_call_failed"
                }
            });

            await emitAgentExecutionFailed({
                executionId,
                threadId,
                error: errorMessage
            });

            // End AGENT_RUN span with error
            if (agentRunSpanId) {
                await endSpan({
                    spanId: agentRunSpanId,
                    error: error instanceof Error ? error : new Error(errorMessage),
                    attributes: {
                        totalIterations: currentIterations,
                        failureReason: "llm_call_failed"
                    }
                });
            }

            return {
                success: false,
                serializedThread: messageState,
                iterations: currentIterations,
                error: errorMessage
            };
        }

        // Safety check: Validate agent output
        const outputSafetyResult = await validateOutput({
            content: llmResponse.content,
            context: {
                userId,
                agentId,
                executionId,
                threadId,
                direction: "output",
                messageRole: "assistant"
            },
            config: agent.safety_config
        });

        // If safety check blocks, fail the execution
        if (!outputSafetyResult.shouldProceed) {
            const blockReasons = outputSafetyResult.violations
                .filter((v) => v.action === "block")
                .map((v) => v.message || v.type)
                .join(", ");

            await emitAgentExecutionFailed({
                executionId,
                threadId,
                error: `Output blocked by safety check: ${blockReasons}`
            });

            // End AGENT_RUN span with error
            if (agentRunSpanId) {
                await endSpan({
                    spanId: agentRunSpanId,
                    error: new Error(`Output blocked by safety check: ${blockReasons}`),
                    attributes: {
                        totalIterations: currentIterations,
                        failureReason: "safety_check_blocked_output"
                    }
                });
            }

            throw new Error(`Output blocked by safety check: ${blockReasons}`);
        }

        // Add assistant response to history (with potentially redacted content)
        const assistantMessage: ThreadMessage = {
            id: `asst-${Date.now()}-${currentIterations}`,
            role: "assistant",
            content: outputSafetyResult.content,
            tool_calls: llmResponse.tool_calls,
            timestamp: new Date()
        };
        messageState.messages.push(assistantMessage);

        // DON'T emit message event for streamed assistant responses
        // The frontend builds the final message from accumulated streaming tokens
        // Only user messages, tool results, and system messages need emitAgentMessage()
        // This prevents race conditions where the full message arrives before all tokens

        // Check if agent is done (no tool calls and has final answer)
        const hasToolCalls = llmResponse.tool_calls && llmResponse.tool_calls.length > 0;

        if (!hasToolCalls) {
            // Check if agent needs user input
            if (llmResponse.requiresUserInput) {
                logger.info("Waiting for user input");

                // Wait for user message signal (5 minute timeout)
                const receivedInput = await condition(() => pendingUserMessage !== null, 300000);

                if (!receivedInput) {
                    // Timeout
                    const timeoutError = "User input timeout after 5 minutes";
                    await emitAgentExecutionFailed({
                        executionId,
                        threadId,
                        error: timeoutError
                    });

                    // End AGENT_ITERATION span with error
                    await endSpan({
                        spanId: iterationSpanId,
                        error: new Error(timeoutError),
                        attributes: {
                            failureReason: "user_input_timeout"
                        }
                    });

                    // End AGENT_RUN span with error
                    if (agentRunSpanId) {
                        await endSpan({
                            spanId: agentRunSpanId,
                            error: new Error(timeoutError),
                            attributes: {
                                totalIterations: currentIterations
                            }
                        });
                    }

                    return {
                        success: false,
                        serializedThread: messageState,
                        iterations: currentIterations,
                        error: timeoutError
                    };
                }

                // Safety check: Validate user input
                const pendingSafetyResult = await validateInput({
                    content: pendingUserMessage!,
                    context: {
                        userId,
                        agentId,
                        executionId,
                        threadId,
                        direction: "input",
                        messageRole: "user"
                    },
                    config: agent.safety_config
                });

                // If safety check blocks, fail the execution
                if (!pendingSafetyResult.shouldProceed) {
                    const blockReasons = pendingSafetyResult.violations
                        .filter((v) => v.action === "block")
                        .map((v) => v.message || v.type)
                        .join(", ");

                    await emitAgentExecutionFailed({
                        executionId,
                        threadId,
                        error: `User message blocked by safety check: ${blockReasons}`
                    });

                    // End AGENT_ITERATION span with error
                    await endSpan({
                        spanId: iterationSpanId,
                        error: new Error(`Safety check blocked user message: ${blockReasons}`),
                        attributes: {
                            failureReason: "safety_check_blocked_user_input"
                        }
                    });

                    // End AGENT_RUN span with error
                    if (agentRunSpanId) {
                        await endSpan({
                            spanId: agentRunSpanId,
                            error: new Error(`Safety check blocked user message: ${blockReasons}`),
                            attributes: {
                                totalIterations: currentIterations,
                                failureReason: "safety_check_blocked"
                            }
                        });
                    }

                    return {
                        success: false,
                        serializedThread: messageState,
                        iterations: currentIterations,
                        error: `User message blocked by safety check: ${blockReasons}`
                    };
                }

                // Add user message to history (with potentially redacted content)
                const userMessage: ThreadMessage = {
                    id: `user-${Date.now()}-${currentIterations}`,
                    role: "user",
                    content: pendingSafetyResult.content,
                    timestamp: new Date()
                };
                messageState.messages.push(userMessage);

                await emitAgentMessage({
                    executionId,
                    threadId,
                    message: userMessage
                });

                // Reset pending message
                pendingUserMessage = null;

                // End AGENT_ITERATION span before continuing
                await endSpan({
                    spanId: iterationSpanId,
                    output: {
                        receivedUserInput: true
                    },
                    attributes: {
                        messageCount: messageState.messages.length
                    }
                });

                // Continue loop to process user input
                currentIterations++;
                continue;
            }

            // Agent is done - save any unsaved messages (including the final assistant message)
            const unsavedMessages = getUnsavedMessages(messageState);
            if (unsavedMessages.length > 0) {
                await saveThreadIncremental({
                    executionId,
                    threadId,
                    messages: unsavedMessages,
                    markCompleted: true // Mark execution as completed after saving
                });
                // Mark all as saved
                unsavedMessages.forEach((msg) => messageState.savedMessageIds.push(msg.id));
            } else {
                // Even if no new messages, mark execution as completed
                await saveThreadIncremental({
                    executionId,
                    threadId,
                    messages: [],
                    markCompleted: true
                });
            }

            logger.info("Agent completed task");

            await emitAgentExecutionCompleted({
                executionId,
                threadId,
                finalMessage: llmResponse.content,
                iterations: currentIterations
            });

            // End AGENT_ITERATION span on completion
            await endSpan({
                spanId: iterationSpanId,
                output: {
                    completed: true,
                    finalMessage: llmResponse.content
                },
                attributes: {
                    messageCount: messageState.messages.length
                }
            });

            // End AGENT_RUN span on successful completion
            if (agentRunSpanId) {
                await endSpan({
                    spanId: agentRunSpanId,
                    output: {
                        success: true,
                        finalMessage: llmResponse.content,
                        iterations: currentIterations
                    },
                    attributes: {
                        totalIterations: currentIterations,
                        messageCount: messageState.messages.length
                    }
                });
            }

            return {
                success: true,
                serializedThread: messageState,
                iterations: currentIterations,
                finalMessage: llmResponse.content
            };
        }

        // Execute tool calls
        for (const toolCall of llmResponse.tool_calls!) {
            logger.info("Executing tool", { toolName: toolCall.name });

            await emitAgentToolCallStarted({
                executionId,
                threadId,
                toolName: toolCall.name,
                arguments: toolCall.arguments
            });

            // Create TOOL_EXECUTION span for this tool call
            const toolContext = await createSpan({
                traceId: executionId,
                parentSpanId: iterationSpanId,
                name: `Tool: ${toolCall.name}`,
                spanType: SpanType.TOOL_EXECUTION,
                entityId: agentId,
                input: {
                    toolName: toolCall.name,
                    arguments: toolCall.arguments
                },
                attributes: {
                    toolName: toolCall.name,
                    toolCallId: toolCall.id
                }
            });
            const toolSpanId = toolContext.spanId;

            try {
                const toolResult = await executeToolCall({
                    executionId,
                    toolCall,
                    availableTools: agent.available_tools,
                    userId,
                    agentId
                });

                // Add tool result to thread messages
                const toolMessage: ThreadMessage = {
                    id: `tool-${Date.now()}-${toolCall.id}`,
                    role: "tool",
                    content: JSON.stringify(toolResult),
                    tool_name: toolCall.name,
                    tool_call_id: toolCall.id,
                    timestamp: new Date()
                };
                messageState.messages.push(toolMessage);

                // End TOOL_EXECUTION span with success
                await endSpan({
                    spanId: toolSpanId,
                    output: toolResult,
                    attributes: {
                        success: true,
                        resultLength: JSON.stringify(toolResult).length
                    }
                });

                await emitAgentToolCallCompleted({
                    executionId,
                    threadId,
                    toolName: toolCall.name,
                    result: toolResult
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown tool error";
                logger.error(
                    "Tool execution failed",
                    error instanceof Error ? error : new Error(errorMessage),
                    { toolName: toolCall.name }
                );

                // Track failed tool to prevent retry loops
                failedToolNames.add(toolCall.name);

                // Add error result to thread messages
                const toolMessage: ThreadMessage = {
                    id: `tool-${Date.now()}-${toolCall.id}`,
                    role: "tool",
                    content: JSON.stringify({ error: errorMessage }),
                    tool_name: toolCall.name,
                    tool_call_id: toolCall.id,
                    timestamp: new Date()
                };
                messageState.messages.push(toolMessage);

                // End TOOL_EXECUTION span with error
                await endSpan({
                    spanId: toolSpanId,
                    error: error instanceof Error ? error : new Error(errorMessage),
                    attributes: {
                        success: false
                    }
                });

                await emitAgentToolCallFailed({
                    executionId,
                    threadId,
                    toolName: toolCall.name,
                    error: errorMessage
                });
            }
        }

        // Save unsaved messages periodically (every 10 iterations)
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

        // End AGENT_ITERATION span on successful iteration
        await endSpan({
            spanId: iterationSpanId,
            output: {
                hasToolCalls: !!(llmResponse.tool_calls && llmResponse.tool_calls.length > 0),
                toolCallCount: llmResponse.tool_calls?.length || 0
            },
            attributes: {
                messageCount: messageState.messages.length
            }
        });

        currentIterations++;
    }

    // Max iterations reached
    const maxIterError = `Max iterations (${maxIterations}) reached`;
    logger.info("Max iterations reached", { maxIterations });

    // Save any unsaved messages
    const unsavedMessages = getUnsavedMessages(messageState);
    if (unsavedMessages.length > 0) {
        await saveThreadIncremental({
            executionId,
            threadId,
            messages: unsavedMessages
        });
    }

    await emitAgentExecutionFailed({
        executionId,
        threadId,
        error: maxIterError
    });

    // End AGENT_RUN span with error
    if (agentRunSpanId) {
        await endSpan({
            spanId: agentRunSpanId,
            error: new Error(maxIterError),
            attributes: {
                totalIterations: currentIterations,
                failureReason: "max_iterations_reached"
            }
        });
    }

    return {
        success: false,
        serializedThread: messageState,
        iterations: currentIterations,
        error: maxIterError
    };
}

/**
 * Get unsaved messages from message state
 */
function getUnsavedMessages(state: WorkflowMessageState): ThreadMessage[] {
    const savedIds = new Set(state.savedMessageIds);
    return state.messages.filter((msg) => !savedIds.has(msg.id));
}

/**
 * Summarize message state to keep only recent messages
 * This prevents history from growing too large for continue-as-new
 */
function summarizeMessageState(state: WorkflowMessageState, maxMessages: number): SerializedThread {
    if (state.messages.length <= maxMessages) {
        return {
            messages: state.messages,
            savedMessageIds: state.savedMessageIds,
            metadata: state.metadata
        };
    }

    // Always keep the system prompt (first message)
    const systemPrompt = state.messages.find((msg) => msg.role === "system");

    // Keep the last N messages
    const recentMessages = state.messages.slice(-(maxMessages - 1));

    // Combine
    const summarizedMessages = systemPrompt
        ? [systemPrompt, ...recentMessages.filter((msg) => msg.id !== systemPrompt.id)]
        : recentMessages;

    // Keep only saved IDs that are still in the messages
    const keptMessageIds = new Set(summarizedMessages.map((m) => m.id));
    const savedIds = state.savedMessageIds.filter((id) => keptMessageIds.has(id));

    return {
        messages: summarizedMessages,
        savedMessageIds: savedIds,
        metadata: state.metadata
    };
}
