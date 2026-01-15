/**
 * Luma AI Dream Machine video generation provider
 */

import { pollUntilComplete, DEFAULT_POLL_CONFIG } from "../../infrastructure/polling";
import { AbstractProvider, type VideoGenerationProvider } from "../base";
import type {
    VideoGenerationRequest,
    VideoGenerationResponse
} from "../../capabilities/video/types";
import type { AILogger, AIProvider } from "../../client/types";

const LUMA_API_URL = "https://api.lumalabs.ai/dream-machine/v1";

/**
 * Luma AI Dream Machine video generation provider
 */
export class LumaVideoProvider extends AbstractProvider implements VideoGenerationProvider {
    readonly provider: AIProvider = "luma";
    readonly supportedModels = ["ray2", "ray1"];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsImageInput(_model: string): boolean {
        // Luma supports image-to-video via keyframes
        return true;
    }

    async generate(
        request: VideoGenerationRequest,
        apiKey: string
    ): Promise<VideoGenerationResponse> {
        const startTime = Date.now();
        const model = request.model || "ray2";

        // Build request body
        interface LumaGenerationRequest {
            prompt: string;
            model?: string;
            aspect_ratio?: string;
            loop?: boolean;
            keyframes?: {
                frame0?: { type: string; url: string };
            };
        }

        const requestBody: LumaGenerationRequest = {
            prompt: request.prompt,
            model,
            aspect_ratio: request.aspectRatio || "16:9",
            loop: false
        };

        // Add image input as keyframe if provided
        if (request.imageInput) {
            requestBody.keyframes = {
                frame0: {
                    type: "image",
                    url: request.imageInput
                }
            };
        }

        // Create the generation
        const createResponse = await fetch(`${LUMA_API_URL}/generations`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Luma API error: ${createResponse.status} - ${errorText}`);
        }

        interface LumaGenerationResponse {
            id: string;
            state: string;
            video?: { url?: string };
            failure_reason?: string;
        }

        const generationData = (await createResponse.json()) as LumaGenerationResponse;
        const generationId = generationData.id;

        // Poll for completion
        const result = await pollUntilComplete<LumaGenerationResponse>(
            async () => {
                const statusResponse = await fetch(`${LUMA_API_URL}/generations/${generationId}`, {
                    headers: {
                        Authorization: `Bearer ${apiKey}`
                    }
                });

                if (!statusResponse.ok) {
                    throw new Error(`Status check failed: ${statusResponse.status}`);
                }

                const status = (await statusResponse.json()) as LumaGenerationResponse;

                if (status.state === "completed") {
                    return { status: "completed", result: status };
                } else if (status.state === "failed") {
                    return {
                        status: "failed",
                        error: status.failure_reason || "Unknown error"
                    };
                }

                return { status: "processing" };
            },
            DEFAULT_POLL_CONFIG,
            this.logger,
            "Luma:VideoGeneration",
            this.provider
        );

        const videoUrl = result.video?.url;

        if (!videoUrl) {
            throw new Error("Luma generation completed but no video URL returned");
        }

        return {
            url: videoUrl,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model,
                taskId: generationId
            }
        };
    }
}
