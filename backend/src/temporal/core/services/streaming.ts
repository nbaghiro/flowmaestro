/**
 * Streaming Module
 *
 * Consolidated streaming functionality for workflow execution.
 * Includes SSE event types, connection management, and LLM token stream splitting.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import type { FastifyReply } from "fastify";

// ============================================================================
// EVENT TYPE ENUM
// ============================================================================

/**
 * All possible execution streaming event types.
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

// ============================================================================
// BASE EVENT INTERFACE
// ============================================================================

/**
 * Base interface for all streaming events.
 */
export interface BaseStreamEvent {
    /** Event type */
    type: ExecutionStreamEventType;
    /** Event timestamp (Unix ms) */
    timestamp: number;
    /** Execution ID this event belongs to */
    executionId: string;
    /** Sequence number for ordering and replay */
    sequence: number;
}

// ============================================================================
// EXECUTION EVENTS
// ============================================================================

/**
 * Execution started event.
 */
export interface ExecutionStartedEvent extends BaseStreamEvent {
    type: "execution:started";
    data: {
        workflowId: string;
        workflowName: string;
        totalNodes: number;
        inputs: JsonObject;
    };
}

/**
 * Execution progress event.
 */
export interface ExecutionProgressEvent extends BaseStreamEvent {
    type: "execution:progress";
    data: {
        progress: number; // 0-100
        completedNodes: number;
        totalNodes: number;
        currentlyExecuting: string[];
    };
}

/**
 * Execution completed event.
 */
export interface ExecutionCompletedEvent extends BaseStreamEvent {
    type: "execution:completed";
    data: {
        outputs: JsonObject;
        durationMs: number;
        nodesExecuted: number;
        totalTokens?: number;
    };
}

/**
 * Execution failed event.
 */
export interface ExecutionFailedEvent extends BaseStreamEvent {
    type: "execution:failed";
    data: {
        error: string;
        failedNodeId?: string;
        failedNodeName?: string;
        durationMs: number;
        nodesExecuted: number;
    };
}

/**
 * Execution paused event.
 */
export interface ExecutionPausedEvent extends BaseStreamEvent {
    type: "execution:paused";
    data: {
        reason: string;
        pausedAtNodeId: string;
        pausedAtNodeName?: string;
        resumeCondition?: string;
        snapshotId?: string;
    };
}

/**
 * Execution resumed event.
 */
export interface ExecutionResumedEvent extends BaseStreamEvent {
    type: "execution:resumed";
    data: {
        resumedFromNodeId: string;
        snapshotId?: string;
    };
}

/**
 * Execution cancelled event.
 */
export interface ExecutionCancelledEvent extends BaseStreamEvent {
    type: "execution:cancelled";
    data: {
        reason?: string;
        cancelledByUser: boolean;
    };
}

// ============================================================================
// NODE EVENTS
// ============================================================================

/**
 * Node started event.
 */
export interface NodeStartedEvent extends BaseStreamEvent {
    type: "node:started";
    data: {
        nodeId: string;
        nodeType: string;
        nodeName?: string;
        attemptNumber?: number;
    };
}

/**
 * Node completed event.
 */
export interface NodeCompletedEvent extends BaseStreamEvent {
    type: "node:completed";
    data: {
        nodeId: string;
        nodeType: string;
        nodeName?: string;
        durationMs: number;
        output?: JsonObject;
        tokenUsage?: {
            promptTokens?: number;
            completionTokens?: number;
            totalTokens?: number;
        };
    };
}

/**
 * Node failed event.
 */
export interface NodeFailedEvent extends BaseStreamEvent {
    type: "node:failed";
    data: {
        nodeId: string;
        nodeType: string;
        nodeName?: string;
        error: string;
        durationMs: number;
        willRetry: boolean;
        attemptNumber?: number;
    };
}

/**
 * Node skipped event.
 */
export interface NodeSkippedEvent extends BaseStreamEvent {
    type: "node:skipped";
    data: {
        nodeId: string;
        nodeType: string;
        nodeName?: string;
        reason: string;
    };
}

/**
 * Node retrying event.
 */
export interface NodeRetryingEvent extends BaseStreamEvent {
    type: "node:retrying";
    data: {
        nodeId: string;
        nodeType: string;
        nodeName?: string;
        attemptNumber: number;
        maxAttempts: number;
        delayMs: number;
        error: string;
    };
}

// ============================================================================
// LLM STREAMING EVENTS
// ============================================================================

/**
 * Token streaming event (for LLM nodes).
 */
export interface NodeTokenEvent extends BaseStreamEvent {
    type: "node:token";
    data: {
        nodeId: string;
        token: string;
        cumulativeText?: string;
        isComplete: boolean;
    };
}

/**
 * Stream start event.
 */
export interface NodeStreamStartEvent extends BaseStreamEvent {
    type: "node:stream:start";
    data: {
        nodeId: string;
        nodeType: string;
        model?: string;
        provider?: string;
    };
}

/**
 * Stream end event.
 */
export interface NodeStreamEndEvent extends BaseStreamEvent {
    type: "node:stream:end";
    data: {
        nodeId: string;
        totalTokens?: number;
        durationMs: number;
    };
}

// ============================================================================
// STATE EVENTS
// ============================================================================

/**
 * Snapshot created event.
 */
export interface SnapshotCreatedEvent extends BaseStreamEvent {
    type: "snapshot:created";
    data: {
        snapshotId: string;
        snapshotType: "checkpoint" | "pause" | "failure" | "final";
        progress: number;
    };
}

/**
 * Variable updated event.
 */
export interface VariableUpdatedEvent extends BaseStreamEvent {
    type: "variable:updated";
    data: {
        variableName: string;
        value: JsonValue;
        nodeId?: string;
    };
}

// ============================================================================
// CONNECTION EVENTS
// ============================================================================

/**
 * Keepalive event (sent periodically to keep connection alive).
 */
export interface KeepaliveEvent extends BaseStreamEvent {
    type: "keepalive";
    data: {
        serverTime: number;
    };
}

/**
 * Error event.
 */
export interface StreamErrorEvent extends BaseStreamEvent {
    type: "error";
    data: {
        error: string;
        code?: string;
        recoverable: boolean;
    };
}

// ============================================================================
// UNION TYPE
// ============================================================================

/**
 * Union of all streaming event types.
 */
export type ExecutionStreamEvent =
    | ExecutionStartedEvent
    | ExecutionProgressEvent
    | ExecutionCompletedEvent
    | ExecutionFailedEvent
    | ExecutionPausedEvent
    | ExecutionResumedEvent
    | ExecutionCancelledEvent
    | NodeStartedEvent
    | NodeCompletedEvent
    | NodeFailedEvent
    | NodeSkippedEvent
    | NodeRetryingEvent
    | NodeTokenEvent
    | NodeStreamStartEvent
    | NodeStreamEndEvent
    | SnapshotCreatedEvent
    | VariableUpdatedEvent
    | KeepaliveEvent
    | StreamErrorEvent;

// ============================================================================
// EVENT HELPERS
// ============================================================================

/**
 * Create a base event with common fields.
 */
export function createBaseEvent(
    type: ExecutionStreamEventType,
    executionId: string,
    sequence: number
): BaseStreamEvent {
    return {
        type,
        timestamp: Date.now(),
        executionId,
        sequence
    };
}

/**
 * Serialize an event to SSE format.
 */
export function serializeEvent(event: ExecutionStreamEvent): string {
    const lines: string[] = [];

    // Event type
    lines.push(`event: ${event.type}`);

    // Event data as JSON
    lines.push(`data: ${JSON.stringify(event)}`);

    // Event ID for replay
    lines.push(`id: ${event.executionId}-${event.sequence}`);

    // Empty line to mark end of event
    lines.push("");
    lines.push("");

    return lines.join("\n");
}

/**
 * Parse an SSE event from string format.
 */
export function parseEvent(sseString: string): ExecutionStreamEvent | null {
    const dataMatch = sseString.match(/^data: (.+)$/m);

    if (!dataMatch) {
        return null;
    }

    try {
        return JSON.parse(dataMatch[1]) as ExecutionStreamEvent;
    } catch {
        return null;
    }
}

// ============================================================================
// SSE MANAGER TYPES
// ============================================================================

/**
 * SSE connection info.
 */
interface SSEConnection {
    executionId: string;
    userId: string;
    reply: FastifyReply;
    lastEventId: number;
    connectedAt: number;
    lastEventAt: number;
}

/**
 * Event buffer entry.
 */
interface BufferedEvent {
    event: ExecutionStreamEvent;
    expiresAt: number;
}

/**
 * SSE Manager configuration.
 */
export interface SSEManagerConfig {
    /** Keepalive interval in ms (default: 15000) */
    keepaliveIntervalMs: number;
    /** Event buffer TTL in ms (default: 300000 = 5 min) */
    bufferTtlMs: number;
    /** Max events to buffer per execution (default: 100) */
    maxBufferedEvents: number;
    /** Connection timeout in ms (default: 3600000 = 1 hour) */
    connectionTimeoutMs: number;
}

const DEFAULT_SSE_CONFIG: SSEManagerConfig = {
    keepaliveIntervalMs: 15000,
    bufferTtlMs: 5 * 60 * 1000,
    maxBufferedEvents: 100,
    connectionTimeoutMs: 60 * 60 * 1000
};

// ============================================================================
// SSE MANAGER CLASS
// ============================================================================

/**
 * Manages SSE connections for execution streaming.
 */
export class SSEManager {
    private connections: Map<string, SSEConnection[]> = new Map();
    private eventBuffers: Map<string, BufferedEvent[]> = new Map();
    private sequenceCounters: Map<string, number> = new Map();
    private config: SSEManagerConfig;
    private keepaliveInterval: NodeJS.Timeout | null = null;
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(config: Partial<SSEManagerConfig> = {}) {
        this.config = { ...DEFAULT_SSE_CONFIG, ...config };
    }

    /**
     * Start the manager (begins keepalive and cleanup intervals).
     */
    start(): void {
        // Start keepalive interval
        this.keepaliveInterval = setInterval(() => {
            this.sendKeepalives();
        }, this.config.keepaliveIntervalMs);

        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanupStaleConnections();
            this.cleanupExpiredEvents();
        }, 60000); // Every minute
    }

    /**
     * Stop the manager.
     */
    stop(): void {
        if (this.keepaliveInterval) {
            clearInterval(this.keepaliveInterval);
            this.keepaliveInterval = null;
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        // Close all connections
        for (const connections of this.connections.values()) {
            for (const conn of connections) {
                this.closeConnection(conn);
            }
        }

        this.connections.clear();
        this.eventBuffers.clear();
        this.sequenceCounters.clear();
    }

    /**
     * Add a new SSE connection.
     *
     * @param executionId - Execution to subscribe to
     * @param userId - User ID for authorization
     * @param reply - Fastify reply object
     * @param lastEventId - Last event ID for replay (optional)
     */
    addConnection(
        executionId: string,
        userId: string,
        reply: FastifyReply,
        lastEventId?: string
    ): void {
        // Set up SSE headers
        reply.raw.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no" // Disable nginx buffering
        });

        const connection: SSEConnection = {
            executionId,
            userId,
            reply,
            lastEventId: this.parseEventId(lastEventId),
            connectedAt: Date.now(),
            lastEventAt: Date.now()
        };

        // Add to connections map
        const existing = this.connections.get(executionId) || [];
        existing.push(connection);
        this.connections.set(executionId, existing);

        // Handle connection close
        reply.raw.on("close", () => {
            this.removeConnection(executionId, reply);
        });

        // Replay buffered events
        this.replayEvents(connection);
    }

    /**
     * Remove a connection.
     */
    removeConnection(executionId: string, reply: FastifyReply): void {
        const connections = this.connections.get(executionId);

        if (connections) {
            const filtered = connections.filter((c) => c.reply !== reply);

            if (filtered.length > 0) {
                this.connections.set(executionId, filtered);
            } else {
                this.connections.delete(executionId);
            }
        }
    }

    /**
     * Broadcast an event to all connections for an execution.
     *
     * @param executionId - Execution ID
     * @param eventType - Event type
     * @param data - Event data
     */
    broadcast<T extends ExecutionStreamEventType>(
        executionId: string,
        eventType: T,
        data: Record<string, unknown>
    ): void {
        const sequence = this.getNextSequence(executionId);

        const event = {
            ...createBaseEvent(eventType, executionId, sequence),
            data
        } as ExecutionStreamEvent;

        // Buffer the event
        this.bufferEvent(executionId, event);

        // Send to all connections
        const connections = this.connections.get(executionId);

        if (connections) {
            const sseData = serializeEvent(event);

            for (const conn of connections) {
                this.sendToConnection(conn, sseData);
            }
        }
    }

    /**
     * Get connection count for an execution.
     */
    getConnectionCount(executionId: string): number {
        return this.connections.get(executionId)?.length || 0;
    }

    /**
     * Get total connection count.
     */
    getTotalConnections(): number {
        let total = 0;
        for (const connections of this.connections.values()) {
            total += connections.length;
        }
        return total;
    }

    /**
     * Get manager statistics.
     */
    getStats(): {
        totalConnections: number;
        executionsWithConnections: number;
        totalBufferedEvents: number;
    } {
        let totalBuffered = 0;
        for (const buffer of this.eventBuffers.values()) {
            totalBuffered += buffer.length;
        }

        return {
            totalConnections: this.getTotalConnections(),
            executionsWithConnections: this.connections.size,
            totalBufferedEvents: totalBuffered
        };
    }

    // ========== Private Methods ==========

    private getNextSequence(executionId: string): number {
        const current = this.sequenceCounters.get(executionId) || 0;
        const next = current + 1;
        this.sequenceCounters.set(executionId, next);
        return next;
    }

    private parseEventId(lastEventId?: string): number {
        if (!lastEventId) return 0;

        const parts = lastEventId.split("-");
        if (parts.length < 2) return 0;

        return parseInt(parts[parts.length - 1], 10) || 0;
    }

    private bufferEvent(executionId: string, event: ExecutionStreamEvent): void {
        const buffer = this.eventBuffers.get(executionId) || [];

        buffer.push({
            event,
            expiresAt: Date.now() + this.config.bufferTtlMs
        });

        // Trim if over max
        if (buffer.length > this.config.maxBufferedEvents) {
            buffer.shift();
        }

        this.eventBuffers.set(executionId, buffer);
    }

    private replayEvents(connection: SSEConnection): void {
        const buffer = this.eventBuffers.get(connection.executionId);

        if (!buffer) return;

        for (const entry of buffer) {
            if (entry.event.sequence > connection.lastEventId) {
                const sseData = serializeEvent(entry.event);
                this.sendToConnection(connection, sseData);
            }
        }
    }

    private sendToConnection(connection: SSEConnection, data: string): void {
        try {
            connection.reply.raw.write(data);
            connection.lastEventAt = Date.now();
        } catch {
            // Connection may be closed
            this.removeConnection(connection.executionId, connection.reply);
        }
    }

    private closeConnection(connection: SSEConnection): void {
        try {
            connection.reply.raw.end();
        } catch {
            // Ignore errors on close
        }
    }

    private sendKeepalives(): void {
        for (const [executionId, connections] of this.connections) {
            const sequence = this.getNextSequence(executionId);

            const event = {
                ...createBaseEvent("keepalive", executionId, sequence),
                data: { serverTime: Date.now() }
            } as ExecutionStreamEvent;

            const sseData = serializeEvent(event);

            for (const conn of connections) {
                this.sendToConnection(conn, sseData);
            }
        }
    }

    private cleanupStaleConnections(): void {
        const now = Date.now();

        for (const [executionId, connections] of this.connections) {
            const active = connections.filter((conn) => {
                const age = now - conn.connectedAt;
                return age < this.config.connectionTimeoutMs;
            });

            if (active.length !== connections.length) {
                // Close stale connections
                for (const conn of connections) {
                    if (!active.includes(conn)) {
                        this.closeConnection(conn);
                    }
                }

                if (active.length > 0) {
                    this.connections.set(executionId, active);
                } else {
                    this.connections.delete(executionId);
                }
            }
        }
    }

    private cleanupExpiredEvents(): void {
        const now = Date.now();

        for (const [executionId, buffer] of this.eventBuffers) {
            const active = buffer.filter((entry) => entry.expiresAt > now);

            if (active.length > 0) {
                this.eventBuffers.set(executionId, active);
            } else {
                this.eventBuffers.delete(executionId);
            }
        }
    }
}

// ============================================================================
// STREAM SPLITTER TYPES
// ============================================================================

/**
 * Token from an LLM stream.
 */
export interface StreamToken {
    token: string;
    index: number;
    timestamp: number;
    isComplete: boolean;
}

/**
 * Consumer callback for stream tokens.
 */
export type StreamConsumer = (token: StreamToken) => void | Promise<void>;

/**
 * Stream metadata captured during streaming.
 */
export interface StreamMetadata {
    nodeId: string;
    executionId: string;
    model?: string;
    provider?: string;
    startTime: number;
    endTime?: number;
    totalTokens: number;
    fullText: string;
}

/**
 * Stream splitter configuration.
 */
export interface StreamSplitterConfig {
    /** Max consumers per stream (default: 10) */
    maxConsumers: number;
    /** Buffer size for late-joining consumers (default: 50 tokens) */
    bufferSize: number;
    /** Timeout for consumer callbacks in ms (default: 5000) */
    consumerTimeoutMs: number;
}

const DEFAULT_SPLITTER_CONFIG: StreamSplitterConfig = {
    maxConsumers: 10,
    bufferSize: 50,
    consumerTimeoutMs: 5000
};

/**
 * Active stream state.
 */
interface ActiveStream {
    metadata: StreamMetadata;
    consumers: Map<string, StreamConsumer>;
    buffer: StreamToken[];
    tokenIndex: number;
    isComplete: boolean;
}

// ============================================================================
// STREAM SPLITTER CLASS
// ============================================================================

/**
 * Splits LLM token streams to multiple consumers.
 */
export class StreamSplitter {
    private streams: Map<string, ActiveStream> = new Map();
    private config: StreamSplitterConfig;

    constructor(config: Partial<StreamSplitterConfig> = {}) {
        this.config = { ...DEFAULT_SPLITTER_CONFIG, ...config };
    }

    /**
     * Create a new stream for an LLM node execution.
     *
     * @param streamId - Unique stream identifier (usually nodeId-executionId)
     * @param metadata - Stream metadata
     * @returns Stream key for reference
     */
    createStream(
        streamId: string,
        metadata: Omit<StreamMetadata, "startTime" | "totalTokens" | "fullText">
    ): string {
        if (this.streams.has(streamId)) {
            // Clean up existing stream
            this.closeStream(streamId);
        }

        this.streams.set(streamId, {
            metadata: {
                ...metadata,
                startTime: Date.now(),
                totalTokens: 0,
                fullText: ""
            },
            consumers: new Map(),
            buffer: [],
            tokenIndex: 0,
            isComplete: false
        });

        return streamId;
    }

    /**
     * Add a consumer to a stream.
     *
     * @param streamId - Stream identifier
     * @param consumerId - Unique consumer identifier
     * @param consumer - Consumer callback
     * @param replayBuffer - Whether to replay buffered tokens (default: true)
     */
    addConsumer(
        streamId: string,
        consumerId: string,
        consumer: StreamConsumer,
        replayBuffer: boolean = true
    ): void {
        const stream = this.streams.get(streamId);

        if (!stream) {
            throw new Error(`Stream ${streamId} not found`);
        }

        if (stream.consumers.size >= this.config.maxConsumers) {
            throw new Error(`Stream ${streamId} has reached max consumers`);
        }

        stream.consumers.set(consumerId, consumer);

        // Replay buffered tokens for late-joining consumers
        if (replayBuffer && stream.buffer.length > 0) {
            this.replayBufferToConsumer(stream, consumer);
        }
    }

    /**
     * Remove a consumer from a stream.
     *
     * @param streamId - Stream identifier
     * @param consumerId - Consumer identifier
     */
    removeConsumer(streamId: string, consumerId: string): void {
        const stream = this.streams.get(streamId);

        if (stream) {
            stream.consumers.delete(consumerId);
        }
    }

    /**
     * Push a token to all consumers of a stream.
     *
     * @param streamId - Stream identifier
     * @param tokenText - Token text
     * @param isComplete - Whether this is the final token
     */
    async pushToken(
        streamId: string,
        tokenText: string,
        isComplete: boolean = false
    ): Promise<void> {
        const stream = this.streams.get(streamId);

        if (!stream) {
            throw new Error(`Stream ${streamId} not found`);
        }

        const token: StreamToken = {
            token: tokenText,
            index: stream.tokenIndex++,
            timestamp: Date.now(),
            isComplete
        };

        // Update metadata
        stream.metadata.totalTokens++;
        stream.metadata.fullText += tokenText;

        if (isComplete) {
            stream.metadata.endTime = Date.now();
            stream.isComplete = true;
        }

        // Add to buffer (with size limit)
        stream.buffer.push(token);
        if (stream.buffer.length > this.config.bufferSize) {
            stream.buffer.shift();
        }

        // Distribute to all consumers
        await this.distributeToken(stream, token);
    }

    /**
     * Close a stream and notify consumers.
     *
     * @param streamId - Stream identifier
     * @returns Final stream metadata
     */
    closeStream(streamId: string): StreamMetadata | null {
        const stream = this.streams.get(streamId);

        if (!stream) {
            return null;
        }

        // Mark as complete if not already
        if (!stream.isComplete) {
            stream.metadata.endTime = Date.now();
            stream.isComplete = true;
        }

        const metadata = { ...stream.metadata };

        // Clean up
        stream.consumers.clear();
        stream.buffer = [];
        this.streams.delete(streamId);

        return metadata;
    }

    /**
     * Get stream metadata.
     *
     * @param streamId - Stream identifier
     * @returns Stream metadata or null
     */
    getMetadata(streamId: string): StreamMetadata | null {
        const stream = this.streams.get(streamId);
        return stream ? { ...stream.metadata } : null;
    }

    /**
     * Get current accumulated text for a stream.
     *
     * @param streamId - Stream identifier
     * @returns Accumulated text or null
     */
    getAccumulatedText(streamId: string): string | null {
        const stream = this.streams.get(streamId);
        return stream ? stream.metadata.fullText : null;
    }

    /**
     * Check if a stream exists and is active.
     */
    isStreamActive(streamId: string): boolean {
        const stream = this.streams.get(streamId);
        return stream ? !stream.isComplete : false;
    }

    /**
     * Get statistics about active streams.
     */
    getStats(): {
        activeStreams: number;
        totalConsumers: number;
        totalTokensProcessed: number;
    } {
        let totalConsumers = 0;
        let totalTokens = 0;

        for (const stream of this.streams.values()) {
            totalConsumers += stream.consumers.size;
            totalTokens += stream.metadata.totalTokens;
        }

        return {
            activeStreams: this.streams.size,
            totalConsumers,
            totalTokensProcessed: totalTokens
        };
    }

    // ========== Private Methods ==========

    private async distributeToken(stream: ActiveStream, token: StreamToken): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const [consumerId, consumer] of stream.consumers) {
            const promise = this.sendToConsumer(consumerId, consumer, token);
            promises.push(promise);
        }

        // Wait for all consumers with timeout
        await Promise.allSettled(promises);
    }

    private async sendToConsumer(
        _consumerId: string,
        consumer: StreamConsumer,
        token: StreamToken
    ): Promise<void> {
        try {
            const result = consumer(token);

            if (result instanceof Promise) {
                await Promise.race([result, this.timeout(this.config.consumerTimeoutMs)]);
            }
        } catch {
            // Consumer error - could log this but don't fail the stream
            // In production, might want to remove misbehaving consumers
        }
    }

    private replayBufferToConsumer(stream: ActiveStream, consumer: StreamConsumer): void {
        // Fire and forget replay - don't block
        (async () => {
            for (const token of stream.buffer) {
                try {
                    const result = consumer(token);
                    if (result instanceof Promise) {
                        await result;
                    }
                } catch {
                    // Ignore replay errors
                    break;
                }
            }
        })();
    }

    private timeout(ms: number): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Consumer timeout")), ms);
        });
    }
}

// ============================================================================
// SSE INTEGRATION
// ============================================================================

/**
 * Create a stream consumer that emits SSE events.
 *
 * @param emitter - Function to emit SSE events
 * @param executionId - Execution ID for event context
 * @param nodeId - Node ID for event context
 * @returns Stream consumer function
 */
export function createSSEConsumer(
    emitter: (eventType: ExecutionStreamEventType, data: JsonObject) => void,
    _executionId: string,
    nodeId: string
): StreamConsumer {
    let cumulativeText = "";

    return (token: StreamToken) => {
        cumulativeText += token.token;

        emitter("node:token", {
            nodeId,
            token: token.token,
            cumulativeText,
            isComplete: token.isComplete
        });
    };
}

/**
 * Create a stream consumer that captures the full response.
 *
 * @param callback - Called with full text when stream completes
 * @returns Stream consumer function
 */
export function createCaptureConsumer(
    callback: (fullText: string, metadata: { totalTokens: number; durationMs: number }) => void
): { consumer: StreamConsumer; getResult: () => string } {
    let fullText = "";
    const startTime = Date.now();
    let tokenCount = 0;

    const consumer: StreamConsumer = (token: StreamToken) => {
        fullText += token.token;
        tokenCount++;

        if (token.isComplete) {
            callback(fullText, {
                totalTokens: tokenCount,
                durationMs: Date.now() - startTime
            });
        }
    };

    return {
        consumer,
        getResult: () => fullText
    };
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

/**
 * Global SSE manager instance.
 */
export const sseManager = new SSEManager();

/**
 * Global stream splitter instance.
 */
export const streamSplitter = new StreamSplitter();
