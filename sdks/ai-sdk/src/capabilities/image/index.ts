/**
 * Image generation capability
 */

import { withRetry, DEFAULT_RETRY_CONFIG } from "../../core/retry";
import type { ImageGenerationRequest, ImageGenerationResponse } from "./types";
import type { ProviderRegistry } from "../../providers/registry";
import type { AIProvider, AILogger, RetryConfig, ImageOperation } from "../../types";

export * from "./types";

/**
 * Image generation capability
 *
 * Provides image generation and editing across multiple providers.
 */
export class ImageCapability {
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
     * Generate an image
     */
    async generate(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
        const provider = request.provider ?? this.registry.getDefaultProvider("image");
        const adapter = this.registry.getImageProvider(provider);
        const apiKey = await this.registry.resolveApiKey(provider, request.connectionId);

        this.logger.info("Image generation request", {
            provider,
            model: request.model,
            operation: request.operation ?? "generate"
        });

        return withRetry(
            () => adapter.generate(request, apiKey),
            this.retryConfig,
            `ImageGeneration:${request.model}`,
            provider,
            this.logger
        );
    }

    /**
     * Check if a provider supports a specific operation
     */
    supportsOperation(provider: AIProvider, operation: ImageOperation): boolean {
        try {
            const adapter = this.registry.getImageProvider(provider);
            return adapter.supportsOperation(operation);
        } catch {
            return false;
        }
    }

    /**
     * Get available image providers
     */
    getAvailableProviders(): AIProvider[] {
        return this.registry
            .getRegisteredProviders("image")
            .filter((p) => this.registry.isProviderAvailable(p));
    }
}
