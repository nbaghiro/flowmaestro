/**
 * HuggingFace text completion provider
 * Uses the HuggingFace Inference API with OpenAI-compatible endpoint
 */

import { AbstractProvider, type TextCompletionProvider } from "../base";
import type {
    TextCompletionRequest,
    TextCompletionResponse,
    TextCompletionStream
} from "../../capabilities/text/types";
import type { AILogger, AIProvider } from "../../types";

const HUGGINGFACE_BASE_URL = "https://api-inference.huggingface.co/models";

/**
 * HuggingFace text completion provider
 */
export class HuggingFaceTextProvider extends AbstractProvider implements TextCompletionProvider {
    readonly provider: AIProvider = "huggingface";
    readonly supportedModels = [
        "meta-llama/Llama-3.3-70B-Instruct",
        "meta-llama/Llama-3.2-3B-Instruct",
        "meta-llama/Llama-3.2-1B-Instruct",
        "mistralai/Mistral-7B-Instruct-v0.3",
        "microsoft/Phi-3-mini-4k-instruct",
        "google/gemma-2-9b-it",
        "*" // HuggingFace supports many models
    ];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsThinking(_model: string): boolean {
        return false; // HuggingFace doesn't support thinking mode
    }

    async complete(
        request: TextCompletionRequest,
        apiKey: string
    ): Promise<TextCompletionResponse> {
        const prompt = this.buildPrompt(request);
        const startTime = Date.now();

        const response = await fetch(`${HUGGINGFACE_BASE_URL}/${request.model}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: request.maxTokens ?? 1000,
                    temperature: request.temperature ?? 0.7,
                    top_p: request.topP ?? 1,
                    return_full_text: false,
                    stop: request.stop
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`);
        }

        const data = (await response.json()) as Array<{ generated_text: string }>;
        const text = data[0]?.generated_text ?? "";

        return {
            text,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model: request.model
            }
        };
    }

    async stream(request: TextCompletionRequest, apiKey: string): Promise<TextCompletionStream> {
        const prompt = this.buildPrompt(request);
        const startTime = Date.now();

        const response = await fetch(`${HUGGINGFACE_BASE_URL}/${request.model}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: request.maxTokens ?? 1000,
                    temperature: request.temperature ?? 0.7,
                    top_p: request.topP ?? 1,
                    return_full_text: false,
                    stop: request.stop
                },
                stream: true
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`);
        }

        return this.createStream(response, request.model, startTime);
    }

    private buildPrompt(request: TextCompletionRequest): string {
        let prompt = "";

        if (request.systemPrompt) {
            prompt += `<|system|>\n${request.systemPrompt}\n`;
        }

        if (typeof request.prompt === "string") {
            prompt += `<|user|>\n${request.prompt}\n<|assistant|>\n`;
        } else {
            for (const msg of request.prompt) {
                if (msg.role === "system") {
                    prompt += `<|system|>\n${msg.content}\n`;
                } else if (msg.role === "user") {
                    prompt += `<|user|>\n${msg.content}\n`;
                } else if (msg.role === "assistant") {
                    prompt += `<|assistant|>\n${msg.content}\n`;
                }
            }
            prompt += "<|assistant|>\n";
        }

        return prompt;
    }

    private createStream(
        response: Response,
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
                const reader = response.body?.getReader();
                if (!reader) {
                    throw new Error("No response body");
                }

                const decoder = new TextDecoder();

                try {
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
                                    const parsed = JSON.parse(data) as {
                                        token?: { text?: string };
                                        generated_text?: string;
                                    };
                                    const text = parsed.token?.text ?? parsed.generated_text ?? "";
                                    if (text) {
                                        fullContent += text;
                                        yield text;
                                    }
                                } catch {
                                    // Skip malformed JSON
                                }
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
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
