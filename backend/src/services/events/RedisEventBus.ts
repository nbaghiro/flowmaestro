import Redis from "ioredis";
import { WebSocketEvent, ThreadStreamingEvent } from "@flowmaestro/shared";
import { config } from "../../core/config";
import { createServiceLogger } from "../../core/logging";

const logger = createServiceLogger("RedisEventBus");

/**
 * RedisEventBus - Cross-process event communication via Redis Pub/Sub
 *
 * This service enables communication between different Node.js processes:
 * - Temporal worker process (where activities run)
 * - API server process (where WebSocket connections live)
 *
 * Events published in one process can be received in another.
 */
export class RedisEventBus {
    private static instance: RedisEventBus;
    private publisher: Redis;
    private subscriber: Redis;
    private handlers: Map<string, Set<(event: WebSocketEvent) => void>>;
    private isConnected: boolean = false;

    private constructor() {
        // Create separate Redis clients for publish and subscribe
        // This is required by Redis - same connection cannot be used for both
        this.publisher = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            lazyConnect: true,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                logger.info({ delayMs: delay, attempt: times }, "Retrying connection");
                return delay;
            }
        });

        this.subscriber = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            lazyConnect: true,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                logger.info({ delayMs: delay, attempt: times }, "Retrying subscriber connection");
                return delay;
            }
        });

        this.handlers = new Map();

        // Set up event handlers
        this.publisher.on("connect", () => {
            logger.info("Publisher connected to Redis");
        });

        this.publisher.on("error", (error) => {
            logger.error({ err: error.message }, "Publisher error");
        });

        this.subscriber.on("connect", () => {
            logger.info("Subscriber connected to Redis");
        });

        this.subscriber.on("error", (error) => {
            logger.error({ err: error.message }, "Subscriber error");
        });

        // Handle pattern-based messages
        this.subscriber.on("pmessage", (pattern: string, _channel: string, message: string) => {
            try {
                const event = JSON.parse(message) as WebSocketEvent;

                // Call all registered handlers for this pattern
                const patternHandlers = this.handlers.get(pattern);
                if (patternHandlers) {
                    patternHandlers.forEach((handler) => {
                        try {
                            handler(event);
                        } catch (error) {
                            logger.error({ pattern, err: error }, "Error in handler");
                        }
                    });
                }
            } catch (error) {
                logger.error({ err: error }, "Failed to parse message");
            }
        });
    }

    static getInstance(): RedisEventBus {
        if (!RedisEventBus.instance) {
            RedisEventBus.instance = new RedisEventBus();
        }
        return RedisEventBus.instance;
    }

    /**
     * Connect to Redis (call this on startup)
     */
    async connect(): Promise<void> {
        if (this.isConnected) {
            return;
        }

        try {
            await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
            this.isConnected = true;
            logger.info("Connected to Redis successfully");
        } catch (error) {
            logger.error({ err: error }, "Failed to connect to Redis");
            throw error;
        }
    }

    /**
     * Publish an event to a Redis channel
     */
    async publish(channel: string, event: WebSocketEvent): Promise<void> {
        if (!this.isConnected) {
            logger.warn("Not connected, skipping publish");
            return;
        }

        try {
            const message = JSON.stringify(event);
            await this.publisher.publish(channel, message);
            logger.info({ eventType: event.type, channel }, "Published event");
        } catch (error) {
            logger.error({ channel, err: error }, "Failed to publish");
        }
    }

    /**
     * Subscribe to events matching a pattern
     * Pattern uses Redis glob-style matching: * matches any characters
     * Example: "workflow:events:*" matches all workflow events
     */
    async subscribe(pattern: string, handler: (event: WebSocketEvent) => void): Promise<void> {
        if (!this.isConnected) {
            await this.connect();
        }

        // Add handler to map
        if (!this.handlers.has(pattern)) {
            this.handlers.set(pattern, new Set());
            // Subscribe to pattern in Redis
            await this.subscriber.psubscribe(pattern);
            logger.info({ pattern }, "Subscribed to pattern");
        }

        this.handlers.get(pattern)!.add(handler);
    }

    /**
     * Unsubscribe from a pattern
     */
    async unsubscribe(pattern: string, handler?: (event: WebSocketEvent) => void): Promise<void> {
        const patternHandlers = this.handlers.get(pattern);
        if (!patternHandlers) {
            return;
        }

        if (handler) {
            patternHandlers.delete(handler);
        }

        // If no more handlers for this pattern, unsubscribe from Redis
        if (!handler || patternHandlers.size === 0) {
            this.handlers.delete(pattern);
            await this.subscriber.punsubscribe(pattern);
            logger.info({ pattern }, "Unsubscribed from pattern");
        }
    }

    /**
     * Disconnect from Redis (call on shutdown)
     */
    async disconnect(): Promise<void> {
        if (!this.isConnected) {
            return;
        }

        try {
            await Promise.all([this.publisher.quit(), this.subscriber.quit()]);
            this.isConnected = false;
            this.handlers.clear();
            logger.info("Disconnected from Redis");
        } catch (error) {
            logger.error({ err: error }, "Error during disconnect");
        }
    }

    /**
     * Check if connected to Redis
     */
    get connected(): boolean {
        return this.isConnected;
    }

    /**
     * Get thread-specific Redis channel name
     */
    private getThreadStreamChannel(threadId: string): string {
        return `thread:${threadId}:stream`;
    }

    /**
     * Publish event to thread-specific channel
     * Used for new thread-scoped streaming events
     */
    async publishThreadEvent(threadId: string, event: ThreadStreamingEvent): Promise<void> {
        const channel = this.getThreadStreamChannel(threadId);
        await this.publish(channel, event as unknown as WebSocketEvent);
    }

    /**
     * Subscribe to thread-specific channel
     * Used for SSE endpoints to receive streaming events for a specific thread
     */
    async subscribeToThread(
        threadId: string,
        handler: (event: ThreadStreamingEvent) => void
    ): Promise<void> {
        const channel = this.getThreadStreamChannel(threadId);
        // Wrap handler to cast event type
        const wrappedHandler = (event: WebSocketEvent) => {
            handler(event as unknown as ThreadStreamingEvent);
        };
        await this.subscribe(channel, wrappedHandler);
    }

    /**
     * Unsubscribe from thread-specific channel
     */
    async unsubscribeFromThread(
        threadId: string,
        _handler: (event: ThreadStreamingEvent) => void
    ): Promise<void> {
        const channel = this.getThreadStreamChannel(threadId);
        // Note: We can't unwrap the handler here, so we unsubscribe from the channel entirely
        // This is fine since each SSE connection has its own handler
        await this.unsubscribe(channel);
    }
}

// Global singleton instance
export const redisEventBus = RedisEventBus.getInstance();
