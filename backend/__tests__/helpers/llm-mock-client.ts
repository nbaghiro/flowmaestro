/**
 * LLM Mock Client for Agent Testing
 *
 * Provides deterministic LLM responses for testing agent workflows.
 * Supports matching by message content, tool calls, iteration number, etc.
 */

import type { JsonObject } from "@flowmaestro/shared";
import type { Tool } from "../../src/storage/models/Agent";
import type { ThreadMessage, ToolCall } from "../../src/storage/models/AgentExecution";
import type { LLMResponse } from "../../src/temporal/workflows/agent-orchestrator";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for a mock LLM response
 */
export interface LLMMockConfig {
    /** Match if last user message contains this string */
    messageContains?: string;
    /** Match if a specific tool was just called */
    toolName?: string;
    /** Match specific iteration number (0-indexed) */
    iteration?: number;
    /** Match based on custom predicate */
    match?: (messages: ThreadMessage[], tools: Tool[], callCount: number) => boolean;
    /** The response to return */
    response: LLMMockResponse;
}

/**
 * Mock LLM response configuration
 */
export interface LLMMockResponse {
    /** Text content of the response */
    content?: string;
    /** Tool calls to make */
    tool_calls?: ToolCall[];
    /** Whether this signals completion (no tool calls, final response) */
    isComplete?: boolean;
    /** Whether user input is required */
    requiresUserInput?: boolean;
    /** Token usage for cost tracking */
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens?: number;
    };
}

/**
 * Mock client that returns configured LLM responses
 */
export interface LLMMockClient {
    getResponse: (messages: ThreadMessage[], tools: Tool[]) => LLMResponse;
    getCallCount: () => number;
    reset: () => void;
}

// ============================================================================
// MOCK CLIENT FACTORY
// ============================================================================

/**
 * Create an LLM mock client with configured responses
 *
 * @param configs - Array of mock configurations to use
 * @returns LLMMockClient instance
 */
export function createLLMMockClient(configs: LLMMockConfig[]): LLMMockClient {
    let callCount = 0;
    // Queue of configs to consume in order (for configs without specific matchers)
    const responseQueue = [...configs];
    // Original configs for reference
    const allConfigs = [...configs];

    return {
        getResponse: (messages: ThreadMessage[], tools: Tool[]): LLMResponse => {
            const currentCall = callCount;
            callCount++;

            // Find matching config - prioritize specific matchers over queue
            let matchedConfig: LLMMockConfig | undefined;
            let matchedIndex = -1;

            // First, check for iteration-specific configs
            for (let i = 0; i < allConfigs.length; i++) {
                const config = allConfigs[i];
                if (config.iteration !== undefined && config.iteration === currentCall) {
                    matchedConfig = config;
                    break;
                }
            }

            // If no iteration match, check for custom/content matchers
            if (!matchedConfig) {
                for (let i = 0; i < allConfigs.length; i++) {
                    const config = allConfigs[i];

                    // Check custom match predicate
                    if (config.match && config.match(messages, tools, currentCall)) {
                        matchedConfig = config;
                        break;
                    }

                    // Check message contains
                    if (config.messageContains) {
                        const lastUserMessage = [...messages]
                            .reverse()
                            .find((m) => m.role === "user");
                        if (lastUserMessage?.content.includes(config.messageContains)) {
                            matchedConfig = config;
                            break;
                        }
                    }

                    // Check tool name (if last message was a tool response)
                    if (config.toolName) {
                        const lastToolMessage = [...messages]
                            .reverse()
                            .find((m) => m.role === "tool");
                        if (lastToolMessage?.tool_name === config.toolName) {
                            matchedConfig = config;
                            break;
                        }
                    }
                }
            }

            // If no specific match, consume from queue in order
            if (!matchedConfig && responseQueue.length > 0) {
                // Find next config in queue that doesn't have specific matchers
                matchedIndex = responseQueue.findIndex(
                    (c) =>
                        c.iteration === undefined &&
                        c.match === undefined &&
                        c.messageContains === undefined &&
                        c.toolName === undefined
                );

                if (matchedIndex !== -1) {
                    matchedConfig = responseQueue[matchedIndex];
                    // Remove from queue so it's not reused
                    responseQueue.splice(matchedIndex, 1);
                } else {
                    // All remaining configs have matchers, just take the first one
                    matchedConfig = responseQueue.shift();
                }
            }

            if (!matchedConfig) {
                // Return default completion response when queue is empty
                return {
                    content: "I don't have a configured response for this input.",
                    isComplete: true,
                    usage: {
                        promptTokens: 100,
                        completionTokens: 20,
                        totalTokens: 120
                    }
                };
            }

            return buildLLMResponse(matchedConfig.response);
        },

        getCallCount: () => callCount,

        reset: () => {
            callCount = 0;
            responseQueue.length = 0;
            responseQueue.push(...configs);
        }
    };
}

/**
 * Build LLMResponse from mock config
 */
function buildLLMResponse(config: LLMMockResponse): LLMResponse {
    const usage = config.usage || {
        promptTokens: 150,
        completionTokens: 50,
        totalTokens: 200
    };

    return {
        content: config.content || "",
        tool_calls: config.tool_calls,
        isComplete: config.isComplete ?? !config.tool_calls?.length,
        requiresUserInput: config.requiresUserInput,
        usage: {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens ?? usage.promptTokens + usage.completionTokens
        }
    };
}

// ============================================================================
// RESPONSE FACTORIES
// ============================================================================

/**
 * Create a simple chat response (no tool calls, completes conversation)
 */
export function createSimpleChatResponse(content: string): LLMMockConfig {
    return {
        response: {
            content,
            isComplete: true,
            usage: {
                promptTokens: 100,
                completionTokens: content.length
            }
        }
    };
}

/**
 * Create a completion response (final answer)
 */
export function createCompletionResponse(content: string): LLMMockConfig {
    return {
        response: {
            content,
            isComplete: true,
            usage: {
                promptTokens: 150,
                completionTokens: content.length
            }
        }
    };
}

/**
 * Create a response with a single tool call
 */
export function createToolCallResponse(
    toolName: string,
    args: JsonObject,
    options?: { thinking?: string }
): LLMMockConfig {
    return {
        response: {
            content: options?.thinking || `I'll use the ${toolName} tool.`,
            tool_calls: [
                {
                    id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: toolName,
                    arguments: args
                }
            ],
            isComplete: false,
            usage: {
                promptTokens: 200,
                completionTokens: 100
            }
        }
    };
}

/**
 * Create a response with multiple parallel tool calls
 */
export function createMultiToolResponse(
    calls: Array<{ name: string; args: JsonObject }>,
    options?: { thinking?: string }
): LLMMockConfig {
    return {
        response: {
            content: options?.thinking || "I'll use multiple tools to help with this.",
            tool_calls: calls.map((call) => ({
                id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: call.name,
                arguments: call.args
            })),
            isComplete: false,
            usage: {
                promptTokens: 250,
                completionTokens: 150
            }
        }
    };
}

/**
 * Create a response that asks for user input
 */
export function createUserInputRequest(prompt: string): LLMMockConfig {
    return {
        response: {
            content: prompt,
            requiresUserInput: true,
            isComplete: false,
            usage: {
                promptTokens: 100,
                completionTokens: prompt.length
            }
        }
    };
}

/**
 * Create a response matched to a specific iteration
 */
export function createIterationResponse(
    iteration: number,
    response: LLMMockResponse
): LLMMockConfig {
    return {
        iteration,
        response
    };
}

/**
 * Create a response that matches when a message contains specific text
 */
export function createMessageMatchResponse(
    contains: string,
    response: LLMMockResponse
): LLMMockConfig {
    return {
        messageContains: contains,
        response
    };
}

/**
 * Create a response that follows a specific tool call
 */
export function createToolFollowupResponse(
    toolName: string,
    response: LLMMockResponse
): LLMMockConfig {
    return {
        toolName,
        response
    };
}

/**
 * Create a response using a custom matcher
 */
export function createCustomMatchResponse(
    match: (messages: ThreadMessage[], tools: Tool[], callCount: number) => boolean,
    response: LLMMockResponse
): LLMMockConfig {
    return {
        match,
        response
    };
}

// ============================================================================
// RESPONSE SEQUENCES
// ============================================================================

/**
 * Create a sequence of responses for a multi-turn conversation
 * Each response is matched to its iteration number
 */
export function createConversationSequence(
    responses: Array<string | LLMMockResponse>
): LLMMockConfig[] {
    return responses.map((response, index) => {
        if (typeof response === "string") {
            return createIterationResponse(index, {
                content: response,
                isComplete: index === responses.length - 1
            });
        }
        return createIterationResponse(index, response);
    });
}

/**
 * Create a tool-use sequence: call tool, then complete with result
 */
export function createToolSequence(
    toolName: string,
    toolArgs: JsonObject,
    finalResponse: string
): LLMMockConfig[] {
    return [
        createIterationResponse(0, {
            content: `I'll use ${toolName} to help with this.`,
            tool_calls: [
                {
                    id: `call-${Date.now()}`,
                    name: toolName,
                    arguments: toolArgs
                }
            ],
            isComplete: false
        }),
        createIterationResponse(1, {
            content: finalResponse,
            isComplete: true
        })
    ];
}

/**
 * Create a multi-tool sequence with chained calls
 */
export function createChainedToolSequence(
    tools: Array<{ name: string; args: JsonObject; thinking?: string }>,
    finalResponse: string
): LLMMockConfig[] {
    const configs: LLMMockConfig[] = [];

    tools.forEach((tool, index) => {
        configs.push(
            createIterationResponse(index, {
                content: tool.thinking || `Using ${tool.name}...`,
                tool_calls: [
                    {
                        id: `call-${Date.now()}-${index}`,
                        name: tool.name,
                        arguments: tool.args
                    }
                ],
                isComplete: false
            })
        );
    });

    configs.push(
        createIterationResponse(tools.length, {
            content: finalResponse,
            isComplete: true
        })
    );

    return configs;
}

// ============================================================================
// PRESET SCENARIOS
// ============================================================================

/**
 * Preset: Simple Q&A (no tools)
 */
export function presetSimpleQA(answer: string): LLMMockConfig[] {
    return [createCompletionResponse(answer)];
}

/**
 * Preset: Slack message scenario
 */
export function presetSlackMessage(channel: string, message: string): LLMMockConfig[] {
    return createToolSequence(
        "slack_send_message",
        { channel, text: message },
        `I've sent the message "${message}" to the ${channel} channel.`
    );
}

/**
 * Preset: Search and respond scenario
 */
export function presetSearchAndRespond(
    searchQuery: string,
    _searchResults: string,
    finalAnswer: string
): LLMMockConfig[] {
    return [
        createToolCallResponse("web_search", { query: searchQuery }),
        createToolFollowupResponse("web_search", {
            content: finalAnswer,
            isComplete: true
        })
    ];
}

/**
 * Preset: Knowledge base lookup scenario
 */
export function presetKBLookup(query: string, finalAnswer: string): LLMMockConfig[] {
    return createToolSequence("search_knowledge_base", { query }, finalAnswer);
}
