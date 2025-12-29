/**
 * Execution Stream Client
 *
 * EventSource-based client for SSE execution updates.
 * Provides auto-reconnection, event buffering, and type-safe event handling.
 */

import { logger } from "./logger";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Execution stream event types (matches backend event-types.ts).
 */
export type ExecutionStreamEventType =
    // Execution lifecycle events
    | "execution:started"
    | "execution:progress"
    | "execution:completed"
    | "execution:failed"
    | "execution:paused"
    | "execution:resumed"
    | "execution:cancelled"
    // Node lifecycle events
    | "node:started"
    | "node:completed"
    | "node:failed"
    | "node:skipped"
    | "node:retrying"
    // LLM streaming events
    | "node:token"
    | "node:stream:start"
    | "node:stream:end"
    // State events
    | "snapshot:created"
    | "variable:updated"
    // Connection events
    | "keepalive"
    | "error";

/**
 * Base event interface.
 */
export interface BaseStreamEvent {
    type: ExecutionStreamEventType;
    timestamp: number;
    executionId: string;
    sequence: number;
}

/**
 * Execution started event data.
 */
export interface ExecutionStartedData {
    workflowId: string;
    workflowName: string;
    totalNodes: number;
    inputs: Record<string, unknown>;
}

/**
 * Execution progress event data.
 */
export interface ExecutionProgressData {
    progress: number;
    completedNodes: number;
    totalNodes: number;
    currentlyExecuting: string[];
}

/**
 * Execution completed event data.
 */
export interface ExecutionCompletedData {
    outputs: Record<string, unknown>;
    durationMs: number;
    nodesExecuted: number;
    totalTokens?: number;
}

/**
 * Execution failed event data.
 */
export interface ExecutionFailedData {
    error: string;
    failedNodeId?: string;
    failedNodeName?: string;
    durationMs: number;
    nodesExecuted: number;
}

/**
 * Node started event data.
 */
export interface NodeStartedData {
    nodeId: string;
    nodeType: string;
    nodeName?: string;
    attemptNumber?: number;
}

/**
 * Node completed event data.
 */
export interface NodeCompletedData {
    nodeId: string;
    nodeType: string;
    nodeName?: string;
    durationMs: number;
    output?: Record<string, unknown>;
    tokenUsage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
}

/**
 * Node failed event data.
 */
export interface NodeFailedData {
    nodeId: string;
    nodeType: string;
    nodeName?: string;
    error: string;
    durationMs: number;
    willRetry: boolean;
    attemptNumber?: number;
}

/**
 * Node token event data (LLM streaming).
 */
export interface NodeTokenData {
    nodeId: string;
    token: string;
    cumulativeText?: string;
    isComplete: boolean;
}

/**
 * Stream event with typed data.
 */
export interface StreamEvent<T = Record<string, unknown>> extends BaseStreamEvent {
    data: T;
}

/**
 * Event handler callback.
 */
export type StreamEventHandler<T = Record<string, unknown>> = (event: StreamEvent<T>) => void;

/**
 * Connection state.
 */
export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

/**
 * Stream client configuration.
 */
export interface ExecutionStreamConfig {
    /** API base URL */
    apiBaseUrl: string;
    /** Auto-reconnect on disconnect (default: true) */
    autoReconnect: boolean;
    /** Max reconnection attempts (default: 5) */
    maxReconnectAttempts: number;
    /** Initial reconnect delay in ms (default: 1000) */
    reconnectDelay: number;
    /** Max reconnect delay in ms (default: 30000) */
    maxReconnectDelay: number;
}

const DEFAULT_CONFIG: ExecutionStreamConfig = {
    apiBaseUrl: import.meta.env.VITE_API_URL || "http://localhost:3001",
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000
};

// ============================================================================
// EXECUTION STREAM CLIENT
// ============================================================================

/**
 * SSE client for execution streaming.
 */
export class ExecutionStreamClient {
    private eventSource: EventSource | null = null;
    private executionId: string | null = null;
    private token: string | null = null;
    private config: ExecutionStreamConfig;
    private handlers: Map<string, Set<StreamEventHandler>> = new Map();
    private connectionState: ConnectionState = "disconnected";
    private reconnectAttempts = 0;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private lastEventId: string | null = null;
    private stateChangeHandlers: Set<(state: ConnectionState) => void> = new Set();

    constructor(config: Partial<ExecutionStreamConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Connect to execution stream.
     *
     * @param executionId - Execution ID to stream
     * @param token - Auth token
     */
    connect(executionId: string, token: string): void {
        if (this.eventSource) {
            this.disconnect();
        }

        this.executionId = executionId;
        this.token = token;
        this.reconnectAttempts = 0;

        this.doConnect();
    }

    /**
     * Disconnect from stream.
     */
    disconnect(): void {
        this.clearReconnectTimeout();

        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        this.setConnectionState("disconnected");
        this.executionId = null;
        this.token = null;
        this.lastEventId = null;
    }

    /**
     * Subscribe to a specific event type.
     *
     * @param eventType - Event type or "*" for all events
     * @param handler - Event handler
     * @returns Unsubscribe function
     */
    on<T = Record<string, unknown>>(
        eventType: ExecutionStreamEventType | "*",
        handler: StreamEventHandler<T>
    ): () => void {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, new Set());
        }

        this.handlers.get(eventType)!.add(handler as StreamEventHandler);

        return () => {
            this.off(eventType, handler);
        };
    }

    /**
     * Unsubscribe from an event type.
     */
    off<T = Record<string, unknown>>(
        eventType: ExecutionStreamEventType | "*",
        handler: StreamEventHandler<T>
    ): void {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
            handlers.delete(handler as StreamEventHandler);
        }
    }

    /**
     * Subscribe to connection state changes.
     */
    onStateChange(handler: (state: ConnectionState) => void): () => void {
        this.stateChangeHandlers.add(handler);
        // Immediately notify current state
        handler(this.connectionState);

        return () => {
            this.stateChangeHandlers.delete(handler);
        };
    }

    /**
     * Get current connection state.
     */
    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    /**
     * Check if connected.
     */
    isConnected(): boolean {
        return this.connectionState === "connected";
    }

    // ========== Private Methods ==========

    private doConnect(): void {
        if (!this.executionId || !this.token) {
            return;
        }

        this.setConnectionState("connecting");

        // Build URL with auth token and optional last event ID for replay
        let url = `${this.config.apiBaseUrl}/api/executions/${this.executionId}/stream`;
        const params = new URLSearchParams();

        if (this.lastEventId) {
            params.set("lastEventId", this.lastEventId);
        }

        const queryString = params.toString();
        if (queryString) {
            url += `?${queryString}`;
        }

        // EventSource doesn't support custom headers, so we use a query param for auth
        // In production, consider using cookies or a custom EventSource polyfill
        const authUrl = `${url}${queryString ? "&" : "?"}token=${encodeURIComponent(this.token)}`;

        try {
            this.eventSource = new EventSource(authUrl);

            this.eventSource.onopen = () => {
                logger.info("SSE stream connected", { executionId: this.executionId });
                this.reconnectAttempts = 0;
                this.setConnectionState("connected");
            };

            this.eventSource.onerror = (error) => {
                logger.error("SSE stream error", error, { executionId: this.executionId });

                if (this.eventSource?.readyState === EventSource.CLOSED) {
                    this.setConnectionState("error");
                    this.handleReconnect();
                }
            };

            // Register handlers for all event types
            this.registerEventHandlers();
        } catch (error) {
            logger.error("Failed to create EventSource", error);
            this.setConnectionState("error");
            this.handleReconnect();
        }
    }

    private registerEventHandlers(): void {
        if (!this.eventSource) return;

        const eventTypes: ExecutionStreamEventType[] = [
            "execution:started",
            "execution:progress",
            "execution:completed",
            "execution:failed",
            "execution:paused",
            "execution:resumed",
            "execution:cancelled",
            "node:started",
            "node:completed",
            "node:failed",
            "node:skipped",
            "node:retrying",
            "node:token",
            "node:stream:start",
            "node:stream:end",
            "snapshot:created",
            "variable:updated",
            "keepalive",
            "error"
        ];

        for (const eventType of eventTypes) {
            this.eventSource.addEventListener(eventType, (e: Event) => {
                const messageEvent = e as MessageEvent;
                this.handleEvent(eventType, messageEvent);
            });
        }
    }

    private handleEvent(eventType: ExecutionStreamEventType, event: MessageEvent): void {
        try {
            const data = JSON.parse(event.data);

            // Update last event ID for reconnection replay
            if (event.lastEventId) {
                this.lastEventId = event.lastEventId;
            }

            const streamEvent: StreamEvent = {
                type: eventType,
                timestamp: data.timestamp || Date.now(),
                executionId: data.executionId || this.executionId || "",
                sequence: data.sequence || 0,
                data: data.data || data
            };

            // Emit to specific handlers
            const handlers = this.handlers.get(eventType);
            if (handlers) {
                handlers.forEach((handler) => {
                    try {
                        handler(streamEvent);
                    } catch (err) {
                        logger.error("Stream event handler error", err);
                    }
                });
            }

            // Emit to wildcard handlers
            const wildcardHandlers = this.handlers.get("*");
            if (wildcardHandlers) {
                wildcardHandlers.forEach((handler) => {
                    try {
                        handler(streamEvent);
                    } catch (err) {
                        logger.error("Stream event handler error", err);
                    }
                });
            }
        } catch (error) {
            logger.error("Failed to parse SSE event", error, { eventType, data: event.data });
        }
    }

    private handleReconnect(): void {
        if (!this.config.autoReconnect) {
            return;
        }

        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            logger.error("Max reconnect attempts reached", {
                executionId: this.executionId,
                attempts: this.reconnectAttempts
            });
            return;
        }

        this.reconnectAttempts++;

        // Exponential backoff
        const delay = Math.min(
            this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
            this.config.maxReconnectDelay
        );

        logger.info("Reconnecting SSE stream", {
            executionId: this.executionId,
            attempt: this.reconnectAttempts,
            delayMs: delay
        });

        this.clearReconnectTimeout();
        this.reconnectTimeout = setTimeout(() => {
            this.doConnect();
        }, delay);
    }

    private clearReconnectTimeout(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    private setConnectionState(state: ConnectionState): void {
        if (this.connectionState !== state) {
            this.connectionState = state;
            this.stateChangeHandlers.forEach((handler) => {
                try {
                    handler(state);
                } catch (err) {
                    logger.error("State change handler error", err);
                }
            });
        }
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Global execution stream client instance.
 */
export const executionStream = new ExecutionStreamClient();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a stream client for a specific execution.
 *
 * @param executionId - Execution ID
 * @param token - Auth token
 * @param config - Optional configuration
 * @returns Connected stream client
 */
export function createExecutionStream(
    executionId: string,
    token: string,
    config?: Partial<ExecutionStreamConfig>
): ExecutionStreamClient {
    const client = new ExecutionStreamClient(config);
    client.connect(executionId, token);
    return client;
}
