/**
 * Shared types for speech providers (streaming)
 */

import type { AILogger } from "../../types";

// =============================================================================
// Deepgram Types
// =============================================================================

/**
 * Deepgram configuration for real-time streaming
 */
export interface DeepgramStreamConfig {
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
 * Default Deepgram configuration for real-time streaming
 */
export const DEFAULT_DEEPGRAM_STREAM_CONFIG: DeepgramStreamConfig = {
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

// =============================================================================
// ElevenLabs Types
// =============================================================================

/**
 * ElevenLabs configuration for real-time streaming
 */
export interface ElevenLabsStreamConfig {
    voiceId: string;
    modelId: "eleven_turbo_v2_5" | "eleven_multilingual_v2" | "eleven_flash_v2_5";
    stability: number; // 0-1
    similarityBoost: number; // 0-1
    style: number; // 0-1
    useSpeakerBoost: boolean;
    outputFormat: "mp3_44100_128" | "mp3_22050_32" | "pcm_16000" | "pcm_22050";
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
 * Default ElevenLabs configuration for real-time streaming
 */
export const DEFAULT_ELEVENLABS_STREAM_CONFIG: ElevenLabsStreamConfig = {
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    modelId: "eleven_turbo_v2_5",
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0,
    useSpeakerBoost: true,
    outputFormat: "mp3_44100_128"
};

// =============================================================================
// Streaming Handler Types
// =============================================================================

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
export type StreamErrorHandler = (error: string, code?: string) => void;

/**
 * Base streaming client configuration
 */
export interface StreamClientConfig {
    /** API key for the service */
    apiKey: string;
    /** Optional logger */
    logger?: AILogger;
}

// =============================================================================
// Legacy Aliases (for backwards compatibility)
// =============================================================================

/** @deprecated Use DeepgramStreamConfig instead */
export type DeepgramConfig = DeepgramStreamConfig;

/** @deprecated Use ElevenLabsStreamConfig instead */
export type ElevenLabsConfig = ElevenLabsStreamConfig;

/** @deprecated Use StreamErrorHandler instead */
export type ErrorHandler = StreamErrorHandler;

/** @deprecated Use DEFAULT_DEEPGRAM_STREAM_CONFIG instead */
export const DEFAULT_DEEPGRAM_CONFIG = DEFAULT_DEEPGRAM_STREAM_CONFIG;

/** @deprecated Use DEFAULT_ELEVENLABS_STREAM_CONFIG instead */
export const DEFAULT_ELEVENLABS_CONFIG = DEFAULT_ELEVENLABS_STREAM_CONFIG;
