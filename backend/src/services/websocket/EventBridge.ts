import { WebSocketEvent, WebSocketEventType } from "@flowmaestro/shared";
import { createServiceLogger } from "../../core/logging";
import { globalEventEmitter } from "../../services/events/EventEmitter";
import { redisEventBus } from "../../services/events/RedisEventBus";
import { wsManager } from "./WebSocketManager";

const logger = createServiceLogger("EventBridge");

/**
 * Bridge between event sources and WebSocket manager
 * Forwards Knowledge Base events to connected WebSocket clients.
 *
 * Note: Workflow and Agent execution events are now handled via SSE
 * (see /api/executions/:id/stream and /api/agents/:id/executions/:id/stream)
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

        // Subscribe to Knowledge Base events (emitted locally, not from Temporal)
        // These are broadcast via WebSocket for real-time document processing updates
        const kbEventTypes: WebSocketEventType[] = [
            "kb:document:processing",
            "kb:document:completed",
            "kb:document:failed"
        ];

        kbEventTypes.forEach((eventType) => {
            globalEventEmitter.on(eventType, (event: WebSocketEvent) => {
                logger.debug({ eventType: event.type }, "Broadcasting KB event via WebSocket");
                wsManager.broadcast(event);
            });
        });

        this.initialized = true;
        logger.info("Event bridge initialized for Knowledge Base events");
    }

    isInitialized(): boolean {
        return this.initialized;
    }
}

// Global singleton instance
export const eventBridge = EventBridge.getInstance();
