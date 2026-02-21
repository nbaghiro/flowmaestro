/**
 * FAL.ai image generation provider
 */

import { AbstractProvider, type ImageGenerationProvider } from "../base";
import type {
    ImageGenerationRequest,
    ImageGenerationResponse
} from "../../capabilities/image/types";
import type { AILogger, AIProvider, ImageOperation } from "../../types";

const FAL_RUN_URL = "https://fal.run";

/**
 * Aspect ratio to dimensions mapping
 */
const ASPECT_RATIO_MAP: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "16:9": { width: 1344, height: 768 },
    "9:16": { width: 768, height: 1344 },
    "21:9": { width: 1536, height: 640 },
    "9:21": { width: 640, height: 1536 },
    "4:3": { width: 1152, height: 896 },
    "3:4": { width: 896, height: 1152 },
    "3:2": { width: 1216, height: 832 },
    "2:3": { width: 832, height: 1216 }
};

/**
 * FAL.ai image generation provider
 * Supports Flux Pro, Flux Dev, and other models
 */
export class FALImageProvider extends AbstractProvider implements ImageGenerationProvider {
    readonly provider: AIProvider = "fal";
    readonly supportedModels = [
        "fal-ai/flux-pro",
        "fal-ai/flux-pro/v1.1",
        "fal-ai/flux-dev",
        "fal-ai/flux-schnell",
        "fal-ai/stable-diffusion-v3-medium"
    ];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsOperation(operation: ImageOperation): boolean {
        // FAL.ai supports all major image operations
        return [
            "generate",
            "inpaint",
            "outpaint",
            "upscale",
            "removeBackground",
            "styleTransfer"
        ].includes(operation);
    }

    async generate(
        request: ImageGenerationRequest,
        apiKey: string
    ): Promise<ImageGenerationResponse> {
        const startTime = Date.now();
        const model = request.model || "fal-ai/flux-pro";

        const dimensions = ASPECT_RATIO_MAP[request.aspectRatio || "1:1"] || {
            width: 1024,
            height: 1024
        };

        const response = await fetch(`${FAL_RUN_URL}/${model}`, {
            method: "POST",
            headers: {
                Authorization: `Key ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: request.prompt,
                image_size: {
                    width: dimensions.width,
                    height: dimensions.height
                },
                num_images: request.n || 1,
                enable_safety_checker: true,
                output_format: "jpeg"
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`FAL.ai API error: ${response.status} - ${errorText}`);
        }

        interface FALImage {
            url: string;
            content_type?: string;
            width?: number;
            height?: number;
        }

        interface FALResponse {
            images: FALImage[];
            seed?: number;
            has_nsfw_concepts?: boolean[];
        }

        const data = (await response.json()) as FALResponse;

        const images = data.images.map((img) => ({
            url: img.url,
            seed: data.seed
        }));

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
}
