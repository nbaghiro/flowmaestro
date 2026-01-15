/**
 * OpenAI embedding provider
 */

import OpenAI from "openai";
import { AbstractProvider, type EmbeddingProvider } from "../base";
import type { EmbeddingRequest, EmbeddingResponse } from "../../capabilities/embedding/types";
import type { AILogger, AIProvider } from "../../client/types";

const DEFAULT_BATCH_SIZE = 2048;

/**
 * OpenAI embedding provider
 */
export class OpenAIEmbeddingProvider extends AbstractProvider implements EmbeddingProvider {
    readonly provider: AIProvider = "openai";
    readonly supportedModels = [
        "text-embedding-3-small",
        "text-embedding-3-large",
        "text-embedding-ada-002"
    ];

    constructor(logger: AILogger) {
        super(logger);
    }

    async embed(request: EmbeddingRequest, apiKey: string): Promise<EmbeddingResponse> {
        const client = new OpenAI({ apiKey });
        const inputs = Array.isArray(request.input) ? request.input : [request.input];
        const batchSize = request.batchSize ?? DEFAULT_BATCH_SIZE;

        const startTime = Date.now();
        const allEmbeddings: number[][] = [];
        let totalTokens = 0;

        // Process in batches
        for (let i = 0; i < inputs.length; i += batchSize) {
            const batch = inputs.slice(i, i + batchSize);

            const response = await client.embeddings.create({
                model: request.model,
                input: batch,
                dimensions: request.dimensions
            });

            for (const item of response.data) {
                allEmbeddings.push(item.embedding);
            }

            totalTokens += response.usage?.total_tokens ?? 0;
        }

        const dimensions = allEmbeddings[0]?.length ?? 0;

        return {
            embeddings: allEmbeddings,
            dimensions,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model: request.model,
                inputCount: inputs.length,
                usage: {
                    totalTokens
                }
            }
        };
    }
}
