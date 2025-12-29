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
import { activityLogger } from "../../core";

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
    activityLogger.info("Message start event emitted", {
        messageId: input.messageId,
        threadId: input.threadId
    });
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
    activityLogger.info("Message complete event emitted", {
        messageId: input.messageId,
        tokenCount: input.tokenCount,
        saved: input.saved
    });
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
    activityLogger.error("Message error event emitted", new Error(input.error), {
        messageId: input.messageId
    });
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

    activityLogger.info("Tokens updated event emitted", {
        threadId: input.threadId,
        totalTokens: input.tokenUsage.totalTokens,
        totalCost: input.tokenUsage.totalCost
    });
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
            activityLogger.error(
                "Publish attempt failed",
                error instanceof Error ? error : new Error(String(error)),
                {
                    attempt,
                    maxRetries: MAX_RETRIES,
                    eventType: event.type,
                    threadId
                }
            );

            if (attempt === MAX_RETRIES) {
                // CRITICAL: Event emission failed after all retries
                activityLogger.error(
                    "FAILED to publish event after all retries",
                    new Error("Max retries exceeded"),
                    {
                        eventType: event.type,
                        threadId,
                        maxRetries: MAX_RETRIES
                    }
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
