// ============================================================================
// VOICE CHAT TYPES
// ============================================================================

/**
 * Voice chat WebSocket message types from client to server
 */
export type VoiceClientMessageType =
    | "start_session"
    | "audio_chunk"
    | "stop_recording"
    | "interrupt"
    | "end_session";

/**
 * Voice chat WebSocket message types from server to client
 */
export type VoiceServerMessageType =
    | "session_ready"
    | "transcript"
    | "execution_started"
    | "agent_thinking"
    | "agent_speaking"
    | "agent_token"
    | "audio_chunk"
    | "agent_done"
    | "error";

/**
 * Client message to start a voice session
 */
export interface VoiceStartSessionMessage {
    type: "start_session";
    agentId: string;
    threadId: string;
}

/**
 * Client message with audio data
 */
export interface VoiceAudioChunkMessage {
    type: "audio_chunk";
    data: string; // base64 PCM
}

/**
 * Client message to stop recording
 */
export interface VoiceStopRecordingMessage {
    type: "stop_recording";
}

/**
 * Client message to interrupt playback (barge-in)
 */
export interface VoiceInterruptMessage {
    type: "interrupt";
}

/**
 * Client message to end voice session
 */
export interface VoiceEndSessionMessage {
    type: "end_session";
}

/**
 * Union type for all client messages
 */
export type VoiceClientMessage =
    | VoiceStartSessionMessage
    | VoiceAudioChunkMessage
    | VoiceStopRecordingMessage
    | VoiceInterruptMessage
    | VoiceEndSessionMessage;

/**
 * Server message when session is ready
 */
export interface VoiceSessionReadyMessage {
    type: "session_ready";
}

/**
 * Server message with transcription
 */
export interface VoiceTranscriptMessage {
    type: "transcript";
    text: string;
    isFinal: boolean;
}

/**
 * Server message when agent is thinking
 */
export interface VoiceAgentThinkingMessage {
    type: "agent_thinking";
}

/**
 * Server message when agent execution starts
 * This allows the client to show the user message and subscribe to streaming
 */
export interface VoiceExecutionStartedMessage {
    type: "execution_started";
    executionId: string;
    threadId: string;
    userMessage: string;
}

/**
 * Server message when agent starts speaking
 */
export interface VoiceAgentSpeakingMessage {
    type: "agent_speaking";
}

/**
 * Server message with agent response token (for text streaming in chat)
 */
export interface VoiceAgentTokenMessage {
    type: "agent_token";
    token: string;
}

/**
 * Server message with audio data
 */
export interface VoiceServerAudioChunkMessage {
    type: "audio_chunk";
    data: string; // base64 MP3
}

/**
 * Server message when agent is done speaking
 */
export interface VoiceAgentDoneMessage {
    type: "agent_done";
}

/**
 * Server error message
 */
export interface VoiceErrorMessage {
    type: "error";
    message: string;
    code?: string;
}

/**
 * Union type for all server messages
 */
export type VoiceServerMessage =
    | VoiceSessionReadyMessage
    | VoiceTranscriptMessage
    | VoiceExecutionStartedMessage
    | VoiceAgentThinkingMessage
    | VoiceAgentSpeakingMessage
    | VoiceAgentTokenMessage
    | VoiceServerAudioChunkMessage
    | VoiceAgentDoneMessage
    | VoiceErrorMessage;

// ============================================================================
// VOICE SESSION TYPES
// ============================================================================

/**
 * Voice session state
 */
export type VoiceSessionState =
    | "initializing"
    | "ready"
    | "listening"
    | "processing"
    | "speaking"
    | "interrupted"
    | "error"
    | "closed";

/**
 * Voice session info returned when session is created
 */
export interface VoiceSessionInfo {
    sessionId: string;
    agentId: string;
    threadId: string;
    state: VoiceSessionState;
    createdAt: string;
}

// ============================================================================
// DEEPGRAM TYPES
// ============================================================================

/**
 * Deepgram configuration options
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
 * Deepgram transcript result
 */
export interface DeepgramTranscript {
    transcript: string;
    confidence: number;
    isFinal: boolean;
    words?: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
    }>;
    speechFinal?: boolean;
}

// ============================================================================
// ELEVENLABS TYPES
// ============================================================================

/**
 * ElevenLabs configuration options
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
 * ElevenLabs voice info
 */
export interface ElevenLabsVoice {
    voiceId: string;
    name: string;
    category: string;
    description?: string;
    previewUrl?: string;
}

// ============================================================================
// AGENT VOICE CONFIG
// ============================================================================

/**
 * Voice configuration stored with agent
 */
export interface AgentVoiceConfig {
    enabled: boolean;
    voiceId: string;
    voiceName?: string;
    autoPlay: boolean;
    inputMode: "vad" | "push-to-talk";
    language: string;
    model?: "eleven_turbo_v2_5" | "eleven_multilingual_v2" | "eleven_flash_v2_5";
    stability?: number;
    similarityBoost?: number;
}

/**
 * Default voice configuration
 */
export const DEFAULT_VOICE_CONFIG: AgentVoiceConfig = {
    enabled: false,
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
    voiceName: "Rachel",
    autoPlay: true,
    inputMode: "vad",
    language: "en-US",
    model: "eleven_turbo_v2_5",
    stability: 0.5,
    similarityBoost: 0.75
};

/**
 * Available ElevenLabs voices - most popular and widely used
 * Ordered by popularity based on usage data
 */
export const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
    // Most Popular Voices
    {
        voiceId: "21m00Tcm4TlvDq8ikWAM",
        name: "Rachel",
        category: "popular",
        description: "Calm, conversational American female - most popular for assistants"
    },
    {
        voiceId: "pNInz6obpgDQGcFmaJgB",
        name: "Adam",
        category: "popular",
        description: "Deep, professional American male - great for narration"
    },
    {
        voiceId: "EXAVITQu4vr4xnSDxMaL",
        name: "Sarah",
        category: "popular",
        description: "Soft, friendly American female - warm and approachable"
    },
    {
        voiceId: "ErXwobaYiN019PkySvjV",
        name: "Antoni",
        category: "popular",
        description: "Well-balanced American male - versatile and natural"
    },
    {
        voiceId: "TxGEqnHWrfWFTfGW9XjX",
        name: "Josh",
        category: "popular",
        description: "Articulate American male - clear and professional"
    },
    {
        voiceId: "MF3mGyEYCl7XYWbV9V6O",
        name: "Elli",
        category: "popular",
        description: "Young American female - energetic and upbeat"
    },
    // British Voices
    {
        voiceId: "onwK4e9ZLuTAKqWW03F9",
        name: "Daniel",
        category: "british",
        description: "British male - calm, authoritative storyteller"
    },
    {
        voiceId: "ThT5KcBeYPX3keUQqHPh",
        name: "Dorothy",
        category: "british",
        description: "British female - pleasant, warm and engaging"
    },
    {
        voiceId: "JBFqnCBsd6RMkjVDRZzb",
        name: "George",
        category: "british",
        description: "British male - warm, friendly narrator"
    },
    // Character Voices
    {
        voiceId: "2EiwWnXFnvU5JabPnv8n",
        name: "Clyde",
        category: "character",
        description: "American male - deep, gruff war veteran style"
    },
    {
        voiceId: "VR6AewLTigWG4xSOukaG",
        name: "Arnold",
        category: "character",
        description: "American male - deep, authoritative"
    },
    {
        voiceId: "AZnzlk1XvdvUeBnXmlld",
        name: "Domi",
        category: "character",
        description: "American female - strong, confident"
    },
    // Professional/Narration
    {
        voiceId: "nPczCjzI2devNBz1zQrb",
        name: "Brian",
        category: "narration",
        description: "American male - deep, smooth narrator"
    },
    {
        voiceId: "N2lVS1w4EtoT3dr4eOWO",
        name: "Callum",
        category: "narration",
        description: "Transatlantic male - versatile storyteller"
    },
    {
        voiceId: "XB0fDUnXU5powFXDhCwa",
        name: "Charlotte",
        category: "narration",
        description: "Swedish-English female - seductive storyteller"
    },
    // Additional Popular
    {
        voiceId: "jsCqWAovK2LkecY7zXl4",
        name: "Freya",
        category: "popular",
        description: "American female - young, expressive"
    },
    {
        voiceId: "oWAxZDx7w5VEj9dCyTzz",
        name: "Grace",
        category: "popular",
        description: "Southern American female - warm, friendly"
    },
    {
        voiceId: "CYw3kZ02Hs0563khs1Fj",
        name: "Dave",
        category: "british",
        description: "British-Essex male - conversational"
    },
    {
        voiceId: "D38z5RcWu1voky8WS1ja",
        name: "Fin",
        category: "character",
        description: "Irish male - sailor character"
    },
    {
        voiceId: "SOYHLrjzK2X1ezoPC6cr",
        name: "Harry",
        category: "british",
        description: "British male - anxious, young"
    }
];
