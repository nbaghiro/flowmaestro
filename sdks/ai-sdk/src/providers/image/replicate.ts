/**
 * Replicate image generation provider (Flux models)
 */

import { pollUntilComplete, DEFAULT_POLL_CONFIG } from "../../core/polling";
import { AbstractProvider, type ImageGenerationProvider } from "../base";
import type {
    ImageGenerationRequest,
    ImageGenerationResponse
} from "../../capabilities/image/types";
import type { AILogger, AIProvider, ImageOperation, AspectRatio } from "../../types";

const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";

/**
 * Map aspect ratio to dimensions
 */
function aspectRatioToDimensions(aspectRatio?: AspectRatio): { width: number; height: number } {
    switch (aspectRatio) {
        case "1:1":
            return { width: 1024, height: 1024 };
        case "16:9":
            return { width: 1344, height: 768 };
        case "9:16":
            return { width: 768, height: 1344 };
        case "4:3":
            return { width: 1152, height: 896 };
        case "3:4":
            return { width: 896, height: 1152 };
        case "21:9":
            return { width: 1536, height: 640 };
        case "9:21":
            return { width: 640, height: 1536 };
        default:
            return { width: 1024, height: 1024 };
    }
}

/**
 * Replicate image generation provider
 */
export class ReplicateImageProvider extends AbstractProvider implements ImageGenerationProvider {
    readonly provider: AIProvider = "replicate";
    readonly supportedModels = [
        "black-forest-labs/flux-1.1-pro-ultra",
        "black-forest-labs/flux-1.1-pro",
        "black-forest-labs/flux-schnell",
        "black-forest-labs/flux-dev"
    ];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsOperation(operation: ImageOperation): boolean {
        return operation === "generate";
    }

    async generate(
        request: ImageGenerationRequest,
        apiKey: string
    ): Promise<ImageGenerationResponse> {
        const startTime = Date.now();
        const { width, height } = aspectRatioToDimensions(request.aspectRatio);

        // Create prediction
        const createResponse = await fetch(REPLICATE_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                Prefer: "wait"
            },
            body: JSON.stringify({
                model: request.model,
                input: {
                    prompt: request.prompt,
                    width,
                    height,
                    num_outputs: request.n ?? 1,
                    output_format: "webp",
                    output_quality: request.quality === "hd" ? 100 : 80
                }
            })
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Replicate API error: ${createResponse.status} - ${errorText}`);
        }

        const prediction = (await createResponse.json()) as {
            id: string;
            status: string;
            output?: string | string[];
            error?: string;
        };

        // If not completed, poll for result
        let result = prediction;
        if (prediction.status !== "succeeded") {
            result = await pollUntilComplete(
                async () => {
                    const statusResponse = await fetch(`${REPLICATE_API_URL}/${prediction.id}`, {
                        headers: { Authorization: `Bearer ${apiKey}` }
                    });

                    if (!statusResponse.ok) {
                        throw new Error(`Status check failed: ${statusResponse.status}`);
                    }

                    const status = (await statusResponse.json()) as typeof prediction;

                    if (status.status === "succeeded") {
                        return { status: "completed", result: status };
                    } else if (status.status === "failed") {
                        return { status: "failed", error: status.error ?? "Generation failed" };
                    }

                    return { status: "processing" };
                },
                DEFAULT_POLL_CONFIG,
                this.logger,
                "Replicate:ImageGeneration",
                this.provider
            );
        }

        // Parse output
        const output = result.output;
        const urls = typeof output === "string" ? [output] : (output ?? []);

        return {
            images: urls.filter(Boolean).map((url) => ({ url })),
            operation: "generate",
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model: request.model
            }
        };
    }
}
