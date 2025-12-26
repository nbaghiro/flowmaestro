import { WebSocketEvent, WebSocketEventType } from "@flowmaestro/shared";
import { createServiceLogger } from "../../core/logging";
import { globalEventEmitter } from "../../services/events/EventEmitter";
import { redisEventBus } from "../../services/events/RedisEventBus";
import { wsManager } from "./WebSocketManager";

const logger = createServiceLogger("EventBridge");

/**
 * Bridge between event sources and WebSocket manager
 * Forwards events from two sources to connected WebSocket clients:
 * 1. Redis Pub/Sub - for events from Temporal worker process (workflow execution events)
 * 2. In-memory EventEmitter - for local events (trigger events, KB events, etc.)
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

        // 1. Connect to Redis and subscribe to workflow & agent events from Temporal worker
        try {
            await redisEventBus.connect();

            // Subscribe to all workflow events published by Temporal activities
            await redisEventBus.subscribe("workflow:events:*", (event: WebSocketEvent) => {
                logger.info({ eventType: event.type }, "Received workflow event from Redis");
                wsManager.broadcast(event);
            });

            // Subscribe to all agent events (chat agents) published by Temporal activities
            await redisEventBus.subscribe("agent:events:*", (event: WebSocketEvent) => {
                logger.info({ eventType: event.type }, "Received agent event from Redis");
                wsManager.broadcast(event);
            });

            logger.info("Event bridge subscribed to Redis workflow and agent events");
        } catch (error) {
            logger.error({ err: error }, "Failed to subscribe to Redis events");
            logger.warn("Workflow and agent execution events will not be received");
        }

        // 2. Subscribe to local in-memory events (non-Temporal events)
        const localEventTypes: WebSocketEventType[] = [
            // Knowledge Base events (emitted locally, not from Temporal)
            "kb:document:processing",
            "kb:document:completed",
            "kb:document:failed"
        ];

        localEventTypes.forEach((eventType) => {
            globalEventEmitter.on(eventType, (event: WebSocketEvent) => {
                logger.info({ eventType: event.type }, "Received from local emitter");
                wsManager.broadcast(event);
            });
        });

        this.initialized = true;
        logger.info("Event bridge initialized - events will be broadcast via WebSocket");
    }

    isInitialized(): boolean {
        return this.initialized;
    }
}

// Global singleton instance
export const eventBridge = EventBridge.getInstance();
