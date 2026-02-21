/**
 * ElevenLabs real-time text-to-speech streaming client
 */

import WebSocket from "ws";
import { silentLogger } from "../core/logger";
import { DEFAULT_ELEVENLABS_CONFIG } from "./types";
import type {
    ElevenLabsConfig,
    ElevenLabsResponse,
    AudioChunkHandler,
    ErrorHandler,
    StreamClientConfig
} from "./types";
import type { AILogger } from "../types";

/**
 * Configuration for ElevenLabsStreamClient
 */
export interface ElevenLabsStreamClientConfig extends StreamClientConfig {
    /** ElevenLabs-specific configuration */
    elevenlabs?: Partial<ElevenLabsConfig>;
}

/**
 * ElevenLabs real-time text-to-speech streaming client
 * Maintains a WebSocket connection to ElevenLabs streaming API
 */
export class ElevenLabsStreamClient {
    private socket: WebSocket | null = null;
    private readonly apiKey: string;
    private config: ElevenLabsConfig;
    private readonly logger: AILogger;
    private isConnected = false;
    private textBuffer: string[] = [];
    private isFlushing = false;

    // Event handlers
    private onAudioChunk: AudioChunkHandler | null = null;
    private onError: ErrorHandler | null = null;
    private onClose: (() => void) | null = null;
    private onOpen: (() => void) | null = null;
    private onComplete: (() => void) | null = null;

    constructor(config: ElevenLabsStreamClientConfig) {
        this.apiKey = config.apiKey;
        this.logger = config.logger ?? silentLogger;
        this.config = {
            ...DEFAULT_ELEVENLABS_CONFIG,
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
     * Sends text word by word for lowest latency
     */
    streamText(text: string): void {
        if (!this.socket || !this.isConnected) {
            this.logger.warn("Cannot stream text: ElevenLabs not connected");
            return;
        }

        // Add text to buffer
        this.textBuffer.push(text);

        // Send immediately if connected
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
     * This triggers ElevenLabs to generate the final audio
     */
    endText(): void {
        if (!this.socket || !this.isConnected) {
            return;
        }

        // Send empty string to signal end
        const endMessage = { text: "" };
        this.socket.send(JSON.stringify(endMessage));
        this.logger.debug("ElevenLabs text stream ended");
    }

    /**
     * Interrupt current speech generation (for barge-in)
     * Closes current context and starts a new one
     */
    async interrupt(): Promise<void> {
        if (!this.socket || !this.isConnected) {
            return;
        }

        this.logger.debug("Interrupting ElevenLabs speech generation");

        // Clear text buffer
        this.textBuffer = [];

        // Close current socket and reconnect for new context
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

    /**
     * Set audio chunk handler
     */
    setOnAudioChunk(handler: AudioChunkHandler): void {
        this.onAudioChunk = handler;
    }

    /**
     * Set error handler
     */
    setOnError(handler: ErrorHandler): void {
        this.onError = handler;
    }

    /**
     * Set close handler
     */
    setOnClose(handler: () => void): void {
        this.onClose = handler;
    }

    /**
     * Set open handler
     */
    setOnOpen(handler: () => void): void {
        this.onOpen = handler;
    }

    /**
     * Set completion handler
     */
    setOnComplete(handler: () => void): void {
        this.onComplete = handler;
    }

    /**
     * Check if connected
     */
    getIsConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Update voice configuration
     */
    updateConfig(newConfig: Partial<ElevenLabsConfig>): void {
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
                // Forward audio chunk to handler
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
