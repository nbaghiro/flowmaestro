/**
 * Google (Gemini) text completion provider
 */

import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { AbstractProvider, type TextCompletionProvider } from "../base";
import type {
    TextCompletionRequest,
    TextCompletionResponse,
    TextCompletionStream
} from "../../capabilities/text/types";
import type { AILogger, AIProvider, Message } from "../../client/types";

/**
 * Models that support thinking
 */
const THINKING_MODELS = ["gemini-2.5-pro", "gemini-2.5-flash"];

/**
 * Google (Gemini) text completion provider
 */
export class GoogleTextProvider extends AbstractProvider implements TextCompletionProvider {
    readonly provider: AIProvider = "google";
    readonly supportedModels = [
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "gemini-pro"
    ];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsThinking(model: string): boolean {
        return THINKING_MODELS.some((tm) => model.startsWith(tm));
    }

    async complete(
        request: TextCompletionRequest,
        apiKey: string
    ): Promise<TextCompletionResponse> {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = this.getModel(genAI, request);

        const prompt = this.buildPrompt(request);
        const startTime = Date.now();

        const result = await model.generateContent(prompt);
        const response = result.response;

        return this.normalizeResponse(response, request.model, startTime);
    }

    async stream(request: TextCompletionRequest, apiKey: string): Promise<TextCompletionStream> {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = this.getModel(genAI, request);

        const prompt = this.buildPrompt(request);
        const startTime = Date.now();

        const streamResult = await model.generateContentStream(prompt);

        return this.createStream(streamResult.stream, request.model, startTime);
    }

    private getModel(genAI: GoogleGenerativeAI, request: TextCompletionRequest): GenerativeModel {
        const generationConfig: Record<string, unknown> = {
            maxOutputTokens: request.maxTokens ?? 1000
        };

        // Only add temperature if not using thinking mode
        if (!request.thinking?.enabled) {
            generationConfig.temperature = request.temperature ?? 0.7;
            if (request.topP !== undefined) {
                generationConfig.topP = request.topP;
            }
        }

        if (request.stop) {
            generationConfig.stopSequences = request.stop;
        }

        // Add thinking config if enabled
        if (request.thinking?.enabled && this.supportsThinking(request.model)) {
            generationConfig.thinkingConfig = {
                thinkingBudget: request.thinking.budgetTokens ?? 4096
            };
        }

        return genAI.getGenerativeModel({
            model: request.model,
            generationConfig,
            systemInstruction: request.systemPrompt
        });
    }

    private buildPrompt(request: TextCompletionRequest): string {
        if (typeof request.prompt === "string") {
            return request.prompt;
        }

        // Filter out system messages (handled via systemInstruction)
        return request.prompt
            .filter((m: Message) => m.role !== "system")
            .map((m: Message) => `${m.role}: ${m.content}`)
            .join("\n");
    }

    private normalizeResponse(
        response: {
            text: () => string;
            usageMetadata?: {
                promptTokenCount?: number;
                candidatesTokenCount?: number;
                totalTokenCount?: number;
            };
        },
        model: string,
        startTime: number
    ): TextCompletionResponse {
        const text = response.text();
        const usage = response.usageMetadata;

        return {
            text,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model,
                usage: usage
                    ? {
                          promptTokens: usage.promptTokenCount,
                          completionTokens: usage.candidatesTokenCount,
                          totalTokens: usage.totalTokenCount
                      }
                    : undefined
            }
        };
    }

    private createStream(
        stream: AsyncIterable<{ text: () => string }>,
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
                for await (const chunk of stream) {
                    const text = chunk.text();
                    if (text) {
                        fullContent += text;
                        yield text;
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
