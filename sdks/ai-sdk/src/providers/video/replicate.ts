/**
 * Replicate video generation provider
 */

import { pollUntilComplete, DEFAULT_POLL_CONFIG } from "../../core/polling";
import { AbstractProvider, type VideoGenerationProvider } from "../base";
import type {
    VideoGenerationRequest,
    VideoGenerationResponse
} from "../../capabilities/video/types";
import type { AILogger, AIProvider } from "../../types";

const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";

/**
 * I2V (image-to-video) model patterns
 */
const I2V_PATTERNS = ["i2v", "image-to-video", "luma-dream"];

/**
 * Replicate video generation provider
 */
export class ReplicateVideoProvider extends AbstractProvider implements VideoGenerationProvider {
    readonly provider: AIProvider = "replicate";
    readonly supportedModels = [
        "wan-video/wan-2.5-t2v-720p",
        "wan-video/wan-2.5-i2v-720p",
        "minimax/video-01"
    ];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsImageInput(model: string): boolean {
        return I2V_PATTERNS.some((pattern) => model.toLowerCase().includes(pattern));
    }

    async generate(
        request: VideoGenerationRequest,
        apiKey: string
    ): Promise<VideoGenerationResponse> {
        const startTime = Date.now();
        const isI2V = this.supportsImageInput(request.model);

        // Build input based on model type
        const input: Record<string, unknown> = {
            prompt: request.prompt,
            aspect_ratio: request.aspectRatio ?? "16:9"
        };

        if (request.duration) {
            input.duration = request.duration;
        }

        if (isI2V && request.imageInput) {
            input.image = request.imageInput;
        }

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
                input
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

        // Poll for result if not completed
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
                "Replicate:VideoGeneration",
                this.provider
            );
        }

        // Parse output
        const output = result.output;
        const url = typeof output === "string" ? output : output?.[0];

        return {
            url,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model: request.model,
                taskId: prediction.id
            }
        };
    }
}
