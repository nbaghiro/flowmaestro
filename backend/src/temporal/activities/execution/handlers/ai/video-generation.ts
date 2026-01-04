/**
 * Video Generation Node Execution
 *
 * Dedicated handler for AI video generation.
 * Supports Google Veo, Runway Gen-3 Alpha, Luma Dream Machine, and Stability AI models.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { config as appConfig } from "../../../../../core/config";
import { ConnectionRepository } from "../../../../../storage/repositories/ConnectionRepository";
import { activityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

// ============================================================================
// TYPES
// ============================================================================

export interface VideoGenerationNodeConfig {
    provider: "google" | "replicate" | "runway" | "luma" | "stabilityai";
    model: string;
    connectionId?: string;
    prompt: string;
    imageInput?: string;
    duration?: number;
    aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";
    loop?: boolean;
    outputFormat?: "url" | "base64";
    outputVariable?: string;
}

export interface VideoGenerationNodeResult {
    provider: string;
    model: string;
    video: {
        url?: string;
        base64?: string;
    };
    metadata?: {
        processingTime: number;
        duration?: number;
        taskId?: string;
    };
}

// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================

async function getProviderApiKey(provider: string, connectionId?: string): Promise<string> {
    if (connectionId) {
        try {
            const connectionRepo = new ConnectionRepository();
            const connection = await connectionRepo.findByIdWithData(connectionId);
            if (connection?.data) {
                const data = connection.data as { api_key?: string };
                if (data.api_key) {
                    activityLogger.debug("Using API key from connection", {
                        provider,
                        connectionId
                    });
                    return data.api_key;
                }
            }
        } catch (error) {
            activityLogger.warn("Failed to get API key from connection, falling back to env", {
                provider,
                connectionId,
                error: error instanceof Error ? error.message : "Unknown error"
            });
        }
    }

    const envMapping: Record<string, string> = {
        google: appConfig.ai.google?.apiKey || "",
        replicate: appConfig.ai.replicate?.apiKey || "",
        runway: appConfig.ai.runway?.apiKey || "",
        luma: appConfig.ai.luma?.apiKey || "",
        stabilityai: appConfig.ai.stabilityai?.apiKey || ""
    };

    const apiKey = envMapping[provider];
    if (!apiKey) {
        throw new Error(
            `No API key available for ${provider}. ` +
                "Either provide a connectionId or set the environment variable."
        );
    }

    return apiKey;
}

// ============================================================================
// POLLING UTILITIES
// ============================================================================

interface PollConfig {
    maxAttempts: number;
    intervalMs: number;
    backoffMultiplier: number;
    maxIntervalMs: number;
}

const DEFAULT_POLL_CONFIG: PollConfig = {
    maxAttempts: 120, // 10 minutes with 5s intervals
    intervalMs: 5000,
    backoffMultiplier: 1.5,
    maxIntervalMs: 30000
};

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

/**
 * Google Veo Video Generation
 * API: https://generativelanguage.googleapis.com/v1beta
 */
async function executeGoogleVeoGeneration(
    config: VideoGenerationNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const apiKey = await getProviderApiKey("google", config.connectionId);

    const prompt = interpolateVariables(config.prompt || "", context);
    const imageInput = config.imageInput
        ? interpolateVariables(config.imageInput, context)
        : undefined;

    activityLogger.info("Google Veo generating video", {
        model: config.model,
        promptLength: prompt.length,
        hasImageInput: !!imageInput
    });

    // Map model names to API model IDs
    const modelMapping: Record<string, string> = {
        "veo-3": "veo-3.0-generate-preview",
        "veo-3-fast": "veo-3.0-fast-generate-preview",
        "veo-2": "veo-2.0-generate-001"
    };

    const apiModel = modelMapping[config.model] || "veo-3.0-generate-preview";

    // Build request body
    interface VeoInstance {
        prompt: string;
        image?: { bytesBase64Encoded: string };
    }

    const instance: VeoInstance = { prompt };

    // Add image input if provided (for image-to-video)
    if (imageInput) {
        let imageBase64: string;

        if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
            const imageResponse = await fetch(imageInput);
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch input image: ${imageResponse.status}`);
            }
            const imageBuffer = await imageResponse.arrayBuffer();
            imageBase64 = Buffer.from(imageBuffer).toString("base64");
        } else if (imageInput.startsWith("data:")) {
            imageBase64 = imageInput.split(",")[1];
        } else {
            imageBase64 = imageInput;
        }

        instance.image = { bytesBase64Encoded: imageBase64 };
    }

    interface VeoParameters {
        aspectRatio?: string;
        durationSeconds?: string;
        resolution?: string;
    }

    const parameters: VeoParameters = {
        aspectRatio: config.aspectRatio || "16:9",
        durationSeconds: String(config.duration || 8)
    };

    // Veo 3 supports resolution parameter
    if (config.model?.includes("veo-3")) {
        parameters.resolution = "720p";
    }

    const createResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:predictLongRunning`,
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

    let operation = (await createResponse.json()) as VeoOperationResponse;
    const operationName = operation.name;

    activityLogger.info("Google Veo operation created", { operationName });

    // Poll for completion
    const pollConfig = DEFAULT_POLL_CONFIG;
    let currentInterval = pollConfig.intervalMs;

    for (let attempt = 0; attempt < pollConfig.maxAttempts; attempt++) {
        if (operation.done) {
            break;
        }

        await sleep(currentInterval);

        const statusResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
            {
                headers: {
                    "x-goog-api-key": apiKey
                }
            }
        );

        if (!statusResponse.ok) {
            activityLogger.warn("Google Veo status check failed", {
                operationName,
                attempt,
                status: statusResponse.status
            });
            continue;
        }

        operation = (await statusResponse.json()) as VeoOperationResponse;

        if (operation.error) {
            throw new Error(
                `Google Veo generation failed: ${operation.error.message || "Unknown error"}`
            );
        }

        activityLogger.debug("Google Veo operation still processing", {
            operationName,
            done: operation.done,
            attempt
        });

        currentInterval = Math.min(
            currentInterval * pollConfig.backoffMultiplier,
            pollConfig.maxIntervalMs
        );
    }

    if (!operation.done) {
        throw new Error(
            `Google Veo generation timed out after ${pollConfig.maxAttempts} polling attempts`
        );
    }

    const videoUrl = operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

    if (!videoUrl) {
        throw new Error("Google Veo generation completed but no video URL returned");
    }

    activityLogger.info("Google Veo video generation complete", { operationName });

    return {
        provider: "google",
        model: config.model || "veo-3",
        video: {
            url: videoUrl
        },
        metadata: {
            processingTime: 0,
            taskId: operationName,
            duration: config.duration || 8
        }
    } as unknown as JsonObject;
}

/**
 * Replicate Video Generation
 * API: https://api.replicate.com/v1/predictions
 * Supports Wan 2.5, MiniMax, and other video models
 */
async function executeReplicateVideoGeneration(
    config: VideoGenerationNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const apiKey = await getProviderApiKey("replicate", config.connectionId);

    const prompt = interpolateVariables(config.prompt || "", context);
    const imageInput = config.imageInput
        ? interpolateVariables(config.imageInput, context)
        : undefined;

    activityLogger.info("Replicate generating video", {
        model: config.model,
        promptLength: prompt.length,
        hasImageInput: !!imageInput
    });

    // Build input based on model type
    interface ReplicateVideoInput {
        prompt: string;
        image?: string;
        aspect_ratio?: string;
        duration?: number;
        num_frames?: number;
    }

    const input: ReplicateVideoInput = {
        prompt,
        aspect_ratio: config.aspectRatio || "16:9"
    };

    // Add image input for I2V models
    if (imageInput) {
        input.image = imageInput;
    }

    // Some models use duration, others use num_frames
    if (config.duration) {
        input.duration = config.duration;
    }

    // Create prediction
    const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Prefer: "wait"
        },
        body: JSON.stringify({
            model: config.model,
            input
        })
    });

    if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Replicate API error: ${createResponse.status} - ${errorText}`);
    }

    interface ReplicatePrediction {
        id: string;
        status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
        output?: string | string[];
        error?: string;
    }

    let prediction = (await createResponse.json()) as ReplicatePrediction;

    // Poll for completion if not already done
    const pollConfig = DEFAULT_POLL_CONFIG;
    let currentInterval = pollConfig.intervalMs;

    for (let attempt = 0; attempt < pollConfig.maxAttempts; attempt++) {
        if (prediction.status === "succeeded" || prediction.status === "failed") {
            break;
        }

        await sleep(currentInterval);

        const pollResponse = await fetch(
            `https://api.replicate.com/v1/predictions/${prediction.id}`,
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`
                }
            }
        );

        if (!pollResponse.ok) {
            activityLogger.warn("Replicate poll error", {
                id: prediction.id,
                attempt,
                status: pollResponse.status
            });
            continue;
        }

        prediction = (await pollResponse.json()) as ReplicatePrediction;

        activityLogger.debug("Replicate prediction status", {
            id: prediction.id,
            status: prediction.status,
            attempt
        });

        currentInterval = Math.min(
            currentInterval * pollConfig.backoffMultiplier,
            pollConfig.maxIntervalMs
        );
    }

    if (prediction.status === "failed") {
        throw new Error(
            `Replicate video generation failed: ${prediction.error || "Unknown error"}`
        );
    }

    if (prediction.status !== "succeeded") {
        throw new Error(
            `Replicate video generation timed out after ${pollConfig.maxAttempts} polling attempts`
        );
    }

    // Handle output - video URL is typically the first (or only) output
    const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;

    if (!outputUrl) {
        throw new Error("Replicate video generation completed but no video URL returned");
    }

    activityLogger.info("Replicate video generation complete", { id: prediction.id });

    return {
        provider: "replicate",
        model: config.model,
        video: {
            url: outputUrl
        },
        metadata: {
            processingTime: 0,
            taskId: prediction.id,
            duration: config.duration || 5
        }
    } as unknown as JsonObject;
}

/**
 * Runway Gen-3 Alpha Video Generation
 * API: https://api.dev.runwayml.com/v1/
 */
async function executeRunwayGeneration(
    config: VideoGenerationNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const apiKey = await getProviderApiKey("runway", config.connectionId);

    const prompt = interpolateVariables(config.prompt || "", context);
    const imageInput = config.imageInput
        ? interpolateVariables(config.imageInput, context)
        : undefined;

    activityLogger.info("Runway generating video", {
        model: config.model,
        promptLength: prompt.length,
        hasImageInput: !!imageInput
    });

    const model = config.model || "gen3a_turbo";

    // Create the generation task
    interface RunwayTaskOptions {
        seconds?: number;
        text_prompt: string;
        image_url?: string;
        aspect_ratio?: string;
    }

    const taskOptions: RunwayTaskOptions = {
        seconds: config.duration || 5,
        text_prompt: prompt
    };

    if (imageInput) {
        taskOptions.image_url = imageInput;
    }

    // Map aspect ratio to Runway format
    if (config.aspectRatio) {
        const aspectRatioMap: Record<string, string> = {
            "16:9": "1280:768",
            "9:16": "768:1280",
            "1:1": "1024:1024"
        };
        taskOptions.aspect_ratio = aspectRatioMap[config.aspectRatio] || "1280:768";
    }

    const createResponse = await fetch("https://api.dev.runwayml.com/v1/tasks", {
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

    activityLogger.info("Runway task created", { taskId });

    // Poll for completion
    const pollConfig = DEFAULT_POLL_CONFIG;
    let currentInterval = pollConfig.intervalMs;

    for (let attempt = 0; attempt < pollConfig.maxAttempts; attempt++) {
        await sleep(currentInterval);

        const statusResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "X-Runway-Version": "2024-11-06"
            }
        });

        if (!statusResponse.ok) {
            activityLogger.warn("Runway status check failed", {
                taskId,
                attempt,
                status: statusResponse.status
            });
            continue;
        }

        const statusData = (await statusResponse.json()) as RunwayTaskResponse;

        if (statusData.status === "SUCCEEDED") {
            activityLogger.info("Runway video generation complete", { taskId });

            return {
                provider: "runway",
                model,
                video: {
                    url: statusData.output?.[0]
                },
                metadata: {
                    processingTime: 0,
                    taskId,
                    duration: config.duration || 5
                }
            } as unknown as JsonObject;
        }

        if (statusData.status === "FAILED") {
            throw new Error(
                `Runway generation failed: ${statusData.failure || statusData.failureCode || "Unknown error"}`
            );
        }

        activityLogger.debug("Runway task still processing", {
            taskId,
            status: statusData.status,
            attempt
        });

        // Increase interval with backoff
        currentInterval = Math.min(
            currentInterval * pollConfig.backoffMultiplier,
            pollConfig.maxIntervalMs
        );
    }

    throw new Error(`Runway generation timed out after ${pollConfig.maxAttempts} polling attempts`);
}

/**
 * Luma AI Dream Machine Video Generation
 * API: https://api.lumalabs.ai/dream-machine/v1/
 */
async function executeLumaGeneration(
    config: VideoGenerationNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const apiKey = await getProviderApiKey("luma", config.connectionId);

    const prompt = interpolateVariables(config.prompt || "", context);
    const imageInput = config.imageInput
        ? interpolateVariables(config.imageInput, context)
        : undefined;

    activityLogger.info("Luma generating video", {
        model: config.model,
        promptLength: prompt.length,
        hasImageInput: !!imageInput
    });

    const model = config.model || "ray2";

    // Create the generation request
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
        prompt,
        model,
        aspect_ratio: config.aspectRatio || "16:9",
        loop: config.loop || false
    };

    // Add image input as keyframe if provided
    if (imageInput) {
        requestBody.keyframes = {
            frame0: {
                type: "image",
                url: imageInput
            }
        };
    }

    const createResponse = await fetch("https://api.lumalabs.ai/dream-machine/v1/generations", {
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

    activityLogger.info("Luma generation created", { generationId });

    // Poll for completion
    const pollConfig = DEFAULT_POLL_CONFIG;
    let currentInterval = pollConfig.intervalMs;

    for (let attempt = 0; attempt < pollConfig.maxAttempts; attempt++) {
        await sleep(currentInterval);

        const statusResponse = await fetch(
            `https://api.lumalabs.ai/dream-machine/v1/generations/${generationId}`,
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`
                }
            }
        );

        if (!statusResponse.ok) {
            activityLogger.warn("Luma status check failed", {
                generationId,
                attempt,
                status: statusResponse.status
            });
            continue;
        }

        const statusData = (await statusResponse.json()) as LumaGenerationResponse;

        if (statusData.state === "completed") {
            activityLogger.info("Luma video generation complete", { generationId });

            return {
                provider: "luma",
                model,
                video: {
                    url: statusData.video?.url
                },
                metadata: {
                    processingTime: 0,
                    taskId: generationId,
                    duration: config.duration || 5
                }
            } as unknown as JsonObject;
        }

        if (statusData.state === "failed") {
            throw new Error(
                `Luma generation failed: ${statusData.failure_reason || "Unknown error"}`
            );
        }

        activityLogger.debug("Luma generation still processing", {
            generationId,
            state: statusData.state,
            attempt
        });

        // Increase interval with backoff
        currentInterval = Math.min(
            currentInterval * pollConfig.backoffMultiplier,
            pollConfig.maxIntervalMs
        );
    }

    throw new Error(`Luma generation timed out after ${pollConfig.maxAttempts} polling attempts`);
}

/**
 * Stability AI Video Generation (Stable Video Diffusion)
 * API: https://api.stability.ai/v2beta/
 */
async function executeStabilityAIGeneration(
    config: VideoGenerationNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const apiKey = await getProviderApiKey("stabilityai", config.connectionId);

    const imageInput = config.imageInput
        ? interpolateVariables(config.imageInput, context)
        : undefined;

    if (!imageInput) {
        throw new Error("Stability AI video generation requires an image input");
    }

    activityLogger.info("Stability AI generating video", {
        model: config.model,
        hasImageInput: !!imageInput
    });

    // Stability AI's video generation requires an image input
    // First, fetch the image if it's a URL
    let imageData: string;

    if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
        const imageResponse = await fetch(imageInput);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch input image: ${imageResponse.status}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        imageData = Buffer.from(imageBuffer).toString("base64");
    } else if (imageInput.startsWith("data:")) {
        // Data URL
        imageData = imageInput.split(",")[1];
    } else {
        // Assume it's already base64
        imageData = imageInput;
    }

    // Create FormData for the request
    const formData = new FormData();
    const imageBlob = new Blob([Buffer.from(imageData, "base64")], { type: "image/png" });
    formData.append("image", imageBlob, "input.png");
    formData.append("seed", "0");
    formData.append("cfg_scale", "1.8");
    formData.append("motion_bucket_id", "127");

    const createResponse = await fetch("https://api.stability.ai/v2beta/image-to-video", {
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

    activityLogger.info("Stability AI video generation created", { generationId });

    // Poll for completion
    const pollConfig = DEFAULT_POLL_CONFIG;
    let currentInterval = pollConfig.intervalMs;

    for (let attempt = 0; attempt < pollConfig.maxAttempts; attempt++) {
        await sleep(currentInterval);

        const statusResponse = await fetch(
            `https://api.stability.ai/v2beta/image-to-video/result/${generationId}`,
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    Accept: "video/*"
                }
            }
        );

        if (statusResponse.status === 202) {
            // Still processing
            activityLogger.debug("Stability AI video still processing", {
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
            activityLogger.info("Stability AI video generation complete", { generationId });

            // The response is the video data itself
            const videoBuffer = await statusResponse.arrayBuffer();
            const videoBase64 = Buffer.from(videoBuffer).toString("base64");

            return {
                provider: "stabilityai",
                model: config.model || "stable-video-diffusion",
                video: {
                    base64: videoBase64
                },
                metadata: {
                    processingTime: 0,
                    taskId: generationId,
                    duration: 4 // SVD generates ~4 second videos
                }
            } as unknown as JsonObject;
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

// ============================================================================
// EXECUTOR
// ============================================================================

export async function executeVideoGenerationNode(
    config: VideoGenerationNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const startTime = Date.now();

    activityLogger.info("Executing video generation node", {
        provider: config.provider,
        model: config.model
    });

    let result: JsonObject;

    switch (config.provider) {
        case "google":
            result = await executeGoogleVeoGeneration(config, context);
            break;

        case "replicate":
            result = await executeReplicateVideoGeneration(config, context);
            break;

        case "runway":
            result = await executeRunwayGeneration(config, context);
            break;

        case "luma":
            result = await executeLumaGeneration(config, context);
            break;

        case "stabilityai":
            result = await executeStabilityAIGeneration(config, context);
            break;

        default:
            throw new Error(`Unsupported video generation provider: ${config.provider}`);
    }

    result.metadata = {
        ...(result.metadata as JsonObject),
        processingTime: Date.now() - startTime
    };

    activityLogger.info("Video generation node execution completed", {
        processingTimeMs: (result.metadata as JsonObject)?.processingTime
    });

    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }

    return result as unknown as JsonObject;
}

// ============================================================================
// HANDLER
// ============================================================================

export class VideoGenerationNodeHandler extends BaseNodeHandler {
    readonly name = "VideoGenerationNodeHandler";
    readonly supportedNodeTypes = ["videoGeneration"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const result = await executeVideoGenerationNode(
            input.nodeConfig as unknown as VideoGenerationNodeConfig,
            context
        );

        return this.success(
            result as unknown as JsonObject,
            {},
            {
                durationMs: Date.now() - startTime
            }
        );
    }
}

export function createVideoGenerationNodeHandler(): VideoGenerationNodeHandler {
    return new VideoGenerationNodeHandler();
}
