/**
 * LLM Node Execution
 *
 * Complete execution logic and handler for LLM/text generation nodes.
 * Supports multiple providers: OpenAI, Anthropic, Google, Cohere, HuggingFace.
 *
 * Uses the unified @flowmaestro/ai SDK for all provider integrations.
 */

import type { AIProvider } from "@flowmaestro/ai-sdk";
import type { JsonObject } from "@flowmaestro/shared";
import { getAIClient } from "../../../../../core/ai";
import {
    HEARTBEAT_INTERVALS,
    withHeartbeat,
    llmCircuitBreakers,
    LLMNodeConfigSchema,
    validateOrThrow,
    type LLMProvider,
    type LLMNodeConfig
} from "../../../../core";
import { activityLogger, interpolateVariables } from "../../../../core";
import { getExecutionContext } from "../../../../core/services/context";
import {
    BaseNodeHandler,
    type NodeHandlerInput,
    type NodeHandlerOutput,
    type TokenUsage
} from "../../types";

// ============================================================================
// TYPES
// ============================================================================

export type { LLMNodeConfig };

export interface LLMExecutionCallbacks {
    onToken?: (token: string) => void;
    onComplete?: (response: string) => void;
    onError?: (error: Error) => void;
    /** Called when extended thinking starts */
    onThinkingStart?: () => void;
    /** Called for each thinking token (for streaming thinking content) */
    onThinkingToken?: (token: string) => void;
    /** Called when extended thinking completes */
    onThinkingComplete?: (thinkingContent: string) => void;
}

export interface LLMNodeResult {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        /** Tokens used for extended thinking (if enabled) */
        thinkingTokens?: number;
    };
    model: string;
    provider: string;
    /** Extended thinking content (if thinking was enabled) */
    thinking?: string;
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute LLM node - calls various LLM providers via unified AI SDK.
 * Uses heartbeats to keep Temporal informed during long-running LLM calls.
 */
export async function executeLLMNode(
    config: unknown,
    context: JsonObject,
    callbacks?: LLMExecutionCallbacks
): Promise<JsonObject> {
    const validatedConfig = validateOrThrow(LLMNodeConfigSchema, config, "LLM");

    const systemPrompt = validatedConfig.systemPrompt
        ? interpolateVariables(validatedConfig.systemPrompt, context)
        : undefined;
    const userPrompt = interpolateVariables(validatedConfig.prompt, context);

    activityLogger.info("Calling LLM provider via unified AI SDK", {
        provider: validatedConfig.provider,
        model: validatedConfig.model,
        promptLength: userPrompt.length,
        streaming: callbacks?.onToken ? "enabled" : "disabled",
        thinkingEnabled: validatedConfig.enableThinking
    });

    const heartbeatInterval = callbacks?.onToken
        ? HEARTBEAT_INTERVALS.STREAMING
        : HEARTBEAT_INTERVALS.DEFAULT;

    const result = await withHeartbeat(
        "llm",
        async (heartbeat) => {
            heartbeat.update({
                step: "calling_provider",
                provider: validatedConfig.provider,
                model: validatedConfig.model
            });

            const circuitBreaker = llmCircuitBreakers[validatedConfig.provider as LLMProvider];

            const executeWithCircuitBreaker = async (
                fn: () => Promise<LLMNodeResult>
            ): Promise<LLMNodeResult> => {
                if (circuitBreaker) {
                    return circuitBreaker.execute(fn);
                }
                return fn();
            };

            const llmResult = await executeWithCircuitBreaker(() =>
                executeWithUnifiedSDK(validatedConfig, systemPrompt, userPrompt, callbacks)
            );

            heartbeat.update({
                step: "completed",
                percentComplete: 100,
                responseLength: llmResult.text.length
            });

            return llmResult;
        },
        heartbeatInterval
    );

    if (validatedConfig.outputVariable) {
        return { [validatedConfig.outputVariable]: result } as unknown as JsonObject;
    }

    return result as unknown as JsonObject;
}

/**
 * Execute LLM call using the unified AI SDK
 */
async function executeWithUnifiedSDK(
    config: LLMNodeConfig,
    systemPrompt: string | undefined,
    userPrompt: string,
    callbacks?: LLMExecutionCallbacks
): Promise<LLMNodeResult> {
    const ai = getAIClient();
    const provider = config.provider as AIProvider;

    // Build the request
    const request = {
        provider,
        model: config.model,
        systemPrompt,
        prompt: userPrompt,
        maxTokens: config.maxTokens ?? 1000,
        temperature: config.temperature ?? 0.7,
        topP: config.topP ?? 1,
        thinking: config.enableThinking
            ? {
                  enabled: true,
                  budgetTokens: config.thinkingBudget ?? 4096
              }
            : undefined,
        connectionId: config.connectionId
    };

    // Streaming execution
    if (callbacks?.onToken) {
        const response = await ai.text.completeWithCallbacks(request, {
            onToken: callbacks.onToken,
            onComplete: (response) => {
                callbacks.onComplete?.(response.text);
            },
            onError: callbacks.onError,
            onThinkingStart: callbacks.onThinkingStart,
            onThinkingToken: callbacks.onThinkingToken,
            onThinkingComplete: callbacks.onThinkingComplete
        });

        activityLogger.info("LLM streaming response completed via unified SDK", {
            provider: config.provider,
            model: config.model,
            responseLength: response.text.length,
            thinkingLength: response.thinking?.length ?? 0
        });

        return {
            text: response.text,
            thinking: response.thinking,
            usage: response.metadata.usage
                ? {
                      promptTokens: response.metadata.usage.promptTokens ?? 0,
                      completionTokens: response.metadata.usage.completionTokens ?? 0,
                      totalTokens: response.metadata.usage.totalTokens ?? 0,
                      thinkingTokens: response.metadata.usage.thinkingTokens
                  }
                : undefined,
            model: config.model,
            provider: config.provider
        };
    }

    // Non-streaming execution
    const response = await ai.text.complete(request);

    activityLogger.info("LLM response completed via unified SDK", {
        provider: config.provider,
        model: config.model,
        responseLength: response.text.length,
        thinkingLength: response.thinking?.length ?? 0,
        totalTokens: response.metadata.usage?.totalTokens
    });

    return {
        text: response.text,
        thinking: response.thinking,
        usage: response.metadata.usage
            ? {
                  promptTokens: response.metadata.usage.promptTokens ?? 0,
                  completionTokens: response.metadata.usage.completionTokens ?? 0,
                  totalTokens: response.metadata.usage.totalTokens ?? 0,
                  thinkingTokens: response.metadata.usage.thinkingTokens
              }
            : undefined,
        model: config.model,
        provider: config.provider
    };
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for LLM node type.
 */
export class LLMNodeHandler extends BaseNodeHandler {
    readonly name = "LLMNodeHandler";
    readonly supportedNodeTypes = ["llm"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const llmResult = await executeLLMNode(
            input.nodeConfig as unknown as LLMNodeConfig,
            context
        );

        let tokenUsage: TokenUsage | undefined;

        if ("usage" in llmResult && llmResult.usage) {
            const usage = llmResult.usage as {
                promptTokens?: number;
                completionTokens?: number;
                totalTokens?: number;
            };
            tokenUsage = {
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                totalTokens: usage.totalTokens,
                model: String(llmResult.model || ""),
                provider: String(llmResult.provider || "")
            };
        }

        return this.success(
            llmResult as unknown as JsonObject,
            {},
            {
                durationMs: Date.now() - startTime,
                tokenUsage
            }
        );
    }
}

/**
 * Factory function for creating LLM handler.
 */
export function createLLMNodeHandler(): LLMNodeHandler {
    return new LLMNodeHandler();
}
