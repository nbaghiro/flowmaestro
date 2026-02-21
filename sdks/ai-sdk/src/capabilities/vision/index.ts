/**
 * Vision analysis capability
 */

import { withRetry, DEFAULT_RETRY_CONFIG } from "../../core/retry";
import type { VisionAnalysisRequest, VisionAnalysisResponse } from "./types";
import type { ProviderRegistry } from "../../providers/registry";
import type { AIProvider, AILogger, RetryConfig } from "../../types";

export * from "./types";

/**
 * Vision analysis capability
 *
 * Provides image analysis across multiple providers.
 */
export class VisionCapability {
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
     * Analyze an image
     */
    async analyze(request: VisionAnalysisRequest): Promise<VisionAnalysisResponse> {
        const provider = request.provider ?? this.registry.getDefaultProvider("vision");
        const adapter = this.registry.getVisionProvider(provider);
        const apiKey = await this.registry.resolveApiKey(provider, request.connectionId);

        this.logger.info("Vision analysis request", {
            provider,
            model: request.model
        });

        return withRetry(
            () => adapter.analyze(request, apiKey),
            this.retryConfig,
            `VisionAnalysis:${request.model}`,
            provider,
            this.logger
        );
    }

    /**
     * Get available vision providers
     */
    getAvailableProviders(): AIProvider[] {
        return this.registry
            .getRegisteredProviders("vision")
            .filter((p) => this.registry.isProviderAvailable(p));
    }
}
