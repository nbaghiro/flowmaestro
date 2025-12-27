/**
 * LLM Service
 *
 * Provides direct LLM execution for services like WorkflowGenerator and WorkflowChatService.
 * This is separate from the node handler which runs within Trigger.dev tasks.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { JsonObject } from "@flowmaestro/shared";
import { createServiceLogger } from "../../core/logging";
import { ConnectionRepository } from "../../storage/repositories/ConnectionRepository";

createServiceLogger("LLMService");

export interface LLMConfig {
    model: string;
    provider: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface LLMNodeConfig extends LLMConfig {
    nodeId?: string;
    nodeName?: string;
    connectionId?: string;
    prompt?: string;
    [key: string]: unknown;
}

export interface LLMMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface LLMResponse {
    text: string;
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface LLMExecutionCallbacks {
    onChunk?: (chunk: string) => void;
    onToken?: (token: string) => void;
    onComplete?: (response: LLMResponse) => void;
    onError?: (error: Error) => void;
}

const connectionRepo = new ConnectionRepository();

/**
 * Execute LLM node with optional streaming callbacks
 */
export async function executeLLMNode(
    config: LLMNodeConfig,
    contextOrMessages?: LLMMessage[] | JsonObject | Record<string, unknown>,
    callbacksOrContext?: LLMExecutionCallbacks | JsonObject,
    maybeCallbacks?: LLMExecutionCallbacks
): Promise<LLMResponse> {
    // Parse overloaded parameters
    let messages: LLMMessage[] | undefined;
    let callbacks: LLMExecutionCallbacks | undefined;

    if (Array.isArray(contextOrMessages)) {
        messages = contextOrMessages;
        callbacks = callbacksOrContext as LLMExecutionCallbacks | undefined;
    } else {
        // contextOrMessages is context, callbacksOrContext might be callbacks
        if (callbacksOrContext && typeof callbacksOrContext === "object" && "onToken" in callbacksOrContext) {
            callbacks = callbacksOrContext as LLMExecutionCallbacks;
        } else if (maybeCallbacks) {
            callbacks = maybeCallbacks;
        }
    }

    const { provider, model, systemPrompt, temperature, maxTokens, connectionId, prompt } = config;

    // Build messages if not provided
    if (!messages) {
        messages = [];
        if (systemPrompt) {
            messages.push({ role: "system", content: systemPrompt });
        }
        if (prompt) {
            messages.push({ role: "user", content: prompt });
        }
    }

    // Get connection credentials
    let apiKey: string | undefined;
    if (connectionId) {
        const connection = await connectionRepo.findByIdWithData(connectionId);
        if (connection?.data && "api_key" in connection.data) {
            apiKey = connection.data.api_key;
        }
    }

    // Fall back to environment variables
    if (!apiKey) {
        if (provider === "openai") {
            apiKey = process.env.OPENAI_API_KEY;
        } else if (provider === "anthropic") {
            apiKey = process.env.ANTHROPIC_API_KEY;
        }
    }

    if (!apiKey) {
        throw new Error(`No API key found for provider: ${provider}`);
    }

    // Execute based on provider
    if (provider === "openai") {
        return executeOpenAI(apiKey, model, messages, { temperature, maxTokens }, callbacks);
    } else if (provider === "anthropic") {
        return executeAnthropic(apiKey, model, messages, { temperature, maxTokens }, callbacks);
    } else {
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
}

async function executeOpenAI(
    apiKey: string,
    model: string,
    messages: LLMMessage[],
    options: { temperature?: number; maxTokens?: number },
    callbacks?: LLMExecutionCallbacks
): Promise<LLMResponse> {
    const openai = new OpenAI({ apiKey });

    const openaiMessages = messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content
    }));

    if (callbacks?.onToken) {
        // Streaming mode
        const stream = await openai.chat.completions.create({
            model,
            messages: openaiMessages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2000,
            stream: true
        });

        let fullText = "";
        let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
                fullText += content;
                callbacks.onToken(content);
            }

            if (chunk.usage) {
                usage = {
                    promptTokens: chunk.usage.prompt_tokens,
                    completionTokens: chunk.usage.completion_tokens,
                    totalTokens: chunk.usage.total_tokens
                };
            }
        }

        const response: LLMResponse = { text: fullText, model, usage };
        callbacks.onComplete?.(response);
        return response;
    } else {
        // Non-streaming mode
        const completion = await openai.chat.completions.create({
            model,
            messages: openaiMessages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2000
        });

        const text = completion.choices[0]?.message?.content || "";

        return {
            text,
            model,
            usage: completion.usage ? {
                promptTokens: completion.usage.prompt_tokens,
                completionTokens: completion.usage.completion_tokens,
                totalTokens: completion.usage.total_tokens
            } : undefined
        };
    }
}

async function executeAnthropic(
    apiKey: string,
    model: string,
    messages: LLMMessage[],
    options: { temperature?: number; maxTokens?: number },
    callbacks?: LLMExecutionCallbacks
): Promise<LLMResponse> {
    const anthropic = new Anthropic({ apiKey });

    // Extract system message
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content
        }));

    if (callbacks?.onToken) {
        // Streaming mode
        const stream = await anthropic.messages.create({
            model,
            max_tokens: options.maxTokens ?? 2000,
            system: systemMessage?.content,
            messages: chatMessages,
            stream: true
        });

        let fullText = "";
        let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

        for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                const content = event.delta.text;
                if (content) {
                    fullText += content;
                    callbacks.onToken(content);
                }
            }

            if (event.type === "message_delta" && event.usage) {
                usage.completionTokens = event.usage.output_tokens;
            }

            if (event.type === "message_start" && event.message.usage) {
                usage.promptTokens = event.message.usage.input_tokens;
            }
        }

        usage.totalTokens = usage.promptTokens + usage.completionTokens;

        const response: LLMResponse = { text: fullText, model, usage };
        callbacks.onComplete?.(response);
        return response;
    } else {
        // Non-streaming mode
        const message = await anthropic.messages.create({
            model,
            max_tokens: options.maxTokens ?? 2000,
            system: systemMessage?.content,
            messages: chatMessages
        });

        const textBlock = message.content.find((block) => block.type === "text");
        const text = textBlock?.type === "text" ? textBlock.text : "";

        return {
            text,
            model,
            usage: {
                promptTokens: message.usage.input_tokens,
                completionTokens: message.usage.output_tokens,
                totalTokens: message.usage.input_tokens + message.usage.output_tokens
            }
        };
    }
}
