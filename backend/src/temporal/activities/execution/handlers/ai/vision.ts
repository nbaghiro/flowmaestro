/**
 * Vision Node Execution
 *
 * Complete execution logic and handler for vision/image nodes.
 * Supports image analysis and generation with OpenAI, Anthropic, and Google.
 */

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import type { JsonObject } from "@flowmaestro/shared";
import { config as appConfig } from "../../../../../core/config";
import { activityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import {
    BaseNodeHandler,
    type NodeHandlerInput,
    type NodeHandlerOutput,
    type TokenUsage
} from "../../types";

// ============================================================================
// TYPES
// ============================================================================

export interface VisionNodeConfig {
    provider: "openai" | "anthropic" | "google";
    model: string;
    operation: "analyze" | "generate";

    // For analyze operation
    imageInput?: string;
    prompt?: string;
    detail?: "low" | "high" | "auto";

    // For generate operation (OpenAI only)
    generationPrompt?: string;
    size?: "1024x1024" | "1792x1024" | "1024x1792";
    quality?: "standard" | "hd";
    style?: "vivid" | "natural";
    n?: number;

    // Common parameters
    maxTokens?: number;
    outputFormat?: "url" | "base64";
    outputVariable?: string;
}

export interface VisionNodeResult {
    operation: string;
    provider: string;
    model: string;
    analysis?: string;
    images?: Array<{
        url?: string;
        base64?: string;
        revisedPrompt?: string;
    }>;
    metadata?: {
        processingTime: number;
        tokensUsed?: number;
    };
}

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

async function executeOpenAI(config: VisionNodeConfig, context: JsonObject): Promise<JsonObject> {
    const apiKey = appConfig.ai.openai.apiKey;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    const openai = new OpenAI({ apiKey });

    if (config.operation === "analyze") {
        const imageUrl = interpolateVariables(config.imageInput || "", context);
        const prompt = interpolateVariables(
            config.prompt || "Describe this image in detail",
            context
        );

        activityLogger.info("OpenAI analyzing image", {
            imageUrlPrefix: imageUrl.substring(0, 100)
        });

        const response = await openai.chat.completions.create({
            model: config.model || "gpt-4-vision-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageUrl,
                                detail: config.detail || "auto"
                            }
                        }
                    ]
                }
            ],
            max_tokens: config.maxTokens || 1000
        });

        const analysis = response.choices[0]?.message?.content || "";

        activityLogger.info("OpenAI analysis complete", { analysisLength: analysis.length });

        return {
            operation: "analyze",
            provider: "openai",
            model: config.model || "gpt-4-vision-preview",
            analysis,
            metadata: {
                processingTime: 0,
                tokensUsed: response.usage?.total_tokens
            }
        } as unknown as JsonObject;
    } else if (config.operation === "generate") {
        const prompt = interpolateVariables(config.generationPrompt || "", context);

        activityLogger.info("OpenAI generating image", { promptPrefix: prompt.substring(0, 100) });

        const response = await openai.images.generate({
            model: config.model || "dall-e-3",
            prompt,
            n: config.n || 1,
            size: config.size || "1024x1024",
            quality: config.quality || "standard",
            style: config.style || "vivid",
            response_format: config.outputFormat === "base64" ? "b64_json" : "url"
        });

        interface ImageData {
            url?: string;
            b64_json?: string;
            revised_prompt?: string;
        }

        const images = (response.data || []).map((img: unknown) => {
            const imageData = img as ImageData;
            return {
                url: imageData.url,
                base64: imageData.b64_json,
                revisedPrompt: imageData.revised_prompt
            };
        });

        activityLogger.info("OpenAI image generation complete", { imageCount: images.length });

        return {
            operation: "generate",
            provider: "openai",
            model: config.model || "dall-e-3",
            images,
            metadata: {
                processingTime: 0
            }
        } as unknown as JsonObject;
    } else {
        throw new Error(`Unsupported operation for OpenAI: ${config.operation}`);
    }
}

async function executeAnthropic(
    config: VisionNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const apiKey = appConfig.ai.anthropic.apiKey;
    if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }

    if (config.operation !== "analyze") {
        throw new Error('Anthropic only supports "analyze" operation (no image generation)');
    }

    const anthropic = new Anthropic({ apiKey });

    const imageInput = interpolateVariables(config.imageInput || "", context);
    const prompt = interpolateVariables(config.prompt || "Describe this image in detail", context);

    activityLogger.info("Anthropic analyzing image with Claude");

    interface AnthropicImageContent {
        type: "image";
        source: {
            type: "base64";
            media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
            data: string;
        };
    }

    interface AnthropicTextContent {
        type: "text";
        text: string;
    }

    let imageContent: AnthropicImageContent;

    const validMediaTypes: Array<"image/jpeg" | "image/png" | "image/gif" | "image/webp"> = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp"
    ];

    const normalizeMediaType = (
        type: string
    ): "image/jpeg" | "image/png" | "image/gif" | "image/webp" => {
        const normalized = type.toLowerCase();
        if (validMediaTypes.includes(normalized as (typeof validMediaTypes)[number])) {
            return normalized as (typeof validMediaTypes)[number];
        }
        return "image/jpeg";
    };

    if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
        const response = await fetch(imageInput);

        if (!response.ok) {
            throw new Error(`Failed to download image: HTTP ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const contentType = response.headers.get("content-type") || "image/jpeg";

        imageContent = {
            type: "image" as const,
            source: {
                type: "base64" as const,
                media_type: normalizeMediaType(contentType),
                data: base64
            }
        };
    } else if (imageInput.startsWith("data:")) {
        const matches = imageInput.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
            throw new Error("Invalid data URL format");
        }

        imageContent = {
            type: "image" as const,
            source: {
                type: "base64" as const,
                media_type: normalizeMediaType(matches[1]),
                data: matches[2]
            }
        };
    } else {
        imageContent = {
            type: "image" as const,
            source: {
                type: "base64" as const,
                media_type: "image/jpeg",
                data: imageInput
            }
        };
    }

    const textContent: AnthropicTextContent = {
        type: "text",
        text: prompt
    };

    const response = await anthropic.messages.create({
        model: config.model || "claude-3-opus-20240229",
        max_tokens: config.maxTokens || 1000,
        messages: [
            {
                role: "user",
                content: [imageContent, textContent] as Array<
                    AnthropicImageContent | AnthropicTextContent
                >
            }
        ]
    });

    const analysis = response.content[0].type === "text" ? response.content[0].text : "";

    activityLogger.info("Anthropic analysis complete", { analysisLength: analysis.length });

    return {
        operation: "analyze",
        provider: "anthropic",
        model: config.model || "claude-3-opus-20240229",
        analysis,
        metadata: {
            processingTime: 0,
            tokensUsed: response.usage.input_tokens + response.usage.output_tokens
        }
    } as unknown as JsonObject;
}

async function executeGoogle(config: VisionNodeConfig, context: JsonObject): Promise<JsonObject> {
    const apiKey = appConfig.ai.google.apiKey;
    if (!apiKey) {
        throw new Error("GOOGLE_API_KEY environment variable is not set");
    }

    if (config.operation !== "analyze") {
        throw new Error('Google Gemini only supports "analyze" operation currently');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: config.model || "gemini-pro-vision"
    });

    const imageInput = interpolateVariables(config.imageInput || "", context);
    const prompt = interpolateVariables(config.prompt || "Describe this image in detail", context);

    activityLogger.info("Google analyzing image with Gemini");

    interface GoogleImagePart {
        inlineData: {
            data: string;
            mimeType: string;
        };
    }

    let imagePart: GoogleImagePart;

    if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
        const response = await fetch(imageInput);

        if (!response.ok) {
            throw new Error(`Failed to download image: HTTP ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = response.headers.get("content-type") || "image/jpeg";

        imagePart = {
            inlineData: {
                data: base64,
                mimeType
            }
        };
    } else if (imageInput.startsWith("data:")) {
        const matches = imageInput.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
            throw new Error("Invalid data URL format");
        }

        imagePart = {
            inlineData: {
                data: matches[2],
                mimeType: matches[1]
            }
        };
    } else {
        imagePart = {
            inlineData: {
                data: imageInput,
                mimeType: "image/jpeg"
            }
        };
    }

    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const analysis = response.text();

    activityLogger.info("Google analysis complete", { analysisLength: analysis.length });

    return {
        operation: "analyze",
        provider: "google",
        model: config.model || "gemini-pro-vision",
        analysis,
        metadata: {
            processingTime: 0
        }
    } as unknown as JsonObject;
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Vision node - image analysis and generation
 */
export async function executeVisionNode(
    config: VisionNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const startTime = Date.now();

    activityLogger.info("Vision node execution starting", {
        provider: config.provider,
        operation: config.operation
    });

    let result: JsonObject;

    switch (config.provider) {
        case "openai":
            result = await executeOpenAI(config, context);
            break;

        case "anthropic":
            result = await executeAnthropic(config, context);
            break;

        case "google":
            result = await executeGoogle(config, context);
            break;

        default:
            throw new Error(`Unsupported vision provider: ${config.provider}`);
    }

    result.metadata = {
        ...(result.metadata as JsonObject),
        processingTime: Date.now() - startTime
    };

    activityLogger.info("Vision node execution completed", {
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

/**
 * Handler for Vision node type.
 */
export class VisionNodeHandler extends BaseNodeHandler {
    readonly name = "VisionNodeHandler";
    readonly supportedNodeTypes = ["vision"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const visionResult = await executeVisionNode(
            input.nodeConfig as unknown as VisionNodeConfig,
            context
        );

        let tokenUsage: TokenUsage | undefined;

        if ("metadata" in visionResult) {
            const metadata = visionResult.metadata as { tokensUsed?: number };
            if (metadata?.tokensUsed) {
                tokenUsage = {
                    totalTokens: metadata.tokensUsed,
                    model: String(visionResult.model || ""),
                    provider: String(visionResult.provider || "")
                };
            }
        }

        return this.success(
            visionResult as unknown as JsonObject,
            {},
            {
                durationMs: Date.now() - startTime,
                tokenUsage
            }
        );
    }
}

/**
 * Factory function for creating Vision handler.
 */
export function createVisionNodeHandler(): VisionNodeHandler {
    return new VisionNodeHandler();
}
