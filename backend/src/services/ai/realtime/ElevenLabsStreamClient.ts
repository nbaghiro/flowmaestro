import WebSocket from "ws";
import type { ElevenLabsConfig } from "@flowmaestro/shared";
import { config } from "../../../core/config";
import { createServiceLogger } from "../../../core/logging";
import { DEFAULT_ELEVENLABS_CONFIG } from "./types";
import type { ElevenLabsResponse, AudioChunkHandler, ErrorHandler } from "./types";

const logger = createServiceLogger("ElevenLabsStreamClient");

/**
 * ElevenLabs real-time text-to-speech streaming client
 * Maintains a WebSocket connection to ElevenLabs streaming API
 */
export class ElevenLabsStreamClient {
    private socket: WebSocket | null = null;
    private config: ElevenLabsConfig;
    private isConnected = false;
    private textBuffer: string[] = [];
    private isFlushing = false;

    // Event handlers
    private onAudioChunk: AudioChunkHandler | null = null;
    private onError: ErrorHandler | null = null;
    private onClose: (() => void) | null = null;
    private onOpen: (() => void) | null = null;
    private onComplete: (() => void) | null = null;

    constructor(customConfig?: Partial<ElevenLabsConfig>) {
        this.config = {
            ...DEFAULT_ELEVENLABS_CONFIG,
            voiceId: config.voice.elevenlabs.defaultVoiceId,
            modelId: config.voice.elevenlabs.model,
            stability: config.voice.elevenlabs.stability,
            similarityBoost: config.voice.elevenlabs.similarityBoost,
            outputFormat: config.voice.elevenlabs.outputFormat,
            ...customConfig
        };
    }

    /**
     * Connect to ElevenLabs streaming API
     */
    async connect(): Promise<void> {
        const apiKey = config.ai.elevenlabs.apiKey;
        if (!apiKey) {
            throw new Error("ElevenLabs API key not configured");
        }

        const url = `wss://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId}/stream-input?model_id=${this.config.modelId}&output_format=${this.config.outputFormat}`;

        return new Promise((resolve, reject) => {
            this.socket = new WebSocket(url, {
                headers: {
                    "xi-api-key": apiKey
                }
            });

            this.socket.on("open", () => {
                logger.info("ElevenLabs WebSocket connected");
                this.isConnected = true;
                this.sendInitialConfig();
                this.onOpen?.();
                resolve();
            });

            this.socket.on("message", (data: Buffer) => {
                this.handleMessage(data);
            });

            this.socket.on("error", (error: Error) => {
                logger.error({ err: error }, "ElevenLabs WebSocket error");
                this.onError?.(`ElevenLabs connection error: ${error.message}`);
                reject(error);
            });

            this.socket.on("close", (code: number, reason: Buffer) => {
                logger.info({ code, reason: reason.toString() }, "ElevenLabs WebSocket closed");
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
        logger.debug("ElevenLabs initial config sent");
    }

    /**
     * Stream text to ElevenLabs for TTS
     * Sends text word by word for lowest latency
     */
    streamText(text: string): void {
        if (!this.socket || !this.isConnected) {
            logger.warn("Cannot stream text: ElevenLabs not connected");
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
        logger.debug("ElevenLabs text stream ended");
    }

    /**
     * Interrupt current speech generation (for barge-in)
     * Closes current context and starts a new one
     */
    async interrupt(): Promise<void> {
        if (!this.socket || !this.isConnected) {
            return;
        }

        logger.debug("Interrupting ElevenLabs speech generation");

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
                logger.error({ error: response.error }, "ElevenLabs error");
                this.onError?.(response.error.message, response.error.code);
                return;
            }

            if (response.audio) {
                // Forward audio chunk to handler
                this.onAudioChunk?.(response.audio);
            }

            if (response.isFinal) {
                logger.debug("ElevenLabs generation complete");
                this.onComplete?.();
            }
        } catch (err) {
            logger.error({ err }, "Failed to parse ElevenLabs message");
        }
    }
}
