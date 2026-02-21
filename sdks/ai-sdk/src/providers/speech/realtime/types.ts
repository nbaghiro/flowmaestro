/**
 * Types for realtime streaming speech clients
 */

import type { AILogger } from "../../../types";

/**
 * Deepgram configuration for real-time streaming
 */
export interface DeepgramConfig {
    model: "nova-2" | "nova-3";
    language: string;
    punctuate: boolean;
    interimResults: boolean;
    endpointing: number; // ms of silence before final
    smartFormat: boolean;
    sampleRate: number;
    encoding: "linear16";
    channels: number;
}

/**
 * ElevenLabs configuration for real-time streaming
 */
export interface ElevenLabsConfig {
    voiceId: string;
    modelId: "eleven_turbo_v2_5" | "eleven_multilingual_v2" | "eleven_flash_v2_5";
    stability: number; // 0-1
    similarityBoost: number; // 0-1
    style: number; // 0-1
    useSpeakerBoost: boolean;
    outputFormat: "mp3_44100_128" | "mp3_22050_32" | "pcm_16000" | "pcm_22050";
}

/**
 * Deepgram WebSocket response types
 */
export interface DeepgramResponse {
    type: "Results" | "Metadata" | "SpeechStarted" | "UtteranceEnd" | "Error";
    channel_index?: [number, number];
    duration?: number;
    start?: number;
    is_final?: boolean;
    speech_final?: boolean;
    channel?: {
        alternatives: Array<{
            transcript: string;
            confidence: number;
            words?: Array<{
                word: string;
                start: number;
                end: number;
                confidence: number;
                punctuated_word?: string;
            }>;
        }>;
    };
    metadata?: {
        request_id: string;
        model_info?: {
            name: string;
            version: string;
        };
    };
    error?: {
        code: string;
        message: string;
    };
}

/**
 * ElevenLabs WebSocket response types
 */
export interface ElevenLabsResponse {
    audio?: string; // base64 encoded audio
    isFinal?: boolean;
    normalizedAlignment?: {
        char_start_times_ms: number[];
        chars_durations_ms: number[];
        chars: string[];
    };
    error?: {
        message: string;
        code?: string;
    };
}

/**
 * Default Deepgram configuration for real-time streaming
 */
export const DEFAULT_DEEPGRAM_CONFIG: DeepgramConfig = {
    model: "nova-2",
    language: "en-US",
    punctuate: true,
    interimResults: true,
    endpointing: 300,
    smartFormat: true,
    sampleRate: 16000,
    encoding: "linear16",
    channels: 1
};

/**
 * Default ElevenLabs configuration for real-time streaming
 */
export const DEFAULT_ELEVENLABS_CONFIG: ElevenLabsConfig = {
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    modelId: "eleven_turbo_v2_5",
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0,
    useSpeakerBoost: true,
    outputFormat: "mp3_44100_128"
};

/**
 * Transcript handler callback type
 */
export type TranscriptHandler = (text: string, isFinal: boolean, speechFinal: boolean) => void;

/**
 * Audio chunk handler callback type
 */
export type AudioChunkHandler = (audioBase64: string) => void;

/**
 * Error handler callback type
 */
export type ErrorHandler = (error: string, code?: string) => void;

/**
 * Stream client configuration
 */
export interface StreamClientConfig {
    /** API key for the service */
    apiKey: string;
    /** Optional logger */
    logger?: AILogger;
}
