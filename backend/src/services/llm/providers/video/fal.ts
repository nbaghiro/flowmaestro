/**
 * FAL.ai video generation provider
 */

import { pollUntilComplete, DEFAULT_POLL_CONFIG } from "../../infrastructure/polling";
import { AbstractProvider, type VideoGenerationProvider } from "../base";
import type {
    VideoGenerationRequest,
    VideoGenerationResponse
} from "../../capabilities/video/types";
import type { AILogger, AIProvider } from "../../client/types";

const FAL_QUEUE_URL = "https://queue.fal.run";

/**
 * I2V (image-to-video) model patterns
 */
const I2V_PATTERNS = ["image-to-video", "i2v", "luma-dream"];

/**
 * FAL.ai video generation provider
 * Supports Kling Video, Luma Dream Machine, and other models
 */
export class FALVideoProvider extends AbstractProvider implements VideoGenerationProvider {
    readonly provider: AIProvider = "fal";
    readonly supportedModels = [
        "fal-ai/kling-video/v2/master/text-to-video",
        "fal-ai/kling-video/v2/master/image-to-video",
        "fal-ai/luma-dream-machine",
        "fal-ai/minimax-video"
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
        const model = request.model || "fal-ai/kling-video/v2/master/text-to-video";

        // Build request body
        interface FALVideoRequest {
            prompt: string;
            image_url?: string;
            duration?: number;
            aspect_ratio?: string;
        }

        const requestBody: FALVideoRequest = {
            prompt: request.prompt
        };

        if (request.imageInput) {
            requestBody.image_url = request.imageInput;
        }

        if (request.duration) {
            requestBody.duration = request.duration;
        }

        if (request.aspectRatio) {
            requestBody.aspect_ratio = request.aspectRatio;
        }

        // Submit to FAL queue
        const submitResponse = await fetch(`${FAL_QUEUE_URL}/${model}`, {
            method: "POST",
            headers: {
                Authorization: `Key ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!submitResponse.ok) {
            const errorText = await submitResponse.text();
            throw new Error(`FAL.ai API error: ${submitResponse.status} - ${errorText}`);
        }

        interface FALQueueResponse {
            request_id: string;
            status_url?: string;
            response_url?: string;
        }

        const queueData = (await submitResponse.json()) as FALQueueResponse;
        const requestId = queueData.request_id;

        // Poll for completion
        interface FALStatusResponse {
            status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
            response?: {
                video?: {
                    url: string;
                };
            };
            error?: string;
        }

        const result = await pollUntilComplete<FALStatusResponse>(
            async () => {
                const statusResponse = await fetch(
                    `${FAL_QUEUE_URL}/${model}/requests/${requestId}`,
                    {
                        headers: {
                            Authorization: `Key ${apiKey}`
                        }
                    }
                );

                if (!statusResponse.ok) {
                    const errorText = await statusResponse.text();
                    throw new Error(
                        `FAL.ai status check error: ${statusResponse.status} - ${errorText}`
                    );
                }

                const status = (await statusResponse.json()) as FALStatusResponse;

                if (status.status === "COMPLETED") {
                    return { status: "completed", result: status };
                } else if (status.status === "FAILED") {
                    return {
                        status: "failed",
                        error: status.error || "Unknown error"
                    };
                }

                return { status: "processing" };
            },
            DEFAULT_POLL_CONFIG,
            this.logger,
            "FAL:VideoGeneration",
            this.provider
        );

        const videoUrl = result.response?.video?.url;

        if (!videoUrl) {
            throw new Error("FAL.ai completed but no video URL in response");
        }

        return {
            url: videoUrl,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model,
                taskId: requestId
            }
        };
    }
}
