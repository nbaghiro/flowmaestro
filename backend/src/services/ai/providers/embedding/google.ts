/**
 * Google embedding provider
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AbstractProvider, type EmbeddingProvider } from "../base";
import type { EmbeddingRequest, EmbeddingResponse } from "../../capabilities/embedding/types";
import type { AILogger, AIProvider } from "../../client/types";

/**
 * Google embedding provider
 */
export class GoogleEmbeddingProvider extends AbstractProvider implements EmbeddingProvider {
    readonly provider: AIProvider = "google";
    readonly supportedModels = ["text-embedding-004", "embedding-001"];

    constructor(logger: AILogger) {
        super(logger);
    }

    async embed(request: EmbeddingRequest, apiKey: string): Promise<EmbeddingResponse> {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: request.model });
        const inputs = Array.isArray(request.input) ? request.input : [request.input];

        const startTime = Date.now();
        const embeddings: number[][] = [];

        // Google processes embeddings one at a time
        for (const input of inputs) {
            const result = await model.embedContent(input);
            embeddings.push(result.embedding.values);
        }

        const dimensions = embeddings[0]?.length ?? 0;

        return {
            embeddings,
            dimensions,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model: request.model,
                inputCount: inputs.length
            }
        };
    }
}
