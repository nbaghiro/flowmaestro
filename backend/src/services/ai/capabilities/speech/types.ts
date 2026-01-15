/**
 * Types for speech capability (TTS and STT)
 */

import type { AIProvider, AudioFormat, ResponseMetadata } from "../../client/types";

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
    /** Connection ID for multi-tenant auth */
    connectionId?: string;
}

/**
 * Transcription response
 */
export interface TranscriptionResponse {
    /** Transcribed text */
    text: string;
    /** Detected language */
    language?: string;
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
