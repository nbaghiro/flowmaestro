/**
 * Thread-scoped streaming event emission activities
 *
 * These replace the old agent-events.ts activities with improved:
 * - threadId-first routing
 * - Sequence numbers for token ordering
 * - Retry logic for reliability
 * - messageId for token correlation
 */

import type {
    MessageStartEvent,
    MessageTokenEvent,
    MessageCompleteEvent,
    MessageErrorEvent,
    ThinkingEvent,
    ThreadStreamingEvent,
    TokensUpdatedEvent
} from "@flowmaestro/shared";
import { redisEventBus } from "../../../services/events/RedisEventBus";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

/**
 * Emit message start event
 */
export async function emitMessageStart(input: {
    threadId: string;
    executionId: string;
    messageId: string;
}): Promise<void> {
    const event: MessageStartEvent = {
        type: "thread:message:start",
        timestamp: Date.now(),
        threadId: input.threadId,
        executionId: input.executionId,
        messageId: input.messageId,
        role: "assistant"
    };

    await publishWithRetry(input.threadId, event);
    console.log(`[Streaming] Message start: ${input.messageId} (thread: ${input.threadId})`);
}

/**
 * Emit individual token with sequence number
 */
export async function emitMessageToken(input: {
    threadId: string;
    executionId: string;
    messageId: string;
    token: string;
    sequence: number;
}): Promise<void> {
    const event: MessageTokenEvent = {
        type: "thread:message:token",
        timestamp: Date.now(),
        threadId: input.threadId,
        executionId: input.executionId,
        messageId: input.messageId,
        token: input.token,
        sequence: input.sequence
    };

    await publishWithRetry(input.threadId, event);
}

/**
 * Emit message complete event
 */
export async function emitMessageComplete(input: {
    threadId: string;
    executionId: string;
    messageId: string;
    finalContent: string;
    tokenCount: number;
    saved: boolean;
}): Promise<void> {
    const event: MessageCompleteEvent = {
        type: "thread:message:complete",
        timestamp: Date.now(),
        threadId: input.threadId,
        executionId: input.executionId,
        messageId: input.messageId,
        finalContent: input.finalContent,
        tokenCount: input.tokenCount,
        saved: input.saved
    };

    await publishWithRetry(input.threadId, event);
    console.log(
        `[Streaming] Message complete: ${input.messageId} ` +
            `(${input.tokenCount} tokens, saved: ${input.saved})`
    );
}

/**
 * Emit message error event
 */
export async function emitMessageError(input: {
    threadId: string;
    executionId: string;
    messageId: string;
    error: string;
    partialContent?: string;
}): Promise<void> {
    const event: MessageErrorEvent = {
        type: "thread:message:error",
        timestamp: Date.now(),
        threadId: input.threadId,
        executionId: input.executionId,
        messageId: input.messageId,
        error: input.error,
        partialContent: input.partialContent
    };

    await publishWithRetry(input.threadId, event);
    console.error(`[Streaming] Message error: ${input.messageId} - ${input.error}`);
}

/**
 * Emit thinking event
 */
export async function emitThinking(input: {
    threadId: string;
    executionId: string;
}): Promise<void> {
    const event: ThinkingEvent = {
        type: "thread:thinking",
        timestamp: Date.now(),
        threadId: input.threadId,
        executionId: input.executionId
    };

    await publishWithRetry(input.threadId, event);
}

export async function emitTokensUpdated(input: {
    threadId: string;
    executionId: string;
    tokenUsage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        totalCost: number;
        lastUpdatedAt: string;
    };
}): Promise<void> {
    const event: TokensUpdatedEvent = {
        type: "thread:tokens:updated",
        timestamp: Date.now(),
        threadId: input.threadId,
        executionId: input.executionId,
        tokenUsage: input.tokenUsage
    };

    await publishWithRetry(input.threadId, event);

    console.log(
        `[Streaming] Tokens updated: ${input.tokenUsage.totalTokens} tokens ($${input.tokenUsage.totalCost.toFixed(4)}) for thread ${input.threadId}`
    );
}

/**
 * Publish event to Redis with retry logic
 * Retries up to MAX_RETRIES times with exponential backoff
 * Does not throw on failure to prevent workflow disruption
 */
async function publishWithRetry(threadId: string, event: ThreadStreamingEvent): Promise<void> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            await redisEventBus.publishThreadEvent(threadId, event);
            return; // Success
        } catch (error) {
            console.error(`[Streaming] Publish attempt ${attempt}/${MAX_RETRIES} failed:`, error);

            if (attempt === MAX_RETRIES) {
                // CRITICAL: Event emission failed after all retries
                console.error(
                    `[Streaming] FAILED to publish event type=${event.type} ` +
                        `thread=${threadId} after ${MAX_RETRIES} attempts`
                );

                // Don't throw - workflow must continue
                // Frontend will detect missing sequence numbers
                return;
            }

            // Exponential backoff
            const delay = RETRY_DELAY_MS * attempt;
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}
