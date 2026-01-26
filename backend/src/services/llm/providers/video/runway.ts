/**
 * Runway video generation provider
 */

import { pollUntilComplete, DEFAULT_POLL_CONFIG } from "../../infrastructure/polling";
import { AbstractProvider, type VideoGenerationProvider } from "../base";
import type {
    VideoGenerationRequest,
    VideoGenerationResponse
} from "../../capabilities/video/types";
import type { AILogger, AIProvider } from "../../client/types";

const RUNWAY_API_URL = "https://api.dev.runwayml.com/v1";

/**
 * Aspect ratio mapping for Runway
 */
const ASPECT_RATIO_MAP: Record<string, string> = {
    "16:9": "1280:768",
    "9:16": "768:1280",
    "1:1": "1024:1024"
};

/**
 * Runway Gen-3 Alpha video generation provider
 */
export class RunwayVideoProvider extends AbstractProvider implements VideoGenerationProvider {
    readonly provider: AIProvider = "runway";
    readonly supportedModels = ["gen3a_turbo", "gen3a"];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsImageInput(_model: string): boolean {
        // Gen-3 Alpha supports image-to-video
        return true;
    }

    async generate(
        request: VideoGenerationRequest,
        apiKey: string
    ): Promise<VideoGenerationResponse> {
        const startTime = Date.now();
        const model = request.model || "gen3a_turbo";

        // Build task options
        interface RunwayTaskOptions {
            seconds?: number;
            text_prompt: string;
            image_url?: string;
            aspect_ratio?: string;
        }

        const taskOptions: RunwayTaskOptions = {
            seconds: request.duration || 5,
            text_prompt: request.prompt
        };

        if (request.imageInput) {
            taskOptions.image_url = request.imageInput;
        }

        if (request.aspectRatio) {
            taskOptions.aspect_ratio = ASPECT_RATIO_MAP[request.aspectRatio] || "1280:768";
        }

        // Create the task
        const createResponse = await fetch(`${RUNWAY_API_URL}/tasks`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "X-Runway-Version": "2024-11-06"
            },
            body: JSON.stringify({
                taskType: model,
                options: taskOptions
            })
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Runway API error: ${createResponse.status} - ${errorText}`);
        }

        interface RunwayTaskResponse {
            id: string;
            status: string;
            output?: string[];
            failure?: string;
            failureCode?: string;
        }

        const taskData = (await createResponse.json()) as RunwayTaskResponse;
        const taskId = taskData.id;

        // Poll for completion
        const result = await pollUntilComplete<RunwayTaskResponse>(
            async () => {
                const statusResponse = await fetch(`${RUNWAY_API_URL}/tasks/${taskId}`, {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "X-Runway-Version": "2024-11-06"
                    }
                });

                if (!statusResponse.ok) {
                    throw new Error(`Status check failed: ${statusResponse.status}`);
                }

                const status = (await statusResponse.json()) as RunwayTaskResponse;

                if (status.status === "SUCCEEDED") {
                    return { status: "completed", result: status };
                } else if (status.status === "FAILED") {
                    return {
                        status: "failed",
                        error: status.failure || status.failureCode || "Unknown error"
                    };
                }

                return { status: "processing" };
            },
            DEFAULT_POLL_CONFIG,
            this.logger,
            "Runway:VideoGeneration",
            this.provider
        );

        const videoUrl = result.output?.[0];

        if (!videoUrl) {
            throw new Error("Runway generation completed but no video URL returned");
        }

        return {
            url: videoUrl,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model,
                taskId
            }
        };
    }
}
