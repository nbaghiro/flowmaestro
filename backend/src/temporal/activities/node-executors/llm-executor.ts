import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CohereClient } from "cohere-ai";
import OpenAI from "openai";
import type { JsonObject } from "@flowmaestro/shared";
import { interpolateVariables } from "../../../core/utils/interpolate-variables";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import type { ApiKeyData } from "../../../storage/models/Connection";

const connectionRepository = new ConnectionRepository();

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
};

/**
 * Check if error is retryable (overload, rate limit, or temporary server errors)
 */
function isRetryableError(error: unknown): boolean {
    // Type guard: check if error is an object
    if (typeof error !== "object" || error === null) {
        return false;
    }

    const err = error as Record<string, unknown>;
    const retryableStatusCodes = [429, 503, 529];

    // Check status code
    if (typeof err.status === "number" && retryableStatusCodes.includes(err.status)) {
        return true;
    }

    // Check error type for Anthropic SDK
    if (
        typeof err.type === "string" &&
        ["overloaded_error", "rate_limit_error"].includes(err.type)
    ) {
        return true;
    }

    // Check for common error messages
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

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: unknown) {
            lastError = error;

            // Don't retry if it's not a retryable error
            if (!isRetryableError(error)) {
                throw error;
            }

            // Don't retry if we've exhausted attempts
            if (attempt >= RETRY_CONFIG.maxRetries) {
                console.error(
                    `[LLM] ${context} - Max retries (${RETRY_CONFIG.maxRetries}) exceeded`
                );
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = Math.min(
                RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
                RETRY_CONFIG.maxDelayMs
            );

            // Safely extract error details
            const err = error as Record<string, unknown>;
            const errorCode = err.status || err.type || "unknown";
            const errorMessage = typeof err.message === "string" ? err.message : "Unknown error";

            console.warn(
                `[LLM] ${context} - Retryable error (${errorCode}): ${errorMessage}. ` +
                    `Retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries})`
            );

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

export interface LLMNodeConfig {
    provider: "openai" | "anthropic" | "google" | "cohere" | "huggingface";
    model: string;
    connectionId?: string;
    systemPrompt?: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    outputVariable?: string;
}

export interface LLMExecutionCallbacks {
    onToken?: (token: string) => void;
    onComplete?: (response: string) => void;
    onError?: (error: Error) => void;
}

export interface LLMNodeResult {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    provider: string;
}

/**
 * Get API key from connection or fall back to environment variable
 */
async function getApiKey(
    connectionId: string | undefined,
    provider: string,
    envVarName: string
): Promise<string> {
    // Try to get from connection first
    if (connectionId) {
        const connection = await connectionRepository.findByIdWithData(connectionId);
        if (!connection) {
            throw new Error(`Connection with ID ${connectionId} not found`);
        }
        if (connection.provider !== provider) {
            throw new Error(
                `Connection provider mismatch: expected ${provider}, got ${connection.provider}`
            );
        }
        if (connection.status !== "active") {
            throw new Error(`Connection is not active (status: ${connection.status})`);
        }
        const data = connection.data as ApiKeyData;
        if (!data.api_key) {
            throw new Error("API key not found in connection data");
        }
        console.log(`[LLM] Using connection: ${connection.name} (${connection.id})`);
        return data.api_key;
    }

    // Fall back to environment variable for backwards compatibility
    const apiKey = process.env[envVarName];
    if (!apiKey) {
        throw new Error(
            `No connection provided and ${envVarName} environment variable is not set. ` +
                `Please add a connection in the Connections page or set the ${envVarName} environment variable.`
        );
    }
    console.log(`[LLM] Using environment variable: ${envVarName}`);
    return apiKey;
}

/**
 * Execute LLM node - calls various LLM providers
 */
export async function executeLLMNode(
    config: LLMNodeConfig,
    context: JsonObject,
    callbacks?: LLMExecutionCallbacks
): Promise<JsonObject> {
    // Validate required config
    if (!config.provider) {
        throw new Error(
            "LLM provider is required. Please select an LLM connection in the node configuration."
        );
    }
    if (!config.model) {
        throw new Error("LLM model is required. Please select a model in the node configuration.");
    }
    if (!config.prompt) {
        throw new Error("Prompt is required. Please enter a prompt in the node configuration.");
    }

    // Interpolate variables in prompts
    const systemPrompt = config.systemPrompt
        ? interpolateVariables(config.systemPrompt, context)
        : undefined;
    const userPrompt = interpolateVariables(config.prompt, context);

    console.log(`[LLM] Calling ${config.provider}/${config.model}`);
    console.log(`[LLM] Prompt length: ${userPrompt.length} chars`);
    console.log(`[LLM] Streaming: ${callbacks?.onToken ? "enabled" : "disabled"}`);

    let result: LLMNodeResult;

    switch (config.provider) {
        case "openai":
            result = await executeOpenAI(config, systemPrompt, userPrompt, callbacks);
            break;
        case "anthropic":
            result = await executeAnthropic(config, systemPrompt, userPrompt, callbacks);
            break;
        case "google":
            result = await executeGoogle(config, systemPrompt, userPrompt, callbacks);
            break;
        case "cohere":
            result = await executeCohere(config, systemPrompt, userPrompt, callbacks);
            break;
        case "huggingface":
            result = await executeHuggingFace(config, systemPrompt, userPrompt, callbacks);
            break;
        default:
            throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }

    // Wrap result in outputVariable if specified
    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }

    return result as unknown as JsonObject;
}

async function executeOpenAI(
    config: LLMNodeConfig,
    systemPrompt: string | undefined,
    userPrompt: string,
    callbacks?: LLMExecutionCallbacks
): Promise<LLMNodeResult> {
    const apiKey = await getApiKey(config.connectionId, "openai", "OPENAI_API_KEY");
    const openai = new OpenAI({ apiKey });

    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userPrompt });

    return withRetry(async () => {
        // Streaming mode
        if (callbacks?.onToken) {
            const stream = await openai.chat.completions.create({
                model: config.model,
                messages,
                temperature: config.temperature ?? 0.7,
                max_tokens: config.maxTokens ?? 1000,
                top_p: config.topP ?? 1,
                stream: true
            });

            let fullContent = "";
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta?.content || "";
                if (delta) {
                    fullContent += delta;
                    callbacks.onToken(delta);
                }
            }

            console.log(`[LLM] OpenAI streaming response: ${fullContent.length} chars`);

            return {
                text: fullContent,
                model: config.model,
                provider: "openai"
            };
        }

        // Non-streaming mode (fallback)
        const response = await openai.chat.completions.create({
            model: config.model,
            messages,
            temperature: config.temperature ?? 0.7,
            max_tokens: config.maxTokens ?? 1000,
            top_p: config.topP ?? 1
        });

        const text = response.choices[0]?.message?.content || "";
        const usage = response.usage;

        console.log(`[LLM] OpenAI response: ${text.length} chars, ${usage?.total_tokens} tokens`);

        return {
            text,
            usage: usage
                ? {
                      promptTokens: usage.prompt_tokens,
                      completionTokens: usage.completion_tokens,
                      totalTokens: usage.total_tokens
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

    return withRetry(async () => {
        // Streaming mode
        if (callbacks?.onToken) {
            const stream = await anthropic.messages.create({
                model: config.model,
                max_tokens: config.maxTokens ?? 1000,
                temperature: config.temperature ?? 0.7,
                system: systemPrompt,
                messages: [{ role: "user", content: userPrompt }],
                stream: true
            });

            let fullContent = "";
            for await (const chunk of stream) {
                if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
                    const delta = chunk.delta.text;
                    fullContent += delta;
                    callbacks.onToken(delta);
                }
            }

            console.log(`[LLM] Anthropic streaming response: ${fullContent.length} chars`);

            return {
                text: fullContent,
                model: config.model,
                provider: "anthropic"
            };
        }

        // Non-streaming mode (fallback)
        const response = await anthropic.messages.create({
            model: config.model,
            max_tokens: config.maxTokens ?? 1000,
            temperature: config.temperature ?? 0.7,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }]
        });

        const text = response.content[0].type === "text" ? response.content[0].text : "";
        const usage = response.usage;

        console.log(
            `[LLM] Anthropic response: ${text.length} chars, ${usage.input_tokens + usage.output_tokens} tokens`
        );

        return {
            text,
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
    const model = genAI.getGenerativeModel({
        model: config.model,
        generationConfig: {
            temperature: config.temperature ?? 0.7,
            maxOutputTokens: config.maxTokens ?? 1000,
            topP: config.topP ?? 1
        }
    });

    // Combine system prompt and user prompt for Google
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;

    return withRetry(async () => {
        // Streaming mode
        if (callbacks?.onToken) {
            const result = await model.generateContentStream(fullPrompt);

            let fullContent = "";
            for await (const chunk of result.stream) {
                const delta = chunk.text();
                fullContent += delta;
                callbacks.onToken(delta);
            }

            console.log(`[LLM] Google streaming response: ${fullContent.length} chars`);

            return {
                text: fullContent,
                model: config.model,
                provider: "google"
            };
        }

        // Non-streaming mode (fallback)
        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        const text = response.text();

        console.log(`[LLM] Google response: ${text.length} chars`);

        return {
            text,
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

    // Build message with preamble (system prompt) if provided
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
        // Streaming mode
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

            console.log(`[LLM] Cohere streaming response: ${fullContent.length} chars`);

            return {
                text: fullContent,
                model: config.model,
                provider: "cohere"
            };
        }

        // Non-streaming mode (fallback)
        const response = await cohere.chat(chatOptions);

        const text = response.text || "";

        console.log(`[LLM] Cohere response: ${text.length} chars`);

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

    // Build messages array for OpenAI-compatible format
    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userPrompt });

    return withRetry(async () => {
        // Streaming mode
        if (callbacks?.onToken) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

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

                    // Special handling for model loading
                    if (response.status === 503) {
                        throw new Error(
                            `Model ${config.model} is loading. This is retryable. Status: ${response.status}`
                        );
                    }

                    throw new Error(`HuggingFace API error (${response.status}): ${errorText}`);
                }

                // Parse SSE stream
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
                                // OpenAI format: choices[0].delta.content
                                const token = parsed.choices?.[0]?.delta?.content || "";
                                if (token) {
                                    fullContent += token;
                                    callbacks.onToken(token);
                                }
                            } catch (_e) {
                                // Skip invalid JSON
                                continue;
                            }
                        }
                    }
                }

                console.log(`[LLM] HuggingFace streaming response: ${fullContent.length} chars`);

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

        // Non-streaming mode
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

                // Special handling for model loading
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

            // OpenAI format: choices[0].message.content
            const text = result.choices?.[0]?.message?.content || "";

            console.log(`[LLM] HuggingFace response: ${text.length} chars`);

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

/**
 * Interpolate ${variableName} references in strings with actual values from context
 */
