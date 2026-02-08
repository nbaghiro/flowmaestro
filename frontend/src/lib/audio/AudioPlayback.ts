import { logger } from "../logger";

/**
 * Audio playback configuration
 */
export interface AudioPlaybackConfig {
    bufferSize: number; // Number of chunks to buffer before playing
    sampleRate: number;
}

const DEFAULT_CONFIG: AudioPlaybackConfig = {
    bufferSize: 2,
    sampleRate: 44100
};

/**
 * Audio playback utility for voice chat
 * Handles streaming audio playback from base64 MP3 chunks
 */
export class AudioPlayback {
    private audioContext: AudioContext | null = null;
    private config: AudioPlaybackConfig;
    private audioQueue: AudioBuffer[] = [];
    private isPlaying = false;
    private currentSource: AudioBufferSourceNode | null = null;
    private nextStartTime = 0;
    private gainNode: GainNode | null = null;
    private onPlaybackStart: (() => void) | null = null;
    private onPlaybackEnd: (() => void) | null = null;

    constructor(config: Partial<AudioPlaybackConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Initialize the audio context
     * Must be called after user interaction (browser autoplay policy)
     */
    async initialize(): Promise<void> {
        if (this.audioContext) {
            return;
        }

        this.audioContext = new AudioContext({
            sampleRate: this.config.sampleRate
        });

        // Create gain node for volume control
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);

        // Resume context if suspended (browser autoplay policy)
        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }

        logger.info("Audio playback initialized", { sampleRate: this.config.sampleRate });
    }

    /**
     * Set callback for when playback starts
     */
    setOnPlaybackStart(callback: () => void): void {
        this.onPlaybackStart = callback;
    }

    /**
     * Set callback for when playback ends
     */
    setOnPlaybackEnd(callback: () => void): void {
        this.onPlaybackEnd = callback;
    }

    /**
     * Queue an audio chunk for playback
     * @param base64Audio Base64 encoded audio (MP3)
     */
    async queueAudio(base64Audio: string): Promise<void> {
        if (!this.audioContext) {
            await this.initialize();
        }

        try {
            // Decode base64 to ArrayBuffer
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Decode audio data
            const audioBuffer = await this.audioContext!.decodeAudioData(bytes.buffer.slice(0));

            // Add to queue
            this.audioQueue.push(audioBuffer);

            // Start playing if we have enough buffered
            if (!this.isPlaying && this.audioQueue.length >= this.config.bufferSize) {
                this.startPlayback();
            }
        } catch (error) {
            logger.error("Failed to queue audio", error);
        }
    }

    /**
     * Start playing queued audio
     */
    private startPlayback(): void {
        if (
            this.isPlaying ||
            this.audioQueue.length === 0 ||
            !this.audioContext ||
            !this.gainNode
        ) {
            return;
        }

        this.isPlaying = true;
        this.nextStartTime = this.audioContext.currentTime;
        this.onPlaybackStart?.();

        this.scheduleNextBuffer();
    }

    /**
     * Schedule the next audio buffer for playback
     */
    private scheduleNextBuffer(): void {
        if (!this.audioContext || !this.gainNode) {
            return;
        }

        const buffer = this.audioQueue.shift();
        if (!buffer) {
            // Queue is empty
            this.isPlaying = false;
            this.onPlaybackEnd?.();
            return;
        }

        // Create source node
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.gainNode);

        // Track current source for interruption
        this.currentSource = source;

        // Schedule playback
        source.start(this.nextStartTime);
        this.nextStartTime += buffer.duration;

        // Schedule next buffer when this one ends
        source.onended = () => {
            if (this.currentSource === source) {
                this.currentSource = null;
            }
            this.scheduleNextBuffer();
        };
    }

    /**
     * Stop all playback and clear queue
     */
    stop(): void {
        // Stop current source
        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch {
                // Ignore errors if already stopped
            }
            this.currentSource = null;
        }

        // Clear queue
        this.audioQueue = [];
        this.isPlaying = false;
        this.nextStartTime = 0;

        logger.info("Audio playback stopped");
    }

    /**
     * Set playback volume
     * @param volume Volume level (0-1)
     */
    setVolume(volume: number): void {
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * Get current volume
     */
    getVolume(): number {
        return this.gainNode?.gain.value ?? 1;
    }

    /**
     * Check if currently playing
     */
    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    /**
     * Get queue length
     */
    getQueueLength(): number {
        return this.audioQueue.length;
    }

    /**
     * Cleanup resources
     */
    cleanup(): void {
        this.stop();

        if (this.gainNode) {
            this.gainNode.disconnect();
            this.gainNode = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}
