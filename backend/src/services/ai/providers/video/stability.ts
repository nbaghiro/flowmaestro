/**
 * Stability AI video generation provider
 * Uses Stable Video Diffusion for image-to-video generation
 */

import { DEFAULT_POLL_CONFIG } from "../../infrastructure/polling";
import { AbstractProvider, type VideoGenerationProvider } from "../base";
import type {
    VideoGenerationRequest,
    VideoGenerationResponse
} from "../../capabilities/video/types";
import type { AILogger, AIProvider } from "../../client/types";

const STABILITY_API_URL = "https://api.stability.ai/v2beta";

/**
 * Stability AI video generation provider
 * Note: Stability AI video requires an image input (image-to-video only)
 */
export class StabilityVideoProvider extends AbstractProvider implements VideoGenerationProvider {
    readonly provider: AIProvider = "stabilityai";
    readonly supportedModels = ["stable-video-diffusion", "svd", "svd-xt"];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsImageInput(_model: string): boolean {
        // Stability AI video ONLY supports image-to-video
        return true;
    }

    async generate(
        request: VideoGenerationRequest,
        apiKey: string
    ): Promise<VideoGenerationResponse> {
        const startTime = Date.now();

        if (!request.imageInput) {
            throw new Error("Stability AI video generation requires an image input");
        }

        this.logger.info("Stability AI generating video", {
            model: request.model,
            hasImageInput: true
        });

        // Fetch and prepare image data
        const imageData = await this.prepareImageData(request.imageInput);

        // Create FormData for the request
        const formData = new FormData();
        const imageBlob = new Blob([Buffer.from(imageData, "base64")], { type: "image/png" });
        formData.append("image", imageBlob, "input.png");
        formData.append("seed", "0");
        formData.append("cfg_scale", "1.8");
        formData.append("motion_bucket_id", "127");

        const createResponse = await fetch(`${STABILITY_API_URL}/image-to-video`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`
            },
            body: formData
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Stability AI API error: ${createResponse.status} - ${errorText}`);
        }

        interface StabilityGenerationResponse {
            id: string;
        }

        const generationData = (await createResponse.json()) as StabilityGenerationResponse;
        const generationId = generationData.id;

        this.logger.info("Stability AI video generation created", { generationId });

        // Poll for completion
        const pollConfig = DEFAULT_POLL_CONFIG;
        let currentInterval = pollConfig.intervalMs;

        for (let attempt = 0; attempt < pollConfig.maxAttempts; attempt++) {
            await this.sleep(currentInterval);

            const statusResponse = await fetch(
                `${STABILITY_API_URL}/image-to-video/result/${generationId}`,
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        Accept: "video/*"
                    }
                }
            );

            if (statusResponse.status === 202) {
                // Still processing
                this.logger.debug("Stability AI video still processing", {
                    generationId,
                    attempt
                });
                currentInterval = Math.min(
                    currentInterval * pollConfig.backoffMultiplier,
                    pollConfig.maxIntervalMs
                );
                continue;
            }

            if (statusResponse.ok) {
                this.logger.info("Stability AI video generation complete", { generationId });

                // The response is the video data itself
                const videoBuffer = await statusResponse.arrayBuffer();
                const videoBase64 = Buffer.from(videoBuffer).toString("base64");

                return {
                    base64: videoBase64,
                    metadata: {
                        processingTimeMs: Date.now() - startTime,
                        provider: this.provider,
                        model: request.model || "stable-video-diffusion",
                        taskId: generationId,
                        duration: 4 // SVD generates ~4 second videos
                    }
                };
            }

            if (statusResponse.status >= 400) {
                const errorText = await statusResponse.text();
                throw new Error(`Stability AI generation failed: ${errorText}`);
            }
        }

        throw new Error(
            `Stability AI generation timed out after ${pollConfig.maxAttempts} polling attempts`
        );
    }

    private async prepareImageData(imageInput: string): Promise<string> {
        if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
            const imageResponse = await fetch(imageInput);
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch input image: ${imageResponse.status}`);
            }
            const imageBuffer = await imageResponse.arrayBuffer();
            return Buffer.from(imageBuffer).toString("base64");
        } else if (imageInput.startsWith("data:")) {
            // Data URL
            return imageInput.split(",")[1];
        } else {
            // Assume already base64
            return imageInput;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
