# FlowMaestro SSE Streaming System

Architectural guide to FlowMaestro's Server-Sent Events (SSE) streaming for real-time workflow execution updates.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Event Types](#event-types)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Integration](#frontend-integration)
6. [Connection Management](#connection-management)
7. [Error Handling & Reconnection](#error-handling--reconnection)
8. [Comparison with WebSocket](#comparison-with-websocket)

---

## Overview

FlowMaestro uses Server-Sent Events (SSE) for unidirectional real-time streaming of workflow execution updates. This complements the WebSocket system by providing a lightweight, HTTP-based alternative optimized for execution monitoring.

### Key Features

- **Unidirectional Streaming**: Server pushes updates to client (no client-to-server messaging)
- **HTTP-Based**: Works through proxies, load balancers, and firewalls without special configuration
- **Auto-Reconnection**: Built-in browser reconnection with `Last-Event-ID` for replay
- **Event Buffering**: Server buffers recent events for late-joining clients
- **LLM Token Streaming**: Real-time token-by-token display for LLM nodes
- **Type Safety**: Fully typed events across TypeScript stack

### When to Use SSE vs WebSocket

| Use Case                    | SSE | WebSocket |
| --------------------------- | --- | --------- |
| Execution monitoring        | ✅  | ✅        |
| LLM token streaming         | ✅  | ✅        |
| User input during execution | ❌  | ✅        |
| Agent chat interactions     | ❌  | ✅        |
| Knowledge base uploads      | ❌  | ✅        |

---

## Architecture

### High-Level Flow

```
Temporal Workflow Activity
  ↓
broadcastExecutionEvent() call
  ↓
SSEManager.broadcast()
  ↓
Event serialized to SSE format
  ↓
Written to all connected clients
  ↓
EventSource receives in browser
  ↓
React hook updates UI state
```

### Components

**SSEManager** (`backend/src/temporal/core/services/streaming.ts`):

- Manages all SSE connections per execution
- Handles event serialization to SSE format
- Buffers events for replay on reconnection
- Sends keepalive pings to maintain connections
- Cleans up stale connections

**StreamSplitter** (`backend/src/temporal/core/services/streaming.ts`):

- Splits LLM token streams to multiple consumers
- Buffers tokens for late-joining viewers
- Tracks streaming metadata (token count, duration)

**ExecutionStreamClient** (`frontend/src/lib/execution-stream.ts`):

- Browser EventSource wrapper
- Auto-reconnection with exponential backoff
- Event handler subscription system
- Connection state management

**useExecutionStream Hook** (`frontend/src/hooks/useExecutionStream.ts`):

- React hook for SSE integration
- State management for progress, nodes, tokens
- Cleanup on unmount

---

## Event Types

SSE events are organized into 5 categories with 18 event types:

### Execution Lifecycle Events

| Event                 | Description                    | Data Fields                                                        |
| --------------------- | ------------------------------ | ------------------------------------------------------------------ |
| `execution:started`   | Workflow execution begins      | workflowId, workflowName, totalNodes, inputs                       |
| `execution:progress`  | Progress update                | progress (0-100), completedNodes, totalNodes, currentlyExecuting[] |
| `execution:completed` | Workflow finished successfully | outputs, durationMs, nodesExecuted, totalTokens                    |
| `execution:failed`    | Workflow failed                | error, failedNodeId, failedNodeName, durationMs                    |
| `execution:paused`    | Workflow paused                | reason, pausedAtNodeId, snapshotId                                 |
| `execution:resumed`   | Workflow resumed               | resumedFromNodeId, snapshotId                                      |
| `execution:cancelled` | Workflow cancelled             | reason, cancelledByUser                                            |

### Node Lifecycle Events

| Event            | Description                | Data Fields                                        |
| ---------------- | -------------------------- | -------------------------------------------------- |
| `node:started`   | Node execution begins      | nodeId, nodeType, nodeName, attemptNumber          |
| `node:completed` | Node finished successfully | nodeId, nodeType, durationMs, output, tokenUsage   |
| `node:failed`    | Node execution failed      | nodeId, nodeType, error, durationMs, willRetry     |
| `node:skipped`   | Node was skipped           | nodeId, nodeType, reason                           |
| `node:retrying`  | Node is retrying           | nodeId, attemptNumber, maxAttempts, delayMs, error |

### LLM Streaming Events

| Event               | Description          | Data Fields                               |
| ------------------- | -------------------- | ----------------------------------------- |
| `node:token`        | Single LLM token     | nodeId, token, cumulativeText, isComplete |
| `node:stream:start` | LLM streaming begins | nodeId, nodeType, model, provider         |
| `node:stream:end`   | LLM streaming ends   | nodeId, totalTokens, durationMs           |

### State Events

| Event              | Description               | Data Fields                        |
| ------------------ | ------------------------- | ---------------------------------- |
| `snapshot:created` | Execution snapshot saved  | snapshotId, snapshotType, progress |
| `variable:updated` | Workflow variable changed | variableName, value, nodeId        |

### Connection Events

| Event       | Description          | Data Fields              |
| ----------- | -------------------- | ------------------------ |
| `keepalive` | Connection heartbeat | serverTime               |
| `error`     | Stream error         | error, code, recoverable |

---

## Backend Implementation

### Route Setup

**File:** `backend/src/api/routes/executions/stream.ts`

```typescript
// GET /api/executions/:id/stream
fastify.get(
    "/:id/stream",
    {
        preHandler: [authMiddleware, validateParams(executionIdParamSchema)]
    },
    async (request, reply) => {
        const { id: executionId } = request.params;
        const userId = request.user.id;

        // Verify execution exists and user owns it
        const execution = await executionRepository.findById(executionId);
        const workflow = await workflowRepository.findById(execution.workflow_id);

        if (!workflow || workflow.user_id !== userId) {
            throw new UnauthorizedError("Not authorized");
        }

        // Add connection to SSE manager (sets headers, handles lifecycle)
        sseManager.addConnection(executionId, userId, reply, lastEventId);

        // Keep connection open
        return new Promise(() => {});
    }
);
```

### SSE Manager

**File:** `backend/src/temporal/core/services/streaming.ts`

```typescript
class SSEManager {
    private connections: Map<string, SSEConnection[]>;
    private eventBuffers: Map<string, BufferedEvent[]>;
    private sequenceCounters: Map<string, number>;

    // Add new SSE connection
    addConnection(executionId: string, userId: string, reply: FastifyReply, lastEventId?: string) {
        // Set SSE headers
        reply.raw.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  // Disable nginx buffering
        });

        // Track connection
        const connection = { executionId, userId, reply, lastEventId, ... };
        this.connections.get(executionId).push(connection);

        // Handle disconnect
        reply.raw.on("close", () => this.removeConnection(executionId, reply));

        // Replay buffered events for reconnection
        this.replayEvents(connection);
    }

    // Broadcast event to all connections for an execution
    broadcast(executionId: string, eventType: string, data: object) {
        const sequence = this.getNextSequence(executionId);
        const event = { type: eventType, timestamp: Date.now(), executionId, sequence, data };

        // Buffer for replay
        this.bufferEvent(executionId, event);

        // Send to all connections
        const sseData = serializeEvent(event);
        for (const conn of this.connections.get(executionId)) {
            conn.reply.raw.write(sseData);
        }
    }
}
```

### SSE Event Format

Events are serialized to standard SSE format:

```
event: node:completed
data: {"type":"node:completed","timestamp":1234567890,"executionId":"exec-123","sequence":42,"data":{"nodeId":"node-1","nodeType":"llm","durationMs":1500}}
id: exec-123-42

```

Key fields:

- `event:` - Event type for EventSource.addEventListener()
- `data:` - JSON payload with full event details
- `id:` - Event ID for `Last-Event-ID` header on reconnection

### Emitting Events from Workflows

```typescript
// From Temporal activity or workflow orchestrator
import { broadcastExecutionEvent } from "../api/routes/executions/stream";

// Emit node started
broadcastExecutionEvent(executionId, "node:started", {
    nodeId: node.id,
    nodeType: node.type,
    nodeName: node.name
});

// Emit LLM token
broadcastExecutionEvent(executionId, "node:token", {
    nodeId: node.id,
    token: chunk,
    cumulativeText: accumulated,
    isComplete: false
});
```

---

## Frontend Integration

### ExecutionStreamClient

**File:** `frontend/src/lib/execution-stream.ts`

```typescript
class ExecutionStreamClient {
    private eventSource: EventSource | null = null;
    private handlers: Map<string, Set<StreamEventHandler>> = new Map();
    private lastEventId: string | null = null;

    connect(executionId: string, token: string) {
        const url = `${API_URL}/api/executions/${executionId}/stream?token=${token}`;

        if (this.lastEventId) {
            url += `&lastEventId=${this.lastEventId}`;
        }

        this.eventSource = new EventSource(url);

        this.eventSource.onopen = () => {
            this.setConnectionState("connected");
        };

        this.eventSource.onerror = () => {
            this.handleReconnect();
        };

        // Register handlers for all event types
        for (const eventType of EVENT_TYPES) {
            this.eventSource.addEventListener(eventType, (e) => {
                this.handleEvent(eventType, e as MessageEvent);
            });
        }
    }

    on<T>(eventType: string, handler: StreamEventHandler<T>): () => void {
        this.handlers.get(eventType).add(handler);
        return () => this.off(eventType, handler);
    }

    private handleEvent(eventType: string, event: MessageEvent) {
        const data = JSON.parse(event.data);
        if (event.lastEventId) {
            this.lastEventId = event.lastEventId; // For reconnection replay
        }
        // Notify handlers...
    }
}
```

### React Hook

**File:** `frontend/src/hooks/useExecutionStream.ts`

```typescript
function useExecutionStream(
    executionId: string | null,
    token: string | null,
    handlers: ExecutionStreamHandlers = {}
) {
    const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
    const [progress, setProgress] = useState(0);
    const [executingNodes, setExecutingNodes] = useState<string[]>([]);
    const [tokensByNode, setTokensByNode] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        if (!executionId || !token) return;

        const client = createExecutionStream(executionId, token);

        client.on("execution:progress", (event) => {
            setProgress(event.data.progress);
            setExecutingNodes(event.data.currentlyExecuting);
        });

        client.on("node:token", (event) => {
            setTokensByNode(prev => {
                const next = new Map(prev);
                const current = next.get(event.data.nodeId) || "";
                next.set(event.data.nodeId, current + event.data.token);
                return next;
            });
        });

        return () => client.disconnect();
    }, [executionId, token]);

    return { connectionState, progress, executingNodes, tokensByNode, ... };
}
```

### Usage in Components

```typescript
function ExecutionMonitor({ executionId }: { executionId: string }) {
    const { token } = useAuth();

    const {
        isConnected,
        progress,
        executingNodes,
        tokensByNode,
        lastError
    } = useExecutionStream(executionId, token, {
        onNodeComplete: (data) => {
            console.log(`Node ${data.nodeId} completed in ${data.durationMs}ms`);
        },
        onComplete: (data) => {
            toast.success(`Execution completed: ${data.nodesExecuted} nodes`);
        }
    });

    return (
        <div>
            <ProgressBar value={progress} />
            {executingNodes.map(nodeId => (
                <NodeStatus key={nodeId} nodeId={nodeId} tokens={tokensByNode.get(nodeId)} />
            ))}
            {lastError && <ErrorMessage error={lastError} />}
        </div>
    );
}
```

---

## Connection Management

### Keepalive

The SSEManager sends keepalive events every 15 seconds to prevent connection timeouts:

```typescript
// Server sends periodically
{ type: "keepalive", timestamp: 1234567890, executionId: "exec-123", sequence: 100, data: { serverTime: 1234567890 } }
```

### Connection Cleanup

Connections are cleaned up when:

- Client disconnects (browser tab closed, navigation)
- Connection times out (default: 1 hour)
- Execution completes and `autoDisconnectOnComplete` is enabled

### Event Buffering

Recent events are buffered (default: 100 events, 5 minute TTL) for:

- Late-joining clients who navigate to execution page mid-run
- Reconnecting clients using `Last-Event-ID`

---

## Error Handling & Reconnection

### Browser Auto-Reconnection

The EventSource API automatically reconnects on network errors. The client enhances this with:

```typescript
// Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
const delay = Math.min(reconnectDelay * Math.pow(2, attempts - 1), maxReconnectDelay);

// Uses Last-Event-ID for replay
if (lastEventId) {
    url += `&lastEventId=${lastEventId}`;
}
```

### Configuration

```typescript
const DEFAULT_CONFIG = {
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000, // Initial delay
    maxReconnectDelay: 30000 // Max delay
};
```

### Error Events

Stream errors are communicated via the `error` event type:

```typescript
{
    type: "error",
    data: {
        error: "Execution not found",
        code: "NOT_FOUND",
        recoverable: false
    }
}
```

---

## Comparison with WebSocket

FlowMaestro uses both SSE and WebSocket for different purposes:

| Feature       | SSE (This Doc)       | WebSocket              |
| ------------- | -------------------- | ---------------------- |
| Direction     | Server → Client      | Bidirectional          |
| Protocol      | HTTP                 | WebSocket (WS)         |
| Reconnection  | Built-in             | Manual                 |
| Event replay  | Via `Last-Event-ID`  | Custom implementation  |
| Use case      | Execution monitoring | Interactive features   |
| Complexity    | Lower                | Higher                 |
| Proxy support | Excellent            | May need configuration |

### When to Use Each

**Use SSE for:**

- Workflow execution monitoring
- LLM token streaming display
- Read-only real-time updates

**Use WebSocket for:**

- Agent chat (requires user messages)
- User input prompts during execution
- Knowledge base upload progress (bidirectional status)

---

## Related Documentation

- **[WebSocket Events](./websocket-events.md)**: Bidirectional real-time communication
- **[Temporal Workflows](./temporal-workflows.md)**: Workflow execution emitting events
- **[Agent Architecture](./agent-architecture.md)**: Agent streaming via SSE

---

## Summary

FlowMaestro's SSE streaming system provides:

1. **18 Event Types**: Comprehensive coverage of execution lifecycle
2. **HTTP-Based**: Works through proxies without configuration
3. **Auto-Reconnection**: Built-in browser reconnection with event replay
4. **Event Buffering**: Late-joining clients receive recent events
5. **LLM Token Streaming**: Real-time token-by-token display
6. **Type Safety**: Fully typed events across TypeScript stack
7. **React Integration**: Custom hooks for easy UI integration

The SSE system complements WebSocket by providing a lightweight, unidirectional streaming solution optimized for execution monitoring and LLM token display.
