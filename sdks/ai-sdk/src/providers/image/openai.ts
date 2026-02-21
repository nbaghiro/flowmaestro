/**
 * OpenAI (DALL-E) image generation provider
 */

import OpenAI from "openai";
import { AbstractProvider, type ImageGenerationProvider } from "../base";
import type {
    ImageGenerationRequest,
    ImageGenerationResponse
} from "../../capabilities/image/types";
import type { AILogger, AIProvider, ImageOperation } from "../../types";

/**
 * OpenAI (DALL-E) image generation provider
 */
export class OpenAIImageProvider extends AbstractProvider implements ImageGenerationProvider {
    readonly provider: AIProvider = "openai";
    readonly supportedModels = ["dall-e-3", "dall-e-2"];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsOperation(operation: ImageOperation): boolean {
        return operation === "generate"; // DALL-E only supports generation
    }

    async generate(
        request: ImageGenerationRequest,
        apiKey: string
    ): Promise<ImageGenerationResponse> {
        const client = new OpenAI({ apiKey });
        const startTime = Date.now();

        const isDallE3 = request.model === "dall-e-3";

        const response = await client.images.generate({
            model: request.model,
            prompt: request.prompt,
            n: isDallE3 ? 1 : (request.n ?? 1), // DALL-E 3 only supports n=1
            size: request.size ?? "1024x1024",
            quality: isDallE3 ? (request.quality ?? "standard") : undefined,
            style: isDallE3 ? (request.style ?? "vivid") : undefined,
            response_format: request.outputFormat === "base64" ? "b64_json" : "url"
        });

        const images = (response.data ?? []).map((img) => ({
            url: img.url,
            base64: img.b64_json,
            revisedPrompt: img.revised_prompt
        }));

        return {
            images,
            operation: "generate",
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model: request.model
            }
        };
    }
}
