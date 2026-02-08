/**
 * Real-time AI streaming services
 *
 * This module provides WebSocket-based streaming clients for AI services:
 * - DeepgramStreamClient: Real-time speech-to-text
 * - ElevenLabsStreamClient: Real-time text-to-speech
 * - VoiceSession: Voice conversation orchestrator
 * - VoiceSessionManager: Session lifecycle management
 */

export { DeepgramStreamClient } from "./DeepgramStreamClient";
export { ElevenLabsStreamClient } from "./ElevenLabsStreamClient";
export { VoiceSession } from "./VoiceSession";
export { VoiceSessionManager, voiceSessionManager } from "./VoiceSessionManager";
export * from "./types";
