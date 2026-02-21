/**
 * OpenAI text completion provider
 */

import OpenAI from "openai";
import { AbstractProvider, type TextCompletionProvider } from "../base";
import type {
    TextCompletionRequest,
    TextCompletionResponse,
    TextCompletionStream
} from "../../capabilities/text/types";
import type { AILogger, AIProvider, Message } from "../../types";

/**
 * Reasoning models that support extended thinking
 */
const REASONING_MODELS = ["o4-mini", "o3", "o3-mini", "o1", "o1-mini", "o1-preview"];

/**
 * OpenAI text completion provider
 */
export class OpenAITextProvider extends AbstractProvider implements TextCompletionProvider {
    readonly provider: AIProvider = "openai";
    readonly supportedModels = [
        "gpt-4.1",
        "gpt-4.1-mini",
        "gpt-4.1-nano",
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "gpt-4",
        "gpt-3.5-turbo",
        "o4-mini",
        "o3",
        "o3-mini",
        "o1",
        "o1-mini",
        "o1-preview"
    ];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsThinking(model: string): boolean {
        return REASONING_MODELS.some((rm) => model.startsWith(rm));
    }

    async complete(
        request: TextCompletionRequest,
        apiKey: string
    ): Promise<TextCompletionResponse> {
        const client = new OpenAI({ apiKey });
        const isReasoningModel = this.supportsThinking(request.model);

        const messages = this.buildMessages(request, isReasoningModel);
        const params = this.buildParams(request, messages, isReasoningModel);

        const startTime = Date.now();
        const response = await client.chat.completions.create(params);

        return this.normalizeResponse(response, request.model, startTime);
    }

    async stream(request: TextCompletionRequest, apiKey: string): Promise<TextCompletionStream> {
        const client = new OpenAI({ apiKey });
        const isReasoningModel = this.supportsThinking(request.model);

        const messages = this.buildMessages(request, isReasoningModel);
        const params = this.buildParams(request, messages, isReasoningModel);

        const streamResponse = await client.chat.completions.create({
            ...params,
            stream: true
        });

        return this.createStream(streamResponse, request.model);
    }

    private buildMessages(
        request: TextCompletionRequest,
        isReasoningModel: boolean
    ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

        if (isReasoningModel) {
            // Reasoning models: merge system prompt into user message
            const combinedPrompt = request.systemPrompt
                ? `${request.systemPrompt}\n\n---\n\n${this.getPromptText(request)}`
                : this.getPromptText(request);
            messages.push({ role: "user", content: combinedPrompt });
        } else {
            // Standard models: separate system and user messages
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
        }

        return messages;
    }

    private getPromptText(request: TextCompletionRequest): string {
        if (typeof request.prompt === "string") {
            return request.prompt;
        }
        return request.prompt.map((m: Message) => `${m.role}: ${m.content}`).join("\n");
    }

    private buildParams(
        request: TextCompletionRequest,
        messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        isReasoningModel: boolean
    ): OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
        const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
            model: request.model,
            messages,
            max_tokens: request.maxTokens ?? 1000
        };

        // Reasoning models don't support temperature/top_p
        if (!isReasoningModel) {
            params.temperature = request.temperature ?? 0.7;
            params.top_p = request.topP ?? 1;
        }

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

        // Extract reasoning tokens if available (o1/o3 models)
        let thinkingTokens: number | undefined;
        if (usage && "completion_tokens_details" in usage) {
            const details = usage.completion_tokens_details as {
                reasoning_tokens?: number;
            };
            thinkingTokens = details?.reasoning_tokens;
        }

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
                          totalTokens: usage.total_tokens,
                          thinkingTokens
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
