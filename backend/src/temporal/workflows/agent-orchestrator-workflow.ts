/**
 * Agent Orchestrator Workflow - With ConversationManager
 * Refactored to use ConversationManager for better message handling
 */

import {
    proxyActivities,
    condition,
    defineSignal,
    setHandler,
    continueAsNew
} from "@temporalio/workflow";
import type { JsonObject } from "@flowmaestro/shared";
import { SpanType } from "../../core/tracing/span-types";
import type { SerializedConversation } from "../../services/conversation/ConversationManager";
import type { Tool } from "../../storage/models/Agent";
import type { ConversationMessage, ToolCall } from "../../storage/models/AgentExecution";
import type * as activities from "../activities";

// Proxy activities
const {
    getAgentConfig,
    callLLM,
    executeToolCall,
    saveConversationIncremental,
    validateInput,
    validateOutput,
    createSpan,
    endSpan
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
    // For continue-as-new with ConversationManager
    serializedConversation?: SerializedConversation;
    iterations?: number;
    // Previous conversation history from thread (for context continuity)
    previousConversationHistory?: Array<{
        id: string;
        role: string;
        content: string;
        tool_calls?: unknown[];
        tool_name?: string;
        tool_call_id?: string;
        timestamp: Date | string;
    }>;
}

export interface AgentOrchestratorResult {
    success: boolean;
    serializedConversation: SerializedConversation;
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
 * Message state for workflow (deterministic, plain objects only)
 */
interface WorkflowMessageState {
    messages: ConversationMessage[];
    savedMessageIds: string[];
    metadata: JsonObject;
}

/**
 * Agent Orchestrator Workflow V2 with ConversationManager
 *
 * Improvements over V1:
 * - Uses ConversationManager pattern for message handling
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
        serializedConversation,
        iterations = 0,
        previousConversationHistory
    } = input;

    console.log(
        `[Agent] Starting orchestrator for execution ${executionId} in thread ${threadId}, iteration ${iterations}`
    );

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

    if (serializedConversation) {
        // Restoring from continue-as-new
        messageState = {
            messages: serializedConversation.messages,
            savedMessageIds: serializedConversation.savedMessageIds,
            metadata: serializedConversation.metadata
        };
    } else {
        // First run - initialize
        messageState = {
            messages: [],
            savedMessageIds: [],
            metadata: {}
        };

        // Add system prompt
        const systemMessage: ConversationMessage = {
            id: `sys-${Date.now()}`,
            role: "system",
            content: agent.system_prompt,
            timestamp: new Date()
        };
        messageState.messages.push(systemMessage);
        messageState.savedMessageIds.push(systemMessage.id); // System message is "saved"

        // Load previous conversation history if provided (for continuing conversations)
        if (previousConversationHistory && previousConversationHistory.length > 0) {
            // Convert previous messages to ConversationMessage format
            // Include tool messages - LLM needs them for context (they contain tool results)
            const previousMessages = previousConversationHistory.map((msg) => ({
                id: msg.id,
                role: msg.role as ConversationMessage["role"],
                content: msg.content,
                tool_calls: msg.tool_calls as ToolCall[] | undefined,
                tool_name: msg.tool_name,
                tool_call_id: msg.tool_call_id,
                timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
            }));

            // Add previous messages to conversation (excluding system message which we already added)
            const nonSystemMessages = previousMessages.filter((msg) => msg.role !== "system");
            messageState.messages.push(...nonSystemMessages);
            // Mark all previous messages as "saved" since they're already persisted
            nonSystemMessages.forEach((msg) => {
                messageState.savedMessageIds.push(msg.id);
            });
        }

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
            const userMessage: ConversationMessage = {
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
        console.log(`[Agent] Received user message for execution ${executionId}`);
        pendingUserMessage = message;
    });

    const maxIterations = agent.max_iterations || 100;
    let currentIterations = iterations;
    const CONTINUE_AS_NEW_THRESHOLD = 50;

    // Main agent loop (ReAct pattern)
    while (currentIterations < maxIterations) {
        console.log(`[Agent] Iteration ${currentIterations}/${maxIterations}`);

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
            console.log(`[Agent] Continue-as-new at iteration ${currentIterations}`);

            // Save incremental messages before continue-as-new
            const unsavedMessages = getUnsavedMessages(messageState);
            if (unsavedMessages.length > 0) {
                await saveConversationIncremental({
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
                serializedConversation: summarizedState,
                iterations: currentIterations
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

        // Call LLM with conversation history and available tools
        let llmResponse: LLMResponse;
        try {
            llmResponse = await callLLM({
                model: agent.model,
                provider: agent.provider,
                connectionId: agent.connection_id,
                messages: messageState.messages,
                tools: agent.available_tools,
                temperature: agent.temperature,
                maxTokens: agent.max_tokens,
                executionId: input.executionId
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
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown LLM error";
            console.error(`[Agent] LLM call failed: ${errorMessage}`);

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
                serializedConversation: messageState,
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
        const assistantMessage: ConversationMessage = {
            id: `asst-${Date.now()}-${currentIterations}`,
            role: "assistant",
            content: outputSafetyResult.content,
            tool_calls: llmResponse.tool_calls,
            timestamp: new Date()
        };
        messageState.messages.push(assistantMessage);

        // Emit message event
        await emitAgentMessage({
            executionId,
            threadId,
            message: assistantMessage
        });

        // Check if agent is done (no tool calls and has final answer)
        const hasToolCalls = llmResponse.tool_calls && llmResponse.tool_calls.length > 0;

        if (!hasToolCalls) {
            // Check if agent needs user input
            if (llmResponse.requiresUserInput) {
                console.log("[Agent] Waiting for user input");

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
                        serializedConversation: messageState,
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
                        serializedConversation: messageState,
                        iterations: currentIterations,
                        error: `User message blocked by safety check: ${blockReasons}`
                    };
                }

                // Add user message to history (with potentially redacted content)
                const userMessage: ConversationMessage = {
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
                await saveConversationIncremental({
                    executionId,
                    threadId,
                    messages: unsavedMessages,
                    markCompleted: true // Mark execution as completed after saving
                });
                // Mark all as saved
                unsavedMessages.forEach((msg) => messageState.savedMessageIds.push(msg.id));
            } else {
                // Even if no new messages, mark execution as completed
                await saveConversationIncremental({
                    executionId,
                    threadId,
                    messages: [],
                    markCompleted: true
                });
            }

            console.log("[Agent] Agent completed task");

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
                serializedConversation: messageState,
                iterations: currentIterations,
                finalMessage: llmResponse.content
            };
        }

        // Execute tool calls
        for (const toolCall of llmResponse.tool_calls!) {
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

                // Add tool result to conversation (for LLM, not shown to users)
                const toolMessage: ConversationMessage = {
                    id: `tool-${Date.now()}-${toolCall.id}`,
                    role: "tool",
                    content: JSON.stringify(toolResult), // Raw JSON for LLM
                    tool_name: toolCall.name,
                    tool_call_id: toolCall.id,
                    timestamp: new Date()
                };
                messageState.messages.push(toolMessage);
                // Note: We don't emit tool messages to frontend to avoid showing raw JSON

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
                console.error(`[Agent] Tool ${toolCall.name} failed: ${errorMessage}`);

                // Add error result to conversation (for LLM, not shown to users)
                const toolMessage: ConversationMessage = {
                    id: `tool-${Date.now()}-${toolCall.id}`,
                    role: "tool",
                    content: JSON.stringify({ success: false, error: errorMessage }), // Raw JSON for LLM
                    tool_name: toolCall.name,
                    tool_call_id: toolCall.id,
                    timestamp: new Date()
                };
                messageState.messages.push(toolMessage);
                // Note: We don't emit tool messages to frontend to avoid showing raw JSON

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
                await saveConversationIncremental({
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
    console.log(`[Agent] ${maxIterError}`);

    // Save any unsaved messages
    const unsavedMessages = getUnsavedMessages(messageState);
    if (unsavedMessages.length > 0) {
        await saveConversationIncremental({
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
        serializedConversation: messageState,
        iterations: currentIterations,
        error: maxIterError
    };
}

/**
 * Get unsaved messages from message state
 */
function getUnsavedMessages(state: WorkflowMessageState): ConversationMessage[] {
    const savedIds = new Set(state.savedMessageIds);
    return state.messages.filter((msg) => !savedIds.has(msg.id));
}

/**
 * Summarize message state to keep only recent messages
 * This prevents history from growing too large for continue-as-new
 */
function summarizeMessageState(
    state: WorkflowMessageState,
    maxMessages: number
): SerializedConversation {
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
