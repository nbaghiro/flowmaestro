/**
 * Embedding Service
 *
 * Service for generating text embeddings using the unified AI SDK.
 * Supports multiple providers: OpenAI, Cohere, Google.
 */

import { getLogger } from "../../core/logging";
import { ConnectionRepository } from "../../storage/repositories/ConnectionRepository";
import { getAIClient, type AIProvider } from "../ai";

const logger = getLogger();

export interface EmbeddingConfig {
    model: string; // e.g., "text-embedding-3-small"
    provider: string; // e.g., "openai", "cohere", "google"
    dimensions?: number; // Optional: reduce dimensions (OpenAI only)
}

export interface EmbeddingResult {
    embeddings: number[][];
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
    };
}

export class EmbeddingService {
    private connectionRepository: ConnectionRepository;

    constructor(connectionRepository?: ConnectionRepository) {
        this.connectionRepository = connectionRepository || new ConnectionRepository();
    }

    /**
     * Generate embeddings for an array of texts
     * Automatically batches requests to stay within API limits
     */
    async generateEmbeddings(
        texts: string[],
        config: EmbeddingConfig,
        userId?: string
    ): Promise<EmbeddingResult> {
        if (texts.length === 0) {
            return {
                embeddings: [],
                model: config.model,
                usage: {
                    prompt_tokens: 0,
                    total_tokens: 0
                }
            };
        }

        // Get connection ID if user has one for this provider
        const connectionId = await this.getConnectionId(userId, config.provider);

        const ai = getAIClient();
        const provider = config.provider.toLowerCase() as AIProvider;

        logger.info(
            {
                component: "EmbeddingService",
                provider,
                model: config.model,
                textCount: texts.length
            },
            "Generating embeddings via unified AI SDK"
        );

        try {
            const response = await ai.embedding.generate({
                provider,
                model: config.model,
                input: texts,
                dimensions: config.dimensions,
                connectionId
            });

            return {
                embeddings: response.embeddings,
                model: config.model,
                usage: {
                    prompt_tokens: response.metadata.usage?.promptTokens ?? 0,
                    total_tokens: response.metadata.usage?.totalTokens ?? 0
                }
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            logger.error(
                { component: "EmbeddingService", err: error, provider, model: config.model },
                "Embedding generation failed"
            );
            throw new Error(`Embedding error (${config.provider}): ${errorMsg}`);
        }
    }

    /**
     * Generate a single embedding for a query text
     */
    async generateQueryEmbedding(
        query: string,
        config: EmbeddingConfig,
        userId?: string
    ): Promise<number[]> {
        const result = await this.generateEmbeddings([query], config, userId);
        return result.embeddings[0];
    }

    /**
     * Get connection ID for the user if they have an active connection for the provider
     */
    private async getConnectionId(
        userId: string | undefined,
        provider: string
    ): Promise<string | undefined> {
        if (!userId) {
            return undefined;
        }

        try {
            const connections = await this.connectionRepository.findByProvider(userId, provider);

            if (connections.length > 0) {
                // Find active API key connection
                const apiKeyConnection = connections.find(
                    (c) => c.connection_method === "api_key" && c.status === "active"
                );

                if (apiKeyConnection) {
                    return apiKeyConnection.id;
                }
            }
        } catch (error) {
            logger.warn(
                { component: "EmbeddingService", err: error, provider },
                "Could not retrieve connections from database"
            );
        }

        return undefined;
    }

    /**
     * Estimate token count (rough approximation)
     * For accurate counts, use tiktoken library
     */
    estimateTokens(text: string): number {
        // Very rough approximation: 1 token ≈ 4 characters
        return Math.ceil(text.length / 4);
    }

    /**
     * Calculate estimated cost for embeddings
     * Based on OpenAI pricing as of 2024
     */
    estimateCost(totalTokens: number, model: string): number {
        const pricePerMillion: Record<string, number> = {
            "text-embedding-3-small": 0.02,
            "text-embedding-3-large": 0.13,
            "text-embedding-ada-002": 0.1,
            "embed-english-v3.0": 0.1, // Cohere
            "embed-multilingual-v3.0": 0.1, // Cohere
            "text-embedding-004": 0.0 // Google (free tier)
        };

        const price = pricePerMillion[model] || 0.02;
        return (totalTokens / 1_000_000) * price;
    }
}
