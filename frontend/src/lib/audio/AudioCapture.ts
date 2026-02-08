import { logger } from "../logger";

/**
 * Audio capture configuration
 */
export interface AudioCaptureConfig {
    sampleRate: number;
    channelCount: number;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
}

const DEFAULT_CONFIG: AudioCaptureConfig = {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
};

/**
 * Audio capture utility for voice chat
 * Captures microphone audio and converts to PCM for streaming
 */
export class AudioCapture {
    private stream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private workletNode: AudioWorkletNode | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;
    private config: AudioCaptureConfig;
    private onAudioData: ((data: ArrayBuffer) => void) | null = null;
    private isCapturing = false;

    constructor(config: Partial<AudioCaptureConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Check if audio capture is supported
     */
    static isSupported(): boolean {
        return !!(
            typeof navigator !== "undefined" &&
            navigator.mediaDevices &&
            typeof navigator.mediaDevices.getUserMedia === "function" &&
            typeof AudioContext !== "undefined" &&
            typeof AudioWorkletNode !== "undefined"
        );
    }

    /**
     * Request microphone permission
     */
    async requestPermission(): Promise<boolean> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((track) => track.stop());
            return true;
        } catch (error) {
            logger.error("Microphone permission denied", error);
            return false;
        }
    }

    /**
     * Start capturing audio
     */
    async start(onAudioData: (data: ArrayBuffer) => void): Promise<void> {
        if (this.isCapturing) {
            logger.warn("Audio capture already started");
            return;
        }

        this.onAudioData = onAudioData;

        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.config.sampleRate,
                    channelCount: this.config.channelCount,
                    echoCancellation: this.config.echoCancellation,
                    noiseSuppression: this.config.noiseSuppression,
                    autoGainControl: this.config.autoGainControl
                }
            });

            // Create audio context
            this.audioContext = new AudioContext({
                sampleRate: this.config.sampleRate
            });

            // Load and register the AudioWorklet processor
            await this.loadWorkletProcessor();

            // Create source node from stream
            this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);

            // Create worklet node for PCM extraction
            this.workletNode = new AudioWorkletNode(this.audioContext, "pcm-processor");

            // Handle audio data from worklet
            this.workletNode.port.onmessage = (event) => {
                if (event.data && this.onAudioData) {
                    // Convert Float32 to Int16 (Linear16)
                    const float32Data = event.data as Float32Array;
                    const int16Data = this.float32ToInt16(float32Data);
                    // Copy buffer to ensure it's a standard ArrayBuffer
                    const buffer = new ArrayBuffer(int16Data.byteLength);
                    new Int16Array(buffer).set(int16Data);
                    this.onAudioData(buffer);
                }
            };

            // Connect the audio graph
            this.sourceNode.connect(this.workletNode);
            this.workletNode.connect(this.audioContext.destination);

            this.isCapturing = true;
            logger.info("Audio capture started", { sampleRate: this.config.sampleRate });
        } catch (error) {
            logger.error("Failed to start audio capture", error);
            this.cleanup();
            throw error;
        }
    }

    /**
     * Stop capturing audio
     */
    stop(): void {
        if (!this.isCapturing) {
            return;
        }

        this.cleanup();
        this.isCapturing = false;
        logger.info("Audio capture stopped");
    }

    /**
     * Check if currently capturing
     */
    getIsCapturing(): boolean {
        return this.isCapturing;
    }

    /**
     * Load the AudioWorklet processor
     */
    private async loadWorkletProcessor(): Promise<void> {
        if (!this.audioContext) return;

        // Create the worklet processor code as a blob URL
        const processorCode = `
            class PCMProcessor extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this.bufferSize = 2048;
                    this.buffer = new Float32Array(this.bufferSize);
                    this.bufferIndex = 0;
                }

                process(inputs, outputs, parameters) {
                    const input = inputs[0];
                    if (!input || !input[0]) return true;

                    const channelData = input[0];

                    for (let i = 0; i < channelData.length; i++) {
                        this.buffer[this.bufferIndex++] = channelData[i];

                        if (this.bufferIndex >= this.bufferSize) {
                            // Send buffer to main thread
                            this.port.postMessage(this.buffer.slice());
                            this.bufferIndex = 0;
                        }
                    }

                    return true;
                }
            }

            registerProcessor('pcm-processor', PCMProcessor);
        `;

        const blob = new Blob([processorCode], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);

        try {
            await this.audioContext.audioWorklet.addModule(url);
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    /**
     * Convert Float32 samples to Int16 (Linear16)
     */
    private float32ToInt16(float32: Float32Array): Int16Array {
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
            // Clamp to [-1, 1] and scale to Int16 range
            const sample = Math.max(-1, Math.min(1, float32[i]));
            int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }
        return int16;
    }

    /**
     * Cleanup resources
     */
    private cleanup(): void {
        if (this.workletNode) {
            this.workletNode.disconnect();
            this.workletNode = null;
        }

        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
        }

        this.onAudioData = null;
    }
}
