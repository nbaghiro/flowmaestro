/**
 * Stability AI image generation provider
 */

import { AbstractProvider, type ImageGenerationProvider } from "../base";
import type {
    ImageGenerationRequest,
    ImageGenerationResponse
} from "../../capabilities/image/types";
import type { AILogger, AIProvider, ImageOperation } from "../../types";

const STABILITY_API_URL = "https://api.stability.ai";

/**
 * Stability AI image generation provider
 * Supports SD3, SDXL, Stable Image Ultra/Core
 */
export class StabilityImageProvider extends AbstractProvider implements ImageGenerationProvider {
    readonly provider: AIProvider = "stabilityai";
    readonly supportedModels = [
        "sd3-large",
        "sd3-large-turbo",
        "sd3-medium",
        "stable-image-ultra",
        "stable-image-core",
        "sdxl-1.0"
    ];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsOperation(operation: ImageOperation): boolean {
        // Stability AI supports generation and some editing operations
        return ["generate", "inpaint", "upscale", "removeBackground"].includes(operation);
    }

    async generate(
        request: ImageGenerationRequest,
        apiKey: string
    ): Promise<ImageGenerationResponse> {
        const startTime = Date.now();
        const model = request.model || "sd3-large";

        // Determine endpoint and request format based on model
        const { endpoint, body } = this.buildRequest(request, model);

        const response = await fetch(`${STABILITY_API_URL}${endpoint}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Stability AI API error: ${response.status} - ${errorText}`);
        }

        const data = (await response.json()) as Record<string, unknown>;
        const images = this.parseResponse(data);

        return {
            images,
            operation: "generate",
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model
            }
        };
    }

    private buildRequest(
        request: ImageGenerationRequest,
        model: string
    ): { endpoint: string; body: Record<string, unknown> } {
        // Map aspect ratio from size if not specified
        const aspectRatio =
            request.aspectRatio ||
            (request.size === "1792x1024" ? "16:9" : request.size === "1024x1792" ? "9:16" : "1:1");

        if (model.startsWith("sd3")) {
            // SD3 endpoint
            return {
                endpoint: "/v2beta/stable-image/generate/sd3",
                body: {
                    prompt: request.prompt,
                    negative_prompt: request.negativePrompt,
                    model,
                    aspect_ratio: aspectRatio,
                    output_format: "png"
                }
            };
        } else if (model.includes("ultra") || model.includes("core")) {
            // Stable Image Ultra/Core endpoint
            const endpoint = model.includes("ultra") ? "ultra" : "core";
            return {
                endpoint: `/v2beta/stable-image/generate/${endpoint}`,
                body: {
                    prompt: request.prompt,
                    negative_prompt: request.negativePrompt,
                    aspect_ratio: aspectRatio,
                    output_format: "png"
                }
            };
        } else {
            // SDXL endpoint
            const [width, height] = (request.size || "1024x1024").split("x").map(Number);
            return {
                endpoint: "/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
                body: {
                    text_prompts: [
                        { text: request.prompt, weight: 1 },
                        ...(request.negativePrompt
                            ? [{ text: request.negativePrompt, weight: -1 }]
                            : [])
                    ],
                    cfg_scale: 7,
                    height,
                    width,
                    samples: request.n || 1,
                    steps: 30
                }
            };
        }
    }

    private parseResponse(data: Record<string, unknown>): Array<{ url?: string; base64?: string }> {
        // SD3/Ultra/Core format
        if (data.image && typeof data.image === "string") {
            return [{ base64: data.image }];
        }

        // SDXL format
        if (Array.isArray(data.artifacts)) {
            return data.artifacts.map((artifact: { base64?: string }) => ({
                base64: artifact.base64
            }));
        }

        // Alternative format
        if (Array.isArray(data.images)) {
            return data.images.map((img: { image?: string; base64?: string }) => ({
                base64: img.image || img.base64
            }));
        }

        throw new Error("Unexpected response format from Stability AI");
    }
}
