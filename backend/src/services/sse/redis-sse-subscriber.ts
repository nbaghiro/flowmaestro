/**
 * Redis SSE Subscriber
 *
 * Subscribes to Redis pub/sub channels and forwards events to SSE clients.
 */

import { createServiceLogger } from "../../core/logging";
import type { SSEContext } from "./sse-handler";

const logger = createServiceLogger("RedisSSESubscriber");

export interface RedisSSESubscriberOptions {
    /** Field in the event data to use for filtering (e.g., "executionId") */
    filterField?: string;
    /** Value to match for the filter field */
    filterValue?: string;
    /** Transform function to modify event data before sending */
    transform?: (
        eventType: string,
        data: Record<string, unknown>
    ) => Record<string, unknown> | null;
}

/**
 * Subscribes to Redis channels and forwards matching events to an SSE connection.
 */
export class RedisSSESubscriber {
    private sse: SSEContext;
    private options: RedisSSESubscriberOptions;
    private subscriptions: Array<{ channel: string; unsubscribe: () => void }> = [];

    constructor(sse: SSEContext, options: RedisSSESubscriberOptions = {}) {
        this.sse = sse;
        this.options = options;
    }

    /**
     * Subscribe to a Redis channel and forward events to the SSE client.
     *
     * @param redis - Redis client with subscribe capability
     * @param channelPattern - Channel pattern to subscribe to (e.g., "workflow:*")
     * @param eventType - SSE event type to send
     */
    async subscribe(
        redis: {
            subscribe: (channel: string, callback: (message: string) => void) => Promise<void>;
            unsubscribe: (channel: string) => Promise<void>;
        },
        channelPattern: string,
        eventType: string
    ): Promise<void> {
        const { filterField, filterValue, transform } = this.options;

        const callback = (message: string) => {
            if (!this.sse.isConnected()) return;

            try {
                const data = JSON.parse(message) as Record<string, unknown>;

                // Apply filter if configured
                if (filterField && filterValue) {
                    if (data[filterField] !== filterValue) {
                        return; // Skip events that don't match the filter
                    }
                }

                // Apply transform if configured
                let eventData = data;
                if (transform) {
                    const transformed = transform(eventType, data);
                    if (transformed === null) {
                        return; // Transform returned null, skip this event
                    }
                    eventData = transformed;
                }

                this.sse.sendEvent(eventType, eventData);
            } catch (error) {
                logger.warn({ channelPattern, error }, "Failed to parse Redis message");
            }
        };

        await redis.subscribe(channelPattern, callback);

        this.subscriptions.push({
            channel: channelPattern,
            unsubscribe: async () => {
                await redis.unsubscribe(channelPattern);
            }
        });
    }

    /**
     * Unsubscribe from all channels.
     */
    async unsubscribeAll(): Promise<void> {
        for (const sub of this.subscriptions) {
            try {
                await sub.unsubscribe();
            } catch (error) {
                logger.warn({ channel: sub.channel, error }, "Failed to unsubscribe from channel");
            }
        }
        this.subscriptions = [];
    }
}

/**
 * Event mapping configuration for Redis to SSE event forwarding.
 */
export interface EventMapping {
    /** Redis channel pattern */
    channel: string;
    /** SSE event type */
    eventType: string;
    /** Optional transform function */
    transform?: (data: Record<string, unknown>) => Record<string, unknown> | null;
}

/**
 * Creates a workflow execution event subscriber.
 *
 * @param sse - SSE context
 * @param executionId - Execution ID to filter events for
 */
export function createWorkflowEventSubscriber(
    sse: SSEContext,
    executionId: string
): RedisSSESubscriber {
    return new RedisSSESubscriber(sse, {
        filterField: "executionId",
        filterValue: executionId
    });
}

/**
 * Creates an agent execution event subscriber.
 *
 * @param sse - SSE context
 * @param executionId - Execution ID to filter events for
 */
export function createAgentEventSubscriber(
    sse: SSEContext,
    executionId: string
): RedisSSESubscriber {
    return new RedisSSESubscriber(sse, {
        filterField: "executionId",
        filterValue: executionId
    });
}

/**
 * Creates a knowledge base event subscriber.
 *
 * @param sse - SSE context
 * @param knowledgeBaseId - Knowledge base ID to filter events for
 */
export function createKnowledgeBaseEventSubscriber(
    sse: SSEContext,
    knowledgeBaseId: string
): RedisSSESubscriber {
    return new RedisSSESubscriber(sse, {
        filterField: "knowledgeBaseId",
        filterValue: knowledgeBaseId
    });
}
