/**
 * Types for speech capability (TTS and STT)
 */

import type { AIProvider, AudioFormat, ResponseMetadata } from "../../client/types";

/**
 * Timestamp granularity options for transcription
 */
export type TimestampGranularity = "segment" | "word";

/**
 * Speech-to-text (transcription) request
 */
export interface TranscriptionRequest {
    /** Provider to use */
    provider?: AIProvider;
    /** Model to use */
    model: string;
    /** Audio input (URL, file path, or base64) */
    audioInput: string;
    /** Language hint (ISO-639-1 code) */
    language?: string;
    /** Transcription prompt/context */
    prompt?: string;
    /** Sampling temperature (0-1, 0 = deterministic) */
    temperature?: number;
    /** Include timestamps in response */
    timestamps?: boolean;
    /** Timestamp granularity (segment, word, or both) */
    timestampGranularities?: TimestampGranularity[];
    /** Connection ID for multi-tenant auth */
    connectionId?: string;
}

/**
 * Word with timing information
 */
export interface TranscriptionWord {
    /** The word */
    word: string;
    /** Start time in seconds */
    start: number;
    /** End time in seconds */
    end: number;
}

/**
 * Transcription segment with timing
 */
export interface TranscriptionSegment {
    /** Segment ID */
    id: number;
    /** Start time in seconds */
    start: number;
    /** End time in seconds */
    end: number;
    /** Segment text */
    text: string;
    /** Word-level timestamps (if requested) */
    words?: TranscriptionWord[];
}

/**
 * Transcription response
 */
export interface TranscriptionResponse {
    /** Transcribed text */
    text: string;
    /** Detected language */
    language?: string;
    /** Audio duration in seconds */
    duration?: number;
    /** Transcription segments with timing (if timestamps requested) */
    segments?: TranscriptionSegment[];
    /** Response metadata */
    metadata: ResponseMetadata;
}

/**
 * Text-to-speech request
 */
export interface TTSRequest {
    /** Provider to use */
    provider?: AIProvider;
    /** Model to use */
    model: string;
    /** Text to convert */
    text: string;
    /** Voice to use (provider-specific ID) */
    voice?: string;
    /** Speech speed (0.5-2.0) */
    speed?: number;
    /** Output format */
    outputFormat?: AudioFormat;
    /** ElevenLabs: voice stability (0-1) */
    stability?: number;
    /** ElevenLabs: similarity boost (0-1) */
    similarityBoost?: number;
    /** ElevenLabs: style exaggeration (0-1) */
    style?: number;
    /** ElevenLabs: enable speaker boost */
    speakerBoost?: boolean;
    /** Connection ID for multi-tenant auth */
    connectionId?: string;
}

/**
 * TTS response
 */
export interface TTSResponse {
    /** Audio URL */
    url?: string;
    /** Base64 encoded audio */
    base64?: string;
    /** Audio file path (if saved) */
    path?: string;
    /** Response metadata */
    metadata: ResponseMetadata & {
        /** Characters used */
        charactersUsed: number;
        /** Audio duration in seconds */
        duration?: number;
    };
}
