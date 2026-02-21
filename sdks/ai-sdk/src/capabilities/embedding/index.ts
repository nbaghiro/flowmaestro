/**
 * Embedding capability
 */

import { withRetry, DEFAULT_RETRY_CONFIG } from "../../core/retry";
import type { EmbeddingRequest, EmbeddingResponse } from "./types";
import type { ProviderRegistry } from "../../providers/registry";
import type { AIProvider, AILogger, RetryConfig } from "../../types";

export * from "./types";

/**
 * Embedding capability
 *
 * Provides vector embedding generation across multiple providers.
 */
export class EmbeddingCapability {
    private readonly registry: ProviderRegistry;
    private readonly retryConfig: RetryConfig;
    private readonly logger: AILogger;

    constructor(
        registry: ProviderRegistry,
        retryConfig: Partial<RetryConfig> = {},
        logger: AILogger
    ) {
        this.registry = registry;
        this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
        this.logger = logger;
    }

    /**
     * Generate embeddings for input text(s)
     */
    async generate(request: EmbeddingRequest): Promise<EmbeddingResponse> {
        const provider = request.provider ?? this.registry.getDefaultProvider("embedding");
        const adapter = this.registry.getEmbeddingProvider(provider);
        const apiKey = await this.registry.resolveApiKey(provider, request.connectionId);

        const inputCount = Array.isArray(request.input) ? request.input.length : 1;

        this.logger.info("Embedding request", {
            provider,
            model: request.model,
            inputCount
        });

        return withRetry(
            () => adapter.embed(request, apiKey),
            this.retryConfig,
            `Embedding:${request.model}`,
            provider,
            this.logger
        );
    }

    /**
     * Generate embedding for a single query (convenience method)
     */
    async generateQuery(
        text: string,
        model: string,
        provider?: AIProvider,
        connectionId?: string
    ): Promise<number[]> {
        const response = await this.generate({
            provider,
            model,
            input: text,
            taskType: "search_query",
            connectionId
        });

        return response.embeddings[0] ?? [];
    }

    /**
     * Generate embeddings for documents (convenience method)
     */
    async generateDocuments(
        texts: string[],
        model: string,
        provider?: AIProvider,
        connectionId?: string
    ): Promise<number[][]> {
        const response = await this.generate({
            provider,
            model,
            input: texts,
            taskType: "search_document",
            connectionId
        });

        return response.embeddings;
    }

    /**
     * Get available embedding providers
     */
    getAvailableProviders(): AIProvider[] {
        return this.registry
            .getRegisteredProviders("embedding")
            .filter((p) => this.registry.isProviderAvailable(p));
    }
}
