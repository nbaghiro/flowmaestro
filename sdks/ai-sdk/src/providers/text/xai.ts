/**
 * x.ai (Grok) text completion provider
 * Uses OpenAI-compatible API format with custom base URL.
 */

import OpenAI from "openai";
import { AbstractProvider, type TextCompletionProvider } from "../base";
import type {
    TextCompletionRequest,
    TextCompletionResponse,
    TextCompletionStream
} from "../../capabilities/text/types";
import type { AILogger, AIProvider } from "../../types";

const XAI_BASE_URL = "https://api.x.ai/v1";

/**
 * x.ai (Grok) text completion provider
 */
export class XAITextProvider extends AbstractProvider implements TextCompletionProvider {
    readonly provider: AIProvider = "xai";
    readonly supportedModels = ["grok-3", "grok-3-fast", "grok-2-vision", "grok-2-vision-1212"];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsThinking(_model: string): boolean {
        // Grok models don't currently support extended thinking mode
        return false;
    }

    async complete(
        request: TextCompletionRequest,
        apiKey: string
    ): Promise<TextCompletionResponse> {
        const client = new OpenAI({ apiKey, baseURL: XAI_BASE_URL });

        const messages = this.buildMessages(request);
        const params = this.buildParams(request, messages);

        const startTime = Date.now();
        const response = await client.chat.completions.create(params);

        return this.normalizeResponse(response, request.model, startTime);
    }

    async stream(request: TextCompletionRequest, apiKey: string): Promise<TextCompletionStream> {
        const client = new OpenAI({ apiKey, baseURL: XAI_BASE_URL });

        const messages = this.buildMessages(request);
        const params = this.buildParams(request, messages);

        const streamResponse = await client.chat.completions.create({
            ...params,
            stream: true
        });

        return this.createStream(streamResponse, request.model);
    }

    private buildMessages(
        request: TextCompletionRequest
    ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

        if (request.systemPrompt) {
            messages.push({ role: "system", content: request.systemPrompt });
        }

        if (typeof request.prompt === "string") {
            messages.push({ role: "user", content: request.prompt });
        } else {
            for (const msg of request.prompt) {
                messages.push({
                    role: msg.role as "system" | "user" | "assistant",
                    content: msg.content
                });
            }
        }

        return messages;
    }

    private buildParams(
        request: TextCompletionRequest,
        messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
    ): OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
        const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
            model: request.model,
            messages,
            max_tokens: request.maxTokens ?? 1000,
            temperature: request.temperature ?? 0.7,
            top_p: request.topP ?? 1
        };

        if (request.stop) {
            params.stop = request.stop;
        }

        return params;
    }

    private normalizeResponse(
        response: OpenAI.Chat.Completions.ChatCompletion,
        model: string,
        startTime: number
    ): TextCompletionResponse {
        const text = response.choices[0]?.message?.content ?? "";
        const usage = response.usage;

        return {
            text,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model,
                requestId: response.id,
                usage: usage
                    ? {
                          promptTokens: usage.prompt_tokens,
                          completionTokens: usage.completion_tokens,
                          totalTokens: usage.total_tokens
                      }
                    : undefined
            }
        };
    }

    private createStream(
        stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
        model: string
    ): TextCompletionStream {
        let fullContent = "";
        const startTime = Date.now();
        let resolveResponse: (response: TextCompletionResponse) => void;
        let usage: OpenAI.Completions.CompletionUsage | undefined;
        let requestId: string | undefined;

        const responsePromise = new Promise<TextCompletionResponse>((resolve) => {
            resolveResponse = resolve;
        });

        const providerName = this.provider;

        const asyncIterator = {
            async *[Symbol.asyncIterator]() {
                for await (const chunk of stream) {
                    if (!requestId && chunk.id) {
                        requestId = chunk.id;
                    }

                    const delta = chunk.choices[0]?.delta?.content ?? "";
                    if (delta) {
                        fullContent += delta;
                        yield delta;
                    }

                    // Capture usage from final chunk
                    if (chunk.usage) {
                        usage = chunk.usage;
                    }
                }

                resolveResponse({
                    text: fullContent,
                    metadata: {
                        processingTimeMs: Date.now() - startTime,
                        provider: providerName,
                        model,
                        requestId,
                        usage: usage
                            ? {
                                  promptTokens: usage.prompt_tokens,
                                  completionTokens: usage.completion_tokens,
                                  totalTokens: usage.total_tokens
                              }
                            : undefined
                    }
                });
            },
            getResponse: () => responsePromise
        };

        return asyncIterator as unknown as TextCompletionStream;
    }
}
