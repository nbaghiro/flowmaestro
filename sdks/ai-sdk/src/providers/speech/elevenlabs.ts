/**
 * ElevenLabs speech provider (TTS request/response + streaming)
 */

import WebSocket from "ws";
import { silentLogger } from "../../core/logger";
import { AbstractProvider, type SpeechProvider } from "../base";
import {
    DEFAULT_ELEVENLABS_STREAM_CONFIG,
    type ElevenLabsStreamConfig,
    type ElevenLabsResponse,
    type AudioChunkHandler,
    type StreamErrorHandler,
    type StreamClientConfig
} from "./types";
import type {
    TranscriptionRequest,
    TranscriptionResponse,
    TTSRequest,
    TTSResponse
} from "../../capabilities/speech/types";
import type { AILogger, AIProvider } from "../../types";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

// =============================================================================
// Streaming Client
// =============================================================================

/**
 * Configuration for ElevenLabs streaming client
 */
export interface ElevenLabsStreamClientConfig extends StreamClientConfig {
    /** ElevenLabs-specific configuration */
    elevenlabs?: Partial<ElevenLabsStreamConfig>;
}

/**
 * ElevenLabs real-time text-to-speech streaming client
 * Maintains a WebSocket connection to ElevenLabs streaming API
 */
export class ElevenLabsStreamClient {
    private socket: WebSocket | null = null;
    private readonly apiKey: string;
    private config: ElevenLabsStreamConfig;
    private readonly logger: AILogger;
    private isConnected = false;
    private textBuffer: string[] = [];
    private isFlushing = false;

    // Event handlers
    private onAudioChunk: AudioChunkHandler | null = null;
    private onError: StreamErrorHandler | null = null;
    private onClose: (() => void) | null = null;
    private onOpen: (() => void) | null = null;
    private onComplete: (() => void) | null = null;

    constructor(config: ElevenLabsStreamClientConfig) {
        this.apiKey = config.apiKey;
        this.logger = config.logger ?? silentLogger;
        this.config = {
            ...DEFAULT_ELEVENLABS_STREAM_CONFIG,
            ...config.elevenlabs
        };
    }

    /**
     * Connect to ElevenLabs streaming API
     */
    async connect(): Promise<void> {
        if (!this.apiKey) {
            throw new Error("ElevenLabs API key not configured");
        }

        const url = `wss://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId}/stream-input?model_id=${this.config.modelId}&output_format=${this.config.outputFormat}`;

        return new Promise((resolve, reject) => {
            this.socket = new WebSocket(url, {
                headers: {
                    "xi-api-key": this.apiKey
                }
            });

            this.socket.on("open", () => {
                this.logger.info("ElevenLabs WebSocket connected");
                this.isConnected = true;
                this.sendInitialConfig();
                this.onOpen?.();
                resolve();
            });

            this.socket.on("message", (data: Buffer) => {
                this.handleMessage(data);
            });

            this.socket.on("error", (error: Error) => {
                this.logger.error("ElevenLabs WebSocket error", error);
                this.onError?.(`ElevenLabs connection error: ${error.message}`);
                reject(error);
            });

            this.socket.on("close", (code: number, reason: Buffer) => {
                this.logger.info("ElevenLabs WebSocket closed", {
                    code,
                    reason: reason.toString()
                });
                this.isConnected = false;
                this.onClose?.();
            });
        });
    }

    /**
     * Send initial configuration to ElevenLabs
     */
    private sendInitialConfig(): void {
        if (!this.socket || !this.isConnected) return;

        const initMessage = {
            text: " ", // Initial space to start the stream
            voice_settings: {
                stability: this.config.stability,
                similarity_boost: this.config.similarityBoost,
                style: this.config.style,
                use_speaker_boost: this.config.useSpeakerBoost
            },
            generation_config: {
                chunk_length_schedule: [120, 160, 250, 290] // Optimized for low latency
            }
        };

        this.socket.send(JSON.stringify(initMessage));
        this.logger.debug("ElevenLabs initial config sent");
    }

    /**
     * Stream text to ElevenLabs for TTS
     */
    streamText(text: string): void {
        if (!this.socket || !this.isConnected) {
            this.logger.warn("Cannot stream text: ElevenLabs not connected");
            return;
        }

        this.textBuffer.push(text);
        this.flushBuffer();
    }

    /**
     * Flush text buffer to ElevenLabs
     */
    private flushBuffer(): void {
        if (this.isFlushing || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        this.isFlushing = true;

        while (this.textBuffer.length > 0) {
            const text = this.textBuffer.shift();
            if (text) {
                const message = { text };
                this.socket.send(JSON.stringify(message));
            }
        }

        this.isFlushing = false;
    }

    /**
     * Signal end of text input
     */
    endText(): void {
        if (!this.socket || !this.isConnected) {
            return;
        }

        const endMessage = { text: "" };
        this.socket.send(JSON.stringify(endMessage));
        this.logger.debug("ElevenLabs text stream ended");
    }

    /**
     * Interrupt current speech generation (for barge-in)
     */
    async interrupt(): Promise<void> {
        if (!this.socket || !this.isConnected) {
            return;
        }

        this.logger.debug("Interrupting ElevenLabs speech generation");
        this.textBuffer = [];
        await this.close();
        await this.connect();
    }

    /**
     * Close the connection gracefully
     */
    async close(): Promise<void> {
        if (this.socket && this.isConnected) {
            this.socket.close();
            this.socket = null;
            this.isConnected = false;
        }
    }

    /** Set audio chunk handler */
    setOnAudioChunk(handler: AudioChunkHandler): void {
        this.onAudioChunk = handler;
    }

    /** Set error handler */
    setOnError(handler: StreamErrorHandler): void {
        this.onError = handler;
    }

    /** Set close handler */
    setOnClose(handler: () => void): void {
        this.onClose = handler;
    }

    /** Set open handler */
    setOnOpen(handler: () => void): void {
        this.onOpen = handler;
    }

    /** Set completion handler */
    setOnComplete(handler: () => void): void {
        this.onComplete = handler;
    }

    /** Check if connected */
    getIsConnected(): boolean {
        return this.isConnected;
    }

    /** Update voice configuration */
    updateConfig(newConfig: Partial<ElevenLabsStreamConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Handle incoming message from ElevenLabs
     */
    private handleMessage(data: Buffer): void {
        try {
            const response = JSON.parse(data.toString()) as ElevenLabsResponse;

            if (response.error) {
                this.logger.error("ElevenLabs error", undefined, { error: response.error });
                this.onError?.(response.error.message, response.error.code);
                return;
            }

            if (response.audio) {
                this.onAudioChunk?.(response.audio);
            }

            if (response.isFinal) {
                this.logger.debug("ElevenLabs generation complete");
                this.onComplete?.();
            }
        } catch (err) {
            this.logger.error(
                "Failed to parse ElevenLabs message",
                err instanceof Error ? err : undefined
            );
        }
    }
}

// =============================================================================
// Speech Provider
// =============================================================================

/**
 * ElevenLabs speech provider
 *
 * Supports:
 * - Request/response TTS via textToSpeech()
 * - Streaming TTS via createStreamClient()
 */
export class ElevenLabsSpeechProvider extends AbstractProvider implements SpeechProvider {
    readonly provider: AIProvider = "elevenlabs";
    readonly supportedModels = [
        "eleven_multilingual_v2",
        "eleven_turbo_v2_5",
        "eleven_turbo_v2",
        "eleven_monolingual_v1",
        "eleven_flash_v2_5"
    ];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsTranscription(): boolean {
        return false;
    }

    supportsTTS(): boolean {
        return true;
    }

    /**
     * Check if this provider supports streaming
     */
    supportsStreaming(): boolean {
        return true;
    }

    async transcribe(
        _request: TranscriptionRequest,
        _apiKey: string
    ): Promise<TranscriptionResponse> {
        throw new Error("ElevenLabs does not support transcription");
    }

    async textToSpeech(request: TTSRequest, apiKey: string): Promise<TTSResponse> {
        const startTime = Date.now();
        const voiceId = request.voice || "21m00Tcm4TlvDq8ikWAM"; // Default to Rachel

        const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
            method: "POST",
            headers: {
                Accept: "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": apiKey
            },
            body: JSON.stringify({
                text: request.text,
                model_id: request.model || "eleven_multilingual_v2",
                voice_settings: {
                    stability: request.stability ?? 0.5,
                    similarity_boost: request.similarityBoost ?? 0.75,
                    style: request.style ?? 0,
                    use_speaker_boost: request.speakerBoost ?? true
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioData = Buffer.from(arrayBuffer).toString("base64");

        return {
            base64: audioData,
            metadata: {
                processingTimeMs: Date.now() - startTime,
                provider: this.provider,
                model: request.model || "eleven_multilingual_v2",
                charactersUsed: request.text.length
            }
        };
    }

    /**
     * Create a streaming TTS client
     *
     * @example
     * ```typescript
     * const stream = provider.createStreamClient({
     *     apiKey: "...",
     *     elevenlabs: { voiceId: "21m00Tcm4TlvDq8ikWAM" }
     * });
     *
     * stream.setOnAudioChunk((audio) => playAudio(audio));
     * await stream.connect();
     * stream.streamText("Hello world");
     * stream.endText();
     * ```
     */
    createStreamClient(config: ElevenLabsStreamClientConfig): ElevenLabsStreamClient {
        return new ElevenLabsStreamClient({
            ...config,
            logger: config.logger ?? this.logger
        });
    }
}
