/**
 * OpenAI vision provider
 */

import OpenAI from "openai";
import { AbstractProvider, type VisionProvider } from "../base";
import type {
    VisionAnalysisRequest,
    VisionAnalysisResponse
} from "../../capabilities/vision/types";
import type { AILogger, AIProvider } from "../../types";

/**
 * OpenAI vision provider
 */
export class OpenAIVisionProvider extends AbstractProvider implements VisionProvider {
    readonly provider: AIProvider = "openai";
    readonly supportedModels = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4-vision-preview"];

    constructor(logger: AILogger) {
        super(logger);
    }

    async analyze(request: VisionAnalysisRequest, apiKey: string): Promise<VisionAnalysisResponse> {
        const client = new OpenAI({ apiKey });
        const startTime = Date.now();

        const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPartImage = {
            type: "image_url",
            image_url: {
                url: request.imageInput,
                detail: (request.detail ?? "auto") as "low" | "high" | "auto"
            }
        };

        const response = await client.chat.completions.create({
            model: request.model,
            messages: [
                {
                    role: "user",
                    content: [
                        imageContent,
                        {
                            type: "text",
                            text: request.prompt ?? "Describe this image in detail."
                        }
                    ]
                }
            ],
            max_tokens: request.maxTokens ?? 1000
        });

        const text = response.choices[0]?.message?.content ?? "";
        const usage = response.usage;

        return {
            analysis: text,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model: request.model,
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
}
