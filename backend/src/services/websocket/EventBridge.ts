import { createServiceLogger } from "../../core/logging";
import { redisEventBus } from "../../services/events/RedisEventBus";

const logger = createServiceLogger("EventBridge");

/**
 * Event Bridge - manages Redis event bus connection for SSE streaming.
 *
 * All real-time events are now handled via SSE:
 * - Workflow execution: /api/executions/:id/stream
 * - Agent execution: /api/agents/:id/executions/:id/stream
 * - KB document processing: /api/knowledge-bases/:id/stream
 *
 * WebSocket is no longer used for event broadcasting.
 */
export class EventBridge {
    private static instance: EventBridge;
    private initialized = false;

    private constructor() {}

    static getInstance(): EventBridge {
        if (!EventBridge.instance) {
            EventBridge.instance = new EventBridge();
        }
        return EventBridge.instance;
    }

    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        // Connect to Redis (needed for SSE routes that subscribe directly)
        try {
            await redisEventBus.connect();
            logger.info("Redis event bus connected");
        } catch (error) {
            logger.error({ err: error }, "Failed to connect to Redis event bus");
        }

        this.initialized = true;
        logger.info("Event bridge initialized (Redis connection for SSE)");
    }

    isInitialized(): boolean {
        return this.initialized;
    }
}

// Global singleton instance
export const eventBridge = EventBridge.getInstance();
