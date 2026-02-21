/**
 * Provider registry for managing provider adapters
 */

import { resolveApiKey, hasApiKey, getConfiguredProviders } from "../core/auth";
import { silentLogger } from "../core/logger";
import type {
    CapabilityType,
    ProviderTypeMap,
    TextCompletionProvider,
    EmbeddingProvider,
    ImageGenerationProvider,
    VideoGenerationProvider,
    VisionProvider,
    SpeechProvider
} from "./base";
import type { AIProvider, AILogger, ProviderConfig, AuthResolver } from "../types";

/**
 * Provider registry configuration
 */
export interface ProviderRegistryConfig {
    providers?: Partial<Record<AIProvider, ProviderConfig>>;
    authResolver?: AuthResolver;
    logger?: AILogger;
}

/**
 * Provider factory function type
 */
export type ProviderFactory<T> = (logger: AILogger) => T;

/**
 * Provider registry - manages provider adapters and API key resolution
 */
export class ProviderRegistry {
    private readonly config: ProviderRegistryConfig;
    private readonly logger: AILogger;

    // Provider adapter registries by capability
    private textProviders = new Map<AIProvider, TextCompletionProvider>();
    private embeddingProviders = new Map<AIProvider, EmbeddingProvider>();
    private imageProviders = new Map<AIProvider, ImageGenerationProvider>();
    private videoProviders = new Map<AIProvider, VideoGenerationProvider>();
    private visionProviders = new Map<AIProvider, VisionProvider>();
    private speechProviders = new Map<AIProvider, SpeechProvider>();

    // Provider factories (lazy initialization)
    private textFactories = new Map<AIProvider, ProviderFactory<TextCompletionProvider>>();
    private embeddingFactories = new Map<AIProvider, ProviderFactory<EmbeddingProvider>>();
    private imageFactories = new Map<AIProvider, ProviderFactory<ImageGenerationProvider>>();
    private videoFactories = new Map<AIProvider, ProviderFactory<VideoGenerationProvider>>();
    private visionFactories = new Map<AIProvider, ProviderFactory<VisionProvider>>();
    private speechFactories = new Map<AIProvider, ProviderFactory<SpeechProvider>>();

    // Default providers per capability
    private defaultProviders: Partial<Record<CapabilityType, AIProvider>> = {};

    constructor(config: ProviderRegistryConfig = {}) {
        this.config = config;
        this.logger = config.logger ?? silentLogger;
    }

    // ========================================================================
    // API Key Resolution
    // ========================================================================

    /**
     * Resolve API key for a provider
     */
    async resolveApiKey(provider: AIProvider, connectionId?: string): Promise<string> {
        return resolveApiKey(
            provider,
            connectionId,
            this.config.authResolver,
            this.config.providers ?? {},
            this.logger
        );
    }

    /**
     * Check if a provider has an API key configured
     */
    isProviderAvailable(provider: AIProvider): boolean {
        return hasApiKey(provider, this.config.providers ?? {});
    }

    /**
     * Get list of available providers (those with API keys configured)
     */
    getAvailableProviders(): AIProvider[] {
        return getConfiguredProviders(this.config.providers ?? {});
    }

    // ========================================================================
    // Provider Configuration
    // ========================================================================

    /**
     * Configure a provider at runtime
     */
    configureProvider(provider: AIProvider, config: ProviderConfig): void {
        if (!this.config.providers) {
            this.config.providers = {};
        }
        this.config.providers[provider] = {
            ...this.config.providers[provider],
            ...config
        };
    }

    /**
     * Set default provider for a capability
     */
    setDefaultProvider(capability: CapabilityType, provider: AIProvider): void {
        this.defaultProviders[capability] = provider;
    }

    /**
     * Get default provider for a capability
     */
    getDefaultProvider(capability: CapabilityType): AIProvider {
        const defaultProvider = this.defaultProviders[capability];
        if (defaultProvider) {
            return defaultProvider;
        }

        // Fallback to first available provider for the capability
        const available = this.getAvailableProviders();
        if (available.length > 0) {
            return available[0];
        }

        throw new Error(
            `No default provider configured for ${capability} and no providers available`
        );
    }

    // ========================================================================
    // Provider Registration (Factories)
    // ========================================================================

    /**
     * Register a text completion provider factory
     */
    registerTextProvider(
        provider: AIProvider,
        factory: ProviderFactory<TextCompletionProvider>
    ): void {
        this.textFactories.set(provider, factory);
    }

    /**
     * Register an embedding provider factory
     */
    registerEmbeddingProvider(
        provider: AIProvider,
        factory: ProviderFactory<EmbeddingProvider>
    ): void {
        this.embeddingFactories.set(provider, factory);
    }

    /**
     * Register an image generation provider factory
     */
    registerImageProvider(
        provider: AIProvider,
        factory: ProviderFactory<ImageGenerationProvider>
    ): void {
        this.imageFactories.set(provider, factory);
    }

    /**
     * Register a video generation provider factory
     */
    registerVideoProvider(
        provider: AIProvider,
        factory: ProviderFactory<VideoGenerationProvider>
    ): void {
        this.videoFactories.set(provider, factory);
    }

    /**
     * Register a vision provider factory
     */
    registerVisionProvider(provider: AIProvider, factory: ProviderFactory<VisionProvider>): void {
        this.visionFactories.set(provider, factory);
    }

    /**
     * Register a speech provider factory
     */
    registerSpeechProvider(provider: AIProvider, factory: ProviderFactory<SpeechProvider>): void {
        this.speechFactories.set(provider, factory);
    }

    // ========================================================================
    // Provider Retrieval
    // ========================================================================

    /**
     * Get a provider adapter for a specific capability
     */
    getProvider<C extends CapabilityType>(provider: AIProvider, capability: C): ProviderTypeMap[C] {
        switch (capability) {
            case "text":
                return this.getTextProvider(provider) as ProviderTypeMap[C];
            case "embedding":
                return this.getEmbeddingProvider(provider) as ProviderTypeMap[C];
            case "image":
                return this.getImageProvider(provider) as ProviderTypeMap[C];
            case "video":
                return this.getVideoProvider(provider) as ProviderTypeMap[C];
            case "vision":
                return this.getVisionProvider(provider) as ProviderTypeMap[C];
            case "speech":
                return this.getSpeechProvider(provider) as ProviderTypeMap[C];
            default:
                throw new Error(`Unknown capability: ${capability}`);
        }
    }

    /**
     * Get text completion provider
     */
    getTextProvider(provider: AIProvider): TextCompletionProvider {
        let adapter = this.textProviders.get(provider);
        if (!adapter) {
            const factory = this.textFactories.get(provider);
            if (!factory) {
                throw new Error(`No text completion provider registered for ${provider}`);
            }
            adapter = factory(this.logger);
            this.textProviders.set(provider, adapter);
        }
        return adapter;
    }

    /**
     * Get embedding provider
     */
    getEmbeddingProvider(provider: AIProvider): EmbeddingProvider {
        let adapter = this.embeddingProviders.get(provider);
        if (!adapter) {
            const factory = this.embeddingFactories.get(provider);
            if (!factory) {
                throw new Error(`No embedding provider registered for ${provider}`);
            }
            adapter = factory(this.logger);
            this.embeddingProviders.set(provider, adapter);
        }
        return adapter;
    }

    /**
     * Get image generation provider
     */
    getImageProvider(provider: AIProvider): ImageGenerationProvider {
        let adapter = this.imageProviders.get(provider);
        if (!adapter) {
            const factory = this.imageFactories.get(provider);
            if (!factory) {
                throw new Error(`No image generation provider registered for ${provider}`);
            }
            adapter = factory(this.logger);
            this.imageProviders.set(provider, adapter);
        }
        return adapter;
    }

    /**
     * Get video generation provider
     */
    getVideoProvider(provider: AIProvider): VideoGenerationProvider {
        let adapter = this.videoProviders.get(provider);
        if (!adapter) {
            const factory = this.videoFactories.get(provider);
            if (!factory) {
                throw new Error(`No video generation provider registered for ${provider}`);
            }
            adapter = factory(this.logger);
            this.videoProviders.set(provider, adapter);
        }
        return adapter;
    }

    /**
     * Get vision provider
     */
    getVisionProvider(provider: AIProvider): VisionProvider {
        let adapter = this.visionProviders.get(provider);
        if (!adapter) {
            const factory = this.visionFactories.get(provider);
            if (!factory) {
                throw new Error(`No vision provider registered for ${provider}`);
            }
            adapter = factory(this.logger);
            this.visionProviders.set(provider, adapter);
        }
        return adapter;
    }

    /**
     * Get speech provider
     */
    getSpeechProvider(provider: AIProvider): SpeechProvider {
        let adapter = this.speechProviders.get(provider);
        if (!adapter) {
            const factory = this.speechFactories.get(provider);
            if (!factory) {
                throw new Error(`No speech provider registered for ${provider}`);
            }
            adapter = factory(this.logger);
            this.speechProviders.set(provider, adapter);
        }
        return adapter;
    }

    // ========================================================================
    // Capability Queries
    // ========================================================================

    /**
     * Get all registered providers for a capability
     */
    getRegisteredProviders(capability: CapabilityType): AIProvider[] {
        switch (capability) {
            case "text":
                return Array.from(this.textFactories.keys());
            case "embedding":
                return Array.from(this.embeddingFactories.keys());
            case "image":
                return Array.from(this.imageFactories.keys());
            case "video":
                return Array.from(this.videoFactories.keys());
            case "vision":
                return Array.from(this.visionFactories.keys());
            case "speech":
                return Array.from(this.speechFactories.keys());
            default:
                return [];
        }
    }

    /**
     * Check if a provider is registered for a capability
     */
    hasProvider(capability: CapabilityType, provider: AIProvider): boolean {
        return this.getRegisteredProviders(capability).includes(provider);
    }
}
