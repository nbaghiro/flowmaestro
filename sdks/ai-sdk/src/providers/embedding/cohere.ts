/**
 * Cohere embedding provider
 */

import { CohereClient } from "cohere-ai";
import { AbstractProvider, type EmbeddingProvider } from "../base";
import type { EmbeddingRequest, EmbeddingResponse } from "../../capabilities/embedding/types";
import type { AILogger, AIProvider, EmbeddingTaskType } from "../../types";

/**
 * Map SDK task type to Cohere API input type
 */
function mapTaskType(
    taskType?: EmbeddingTaskType
): "search_document" | "search_query" | "classification" | "clustering" {
    switch (taskType) {
        case "search_document":
            return "search_document";
        case "search_query":
            return "search_query";
        case "classification":
            return "classification";
        case "clustering":
            return "clustering";
        default:
            return "search_document";
    }
}

/**
 * Cohere embedding provider
 */
export class CohereEmbeddingProvider extends AbstractProvider implements EmbeddingProvider {
    readonly provider: AIProvider = "cohere";
    readonly supportedModels = [
        "embed-english-v3.0",
        "embed-english-light-v3.0",
        "embed-multilingual-v3.0",
        "embed-multilingual-light-v3.0"
    ];

    constructor(logger: AILogger) {
        super(logger);
    }

    async embed(request: EmbeddingRequest, apiKey: string): Promise<EmbeddingResponse> {
        const client = new CohereClient({ token: apiKey });
        const inputs = Array.isArray(request.input) ? request.input : [request.input];

        const startTime = Date.now();

        const response = await client.embed({
            texts: inputs,
            model: request.model,
            inputType: mapTaskType(request.taskType),
            truncate:
                request.truncate === "start" ? "START" : request.truncate === "end" ? "END" : "NONE"
        });

        // Handle different response formats
        let embeddings: number[][];
        if (Array.isArray(response.embeddings)) {
            if (typeof response.embeddings[0] === "number") {
                // Single embedding returned as flat array
                embeddings = [response.embeddings as unknown as number[]];
            } else {
                embeddings = response.embeddings as number[][];
            }
        } else {
            embeddings = [];
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
