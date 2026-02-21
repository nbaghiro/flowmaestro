/**
 * Text completion capability
 */

import { withRetry, DEFAULT_RETRY_CONFIG } from "../../core/retry";
import type {
    TextCompletionRequest,
    TextCompletionResponse,
    TextCompletionStream,
    StreamingCallbacks
} from "./types";
import type { ProviderRegistry } from "../../providers/registry";
import type { AIProvider, AILogger, RetryConfig } from "../../types";

export * from "./types";

/**
 * Text completion capability
 *
 * Provides text generation across multiple LLM providers with
 * streaming support and extended thinking.
 */
export class TextCapability {
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
     * Generate text completion (non-streaming)
     */
    async complete(request: TextCompletionRequest): Promise<TextCompletionResponse> {
        const provider = request.provider ?? this.registry.getDefaultProvider("text");
        const adapter = this.registry.getTextProvider(provider);
        const apiKey = await this.registry.resolveApiKey(provider, request.connectionId);

        this.logger.info("Text completion request", {
            provider,
            model: request.model,
            promptLength:
                typeof request.prompt === "string" ? request.prompt.length : request.prompt.length
        });

        return withRetry(
            () => adapter.complete(request, apiKey),
            this.retryConfig,
            `TextCompletion:${request.model}`,
            provider,
            this.logger
        );
    }

    /**
     * Generate text completion with streaming
     * Returns an async iterator for token-by-token consumption
     */
    async stream(request: TextCompletionRequest): Promise<TextCompletionStream> {
        const provider = request.provider ?? this.registry.getDefaultProvider("text");
        const adapter = this.registry.getTextProvider(provider);
        const apiKey = await this.registry.resolveApiKey(provider, request.connectionId);

        this.logger.info("Text completion stream request", {
            provider,
            model: request.model
        });

        return adapter.stream(request, apiKey);
    }

    /**
     * Generate text completion with callbacks
     * Useful for real-time UI updates
     */
    async completeWithCallbacks(
        request: TextCompletionRequest,
        callbacks: StreamingCallbacks
    ): Promise<TextCompletionResponse> {
        const stream = await this.stream(request);

        try {
            for await (const token of stream) {
                callbacks.onToken?.(token);
            }

            const response = await stream.getResponse();
            callbacks.onComplete?.(response);

            if (response.thinking) {
                callbacks.onThinkingComplete?.(response.thinking);
            }

            return response;
        } catch (error) {
            callbacks.onError?.(error as Error);
            throw error;
        }
    }

    /**
     * Check if a model supports extended thinking
     */
    supportsThinking(provider: AIProvider, model: string): boolean {
        try {
            const adapter = this.registry.getTextProvider(provider);
            return adapter.supportsThinking(model);
        } catch {
            return false;
        }
    }

    /**
     * Get available text providers
     */
    getAvailableProviders(): AIProvider[] {
        return this.registry
            .getRegisteredProviders("text")
            .filter((p) => this.registry.isProviderAvailable(p));
    }
}
