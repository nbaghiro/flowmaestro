/**
 * Realtime streaming clients for voice applications
 *
 * These are WebSocket-based clients for continuous audio streaming,
 * separate from the request/response speech providers.
 */

export { DeepgramStreamClient } from "./DeepgramStreamClient";
export type { DeepgramStreamClientConfig } from "./DeepgramStreamClient";

export { ElevenLabsStreamClient } from "./ElevenLabsStreamClient";
export type { ElevenLabsStreamClientConfig } from "./ElevenLabsStreamClient";

export * from "./types";
