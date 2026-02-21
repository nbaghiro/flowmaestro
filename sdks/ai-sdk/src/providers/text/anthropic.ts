/**
 * Anthropic text completion provider
 */

import Anthropic from "@anthropic-ai/sdk";
import { AbstractProvider, type TextCompletionProvider } from "../base";
import type {
    TextCompletionRequest,
    TextCompletionResponse,
    TextCompletionStream
} from "../../capabilities/text/types";
import type { AILogger, AIProvider, Message } from "../../types";

/**
 * Models that support extended thinking
 */
const THINKING_MODELS = [
    "claude-sonnet-4-5-20250929",
    "claude-opus-4-5-20251101",
    "claude-4",
    "claude-4-sonnet",
    "claude-4-opus"
];

/**
 * Anthropic text completion provider
 */
export class AnthropicTextProvider extends AbstractProvider implements TextCompletionProvider {
    readonly provider: AIProvider = "anthropic";
    readonly supportedModels = [
        "claude-sonnet-4-5-20250929",
        "claude-opus-4-5-20251101",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307"
    ];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsThinking(model: string): boolean {
        return THINKING_MODELS.some(
            (tm) => model === tm || model.startsWith(tm.split("-").slice(0, 2).join("-"))
        );
    }

    async complete(
        request: TextCompletionRequest,
        apiKey: string
    ): Promise<TextCompletionResponse> {
        const client = new Anthropic({ apiKey });

        const messages = this.buildMessages(request);
        const params = this.buildParams(request, messages);

        const startTime = Date.now();
        const response = await client.messages.create({
            ...params,
            stream: false
        });

        return this.normalizeResponse(response, request.model, startTime);
    }

    async stream(request: TextCompletionRequest, apiKey: string): Promise<TextCompletionStream> {
        const client = new Anthropic({ apiKey });

        const messages = this.buildMessages(request);
        const params = this.buildParams(request, messages);

        // Use streaming with stream: true
        const streamResponse = await client.messages.create({
            ...params,
            stream: true
        });

        return this.createStream(streamResponse, request.model);
    }

    private buildMessages(request: TextCompletionRequest): Anthropic.MessageParam[] {
        const messages: Anthropic.MessageParam[] = [];

        if (typeof request.prompt === "string") {
            messages.push({ role: "user", content: request.prompt });
        } else {
            for (const msg of request.prompt) {
                if (msg.role === "system") {
                    // System messages handled separately in Anthropic API
                    continue;
                }
                messages.push({
                    role: msg.role as "user" | "assistant",
                    content: msg.content
                });
            }
        }

        return messages;
    }

    private buildParams(
        request: TextCompletionRequest,
        messages: Anthropic.MessageParam[]
    ): Anthropic.MessageCreateParams {
        const params: Anthropic.MessageCreateParams = {
            model: request.model,
            messages,
            max_tokens: request.maxTokens ?? 1000
        };

        // Add system prompt
        if (request.systemPrompt) {
            params.system = request.systemPrompt;
        } else if (Array.isArray(request.prompt)) {
            const systemMsg = request.prompt.find((m: Message) => m.role === "system");
            if (systemMsg) {
                params.system = systemMsg.content;
            }
        }

        // Add temperature if not using thinking
        if (!request.thinking?.enabled) {
            params.temperature = request.temperature ?? 0.7;
            if (request.topP !== undefined) {
                params.top_p = request.topP;
            }
        }

        // Add extended thinking
        if (request.thinking?.enabled && this.supportsThinking(request.model)) {
            params.thinking = {
                type: "enabled",
                budget_tokens: request.thinking.budgetTokens ?? 4096
            };
            // Temperature must be 1 for thinking mode
            params.temperature = 1;
        }

        if (request.stop) {
            params.stop_sequences = request.stop;
        }

        return params;
    }

    private normalizeResponse(
        response: Anthropic.Message,
        model: string,
        startTime: number
    ): TextCompletionResponse {
        // Extract text from content blocks
        let text = "";
        let thinking = "";

        for (const block of response.content) {
            if (block.type === "text") {
                text += block.text;
            } else if (block.type === "thinking") {
                thinking += block.thinking;
            }
        }

        const usage = response.usage;

        return {
            text,
            thinking: thinking || undefined,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model,
                requestId: response.id,
                usage: {
                    promptTokens: usage.input_tokens,
                    completionTokens: usage.output_tokens,
                    totalTokens: usage.input_tokens + usage.output_tokens
                }
            }
        };
    }

    private createStream(
        stream: AsyncIterable<Anthropic.MessageStreamEvent>,
        model: string
    ): TextCompletionStream {
        let fullContent = "";
        let thinkingContent = "";
        const startTime = Date.now();
        let resolveResponse: (response: TextCompletionResponse) => void;
        let inputTokens = 0;
        let outputTokens = 0;
        let requestId: string | undefined;

        const responsePromise = new Promise<TextCompletionResponse>((resolve) => {
            resolveResponse = resolve;
        });

        const providerName = this.provider;

        const asyncIterator = {
            async *[Symbol.asyncIterator]() {
                for await (const event of stream) {
                    if (event.type === "message_start") {
                        requestId = event.message.id;
                        inputTokens = event.message.usage?.input_tokens ?? 0;
                    }

                    if (event.type === "content_block_delta") {
                        if (event.delta.type === "text_delta") {
                            fullContent += event.delta.text;
                            yield event.delta.text;
                        } else if (event.delta.type === "thinking_delta") {
                            thinkingContent += event.delta.thinking;
                        }
                    }

                    if (event.type === "message_delta") {
                        outputTokens = event.usage?.output_tokens ?? 0;
                    }
                }

                resolveResponse({
                    text: fullContent,
                    thinking: thinkingContent || undefined,
                    metadata: {
                        processingTimeMs: Date.now() - startTime,
                        provider: providerName,
                        model,
                        requestId,
                        usage: {
                            promptTokens: inputTokens,
                            completionTokens: outputTokens,
                            totalTokens: inputTokens + outputTokens
                        }
                    }
                });
            },
            getResponse: () => responsePromise
        };

        return asyncIterator as unknown as TextCompletionStream;
    }
}
