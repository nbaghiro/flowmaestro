/**
 * Image Generation Node Execution
 *
 * Dedicated handler for AI image generation.
 * Supports OpenAI DALL-E, Replicate Flux, and Stability AI models.
 */

import OpenAI from "openai";
import type { JsonObject } from "@flowmaestro/shared";
import { config as appConfig } from "../../../../../core/config";
import { ConnectionRepository } from "../../../../../storage/repositories/ConnectionRepository";
import { activityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

// ============================================================================
// TYPES
// ============================================================================

export interface ImageGenerationNodeConfig {
    provider: "openai" | "replicate" | "stabilityai";
    model: string;
    connectionId?: string;
    prompt: string;
    negativePrompt?: string;
    size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792";
    aspectRatio?: "1:1" | "16:9" | "9:16" | "21:9" | "9:21" | "4:3" | "3:4" | "3:2" | "2:3";
    quality?: "standard" | "hd";
    style?: "vivid" | "natural";
    n?: number;
    outputFormat?: "url" | "base64";
    outputVariable?: string;
}

export interface ImageGenerationNodeResult {
    provider: string;
    model: string;
    images: Array<{
        url?: string;
        base64?: string;
        revisedPrompt?: string;
    }>;
    metadata?: {
        processingTime: number;
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
        openai: appConfig.ai.openai.apiKey,
        replicate: appConfig.ai.replicate?.apiKey || "",
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
// PROVIDER IMPLEMENTATIONS
// ============================================================================

async function executeOpenAIGeneration(
    config: ImageGenerationNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const apiKey = await getProviderApiKey("openai", config.connectionId);
    const openai = new OpenAI({ apiKey });

    const prompt = interpolateVariables(config.prompt || "", context);

    activityLogger.info("OpenAI generating image", {
        model: config.model,
        promptLength: prompt.length
    });

    const isDallE3 = config.model === "dall-e-3";

    const response = await openai.images.generate({
        model: config.model || "dall-e-3",
        prompt,
        n: isDallE3 ? 1 : config.n || 1, // DALL-E 3 only supports n=1
        size: config.size || "1024x1024",
        quality: isDallE3 ? config.quality || "standard" : undefined,
        style: isDallE3 ? config.style || "vivid" : undefined,
        response_format: config.outputFormat === "base64" ? "b64_json" : "url"
    });

    const images = (response.data ?? []).map((img) => ({
        url: img.url,
        base64: img.b64_json,
        revisedPrompt: img.revised_prompt
    }));

    activityLogger.info("OpenAI image generation complete", { imageCount: images.length });

    return {
        provider: "openai",
        model: config.model || "dall-e-3",
        images,
        metadata: {
            processingTime: 0
        }
    } as unknown as JsonObject;
}

async function executeReplicateGeneration(
    config: ImageGenerationNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const apiKey = await getProviderApiKey("replicate", config.connectionId);

    const prompt = interpolateVariables(config.prompt || "", context);

    activityLogger.info("Replicate generating image", {
        model: config.model,
        promptLength: prompt.length
    });

    // Map aspect ratio to width/height for Flux models
    const aspectRatioMap: Record<string, { width: number; height: number }> = {
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

    const dimensions = aspectRatioMap[config.aspectRatio || "1:1"] || { width: 1024, height: 1024 };

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
            input: {
                prompt,
                width: dimensions.width,
                height: dimensions.height,
                num_outputs: config.n || 1,
                output_format: "webp",
                output_quality: config.quality === "hd" ? 100 : 80
            }
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
        urls?: {
            get: string;
        };
    }

    let prediction = (await createResponse.json()) as ReplicatePrediction;

    // Poll for completion if not already done (Prefer: wait should handle most cases)
    const maxAttempts = 120; // 2 minutes with 1s intervals
    let attempts = 0;

    while (
        prediction.status !== "succeeded" &&
        prediction.status !== "failed" &&
        attempts < maxAttempts
    ) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;

        const pollResponse = await fetch(
            `https://api.replicate.com/v1/predictions/${prediction.id}`,
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`
                }
            }
        );

        if (!pollResponse.ok) {
            throw new Error(`Replicate poll error: ${pollResponse.status}`);
        }

        prediction = (await pollResponse.json()) as ReplicatePrediction;

        activityLogger.debug("Replicate prediction status", {
            id: prediction.id,
            status: prediction.status,
            attempt: attempts
        });
    }

    if (prediction.status === "failed") {
        throw new Error(`Replicate prediction failed: ${prediction.error || "Unknown error"}`);
    }

    if (prediction.status !== "succeeded") {
        throw new Error("Replicate prediction timed out");
    }

    // Handle output - can be string or array of strings
    const outputUrls = Array.isArray(prediction.output) ? prediction.output : [prediction.output];

    const images = outputUrls.filter(Boolean).map((url) => ({
        url: url as string
    }));

    activityLogger.info("Replicate image generation complete", { imageCount: images.length });

    return {
        provider: "replicate",
        model: config.model,
        images,
        metadata: {
            processingTime: 0
        }
    } as unknown as JsonObject;
}

async function executeStabilityAIGeneration(
    config: ImageGenerationNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const apiKey = await getProviderApiKey("stabilityai", config.connectionId);

    const prompt = interpolateVariables(config.prompt || "", context);
    const negativePrompt = config.negativePrompt
        ? interpolateVariables(config.negativePrompt, context)
        : undefined;

    activityLogger.info("Stability AI generating image", {
        model: config.model,
        promptLength: prompt.length
    });

    const model = config.model || "sd3-large";
    let endpoint: string;
    let requestBody: Record<string, unknown>;

    // Map size to aspect ratio if aspect ratio not specified
    const aspectRatio =
        config.aspectRatio ||
        (config.size === "1792x1024" ? "16:9" : config.size === "1024x1792" ? "9:16" : "1:1");

    if (model.startsWith("sd3")) {
        // SD3 endpoint
        endpoint = "https://api.stability.ai/v2beta/stable-image/generate/sd3";
        requestBody = {
            prompt,
            negative_prompt: negativePrompt,
            model,
            aspect_ratio: aspectRatio,
            output_format: "png"
        };
    } else if (model.includes("ultra") || model.includes("core")) {
        // Stable Image Ultra/Core endpoint
        endpoint = `https://api.stability.ai/v2beta/stable-image/generate/${model.includes("ultra") ? "ultra" : "core"}`;
        requestBody = {
            prompt,
            negative_prompt: negativePrompt,
            aspect_ratio: aspectRatio,
            output_format: "png"
        };
    } else {
        // SDXL endpoint
        endpoint =
            "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image";
        const [width, height] = (config.size || "1024x1024").split("x").map(Number);
        requestBody = {
            text_prompts: [
                { text: prompt, weight: 1 },
                ...(negativePrompt ? [{ text: negativePrompt, weight: -1 }] : [])
            ],
            cfg_scale: 7,
            height,
            width,
            samples: config.n || 1,
            steps: 30
        };
    }

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stability AI API error: ${response.status} - ${errorText}`);
    }

    interface StabilityImage {
        base64?: string;
        image?: string;
        seed?: number;
    }

    interface StabilityResponse {
        image?: string;
        artifacts?: StabilityImage[];
        images?: StabilityImage[];
        seed?: number;
    }

    const data = (await response.json()) as StabilityResponse;

    let images: Array<{ url?: string; base64?: string }>;

    if (data.image) {
        // SD3/Ultra/Core format
        images = [{ base64: data.image }];
    } else if (data.artifacts) {
        // SDXL format
        images = data.artifacts.map((artifact) => ({
            base64: artifact.base64
        }));
    } else if (data.images) {
        // Alternative format
        images = data.images.map((img) => ({
            base64: img.image || img.base64
        }));
    } else {
        throw new Error("Unexpected response format from Stability AI");
    }

    activityLogger.info("Stability AI image generation complete", { imageCount: images.length });

    return {
        provider: "stabilityai",
        model: config.model || "sd3-large",
        images,
        metadata: {
            processingTime: 0
        }
    } as unknown as JsonObject;
}

// ============================================================================
// EXECUTOR
// ============================================================================

export async function executeImageGenerationNode(
    config: ImageGenerationNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const startTime = Date.now();

    activityLogger.info("Executing image generation node", {
        provider: config.provider,
        model: config.model
    });

    let result: JsonObject;

    switch (config.provider) {
        case "openai":
            result = await executeOpenAIGeneration(config, context);
            break;

        case "replicate":
            result = await executeReplicateGeneration(config, context);
            break;

        case "stabilityai":
            result = await executeStabilityAIGeneration(config, context);
            break;

        default:
            throw new Error(`Unsupported image generation provider: ${config.provider}`);
    }

    result.metadata = {
        ...(result.metadata as JsonObject),
        processingTime: Date.now() - startTime
    };

    activityLogger.info("Image generation node execution completed", {
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

export class ImageGenerationNodeHandler extends BaseNodeHandler {
    readonly name = "ImageGenerationNodeHandler";
    readonly supportedNodeTypes = ["imageGeneration"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const result = await executeImageGenerationNode(
            input.nodeConfig as unknown as ImageGenerationNodeConfig,
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

export function createImageGenerationNodeHandler(): ImageGenerationNodeHandler {
    return new ImageGenerationNodeHandler();
}
