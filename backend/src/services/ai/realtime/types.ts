import type {
    VoiceSessionState,
    DeepgramConfig,
    ElevenLabsConfig,
    VoiceServerMessage
} from "@flowmaestro/shared";
import type WebSocket from "ws";

/**
 * Internal voice session context
 */
export interface VoiceSessionContext {
    sessionId: string;
    agentId: string;
    threadId: string;
    userId: string;
    workspaceId: string;
    state: VoiceSessionState;
    createdAt: Date;
}

/**
 * Voice session event handlers
 */
export interface VoiceSessionEventHandlers {
    onTranscript: (text: string, isFinal: boolean) => void;
    onAgentThinking: () => void;
    onAgentSpeaking: () => void;
    onAudioChunk: (data: string) => void;
    onAgentDone: () => void;
    onError: (message: string, code?: string) => void;
    onStateChange: (state: VoiceSessionState) => void;
}

/**
 * WebSocket connection wrapper with metadata
 */
export interface VoiceWebSocketConnection {
    socket: WebSocket;
    sessionId: string;
    userId: string;
    agentId?: string;
    threadId?: string;
    isAlive: boolean;
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
 * Send a message to WebSocket connection
 */
export function sendVoiceMessage(socket: WebSocket, message: VoiceServerMessage): void {
    if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(message));
    }
}

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
