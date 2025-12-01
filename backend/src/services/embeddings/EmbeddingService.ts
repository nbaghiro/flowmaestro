import OpenAI from "openai";
import { ConnectionRepository } from "../../storage/repositories/ConnectionRepository";

export interface EmbeddingConfig {
    model: string; // e.g., "text-embedding-3-small"
    provider: string; // e.g., "openai"
    dimensions?: number; // Optional: reduce dimensions
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

        switch (config.provider.toLowerCase()) {
            case "openai":
                return this.generateOpenAIEmbeddings(texts, config, userId);
            default:
                throw new Error(`Unsupported embedding provider: ${config.provider}`);
        }
    }

    /**
     * Generate embeddings using OpenAI
     */
    private async generateOpenAIEmbeddings(
        texts: string[],
        config: EmbeddingConfig,
        userId?: string
    ): Promise<EmbeddingResult> {
        const apiKey = await this.getOpenAIApiKey(userId);
        const client = new OpenAI({ apiKey });

        // OpenAI allows up to 2048 texts per request for text-embedding-3-small
        // But we'll use a conservative batch size of 100
        const batchSize = 100;
        const batches = this.createBatches(texts, batchSize);

        const allEmbeddings: number[][] = [];
        let totalPromptTokens = 0;
        let totalTokens = 0;

        for (const batch of batches) {
            try {
                const response = await client.embeddings.create({
                    model: config.model,
                    input: batch,
                    dimensions: config.dimensions
                });

                // Extract embeddings in the same order as input
                for (const embedding of response.data) {
                    allEmbeddings.push(embedding.embedding);
                }

                // Track usage
                totalPromptTokens += response.usage.prompt_tokens;
                totalTokens += response.usage.total_tokens;
            } catch (error: unknown) {
                // Handle rate limits with retry
                const apiError = error as { status?: number };
                if (apiError.status === 429) {
                    // Wait and retry
                    await this.sleep(1000);
                    // Retry this batch
                    const retryResponse = await client.embeddings.create({
                        model: config.model,
                        input: batch,
                        dimensions: config.dimensions
                    });

                    for (const embedding of retryResponse.data) {
                        allEmbeddings.push(embedding.embedding);
                    }

                    totalPromptTokens += retryResponse.usage.prompt_tokens;
                    totalTokens += retryResponse.usage.total_tokens;
                } else {
                    const errorMsg = error instanceof Error ? error.message : "Unknown error";
                    throw new Error(`OpenAI embedding error: ${errorMsg}`);
                }
            }
        }

        return {
            embeddings: allEmbeddings,
            model: config.model,
            usage: {
                prompt_tokens: totalPromptTokens,
                total_tokens: totalTokens
            }
        };
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
     * Get OpenAI API key from connections or environment
     */
    private async getOpenAIApiKey(userId?: string): Promise<string> {
        // First, try to get from user connections
        if (userId) {
            try {
                const connections = await this.connectionRepository.findByProvider(
                    userId,
                    "openai"
                );

                if (connections.length > 0) {
                    // Find active API key connection
                    const apiKeyConnectionSummary = connections.find(
                        (c) => c.connection_method === "api_key" && c.status === "active"
                    );

                    if (apiKeyConnectionSummary) {
                        // Fetch full connection with decrypted data
                        const apiKeyConnection = await this.connectionRepository.findByIdWithData(
                            apiKeyConnectionSummary.id
                        );

                        if (
                            apiKeyConnection &&
                            apiKeyConnection.data &&
                            "api_key" in apiKeyConnection.data
                        ) {
                            return apiKeyConnection.data.api_key as string;
                        }
                    }
                }
            } catch (error) {
                // Fall through to environment variable
                console.warn("Could not retrieve OpenAI connections from database:", error);
            }
        }

        // Fallback to environment variable
        const envKey = process.env.OPENAI_API_KEY;
        if (!envKey) {
            throw new Error(
                "OpenAI API key not found. Please add it to your connections or set OPENAI_API_KEY environment variable."
            );
        }

        return envKey;
    }

    /**
     * Create batches from array
     */
    private createBatches<T>(array: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
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
            "text-embedding-ada-002": 0.1
        };

        const price = pricePerMillion[model] || 0.02;
        return (totalTokens / 1_000_000) * price;
    }
}
