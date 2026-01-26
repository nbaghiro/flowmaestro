/**
 * Anthropic vision provider
 */

import Anthropic from "@anthropic-ai/sdk";
import { AbstractProvider, type VisionProvider } from "../base";
import type {
    VisionAnalysisRequest,
    VisionAnalysisResponse
} from "../../capabilities/vision/types";
import type { AILogger, AIProvider } from "../../client/types";

/**
 * Valid media types for Anthropic
 */
type AnthropicMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const VALID_MEDIA_TYPES: AnthropicMediaType[] = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp"
];

/**
 * Anthropic vision provider (Claude)
 */
export class AnthropicVisionProvider extends AbstractProvider implements VisionProvider {
    readonly provider: AIProvider = "anthropic";
    readonly supportedModels = [
        "claude-sonnet-4-5-20250929",
        "claude-opus-4-0-20250514",
        "claude-3-5-sonnet-20241022",
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307"
    ];

    constructor(logger: AILogger) {
        super(logger);
    }

    async analyze(request: VisionAnalysisRequest, apiKey: string): Promise<VisionAnalysisResponse> {
        const client = new Anthropic({ apiKey });
        const startTime = Date.now();

        // Convert image input to Anthropic format
        const imageContent = await this.buildImageContent(request.imageInput);

        const response = await client.messages.create({
            model: request.model,
            max_tokens: request.maxTokens ?? 1000,
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
            ]
        });

        const text = response.content[0].type === "text" ? response.content[0].text : "";
        const usage = response.usage;

        return {
            analysis: text,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model: request.model,
                usage: {
                    promptTokens: usage.input_tokens,
                    completionTokens: usage.output_tokens,
                    totalTokens: usage.input_tokens + usage.output_tokens
                }
            }
        };
    }

    private async buildImageContent(imageInput: string): Promise<{
        type: "image";
        source: {
            type: "base64";
            media_type: AnthropicMediaType;
            data: string;
        };
    }> {
        if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
            const response = await fetch(imageInput);
            if (!response.ok) {
                throw new Error(`Failed to download image: HTTP ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            const contentType = response.headers.get("content-type") || "image/jpeg";

            return {
                type: "image",
                source: {
                    type: "base64",
                    media_type: this.normalizeMediaType(contentType),
                    data: base64
                }
            };
        } else if (imageInput.startsWith("data:")) {
            const matches = imageInput.match(/^data:([^;]+);base64,(.+)$/);
            if (!matches) {
                throw new Error("Invalid data URL format");
            }

            return {
                type: "image",
                source: {
                    type: "base64",
                    media_type: this.normalizeMediaType(matches[1]),
                    data: matches[2]
                }
            };
        } else {
            // Assume raw base64
            return {
                type: "image",
                source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: imageInput
                }
            };
        }
    }

    private normalizeMediaType(type: string): AnthropicMediaType {
        const normalized = type.toLowerCase();
        if (VALID_MEDIA_TYPES.includes(normalized as AnthropicMediaType)) {
            return normalized as AnthropicMediaType;
        }
        return "image/jpeg";
    }
}
