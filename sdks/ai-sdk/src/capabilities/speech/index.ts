/**
 * Speech capability (TTS and STT)
 */

import { withRetry, DEFAULT_RETRY_CONFIG } from "../../core/retry";
import { DeepgramStreamClient } from "./realtime/DeepgramStreamClient";
import { ElevenLabsStreamClient } from "./realtime/ElevenLabsStreamClient";
import type { DeepgramStreamClientConfig } from "./realtime/DeepgramStreamClient";
import type { ElevenLabsStreamClientConfig } from "./realtime/ElevenLabsStreamClient";
import type { TranscriptionRequest, TranscriptionResponse, TTSRequest, TTSResponse } from "./types";
import type { ProviderRegistry } from "../../providers/registry";
import type { AIProvider, AILogger, RetryConfig } from "../../types";

export * from "./types";

// Re-export realtime streaming clients and types
export { DeepgramStreamClient, ElevenLabsStreamClient };
export type { DeepgramStreamClientConfig, ElevenLabsStreamClientConfig };
export * from "./realtime/types";

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

    /**
     * Create a realtime speech-to-text streaming client (Deepgram)
     *
     * @example
     * ```typescript
     * const transcriber = ai.speech.createRealtimeTranscriber({
     *     apiKey: process.env.DEEPGRAM_API_KEY,
     *     deepgram: { model: "nova-2", language: "en-US" }
     * });
     *
     * transcriber.setOnTranscript((text, isFinal) => {
     *     console.log(isFinal ? `Final: ${text}` : `Interim: ${text}`);
     * });
     *
     * await transcriber.connect();
     * transcriber.sendAudio(audioBuffer);
     * ```
     */
    createRealtimeTranscriber(config: DeepgramStreamClientConfig): DeepgramStreamClient {
        return new DeepgramStreamClient({
            ...config,
            logger: config.logger ?? this.logger
        });
    }

    /**
     * Create a realtime text-to-speech streaming client (ElevenLabs)
     *
     * @example
     * ```typescript
     * const synthesizer = ai.speech.createRealtimeSynthesizer({
     *     apiKey: process.env.ELEVENLABS_API_KEY,
     *     elevenlabs: { voiceId: "21m00Tcm4TlvDq8ikWAM" }
     * });
     *
     * synthesizer.setOnAudioChunk((audioBase64) => {
     *     // Stream audio to speaker
     * });
     *
     * await synthesizer.connect();
     * synthesizer.streamText("Hello, world!");
     * synthesizer.endText();
     * ```
     */
    createRealtimeSynthesizer(config: ElevenLabsStreamClientConfig): ElevenLabsStreamClient {
        return new ElevenLabsStreamClient({
            ...config,
            logger: config.logger ?? this.logger
        });
    }
}
