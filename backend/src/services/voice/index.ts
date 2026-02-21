/**
 * Voice Orchestration Service
 *
 * Provides real-time voice conversation capabilities with agents.
 * Uses Deepgram for speech-to-text and ElevenLabs for text-to-speech.
 */

export { VoiceSession } from "./VoiceSession";
export { VoiceSessionManager, voiceSessionManager } from "./VoiceSessionManager";
export type {
    VoiceSessionContext,
    VoiceSessionEventHandlers,
    VoiceWebSocketConnection
} from "./types";
export { sendVoiceMessage } from "./types";
