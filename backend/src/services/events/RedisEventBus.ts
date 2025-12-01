import Redis from "ioredis";
import { WebSocketEvent } from "@flowmaestro/shared";
import { config } from "../../core/config";

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
                console.log(`[RedisEventBus] Retrying connection in ${delay}ms (attempt ${times})`);
                return delay;
            }
        });

        this.subscriber = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            lazyConnect: true,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                console.log(`[RedisEventBus] Retrying connection in ${delay}ms (attempt ${times})`);
                return delay;
            }
        });

        this.handlers = new Map();

        // Set up event handlers
        this.publisher.on("connect", () => {
            console.log("[RedisEventBus] Publisher connected to Redis");
        });

        this.publisher.on("error", (error) => {
            console.error("[RedisEventBus] Publisher error:", error.message);
        });

        this.subscriber.on("connect", () => {
            console.log("[RedisEventBus] Subscriber connected to Redis");
        });

        this.subscriber.on("error", (error) => {
            console.error("[RedisEventBus] Subscriber error:", error.message);
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
                            console.error(
                                `[RedisEventBus] Error in handler for ${pattern}:`,
                                error
                            );
                        }
                    });
                }
            } catch (error) {
                console.error("[RedisEventBus] Failed to parse message:", error);
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
            console.log("[RedisEventBus] Connected to Redis successfully");
        } catch (error) {
            console.error("[RedisEventBus] Failed to connect to Redis:", error);
            throw error;
        }
    }

    /**
     * Publish an event to a Redis channel
     */
    async publish(channel: string, event: WebSocketEvent): Promise<void> {
        if (!this.isConnected) {
            console.warn("[RedisEventBus] Not connected, skipping publish");
            return;
        }

        try {
            const message = JSON.stringify(event);
            await this.publisher.publish(channel, message);
            console.log(`[RedisEventBus] Published ${event.type} to ${channel}`);
        } catch (error) {
            console.error(`[RedisEventBus] Failed to publish to ${channel}:`, error);
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
            console.log(`[RedisEventBus] Subscribed to pattern: ${pattern}`);
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
            console.log(`[RedisEventBus] Unsubscribed from pattern: ${pattern}`);
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
            console.log("[RedisEventBus] Disconnected from Redis");
        } catch (error) {
            console.error("[RedisEventBus] Error during disconnect:", error);
        }
    }

    /**
     * Check if connected to Redis
     */
    get connected(): boolean {
        return this.isConnected;
    }
}

// Global singleton instance
export const redisEventBus = RedisEventBus.getInstance();
