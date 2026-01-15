/**
 * Speech capability (TTS and STT)
 */

import { withRetry, DEFAULT_RETRY_CONFIG } from "../../infrastructure/retry";
import type { TranscriptionRequest, TranscriptionResponse, TTSRequest, TTSResponse } from "./types";
import type { AIProvider, AILogger, RetryConfig } from "../../client/types";
import type { ProviderRegistry } from "../../providers/registry";

export * from "./types";

/**
 * Speech capability
 *
 * Provides speech-to-text and text-to-speech across multiple providers.
 */
export class SpeechCapability {
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
     * Transcribe audio to text
     */
    async transcribe(request: TranscriptionRequest): Promise<TranscriptionResponse> {
        const provider = request.provider ?? this.registry.getDefaultProvider("speech");
        const adapter = this.registry.getSpeechProvider(provider);
        const apiKey = await this.registry.resolveApiKey(provider, request.connectionId);

        this.logger.info("Transcription request", {
            provider,
            model: request.model
        });

        return withRetry(
            () => adapter.transcribe(request, apiKey),
            this.retryConfig,
            `Transcription:${request.model}`,
            provider,
            this.logger
        );
    }

    /**
     * Convert text to speech
     */
    async synthesize(request: TTSRequest): Promise<TTSResponse> {
        const provider = request.provider ?? this.registry.getDefaultProvider("speech");
        const adapter = this.registry.getSpeechProvider(provider);
        const apiKey = await this.registry.resolveApiKey(provider, request.connectionId);

        this.logger.info("Text-to-speech request", {
            provider,
            model: request.model,
            textLength: request.text.length
        });

        return withRetry(
            () => adapter.textToSpeech(request, apiKey),
            this.retryConfig,
            `TTS:${request.model}`,
            provider,
            this.logger
        );
    }

    /**
     * Get available speech providers
     */
    getAvailableProviders(): AIProvider[] {
        return this.registry
            .getRegisteredProviders("speech")
            .filter((p) => this.registry.isProviderAvailable(p));
    }
}
