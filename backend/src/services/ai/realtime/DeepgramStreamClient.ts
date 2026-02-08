import WebSocket from "ws";
import type { DeepgramConfig } from "@flowmaestro/shared";
import { config } from "../../../core/config";
import { createServiceLogger } from "../../../core/logging";
import { DEFAULT_DEEPGRAM_CONFIG } from "./types";
import type { DeepgramResponse, TranscriptHandler, ErrorHandler } from "./types";

const logger = createServiceLogger("DeepgramStreamClient");

/**
 * Deepgram real-time speech-to-text streaming client
 * Maintains a WebSocket connection to Deepgram's streaming API
 */
export class DeepgramStreamClient {
    private socket: WebSocket | null = null;
    private config: DeepgramConfig;
    private isConnected = false;
    private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

    // Event handlers
    private onTranscript: TranscriptHandler | null = null;
    private onError: ErrorHandler | null = null;
    private onClose: (() => void) | null = null;
    private onOpen: (() => void) | null = null;

    constructor(customConfig?: Partial<DeepgramConfig>) {
        this.config = {
            ...DEFAULT_DEEPGRAM_CONFIG,
            model: config.voice.deepgram.model,
            language: config.voice.deepgram.language,
            sampleRate: config.voice.deepgram.sampleRate,
            endpointing: config.voice.deepgram.endpointing,
            ...customConfig
        };
    }

    /**
     * Connect to Deepgram streaming API
     */
    async connect(): Promise<void> {
        const apiKey = config.ai.deepgram.apiKey;
        if (!apiKey) {
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
                    Authorization: `Token ${apiKey}`
                }
            });

            this.socket.on("open", () => {
                logger.info("Deepgram WebSocket connected");
                this.isConnected = true;
                this.startKeepAlive();
                this.onOpen?.();
                resolve();
            });

            this.socket.on("message", (data: Buffer) => {
                this.handleMessage(data);
            });

            this.socket.on("error", (error: Error) => {
                logger.error({ err: error }, "Deepgram WebSocket error");
                this.onError?.(`Deepgram connection error: ${error.message}`);
                reject(error);
            });

            this.socket.on("close", (code: number, reason: Buffer) => {
                logger.info({ code, reason: reason.toString() }, "Deepgram WebSocket closed");
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
            logger.warn("Cannot send audio: Deepgram not connected");
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

    /**
     * Set transcript handler
     */
    setOnTranscript(handler: TranscriptHandler): void {
        this.onTranscript = handler;
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
     * Check if connected
     */
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
                    logger.debug({ metadata: response.metadata }, "Deepgram metadata received");
                    break;
                case "SpeechStarted":
                    logger.debug("Deepgram detected speech start");
                    break;
                case "UtteranceEnd":
                    logger.debug("Deepgram detected utterance end");
                    break;
                case "Error":
                    logger.error({ error: response.error }, "Deepgram error");
                    this.onError?.(response.error?.message || "Unknown Deepgram error");
                    break;
                default:
                    logger.debug({ type: response.type }, "Unknown Deepgram message type");
            }
        } catch (err) {
            logger.error({ err }, "Failed to parse Deepgram message");
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

        logger.debug(
            {
                transcript,
                isFinal,
                speechFinal,
                confidence: alternative.confidence
            },
            "Deepgram transcript received"
        );

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
