/**
 * Google Veo video generation provider
 */

import { pollUntilComplete, DEFAULT_POLL_CONFIG } from "../../core/polling";
import { AbstractProvider, type VideoGenerationProvider } from "../base";
import type {
    VideoGenerationRequest,
    VideoGenerationResponse
} from "../../capabilities/video/types";
import type { AILogger, AIProvider } from "../../types";

const GOOGLE_AI_URL = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Model name to API model ID mapping
 */
const MODEL_MAPPING: Record<string, string> = {
    "veo-3": "veo-3.0-generate-preview",
    "veo-3-fast": "veo-3.0-fast-generate-preview",
    "veo-2": "veo-2.0-generate-001"
};

/**
 * Google Veo video generation provider
 */
export class GoogleVideoProvider extends AbstractProvider implements VideoGenerationProvider {
    readonly provider: AIProvider = "google";
    readonly supportedModels = ["veo-3", "veo-3-fast", "veo-2"];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsImageInput(_model: string): boolean {
        // All Veo models support image-to-video
        return true;
    }

    async generate(
        request: VideoGenerationRequest,
        apiKey: string
    ): Promise<VideoGenerationResponse> {
        const startTime = Date.now();
        const apiModel = MODEL_MAPPING[request.model] || "veo-3.0-generate-preview";

        // Build request body
        interface VeoInstance {
            prompt: string;
            image?: { bytesBase64Encoded: string };
        }

        const instance: VeoInstance = { prompt: request.prompt };

        // Add image input if provided (for image-to-video)
        if (request.imageInput) {
            const imageBase64 = await this.fetchImageAsBase64(request.imageInput);
            instance.image = { bytesBase64Encoded: imageBase64 };
        }

        interface VeoParameters {
            aspectRatio?: string;
            durationSeconds?: string;
            resolution?: string;
        }

        const parameters: VeoParameters = {
            aspectRatio: request.aspectRatio || "16:9",
            durationSeconds: String(request.duration || 8)
        };

        // Veo 3 supports resolution parameter
        if (request.model?.includes("veo-3")) {
            parameters.resolution = "720p";
        }

        // Create the long-running operation
        const createResponse = await fetch(
            `${GOOGLE_AI_URL}/models/${apiModel}:predictLongRunning`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },
                body: JSON.stringify({
                    instances: [instance],
                    parameters
                })
            }
        );

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Google Veo API error: ${createResponse.status} - ${errorText}`);
        }

        interface VeoOperationResponse {
            name: string;
            done: boolean;
            response?: {
                generateVideoResponse?: {
                    generatedSamples?: Array<{
                        video?: { uri?: string };
                    }>;
                };
            };
            error?: {
                message: string;
                code: number;
            };
        }

        const operation = (await createResponse.json()) as VeoOperationResponse;
        const operationName = operation.name;

        // Poll for completion
        const result = await pollUntilComplete<VeoOperationResponse>(
            async () => {
                const statusResponse = await fetch(`${GOOGLE_AI_URL}/${operationName}`, {
                    headers: {
                        "x-goog-api-key": apiKey
                    }
                });

                if (!statusResponse.ok) {
                    throw new Error(`Status check failed: ${statusResponse.status}`);
                }

                const status = (await statusResponse.json()) as VeoOperationResponse;

                if (status.error) {
                    return {
                        status: "failed",
                        error: status.error.message || "Unknown error"
                    };
                }

                if (status.done) {
                    return { status: "completed", result: status };
                }

                return { status: "processing" };
            },
            DEFAULT_POLL_CONFIG,
            this.logger,
            "GoogleVeo:VideoGeneration",
            this.provider
        );

        const videoUrl = result.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

        if (!videoUrl) {
            throw new Error("Google Veo generation completed but no video URL returned");
        }

        return {
            url: videoUrl,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model: request.model || "veo-3",
                taskId: operationName
            }
        };
    }

    private async fetchImageAsBase64(imageInput: string): Promise<string> {
        if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
            const imageResponse = await fetch(imageInput);
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch input image: ${imageResponse.status}`);
            }
            const imageBuffer = await imageResponse.arrayBuffer();
            return Buffer.from(imageBuffer).toString("base64");
        } else if (imageInput.startsWith("data:")) {
            return imageInput.split(",")[1];
        } else {
            return imageInput;
        }
    }
}
