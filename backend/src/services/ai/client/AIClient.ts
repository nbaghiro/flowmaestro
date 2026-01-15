/**
 * AI Client
 *
 * Single entry point for all AI operations across multiple providers.
 */

import { EmbeddingCapability } from "../capabilities/embedding/index";
import { ImageCapability } from "../capabilities/image/index";
import { SpeechCapability } from "../capabilities/speech/index";
import { TextCapability } from "../capabilities/text/index";
import { VideoCapability } from "../capabilities/video/index";
import { VisionCapability } from "../capabilities/vision/index";
import { consoleLogger, silentLogger } from "../infrastructure/logger";
import { DEFAULT_RETRY_CONFIG } from "../infrastructure/retry";

// Import provider factories
import {
    OpenAIEmbeddingProvider,
    CohereEmbeddingProvider,
    GoogleEmbeddingProvider
} from "../providers/embedding/index";
import {
    OpenAIImageProvider,
    ReplicateImageProvider,
    StabilityImageProvider,
    FALImageProvider
} from "../providers/image/index";
import { ProviderRegistry } from "../providers/registry";
import { OpenAISpeechProvider, ElevenLabsSpeechProvider } from "../providers/speech/index";
import {
    OpenAITextProvider,
    AnthropicTextProvider,
    GoogleTextProvider,
    CohereTextProvider,
    HuggingFaceTextProvider
} from "../providers/text/index";
import {
    ReplicateVideoProvider,
    GoogleVideoProvider,
    RunwayVideoProvider,
    LumaVideoProvider,
    FALVideoProvider,
    StabilityVideoProvider
} from "../providers/video/index";
import {
    OpenAIVisionProvider,
    AnthropicVisionProvider,
    GoogleVisionProvider
} from "../providers/vision/index";
import type { AIClientConfig, AIProvider, ProviderConfig, AILogger, RetryConfig } from "./types";

/**
 * AI Client
 *
 * Single entry point for all AI operations across multiple providers.
 *
 * @example
 * ```typescript
 * const ai = new AIClient({
 *   providers: {
 *     openai: { apiKey: process.env.OPENAI_API_KEY },
 *     anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
 *   }
 * });
 *
 * // Text completion
 * const response = await ai.text.complete({
 *   provider: "anthropic",
 *   model: "claude-sonnet-4-5-20250929",
 *   prompt: "Explain quantum computing"
 * });
 *
 * // Streaming
 * for await (const token of await ai.text.stream({
 *   provider: "openai",
 *   model: "gpt-4.1",
 *   prompt: "Write a story"
 * })) {
 *   process.stdout.write(token);
 * }
 *
 * // Image generation
 * const image = await ai.image.generate({
 *   provider: "openai",
 *   model: "dall-e-3",
 *   prompt: "A futuristic city"
 * });
 * ```
 */
export class AIClient {
    private readonly config: AIClientConfig;
    private readonly registry: ProviderRegistry;
    private readonly logger: AILogger;
    private readonly retryConfig: RetryConfig;

    // Capability namespaces
    public readonly text: TextCapability;
    public readonly embedding: EmbeddingCapability;
    public readonly image: ImageCapability;
    public readonly video: VideoCapability;
    public readonly vision: VisionCapability;
    public readonly speech: SpeechCapability;

    constructor(config: AIClientConfig = {}) {
        this.config = config;
        this.logger = this.config.logger ?? (this.config.debug ? consoleLogger : silentLogger);
        this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry };

        // Initialize provider registry
        this.registry = new ProviderRegistry({
            providers: config.providers,
            authResolver: config.authResolver,
            logger: this.logger
        });

        // Register all providers
        this.registerProviders();

        // Initialize capability namespaces
        this.text = new TextCapability(this.registry, this.retryConfig, this.logger);
        this.embedding = new EmbeddingCapability(this.registry, this.retryConfig, this.logger);
        this.image = new ImageCapability(this.registry, this.retryConfig, this.logger);
        this.video = new VideoCapability(this.registry, this.retryConfig, this.logger);
        this.vision = new VisionCapability(this.registry, this.retryConfig, this.logger);
        this.speech = new SpeechCapability(this.registry, this.retryConfig, this.logger);
    }

    /**
     * Register all built-in providers
     */
    private registerProviders(): void {
        // Text providers
        this.registry.registerTextProvider("openai", (logger) => new OpenAITextProvider(logger));
        this.registry.registerTextProvider(
            "anthropic",
            (logger) => new AnthropicTextProvider(logger)
        );
        this.registry.registerTextProvider("google", (logger) => new GoogleTextProvider(logger));
        this.registry.registerTextProvider("cohere", (logger) => new CohereTextProvider(logger));
        this.registry.registerTextProvider(
            "huggingface",
            (logger) => new HuggingFaceTextProvider(logger)
        );

        // Embedding providers
        this.registry.registerEmbeddingProvider(
            "openai",
            (logger) => new OpenAIEmbeddingProvider(logger)
        );
        this.registry.registerEmbeddingProvider(
            "cohere",
            (logger) => new CohereEmbeddingProvider(logger)
        );
        this.registry.registerEmbeddingProvider(
            "google",
            (logger) => new GoogleEmbeddingProvider(logger)
        );

        // Image providers
        this.registry.registerImageProvider("openai", (logger) => new OpenAIImageProvider(logger));
        this.registry.registerImageProvider(
            "replicate",
            (logger) => new ReplicateImageProvider(logger)
        );
        this.registry.registerImageProvider(
            "stabilityai",
            (logger) => new StabilityImageProvider(logger)
        );
        this.registry.registerImageProvider("fal", (logger) => new FALImageProvider(logger));

        // Video providers
        this.registry.registerVideoProvider(
            "replicate",
            (logger) => new ReplicateVideoProvider(logger)
        );
        this.registry.registerVideoProvider("google", (logger) => new GoogleVideoProvider(logger));
        this.registry.registerVideoProvider("runway", (logger) => new RunwayVideoProvider(logger));
        this.registry.registerVideoProvider("luma", (logger) => new LumaVideoProvider(logger));
        this.registry.registerVideoProvider("fal", (logger) => new FALVideoProvider(logger));
        this.registry.registerVideoProvider(
            "stabilityai",
            (logger) => new StabilityVideoProvider(logger)
        );

        // Vision providers
        this.registry.registerVisionProvider(
            "openai",
            (logger) => new OpenAIVisionProvider(logger)
        );
        this.registry.registerVisionProvider(
            "anthropic",
            (logger) => new AnthropicVisionProvider(logger)
        );
        this.registry.registerVisionProvider(
            "google",
            (logger) => new GoogleVisionProvider(logger)
        );

        // Speech providers
        this.registry.registerSpeechProvider(
            "openai",
            (logger) => new OpenAISpeechProvider(logger)
        );
        this.registry.registerSpeechProvider(
            "elevenlabs",
            (logger) => new ElevenLabsSpeechProvider(logger)
        );
    }

    /**
     * Get API key for a provider
     * Uses configured auth resolver or falls back to provider config
     */
    async getApiKey(provider: AIProvider, connectionId?: string): Promise<string> {
        return this.registry.resolveApiKey(provider, connectionId);
    }

    /**
     * Check if a provider is configured and available
     */
    isProviderAvailable(provider: AIProvider): boolean {
        return this.registry.isProviderAvailable(provider);
    }

    /**
     * Get list of available providers
     */
    getAvailableProviders(): AIProvider[] {
        return this.registry.getAvailableProviders();
    }

    /**
     * Update provider configuration at runtime
     */
    configureProvider(provider: AIProvider, config: ProviderConfig): void {
        this.registry.configureProvider(provider, config);
    }

    /**
     * Set default provider for a capability
     */
    setDefaultProvider(
        capability: "text" | "embedding" | "image" | "video" | "vision" | "speech",
        provider: AIProvider
    ): void {
        this.registry.setDefaultProvider(capability, provider);
    }
}
