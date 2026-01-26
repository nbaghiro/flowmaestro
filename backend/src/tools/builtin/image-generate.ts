/**
 * Image Generation Tool
 *
 * Generates images using AI image models (DALL-E, Stable Diffusion, etc.)
 */

import { z } from "zod";
import { createServiceLogger } from "../../core/logging";
import { getAIClient } from "../../services/llm";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";

const logger = createServiceLogger("ImageGenerateTool");

/**
 * Image size options
 */
export type ImageSize = "256x256" | "512x512" | "1024x1024" | "1024x1792" | "1792x1024";

/**
 * Image quality options
 */
export type ImageQuality = "standard" | "hd";

/**
 * Input schema for image generation
 */
export const imageGenerateInputSchema = z.object({
    prompt: z.string().min(1).max(4000).describe("Description of the image to generate"),
    size: z
        .enum(["256x256", "512x512", "1024x1024", "1024x1792", "1792x1024"])
        .default("1024x1024")
        .describe("Size of the generated image"),
    quality: z
        .enum(["standard", "hd"])
        .default("standard")
        .describe("Quality of the generated image"),
    style: z.enum(["natural", "vivid"]).default("vivid").describe("Style of the generated image"),
    n: z.number().int().min(1).max(4).default(1).describe("Number of images to generate")
});

export type ImageGenerateInput = z.infer<typeof imageGenerateInputSchema>;

/**
 * Image generation result
 */
export interface ImageGenerateOutput {
    images: Array<{
        url: string;
        revisedPrompt?: string;
    }>;
    prompt: string;
    size: string;
}

/**
 * Execute image generation
 */
async function executeImageGenerate(
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
        // Validate input
        const input = imageGenerateInputSchema.parse(params);

        logger.info(
            {
                promptLength: input.prompt.length,
                size: input.size,
                quality: input.quality,
                traceId: context.traceId
            },
            "Generating image"
        );

        // Use unified AI service
        const ai = getAIClient();
        const response = await ai.image.generate({
            provider: "openai",
            model: "dall-e-3",
            prompt: input.prompt,
            size: input.size,
            quality: input.quality,
            style: input.style,
            n: input.n
        });

        const output: ImageGenerateOutput = {
            images: response.images.map((img) => ({
                url: img.url || "",
                revisedPrompt: img.revisedPrompt
            })),
            prompt: input.prompt,
            size: input.size
        };

        logger.info(
            { imageCount: output.images.length, traceId: context.traceId },
            "Image generation completed"
        );

        return {
            success: true,
            data: output,
            metadata: {
                durationMs: Date.now() - startTime,
                creditCost: input.quality === "hd" ? 10 : 5 // HD costs more
            }
        };
    } catch (error) {
        logger.error({ err: error, traceId: context.traceId }, "Image generation failed");

        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Image generation failed",
                retryable: false
            },
            metadata: {
                durationMs: Date.now() - startTime
            }
        };
    }
}

/**
 * Image Generate Tool Definition
 */
export const imageGenerateTool: BuiltInTool = {
    name: "image_generate",
    displayName: "Generate Image",
    description:
        "Generate images using AI. Describe the image you want to create in detail. Use this for creating visualizations, diagrams, illustrations, or any visual content.",
    category: "media",
    riskLevel: "low",
    inputSchema: {
        type: "object",
        properties: {
            prompt: {
                type: "string",
                description: "Description of the image to generate",
                minLength: 1,
                maxLength: 4000
            },
            size: {
                type: "string",
                enum: ["256x256", "512x512", "1024x1024", "1024x1792", "1792x1024"],
                description: "Size of the generated image",
                default: "1024x1024"
            },
            quality: {
                type: "string",
                enum: ["standard", "hd"],
                description: "Quality of the generated image",
                default: "standard"
            },
            style: {
                type: "string",
                enum: ["natural", "vivid"],
                description: "Style of the generated image",
                default: "vivid"
            },
            n: {
                type: "number",
                description: "Number of images to generate",
                minimum: 1,
                maximum: 4,
                default: 1
            }
        },
        required: ["prompt"]
    },
    zodSchema: imageGenerateInputSchema,
    enabledByDefault: true,
    creditCost: 5,
    tags: ["image", "generate", "ai", "dalle", "visual"],
    execute: executeImageGenerate
};
