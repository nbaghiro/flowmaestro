/**
 * LLM Node Execution
 *
 * Complete execution logic and handler for LLM/text generation nodes.
 * Supports multiple providers: OpenAI, Anthropic, Google, Cohere, HuggingFace.
 */

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CohereClient } from "cohere-ai";
import OpenAI from "openai";
import type { JsonObject } from "@flowmaestro/shared";
import { ConnectionRepository } from "../../../../../storage/repositories/ConnectionRepository";
import {
    HEARTBEAT_INTERVALS,
    ConfigurationError,
    NotFoundError,
    ValidationError,
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
import type { ApiKeyData } from "../../../../../storage/models/Connection";

const connectionRepository = new ConnectionRepository();

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
// RETRY LOGIC
// ============================================================================

const RETRY_CONFIG = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
};

function isRetryableError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
        return false;
    }

    const err = error as Record<string, unknown>;
    const retryableStatusCodes = [429, 503, 529];

    if (typeof err.status === "number" && retryableStatusCodes.includes(err.status)) {
        return true;
    }

    if (
        typeof err.type === "string" &&
        ["overloaded_error", "rate_limit_error"].includes(err.type)
    ) {
        return true;
    }

    if (typeof err.message === "string") {
        const message = err.message.toLowerCase();
        if (
            message.includes("overloaded") ||
            message.includes("rate limit") ||
            message.includes("too many requests") ||
            (message.includes("model") && message.includes("loading")) ||
            message.includes("is currently loading")
        ) {
            return true;
        }
    }

    return false;
}

async function withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: unknown) {
            lastError = error;

            if (!isRetryableError(error)) {
                throw error;
            }

            if (attempt >= RETRY_CONFIG.maxRetries) {
                activityLogger.error(
                    "Max retries exceeded",
                    error instanceof Error ? error : new Error(String(error)),
                    { context, maxRetries: RETRY_CONFIG.maxRetries }
                );
                throw error;
            }

            const delay = Math.min(
                RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
                RETRY_CONFIG.maxDelayMs
            );

            const err = error as Record<string, unknown>;
            const errorCode = err.status || err.type || "unknown";
            const errorMessage = typeof err.message === "string" ? err.message : "Unknown error";

            activityLogger.warn("Retryable error, retrying", {
                context,
                errorCode,
                errorMessage,
                delayMs: delay,
                attempt: attempt + 1,
                maxRetries: RETRY_CONFIG.maxRetries
            });

            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

// ============================================================================
// API KEY HELPER
// ============================================================================

async function getApiKey(
    connectionId: string | undefined,
    provider: string,
    envVarName: string
): Promise<string> {
    if (connectionId) {
        const connection = await connectionRepository.findByIdWithData(connectionId);
        if (!connection) {
            throw new NotFoundError("Connection", connectionId);
        }
        if (connection.provider !== provider) {
            throw new ValidationError(
                `expected ${provider}, got ${connection.provider}`,
                "provider"
            );
        }
        if (connection.status !== "active") {
            throw new ValidationError(
                `Connection is not active (status: ${connection.status})`,
                "status"
            );
        }
        const data = connection.data as ApiKeyData;
        if (!data.api_key) {
            throw new ConfigurationError("API key not found in connection data", "api_key");
        }
        activityLogger.info("Using connection for API key", {
            connectionName: connection.name,
            connectionId: connection.id
        });
        return data.api_key;
    }

    const apiKey = process.env[envVarName];
    if (!apiKey) {
        throw new ConfigurationError(
            `No connection provided and ${envVarName} environment variable is not set. ` +
                `Please add a connection in the Connections page or set the ${envVarName} environment variable.`,
            envVarName
        );
    }
    activityLogger.info("Using environment variable for API key", { envVarName });
    return apiKey;
}

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

async function executeOpenAI(
    config: LLMNodeConfig,
    systemPrompt: string | undefined,
    userPrompt: string,
    callbacks?: LLMExecutionCallbacks
): Promise<LLMNodeResult> {
    const apiKey = await getApiKey(config.connectionId, "openai", "OPENAI_API_KEY");
    const openai = new OpenAI({ apiKey });

    // Check if this is a reasoning model (o1, o3 series)
    const isReasoningModel = /^o[13](-preview|-mini)?$/.test(config.model);

    // For reasoning models: no system messages, merge into user message
    // For reasoning models: no temperature parameter
    const messages: Array<{ role: "system" | "user"; content: string }> = [];

    if (isReasoningModel) {
        // Merge system prompt into user message for o1/o3 models
        const combinedPrompt = systemPrompt
            ? `${systemPrompt}\n\n---\n\n${userPrompt}`
            : userPrompt;
        messages.push({ role: "user", content: combinedPrompt });
        activityLogger.info("Using reasoning model, merged system prompt into user message", {
            model: config.model
        });
    } else {
        if (systemPrompt) {
            messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: userPrompt });
    }

    return withRetry(async () => {
        if (callbacks?.onToken) {
            // Build stream params - reasoning models don't support temperature
            const streamParams: Parameters<typeof openai.chat.completions.create>[0] = {
                model: config.model,
                messages,
                max_tokens: config.maxTokens ?? 1000,
                stream: true
            };

            if (!isReasoningModel) {
                streamParams.temperature = config.temperature ?? 0.7;
                streamParams.top_p = config.topP ?? 1;
            }

            // Notify that reasoning is starting for o1/o3 models
            if (isReasoningModel && config.enableThinking) {
                callbacks.onThinkingStart?.();
            }

            const streamResponse = await openai.chat.completions.create(streamParams);
            // Type assertion for streaming response
            const stream =
                streamResponse as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;

            let fullContent = "";
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta?.content || "";
                if (delta) {
                    fullContent += delta;
                    callbacks.onToken(delta);
                }
            }

            // For reasoning models, notify thinking complete (reasoning happens internally)
            if (isReasoningModel && config.enableThinking) {
                callbacks.onThinkingComplete?.("(Reasoning completed internally by model)");
            }

            activityLogger.info("OpenAI streaming response completed", {
                responseLength: fullContent.length,
                isReasoningModel
            });

            return {
                text: fullContent,
                model: config.model,
                provider: "openai"
            };
        }

        // Non-streaming request
        const requestParams: Parameters<typeof openai.chat.completions.create>[0] = {
            model: config.model,
            messages,
            max_tokens: config.maxTokens ?? 1000
        };

        if (!isReasoningModel) {
            requestParams.temperature = config.temperature ?? 0.7;
            requestParams.top_p = config.topP ?? 1;
        }

        const rawResponse = await openai.chat.completions.create(requestParams);
        // Type assertion for non-streaming response
        const response = rawResponse as OpenAI.Chat.Completions.ChatCompletion;

        const text = response.choices[0]?.message?.content || "";
        const usage = response.usage;

        // Extract reasoning tokens for o1/o3 models if available
        let thinkingTokens: number | undefined;
        if (isReasoningModel && usage) {
            const completionDetails = (usage as unknown as Record<string, unknown>)
                .completion_tokens_details as { reasoning_tokens?: number } | undefined;
            thinkingTokens = completionDetails?.reasoning_tokens;
        }

        activityLogger.info("OpenAI response completed", {
            responseLength: text.length,
            totalTokens: usage?.total_tokens,
            reasoningTokens: thinkingTokens,
            isReasoningModel
        });

        return {
            text,
            usage: usage
                ? {
                      promptTokens: usage.prompt_tokens,
                      completionTokens: usage.completion_tokens,
                      totalTokens: usage.total_tokens,
                      thinkingTokens
                  }
                : undefined,
            model: config.model,
            provider: "openai"
        };
    }, `OpenAI ${config.model}`);
}

async function executeAnthropic(
    config: LLMNodeConfig,
    systemPrompt: string | undefined,
    userPrompt: string,
    callbacks?: LLMExecutionCallbacks
): Promise<LLMNodeResult> {
    const apiKey = await getApiKey(config.connectionId, "anthropic", "ANTHROPIC_API_KEY");
    const anthropic = new Anthropic({ apiKey });

    // Check if extended thinking is enabled and model supports it
    const useExtendedThinking = config.enableThinking && config.model.includes("claude-");
    const thinkingBudget = config.thinkingBudget ?? 4096;

    return withRetry(async () => {
        if (callbacks?.onToken) {
            // Build request params with optional extended thinking
            const streamParams: Parameters<typeof anthropic.messages.create>[0] = {
                model: config.model,
                max_tokens: config.maxTokens ?? 1000,
                system: systemPrompt,
                messages: [{ role: "user", content: userPrompt }],
                stream: true
            };

            // Add extended thinking if enabled (Claude 4+ models)
            if (useExtendedThinking) {
                // Extended thinking requires specific parameters
                // Note: temperature must not be set when using extended thinking
                (streamParams as unknown as Record<string, unknown>).thinking = {
                    type: "enabled",
                    budget_tokens: thinkingBudget
                };
                activityLogger.info("Extended thinking enabled for Anthropic", {
                    budgetTokens: thinkingBudget
                });
            } else {
                streamParams.temperature = config.temperature ?? 0.7;
            }

            const streamResponse = await anthropic.messages.create(streamParams);
            // Type assertion for streaming response
            const stream = streamResponse as AsyncIterable<Anthropic.MessageStreamEvent>;

            let fullContent = "";
            let thinkingContent = "";
            let isInThinkingBlock = false;

            for await (const chunk of stream) {
                // Handle thinking content blocks (Claude 4+ extended thinking)
                if (chunk.type === "content_block_start") {
                    const block = chunk.content_block as { type: string };
                    if (block.type === "thinking") {
                        isInThinkingBlock = true;
                        callbacks.onThinkingStart?.();
                    }
                } else if (chunk.type === "content_block_stop") {
                    if (isInThinkingBlock) {
                        isInThinkingBlock = false;
                        callbacks.onThinkingComplete?.(thinkingContent);
                    }
                } else if (chunk.type === "content_block_delta") {
                    if (isInThinkingBlock && chunk.delta.type === "thinking_delta") {
                        const delta = (chunk.delta as { thinking?: string }).thinking || "";
                        thinkingContent += delta;
                        callbacks.onThinkingToken?.(delta);
                    } else if (chunk.delta.type === "text_delta") {
                        const delta = chunk.delta.text;
                        fullContent += delta;
                        callbacks.onToken(delta);
                    }
                }
            }

            activityLogger.info("Anthropic streaming response completed", {
                responseLength: fullContent.length,
                thinkingLength: thinkingContent.length,
                extendedThinking: useExtendedThinking
            });

            return {
                text: fullContent,
                thinking: thinkingContent || undefined,
                model: config.model,
                provider: "anthropic"
            };
        }

        // Non-streaming request
        const requestParams: Parameters<typeof anthropic.messages.create>[0] = {
            model: config.model,
            max_tokens: config.maxTokens ?? 1000,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }]
        };

        if (useExtendedThinking) {
            (requestParams as unknown as Record<string, unknown>).thinking = {
                type: "enabled",
                budget_tokens: thinkingBudget
            };
        } else {
            requestParams.temperature = config.temperature ?? 0.7;
        }

        const rawResponse = await anthropic.messages.create(requestParams);
        // Type assertion for non-streaming response
        const response = rawResponse as Anthropic.Message;

        // Extract text and thinking content from response
        let text = "";
        let thinkingContent = "";

        for (const block of response.content) {
            if (block.type === "text") {
                text = block.text;
            } else if (block.type === "thinking") {
                thinkingContent = (block as { thinking?: string }).thinking || "";
            }
        }

        const usage = response.usage;

        activityLogger.info("Anthropic response completed", {
            responseLength: text.length,
            thinkingLength: thinkingContent.length,
            totalTokens: usage.input_tokens + usage.output_tokens,
            extendedThinking: useExtendedThinking
        });

        return {
            text,
            thinking: thinkingContent || undefined,
            usage: {
                promptTokens: usage.input_tokens,
                completionTokens: usage.output_tokens,
                totalTokens: usage.input_tokens + usage.output_tokens
            },
            model: config.model,
            provider: "anthropic"
        };
    }, `Anthropic ${config.model}`);
}

async function executeGoogle(
    config: LLMNodeConfig,
    systemPrompt: string | undefined,
    userPrompt: string,
    callbacks?: LLMExecutionCallbacks
): Promise<LLMNodeResult> {
    const apiKey = await getApiKey(config.connectionId, "google", "GOOGLE_API_KEY");
    const genAI = new GoogleGenerativeAI(apiKey);

    // Check if thinking is enabled and model supports it (Gemini 2.5+)
    const useThinking = config.enableThinking && config.model.includes("gemini-2.5");
    const thinkingBudget = config.thinkingBudget ?? 4096;

    // Build generation config with optional thinking
    const generationConfig: Record<string, unknown> = {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens ?? 1000,
        topP: config.topP ?? 1
    };

    // Add thinking config for Gemini 2.5+ models
    if (useThinking) {
        generationConfig.thinkingConfig = {
            thinkingBudget: thinkingBudget
        };
        activityLogger.info("Extended thinking enabled for Google Gemini", {
            budgetTokens: thinkingBudget
        });
    }

    const model = genAI.getGenerativeModel({
        model: config.model,
        generationConfig
    });

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;

    return withRetry(async () => {
        if (callbacks?.onToken) {
            // Notify thinking start for Gemini 2.5+ with thinking enabled
            if (useThinking) {
                callbacks.onThinkingStart?.();
            }

            const result = await model.generateContentStream(fullPrompt);

            let fullContent = "";
            let thinkingContent = "";

            for await (const chunk of result.stream) {
                const delta = chunk.text();
                fullContent += delta;
                callbacks.onToken(delta);

                // Check for thinking content in Gemini response (if available)
                const candidates = chunk.candidates;
                if (candidates?.[0]?.content?.parts) {
                    for (const part of candidates[0].content.parts) {
                        const partObj = part as { thought?: string };
                        if (partObj.thought) {
                            thinkingContent += partObj.thought;
                            callbacks.onThinkingToken?.(partObj.thought);
                        }
                    }
                }
            }

            if (useThinking) {
                callbacks.onThinkingComplete?.(thinkingContent || "(Thinking completed)");
            }

            activityLogger.info("Google streaming response completed", {
                responseLength: fullContent.length,
                thinkingLength: thinkingContent.length,
                useThinking
            });

            return {
                text: fullContent,
                thinking: thinkingContent || undefined,
                model: config.model,
                provider: "google"
            };
        }

        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        const text = response.text();

        // Extract thinking content from non-streaming response if available
        let thinkingContent = "";
        const candidates = response.candidates;
        if (candidates?.[0]?.content?.parts) {
            for (const part of candidates[0].content.parts) {
                const partObj = part as { thought?: string };
                if (partObj.thought) {
                    thinkingContent += partObj.thought;
                }
            }
        }

        activityLogger.info("Google response completed", {
            responseLength: text.length,
            thinkingLength: thinkingContent.length,
            useThinking
        });

        return {
            text,
            thinking: thinkingContent || undefined,
            model: config.model,
            provider: "google"
        };
    }, `Google ${config.model}`);
}

async function executeCohere(
    config: LLMNodeConfig,
    systemPrompt: string | undefined,
    userPrompt: string,
    callbacks?: LLMExecutionCallbacks
): Promise<LLMNodeResult> {
    const apiKey = await getApiKey(config.connectionId, "cohere", "COHERE_API_KEY");
    const cohere = new CohereClient({ token: apiKey });

    const chatOptions: {
        model: string;
        message: string;
        preamble?: string;
        temperature?: number;
        maxTokens?: number;
        p?: number;
    } = {
        model: config.model,
        message: userPrompt,
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens ?? 1000,
        p: config.topP ?? 1
    };

    if (systemPrompt) {
        chatOptions.preamble = systemPrompt;
    }

    return withRetry(async () => {
        if (callbacks?.onToken) {
            const stream = await cohere.chatStream(chatOptions);

            let fullContent = "";
            for await (const chunk of stream) {
                if (chunk.eventType === "text-generation") {
                    const delta = chunk.text;
                    fullContent += delta;
                    callbacks.onToken(delta);
                }
            }

            activityLogger.info("Cohere streaming response completed", {
                responseLength: fullContent.length
            });

            return {
                text: fullContent,
                model: config.model,
                provider: "cohere"
            };
        }

        const response = await cohere.chat(chatOptions);
        const text = response.text || "";

        activityLogger.info("Cohere response completed", { responseLength: text.length });

        return {
            text,
            model: config.model,
            provider: "cohere"
        };
    }, `Cohere ${config.model}`);
}

async function executeHuggingFace(
    config: LLMNodeConfig,
    systemPrompt: string | undefined,
    userPrompt: string,
    callbacks?: LLMExecutionCallbacks
): Promise<LLMNodeResult> {
    const apiKey = await getApiKey(config.connectionId, "huggingface", "HUGGINGFACE_API_KEY");

    const apiUrl = "https://router.huggingface.co/v1/chat/completions";

    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userPrompt });

    return withRetry(async () => {
        if (callbacks?.onToken) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000);

            try {
                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: config.model,
                        messages,
                        temperature: config.temperature ?? 0.7,
                        max_tokens: config.maxTokens ?? 1000,
                        top_p: config.topP ?? 1,
                        stream: true
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();

                    if (response.status === 503) {
                        throw new Error(
                            `Model ${config.model} is loading. This is retryable. Status: ${response.status}`
                        );
                    }

                    throw new Error(`HuggingFace API error (${response.status}): ${errorText}`);
                }

                const reader = response.body?.getReader();
                if (!reader) {
                    throw new Error("Response body is not readable");
                }

                const decoder = new TextDecoder();
                let fullContent = "";

                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n");

                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const data = line.slice(6);
                            if (data === "[DONE]") continue;

                            try {
                                const parsed = JSON.parse(data);
                                const token = parsed.choices?.[0]?.delta?.content || "";
                                if (token) {
                                    fullContent += token;
                                    callbacks.onToken(token);
                                }
                            } catch (_e) {
                                continue;
                            }
                        }
                    }
                }

                activityLogger.info("HuggingFace streaming response completed", {
                    responseLength: fullContent.length
                });

                return {
                    text: fullContent,
                    model: config.model,
                    provider: "huggingface"
                };
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: config.model,
                    messages,
                    temperature: config.temperature ?? 0.7,
                    max_tokens: config.maxTokens ?? 1000,
                    top_p: config.topP ?? 1,
                    stream: false
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();

                if (response.status === 503) {
                    throw new Error(
                        `Model ${config.model} is loading. This is retryable. Status: ${response.status}`
                    );
                }

                throw new Error(`HuggingFace API error (${response.status}): ${errorText}`);
            }

            const result = (await response.json()) as {
                choices?: Array<{ message?: { content?: string } }>;
            };

            const text = result.choices?.[0]?.message?.content || "";

            activityLogger.info("HuggingFace response completed", { responseLength: text.length });

            return {
                text,
                model: config.model,
                provider: "huggingface"
            };
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }, `HuggingFace ${config.model}`);
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute LLM node - calls various LLM providers.
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

    activityLogger.info("Calling LLM provider", {
        provider: validatedConfig.provider,
        model: validatedConfig.model,
        promptLength: userPrompt.length,
        streaming: callbacks?.onToken ? "enabled" : "disabled"
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

            let llmResult: LLMNodeResult;

            const circuitBreaker = llmCircuitBreakers[validatedConfig.provider as LLMProvider];

            const executeWithCircuitBreaker = async (
                fn: () => Promise<LLMNodeResult>
            ): Promise<LLMNodeResult> => {
                if (circuitBreaker) {
                    return circuitBreaker.execute(fn);
                }
                return fn();
            };

            switch (validatedConfig.provider) {
                case "openai":
                    llmResult = await executeWithCircuitBreaker(() =>
                        executeOpenAI(validatedConfig, systemPrompt, userPrompt, callbacks)
                    );
                    break;
                case "anthropic":
                    llmResult = await executeWithCircuitBreaker(() =>
                        executeAnthropic(validatedConfig, systemPrompt, userPrompt, callbacks)
                    );
                    break;
                case "google":
                    llmResult = await executeWithCircuitBreaker(() =>
                        executeGoogle(validatedConfig, systemPrompt, userPrompt, callbacks)
                    );
                    break;
                case "cohere":
                    llmResult = await executeWithCircuitBreaker(() =>
                        executeCohere(validatedConfig, systemPrompt, userPrompt, callbacks)
                    );
                    break;
                case "huggingface":
                    llmResult = await executeWithCircuitBreaker(() =>
                        executeHuggingFace(validatedConfig, systemPrompt, userPrompt, callbacks)
                    );
                    break;
                default:
                    throw new ValidationError(
                        `Unsupported LLM provider: ${validatedConfig.provider}`,
                        "provider"
                    );
            }

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
