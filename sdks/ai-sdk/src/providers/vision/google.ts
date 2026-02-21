/**
 * Google (Gemini) vision provider
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AbstractProvider, type VisionProvider } from "../base";
import type {
    VisionAnalysisRequest,
    VisionAnalysisResponse
} from "../../capabilities/vision/types";
import type { AILogger, AIProvider } from "../../types";

/**
 * Google (Gemini) vision provider
 */
export class GoogleVisionProvider extends AbstractProvider implements VisionProvider {
    readonly provider: AIProvider = "google";
    readonly supportedModels = [
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "gemini-pro-vision"
    ];

    constructor(logger: AILogger) {
        super(logger);
    }

    async analyze(request: VisionAnalysisRequest, apiKey: string): Promise<VisionAnalysisResponse> {
        const genAI = new GoogleGenerativeAI(apiKey);
        const startTime = Date.now();

        const model = genAI.getGenerativeModel({
            model: request.model,
            generationConfig: {
                maxOutputTokens: request.maxTokens ?? 1000
            }
        });

        // Build image part
        const imagePart = await this.buildImagePart(request.imageInput);

        const result = await model.generateContent([
            request.prompt ?? "Describe this image in detail.",
            imagePart
        ]);

        const response = result.response;
        const text = response.text();
        const usage = response.usageMetadata;

        return {
            analysis: text,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model: request.model,
                usage: usage
                    ? {
                          promptTokens: usage.promptTokenCount,
                          completionTokens: usage.candidatesTokenCount,
                          totalTokens: usage.totalTokenCount
                      }
                    : undefined
            }
        };
    }

    private async buildImagePart(imageInput: string): Promise<{
        inlineData: {
            data: string;
            mimeType: string;
        };
    }> {
        if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
            const response = await fetch(imageInput);
            if (!response.ok) {
                throw new Error(`Failed to download image: HTTP ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            const mimeType = response.headers.get("content-type") || "image/jpeg";

            return {
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

            return {
                inlineData: {
                    data: matches[2],
                    mimeType: matches[1]
                }
            };
        } else {
            // Assume raw base64
            return {
                inlineData: {
                    data: imageInput,
                    mimeType: "image/jpeg"
                }
            };
        }
    }
}
