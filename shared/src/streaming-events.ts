import type { JsonObject } from "./types";

/**
 * Thread-scoped streaming event types for agent message streaming.
 * These events replace the old execution-scoped agent events.
 *
 * Key improvements:
 * - threadId-first routing (not executionId)
 * - Sequence numbers for guaranteed token ordering
 * - messageId to correlate tokens to specific messages
 * - Explicit lifecycle: start → token* → complete/error
 */

export type StreamingEventType =
    | "thread:message:start" // Assistant message starting
    | "thread:message:token" // Individual token with sequence
    | "thread:message:complete" // Message finalized, saved to DB
    | "thread:message:error" // Message generation failed
    | "thread:thinking" // Agent thinking indicator (simple)
    | "thread:thinking:start" // Extended thinking started
    | "thread:thinking:token" // Extended thinking token
    | "thread:thinking:complete" // Extended thinking completed
    | "thread:tool:started" // Tool execution started
    | "thread:tool:completed" // Tool execution completed
    | "thread:tool:failed" // Tool execution failed
    | "thread:tokens:updated"; // Updated aggregate token & cost usage

/**
 * Base event interface with common fields
 */
export interface BaseStreamingEvent {
    type: StreamingEventType;
    timestamp: number;
    threadId: string; // PRIMARY routing key
    executionId: string; // For execution tracking
}

/**
 * Emitted when an assistant message starts streaming
 */
export interface MessageStartEvent extends BaseStreamingEvent {
    type: "thread:message:start";
    messageId: string; // Unique ID for this message
    role: "assistant";
}

/**
 * Emitted for each token in the streaming response
 * Includes sequence number for guaranteed ordering
 */
export interface MessageTokenEvent extends BaseStreamingEvent {
    type: "thread:message:token";
    messageId: string; // Which message these tokens belong to
    token: string; // The actual token text
    sequence: number; // Monotonically increasing (1, 2, 3...)
}

/**
 * Emitted when message streaming completes successfully
 */
export interface MessageCompleteEvent extends BaseStreamingEvent {
    type: "thread:message:complete";
    messageId: string;
    finalContent: string; // Complete message (for verification)
    tokenCount: number; // Total tokens emitted
    saved: boolean; // Confirmed persisted to DB
}

/**
 * Emitted when message streaming fails
 */
export interface MessageErrorEvent extends BaseStreamingEvent {
    type: "thread:message:error";
    messageId: string;
    error: string;
    partialContent?: string; // Tokens received before error
}

/**
 * Emitted when agent is thinking (no tokens yet)
 * Simple indicator for basic thinking state
 */
export interface ThinkingEvent extends BaseStreamingEvent {
    type: "thread:thinking";
}

/**
 * Emitted when extended thinking starts (for reasoning models)
 * Used with Claude extended thinking, OpenAI o1/o3, Gemini thinking
 */
export interface ThinkingStartEvent extends BaseStreamingEvent {
    type: "thread:thinking:start";
    messageId: string;
}

/**
 * Emitted for each token in the extended thinking process
 * Includes sequence number for guaranteed ordering
 */
export interface ThinkingTokenEvent extends BaseStreamingEvent {
    type: "thread:thinking:token";
    messageId: string;
    token: string;
    sequence: number;
}

/**
 * Emitted when extended thinking completes
 * Contains the full thinking content (may be summarized by provider)
 */
export interface ThinkingCompleteEvent extends BaseStreamingEvent {
    type: "thread:thinking:complete";
    messageId: string;
    thinkingContent: string; // Full thinking text (may be summarized)
    tokenCount: number;
}

/**
 * Emitted when tool execution starts
 */
export interface ToolStartedEvent extends BaseStreamingEvent {
    type: "thread:tool:started";
    toolName: string;
    toolCallId: string;
    arguments: JsonObject;
}

/**
 * Emitted when tool execution completes successfully
 */
export interface ToolCompletedEvent extends BaseStreamingEvent {
    type: "thread:tool:completed";
    toolName: string;
    toolCallId: string;
    result: JsonObject;
}

/**
 * Emitted when tool execution fails
 */
export interface ToolFailedEvent extends BaseStreamingEvent {
    type: "thread:tool:failed";
    toolName: string;
    toolCallId: string;
    error: string;
}

/**
 * Emitted when token usage for the thread is updated
 */
export interface TokensUpdatedEvent extends BaseStreamingEvent {
    type: "thread:tokens:updated";
    tokenUsage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        totalCost: number;
        lastUpdatedAt: string; // matches your emitter
    };
}

/**
 * Union type of all thread streaming events
 * Enables TypeScript discriminated unions based on `type` field
 */
export type ThreadStreamingEvent =
    | MessageStartEvent
    | MessageTokenEvent
    | MessageCompleteEvent
    | MessageErrorEvent
    | ThinkingEvent
    | ThinkingStartEvent
    | ThinkingTokenEvent
    | ThinkingCompleteEvent
    | ToolStartedEvent
    | ToolCompletedEvent
    | ToolFailedEvent
    | TokensUpdatedEvent;
