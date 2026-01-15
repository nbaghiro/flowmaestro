/**
 * Video generation capability
 */

import { withRetry, DEFAULT_RETRY_CONFIG } from "../../infrastructure/retry";
import type { VideoGenerationRequest, VideoGenerationResponse } from "./types";
import type { AIProvider, AILogger, RetryConfig } from "../../client/types";
import type { ProviderRegistry } from "../../providers/registry";

export * from "./types";

/**
 * Video generation capability
 *
 * Provides video generation across multiple providers with async polling support.
 */
export class VideoCapability {
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
     * Generate a video
     */
    async generate(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
        const provider = request.provider ?? this.registry.getDefaultProvider("video");
        const adapter = this.registry.getVideoProvider(provider);
        const apiKey = await this.registry.resolveApiKey(provider, request.connectionId);

        this.logger.info("Video generation request", {
            provider,
            model: request.model,
            hasImageInput: !!request.imageInput
        });

        return withRetry(
            () => adapter.generate(request, apiKey),
            this.retryConfig,
            `VideoGeneration:${request.model}`,
            provider,
            this.logger
        );
    }

    /**
     * Check if a model supports image input (I2V)
     */
    supportsImageInput(provider: AIProvider, model: string): boolean {
        try {
            const adapter = this.registry.getVideoProvider(provider);
            return adapter.supportsImageInput(model);
        } catch {
            return false;
        }
    }

    /**
     * Get available video providers
     */
    getAvailableProviders(): AIProvider[] {
        return this.registry
            .getRegisteredProviders("video")
            .filter((p) => this.registry.isProviderAvailable(p));
    }
}
