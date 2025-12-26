/**
 * WebSocket Client for FlowMaestro Real-time Updates
 */

import { WebSocketEvent } from "@flowmaestro/shared";
import { logger } from "./logger";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3001";

type EventHandler = (event: WebSocketEvent) => void;

export class WebSocketClient {
    private static instance: WebSocketClient;
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private eventHandlers: Map<string, Set<EventHandler>> = new Map();
    private connectionPromise: Promise<void> | null = null;
    private shouldReconnect = true;

    private constructor() {}

    static getInstance(): WebSocketClient {
        if (!WebSocketClient.instance) {
            WebSocketClient.instance = new WebSocketClient();
        }
        return WebSocketClient.instance;
    }

    async connect(token: string): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        // Store token and reset reconnection flags
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;

        this.connectionPromise = new Promise((resolve, reject) => {
            const wsUrl = `${WS_URL}/ws?token=${encodeURIComponent(token)}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                logger.info("WebSocket connected");
                this.reconnectAttempts = 0;
                this.connectionPromise = null;
                resolve();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    logger.error("Failed to parse WebSocket message", error);
                }
            };

            this.ws.onerror = (error) => {
                logger.error("WebSocket error", error);
                this.connectionPromise = null;
                reject(error);
            };

            this.ws.onclose = (event) => {
                logger.info("WebSocket disconnected", { code: event.code, reason: event.reason });
                this.connectionPromise = null;

                // Don't reconnect if authentication failed (code 1008)
                if (event.code === 1008) {
                    logger.error("WebSocket authentication failed, not reconnecting");
                    this.shouldReconnect = false;
                    return;
                }

                this.handleReconnect(token);
            };
        });

        return this.connectionPromise;
    }

    disconnect(): void {
        this.shouldReconnect = false; // Prevent reconnection
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.eventHandlers.clear();
        this.reconnectAttempts = 0;
        this.connectionPromise = null;
    }

    on(eventType: string, handler: EventHandler): void {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, new Set());
        }
        this.eventHandlers.get(eventType)!.add(handler);
    }

    off(eventType: string, handler: EventHandler): void {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    subscribeToExecution(executionId: string): void {
        this.send({
            type: "subscribe",
            executionId
        });
    }

    unsubscribeFromExecution(executionId: string): void {
        this.send({
            type: "unsubscribe",
            executionId
        });
    }

    private send(data: unknown): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    private handleMessage(data: unknown): void {
        const d = data as Record<string, unknown>;
        // Handle system messages
        if (d.type === "connected") {
            logger.debug("WebSocket connection confirmed", { data });
            return;
        }

        if (d.type === "subscribed" || d.type === "unsubscribed") {
            logger.debug("Execution subscription changed", {
                type: d.type,
                executionId: d.executionId
            });
            return;
        }

        // Emit to specific event type handlers
        const handlers = this.eventHandlers.get(d.type as string);
        if (handlers) {
            handlers.forEach((handler) => handler(data as WebSocketEvent));
        }

        // Emit to "all" handlers
        const allHandlers = this.eventHandlers.get("*");
        if (allHandlers) {
            allHandlers.forEach((handler) => handler(data as WebSocketEvent));
        }
    }

    private handleReconnect(token: string): void {
        // Don't reconnect if explicitly disabled (e.g., auth failure or manual disconnect)
        if (!this.shouldReconnect) {
            logger.info("Reconnection disabled, not attempting to reconnect");
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error("Max reconnect attempts reached");
            this.shouldReconnect = false;
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        logger.info("Reconnecting WebSocket", { delayMs: delay, attempt: this.reconnectAttempts });

        setTimeout(() => {
            this.connect(token).catch((error) => {
                logger.error("Reconnect failed", error);
            });
        }, delay);
    }

    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// Global singleton instance
export const wsClient = WebSocketClient.getInstance();
