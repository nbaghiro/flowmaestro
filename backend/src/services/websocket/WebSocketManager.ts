import { WebSocketEvent } from "@flowmaestro/shared";
import { createServiceLogger } from "../../core/logging";
import type { WebSocket } from "@fastify/websocket";

const logger = createServiceLogger("WebSocketManager");

interface Connection {
    socket: WebSocket;
    userId: string;
    subscriptions: Set<string>; // execution IDs
}

export class WebSocketManager {
    private static instance: WebSocketManager;
    private connections: Map<string, Connection>; // connectionId -> Connection
    private executionSubscribers: Map<string, Set<string>>; // executionId -> Set<connectionId>

    private constructor() {
        this.connections = new Map();
        this.executionSubscribers = new Map();
    }

    static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }

    addConnection(connectionId: string, socket: WebSocket, userId: string): void {
        this.connections.set(connectionId, {
            socket,
            userId,
            subscriptions: new Set()
        });

        // Set up message handler
        socket.on("message", (message: Buffer) => {
            try {
                const data = JSON.parse(message.toString());
                this.handleMessage(connectionId, data);
            } catch (error) {
                logger.error({ err: error }, "Failed to parse WebSocket message");
            }
        });

        // Clean up on close
        socket.on("close", () => {
            this.removeConnection(connectionId);
        });
    }

    removeConnection(connectionId: string): void {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        // Remove from all execution subscriptions
        connection.subscriptions.forEach((executionId) => {
            const subscribers = this.executionSubscribers.get(executionId);
            if (subscribers) {
                subscribers.delete(connectionId);
                if (subscribers.size === 0) {
                    this.executionSubscribers.delete(executionId);
                }
            }
        });

        this.connections.delete(connectionId);
    }

    subscribeToExecution(connectionId: string, executionId: string): void {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            logger.info({ connectionId }, "Cannot subscribe: connection not found");
            return;
        }

        connection.subscriptions.add(executionId);

        if (!this.executionSubscribers.has(executionId)) {
            this.executionSubscribers.set(executionId, new Set());
        }
        this.executionSubscribers.get(executionId)!.add(connectionId);

        logger.info({ connectionId, executionId }, "Subscribed connection to execution");
        logger.info(
            { executionId, subscriberCount: this.executionSubscribers.get(executionId)!.size },
            "Total subscribers for execution"
        );
    }

    unsubscribeFromExecution(connectionId: string, executionId: string): void {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        connection.subscriptions.delete(executionId);

        const subscribers = this.executionSubscribers.get(executionId);
        if (subscribers) {
            subscribers.delete(connectionId);
            if (subscribers.size === 0) {
                this.executionSubscribers.delete(executionId);
            }
        }
    }

    broadcast(event: WebSocketEvent): void {
        const message = JSON.stringify(event);

        // If it's an execution-related event, send to subscribers
        if ("executionId" in event) {
            const executionId = (event as WebSocketEvent & { executionId: string }).executionId;
            logger.info(
                { eventType: event.type, executionId },
                "Broadcasting to execution subscribers"
            );
            this.broadcastToExecution(executionId, event);
        } else {
            // Broadcast to all connections
            logger.info({ eventType: event.type }, "Broadcasting to all connections");
            this.connections.forEach((connection) => {
                // 1 is the OPEN state for ws-based WebSocket implementations
                if (connection.socket.readyState === 1) {
                    connection.socket.send(message);
                }
            });
        }
    }

    broadcastToExecution(executionId: string, event: WebSocketEvent): void {
        const subscribers = this.executionSubscribers.get(executionId);
        if (!subscribers || subscribers.size === 0) {
            logger.info({ executionId }, "No subscribers for execution");
            return;
        }

        const message = JSON.stringify(event);
        logger.info(
            { eventType: event.type, subscriberCount: subscribers.size },
            "Sending event to subscribers"
        );

        subscribers.forEach((connectionId) => {
            const connection = this.connections.get(connectionId);
            // 1 is the OPEN state for ws-based WebSocket implementations
            if (connection && connection.socket.readyState === 1) {
                connection.socket.send(message);
            }
        });
    }

    broadcastToUser(userId: string, event: WebSocketEvent): void {
        const message = JSON.stringify(event);

        this.connections.forEach((connection) => {
            // 1 is the OPEN state for ws-based WebSocket implementations
            if (connection.userId === userId && connection.socket.readyState === 1) {
                connection.socket.send(message);
            }
        });
    }

    private handleMessage(connectionId: string, data: unknown): void {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        // Type guard for message data
        const message = data as { type?: string; executionId?: string };

        // Handle subscription requests
        if (message.type === "subscribe" && message.executionId) {
            this.subscribeToExecution(connectionId, message.executionId);
            // Send acknowledgment
            connection.socket.send(
                JSON.stringify({
                    type: "subscribed",
                    executionId: message.executionId
                })
            );
        } else if (message.type === "unsubscribe" && message.executionId) {
            this.unsubscribeFromExecution(connectionId, message.executionId);
            // Send acknowledgment
            connection.socket.send(
                JSON.stringify({
                    type: "unsubscribed",
                    executionId: message.executionId
                })
            );
        }
    }

    getConnectionCount(): number {
        return this.connections.size;
    }

    getExecutionSubscriberCount(executionId: string): number {
        return this.executionSubscribers.get(executionId)?.size || 0;
    }
}

// Global singleton instance
export const wsManager = WebSocketManager.getInstance();
