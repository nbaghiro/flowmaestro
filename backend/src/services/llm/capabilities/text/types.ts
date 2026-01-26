/**
 * Types for text completion capability
 */

import type { AIProvider, Message, ResponseMetadata } from "../../client/types";

/**
 * Extended thinking configuration
 */
export interface ThinkingConfig {
    /** Enable extended thinking mode */
    enabled: boolean;
    /** Budget for thinking tokens (minimum 1024) */
    budgetTokens?: number;
}

/**
 * Text completion request
 */
export interface TextCompletionRequest {
    /** Provider to use (optional if default is set) */
    provider?: AIProvider;
    /** Model to use */
    model: string;
    /** System prompt */
    systemPrompt?: string;
    /** User prompt or messages */
    prompt: string | Message[];
    /** Maximum tokens to generate */
    maxTokens?: number;
    /** Temperature (0-2) */
    temperature?: number;
    /** Top P sampling */
    topP?: number;
    /** Stop sequences */
    stop?: string[];
    /** Extended thinking configuration */
    thinking?: ThinkingConfig;
    /** Connection ID for multi-tenant auth */
    connectionId?: string;
    /** Request-specific timeout */
    timeoutMs?: number;
}

/**
 * Streaming callback options
 */
export interface StreamingCallbacks {
    /** Called for each content token */
    onToken?: (token: string) => void;
    /** Called when generation completes */
    onComplete?: (response: TextCompletionResponse) => void;
    /** Called on error */
    onError?: (error: Error) => void;
    /** Called when thinking starts */
    onThinkingStart?: () => void;
    /** Called for each thinking token */
    onThinkingToken?: (token: string) => void;
    /** Called when thinking completes */
    onThinkingComplete?: (thinkingContent: string) => void;
}

/**
 * Text completion response
 */
export interface TextCompletionResponse {
    /** Generated text */
    text: string;
    /** Thinking content if enabled */
    thinking?: string;
    /** Response metadata */
    metadata: ResponseMetadata;
}

/**
 * Streaming text completion response (async iterator)
 */
export interface TextCompletionStream {
    [Symbol.asyncIterator](): AsyncIterator<string>;
    /** Get full response after streaming completes */
    getResponse(): Promise<TextCompletionResponse>;
}
