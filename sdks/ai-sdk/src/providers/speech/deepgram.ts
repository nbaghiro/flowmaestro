/**
 * Deepgram speech provider (STT streaming)
 */

import WebSocket from "ws";
import { silentLogger } from "../../core/logger";
import { AbstractProvider, type SpeechProvider } from "../base";
import {
    DEFAULT_DEEPGRAM_STREAM_CONFIG,
    type DeepgramStreamConfig,
    type DeepgramResponse,
    type TranscriptHandler,
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

// =============================================================================
// Streaming Client
// =============================================================================

/**
 * Configuration for Deepgram streaming client
 */
export interface DeepgramStreamClientConfig extends StreamClientConfig {
    /** Deepgram-specific configuration */
    deepgram?: Partial<DeepgramStreamConfig>;
}

/**
 * Deepgram real-time speech-to-text streaming client
 * Maintains a WebSocket connection to Deepgram's streaming API
 */
export class DeepgramStreamClient {
    private socket: WebSocket | null = null;
    private readonly apiKey: string;
    private readonly config: DeepgramStreamConfig;
    private readonly logger: AILogger;
    private isConnected = false;
    private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

    // Event handlers
    private onTranscript: TranscriptHandler | null = null;
    private onError: StreamErrorHandler | null = null;
    private onClose: (() => void) | null = null;
    private onOpen: (() => void) | null = null;

    constructor(config: DeepgramStreamClientConfig) {
        this.apiKey = config.apiKey;
        this.logger = config.logger ?? silentLogger;
        this.config = {
            ...DEFAULT_DEEPGRAM_STREAM_CONFIG,
            ...config.deepgram
        };
    }

    /**
     * Connect to Deepgram streaming API
     */
    async connect(): Promise<void> {
        if (!this.apiKey) {
            throw new Error("Deepgram API key not configured");
        }

        const params = new URLSearchParams({
            model: this.config.model,
            language: this.config.language,
            punctuate: String(this.config.punctuate),
            interim_results: String(this.config.interimResults),
            endpointing: String(this.config.endpointing),
            smart_format: String(this.config.smartFormat),
            sample_rate: String(this.config.sampleRate),
            encoding: this.config.encoding,
            channels: String(this.config.channels)
        });

        const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

        return new Promise((resolve, reject) => {
            this.socket = new WebSocket(url, {
                headers: {
                    Authorization: `Token ${this.apiKey}`
                }
            });

            this.socket.on("open", () => {
                this.logger.info("Deepgram WebSocket connected");
                this.isConnected = true;
                this.startKeepAlive();
                this.onOpen?.();
                resolve();
            });

            this.socket.on("message", (data: Buffer) => {
                this.handleMessage(data);
            });

            this.socket.on("error", (error: Error) => {
                this.logger.error("Deepgram WebSocket error", error);
                this.onError?.(`Deepgram connection error: ${error.message}`);
                reject(error);
            });

            this.socket.on("close", (code: number, reason: Buffer) => {
                this.logger.info("Deepgram WebSocket closed", { code, reason: reason.toString() });
                this.isConnected = false;
                this.stopKeepAlive();
                this.onClose?.();
            });
        });
    }

    /**
     * Send audio data to Deepgram
     */
    sendAudio(audioData: Buffer): void {
        if (!this.socket || !this.isConnected) {
            this.logger.warn("Cannot send audio: Deepgram not connected");
            return;
        }

        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(audioData);
        }
    }

    /**
     * Send base64 encoded audio to Deepgram
     */
    sendBase64Audio(base64Data: string): void {
        const buffer = Buffer.from(base64Data, "base64");
        this.sendAudio(buffer);
    }

    /**
     * Close the connection gracefully
     */
    async close(): Promise<void> {
        this.stopKeepAlive();

        if (this.socket && this.isConnected) {
            // Send close stream message
            const closeMessage = JSON.stringify({ type: "CloseStream" });
            this.socket.send(closeMessage);

            // Wait briefly for final results
            await new Promise((resolve) => setTimeout(resolve, 500));

            this.socket.close();
            this.socket = null;
            this.isConnected = false;
        }
    }

    /** Set transcript handler */
    setOnTranscript(handler: TranscriptHandler): void {
        this.onTranscript = handler;
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

    /** Check if connected */
    getIsConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Handle incoming message from Deepgram
     */
    private handleMessage(data: Buffer): void {
        try {
            const response = JSON.parse(data.toString()) as DeepgramResponse;

            switch (response.type) {
                case "Results":
                    this.handleTranscriptResult(response);
                    break;
                case "Metadata":
                    this.logger.debug("Deepgram metadata received", {
                        metadata: response.metadata
                    });
                    break;
                case "SpeechStarted":
                    this.logger.debug("Deepgram detected speech start");
                    break;
                case "UtteranceEnd":
                    this.logger.debug("Deepgram detected utterance end");
                    break;
                case "Error":
                    this.logger.error("Deepgram error", undefined, { error: response.error });
                    this.onError?.(response.error?.message || "Unknown Deepgram error");
                    break;
                default:
                    this.logger.debug("Unknown Deepgram message type", { type: response.type });
            }
        } catch (err) {
            this.logger.error(
                "Failed to parse Deepgram message",
                err instanceof Error ? err : undefined
            );
        }
    }

    /**
     * Handle transcript result from Deepgram
     */
    private handleTranscriptResult(response: DeepgramResponse): void {
        const alternative = response.channel?.alternatives?.[0];
        if (!alternative) return;

        const transcript = alternative.transcript;
        if (!transcript) return;

        const isFinal = response.is_final || false;
        const speechFinal = response.speech_final || false;

        this.logger.debug("Deepgram transcript received", {
            transcript,
            isFinal,
            speechFinal,
            confidence: alternative.confidence
        });

        this.onTranscript?.(transcript, isFinal, speechFinal);
    }

    /**
     * Start keep-alive ping to prevent connection timeout
     */
    private startKeepAlive(): void {
        this.keepAliveInterval = setInterval(() => {
            if (this.socket && this.isConnected) {
                const keepAlive = JSON.stringify({ type: "KeepAlive" });
                this.socket.send(keepAlive);
            }
        }, 10000); // Every 10 seconds
    }

    /**
     * Stop keep-alive ping
     */
    private stopKeepAlive(): void {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
    }
}

// =============================================================================
// Speech Provider
// =============================================================================

/**
 * Deepgram speech provider
 *
 * Supports:
 * - Streaming STT via createStreamClient()
 *
 * Note: Deepgram is primarily a streaming service. For non-streaming
 * transcription, consider using OpenAI Whisper via OpenAISpeechProvider.
 */
export class DeepgramSpeechProvider extends AbstractProvider implements SpeechProvider {
    readonly provider: AIProvider = "deepgram";
    readonly supportedModels = ["nova-2", "nova-3"];

    constructor(logger: AILogger) {
        super(logger);
    }

    supportsTranscription(): boolean {
        // Deepgram supports transcription via streaming
        return true;
    }

    supportsTTS(): boolean {
        return false;
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
        // Deepgram's primary mode is streaming. For file-based transcription,
        // users should use the streaming client or OpenAI Whisper.
        throw new Error(
            "Deepgram is primarily a streaming service. Use createStreamClient() for real-time transcription, or use OpenAI Whisper for file-based transcription."
        );
    }

    async textToSpeech(_request: TTSRequest, _apiKey: string): Promise<TTSResponse> {
        throw new Error("Deepgram does not support text-to-speech");
    }

    /**
     * Create a streaming STT client
     *
     * @example
     * ```typescript
     * const stream = provider.createStreamClient({
     *     apiKey: "...",
     *     deepgram: { model: "nova-2", language: "en-US" }
     * });
     *
     * stream.setOnTranscript((text, isFinal) => {
     *     console.log(isFinal ? `Final: ${text}` : `Interim: ${text}`);
     * });
     *
     * await stream.connect();
     * stream.sendAudio(audioBuffer);
     * ```
     */
    createStreamClient(config: DeepgramStreamClientConfig): DeepgramStreamClient {
        return new DeepgramStreamClient({
            ...config,
            logger: config.logger ?? this.logger
        });
    }
}
