/**
 * Speech providers
 */

export { OpenAISpeechProvider } from "./openai";
export { ElevenLabsSpeechProvider } from "./elevenlabs";

// Realtime streaming clients
export { DeepgramStreamClient } from "./realtime/DeepgramStreamClient";
export { ElevenLabsStreamClient } from "./realtime/ElevenLabsStreamClient";
export type { DeepgramStreamClientConfig } from "./realtime/DeepgramStreamClient";
export type { ElevenLabsStreamClientConfig } from "./realtime/ElevenLabsStreamClient";
export * from "./realtime/types";
