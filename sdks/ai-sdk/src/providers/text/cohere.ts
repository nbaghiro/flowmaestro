/**
 * Cohere text completion provider
 */

import { CohereClient } from "cohere-ai";
import { AbstractProvider, type TextCompletionProvider } from "../base";
import type {
    TextCompletionRequest,
    TextCompletionResponse,
    TextCompletionStream
} from "../../capabilities/text/types";
import type { AILogger, AIProvider } from "../../types";

/**
 * Cohere text completion provider
 */
export class CohereTextProvider extends AbstractProvider implements TextCompletionProvider {
    readonly provider: AIProvider = "cohere";
    readonly supportedModels = [
        "command-r-plus",
        "command-r",
        "command",
        "command-light",
        "command-nightly"
    ];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsThinking(_model: string): boolean {
        return false; // Cohere doesn't support thinking mode
    }

    async complete(
        request: TextCompletionRequest,
        apiKey: string
    ): Promise<TextCompletionResponse> {
        const client = new CohereClient({ token: apiKey });

        const { message, chatHistory, preamble } = this.buildChatParams(request);
        const startTime = Date.now();

        const response = await client.chat({
            model: request.model,
            message,
            chatHistory,
            preamble,
            temperature: request.temperature ?? 0.7,
            maxTokens: request.maxTokens ?? 1000,
            p: request.topP ?? 1,
            stopSequences: request.stop
        });

        return this.normalizeResponse(response, request.model, startTime);
    }

    async stream(request: TextCompletionRequest, apiKey: string): Promise<TextCompletionStream> {
        const client = new CohereClient({ token: apiKey });

        const { message, chatHistory, preamble } = this.buildChatParams(request);
        const startTime = Date.now();

        const stream = await client.chatStream({
            model: request.model,
            message,
            chatHistory,
            preamble,
            temperature: request.temperature ?? 0.7,
            maxTokens: request.maxTokens ?? 1000,
            p: request.topP ?? 1,
            stopSequences: request.stop
        });

        return this.createStream(stream, request.model, startTime);
    }

    private buildChatParams(request: TextCompletionRequest): {
        message: string;
        chatHistory?: Array<{ role: "USER" | "CHATBOT"; message: string }>;
        preamble?: string;
    } {
        let message: string;
        let chatHistory: Array<{ role: "USER" | "CHATBOT"; message: string }> | undefined;
        let preamble: string | undefined = request.systemPrompt;

        if (typeof request.prompt === "string") {
            message = request.prompt;
        } else {
            // Convert messages to Cohere format
            chatHistory = [];
            message = "";

            for (const msg of request.prompt) {
                if (msg.role === "system") {
                    preamble = msg.content;
                } else if (msg.role === "user") {
                    // The last user message becomes the main message
                    if (message) {
                        chatHistory.push({ role: "USER", message });
                    }
                    message = msg.content;
                } else if (msg.role === "assistant") {
                    chatHistory.push({ role: "CHATBOT", message: msg.content });
                }
            }
        }

        return { message, chatHistory, preamble };
    }

    private normalizeResponse(
        response: {
            text: string;
            meta?: { tokens?: { inputTokens?: number; outputTokens?: number } };
        },
        model: string,
        startTime: number
    ): TextCompletionResponse {
        const text = response.text;
        const tokens = response.meta?.tokens;

        return {
            text,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model,
                usage: tokens
                    ? {
                          promptTokens: tokens.inputTokens,
                          completionTokens: tokens.outputTokens,
                          totalTokens: (tokens.inputTokens ?? 0) + (tokens.outputTokens ?? 0)
                      }
                    : undefined
            }
        };
    }

    private createStream(
        stream: AsyncIterable<{ eventType: string; text?: string }>,
        model: string,
        startTime: number
    ): TextCompletionStream {
        let fullContent = "";
        let resolveResponse: (response: TextCompletionResponse) => void;

        const responsePromise = new Promise<TextCompletionResponse>((resolve) => {
            resolveResponse = resolve;
        });

        const providerName = this.provider;

        const asyncIterator = {
            async *[Symbol.asyncIterator]() {
                for await (const event of stream) {
                    if (event.eventType === "text-generation" && event.text) {
                        fullContent += event.text;
                        yield event.text;
                    }
                }

                resolveResponse({
                    text: fullContent,
                    metadata: {
                        processingTimeMs: Date.now() - startTime,
                        provider: providerName,
                        model
                    }
                });
            },
            getResponse: () => responsePromise
        };

        return asyncIterator as unknown as TextCompletionStream;
    }
}
