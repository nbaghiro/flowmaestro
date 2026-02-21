/**
 * Speech providers
 */

// Providers
export { OpenAISpeechProvider } from "./openai";
export { ElevenLabsSpeechProvider, ElevenLabsStreamClient } from "./elevenlabs";
export type { ElevenLabsStreamClientConfig } from "./elevenlabs";
export { DeepgramSpeechProvider, DeepgramStreamClient } from "./deepgram";
export type { DeepgramStreamClientConfig } from "./deepgram";

// Streaming types
export * from "./types";
