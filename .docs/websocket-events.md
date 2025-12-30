# FlowMaestro WebSocket Event System

Architectural guide to FlowMaestro's real-time event system for workflow and agent execution updates via WebSocket.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Event Types](#event-types)
4. [Connection & Authentication](#connection--authentication)
5. [Subscription Management](#subscription-management)
6. [Frontend Integration](#frontend-integration)
7. [Backend Implementation](#backend-implementation)
8. [Error Handling](#error-handling)

---

## Overview

FlowMaestro uses WebSocket (Socket.IO) for bidirectional real-time communication, enabling:

- Live workflow execution progress updates
- Node-level execution visibility
- Agent streaming responses
- Knowledge base processing status
- User input prompts during workflow execution

### Key Benefits

- **Real-time Updates**: Zero polling, instant event delivery
- **Bidirectional**: Server pushes updates, client can send responses
- **Selective Subscriptions**: Clients receive only relevant events
- **Automatic Reconnection**: Built-in connection recovery
- **Type Safety**: Fully typed events in TypeScript

---

## Architecture

### High-Level Flow

```
Backend Service (Workflow/Agent Execution)
  ↓
EventEmitter (Internal Events)
  ↓
EventBridge (Translation Layer)
  ↓
WebSocketManager (Socket.IO Server)
  ↓
WebSocket Connection
  ↓
Frontend Client (React App)
  ↓
UI Updates
```

### Components

**EventEmitter** (`backend/src/services/events/EventEmitter.ts`):

- Node.js EventEmitter for internal event bus
- Decouples event producers from consumers
- In-process pub/sub pattern

**EventBridge** (`backend/src/services/events/EventBridge.ts`):

- Translates internal events to WebSocket messages
- Filters events by user and execution
- Routes events to appropriate Socket.IO rooms

**WebSocketManager** (`backend/src/services/websocket/WebSocketManager.ts`):

- Socket.IO server wrapper
- Connection lifecycle management
- Authentication and authorization
- Room-based event broadcasting

---

## Event Types

FlowMaestro supports 15 event types across 5 categories:

### 1. Execution Events

**execution:started**

- Emitted when workflow execution begins
- Data: execution ID, workflow ID, status, start time

**execution:updated**

- Emitted on status changes during execution
- Data: execution ID, status, current node, progress

**execution:completed**

- Emitted when workflow completes successfully
- Data: execution ID, outputs, duration

**execution:failed**

- Emitted on workflow failure
- Data: execution ID, error message, failed node

---

### 2. Node Execution Events

**node:started**

- Emitted when individual node begins execution
- Data: node ID, node type, execution context

**node:completed**

- Emitted when node finishes successfully
- Data: node ID, outputs, duration

**node:failed**

- Emitted when node execution fails
- Data: node ID, error message, retry info

**node:progress**

- Emitted for long-running nodes with progress tracking
- Data: node ID, progress percentage, current step

---

### 3. User Input Events

**user_input:required**

- Emitted when workflow needs user input
- Data: input prompt, expected type, validation rules
- Client must respond via `user_input:provide` event

**user_input:timeout**

- Emitted when user input times out
- Data: timeout duration, workflow state

---

### 4. Knowledge Base Events

**kb:upload_started**

- Emitted when document upload begins
- Data: knowledge base ID, file name, file size

**kb:processing**

- Emitted during document processing
- Data: progress percentage, current step (extraction, chunking, embedding)

**kb:upload_completed**

- Emitted when document is fully processed
- Data: document ID, chunk count, embedding count

**kb:upload_failed**

- Emitted on processing failure
- Data: error message, failed step

---

### 5. Agent Streaming Events

**agent:streaming_start**

- Emitted when agent begins streaming response
- Data: agent ID, execution ID

**agent:token**

- Emitted for each token during streaming
- Data: token text, cumulative response

**agent:streaming_end**

- Emitted when streaming completes
- Data: full response, token count

**agent:tool_call**

- Emitted when agent invokes a tool
- Data: tool name, arguments, execution status

---

## Connection & Authentication

### Client Connection

**Initialization**:

- Client connects to WebSocket server (same origin as API)
- Socket.IO handles transport negotiation (WebSocket preferred, polling fallback)
- Automatic reconnection with exponential backoff

**Authentication**:

- JWT token passed in connection query parameters
- Server validates token on connection
- Invalid tokens result in connection rejection

**Connection Lifecycle**:

1. Client initiates connection with JWT
2. Server validates and authenticates
3. Connection established, socket ID assigned
4. Client subscribes to relevant event channels
5. Server emits events to subscribed clients
6. On disconnect, subscriptions cleaned up

---

## Subscription Management

### Channel Types

**Execution Channels**:

- Format: `execution:{executionId}`
- Events: All execution and node events for specific execution
- Auto-subscribed when viewing execution page

**Agent Channels**:

- Format: `agent:{agentId}:{executionId}`
- Events: Streaming and tool call events
- Auto-subscribed during agent chat

**Knowledge Base Channels**:

- Format: `kb:{knowledgeBaseId}`
- Events: Upload and processing events
- Auto-subscribed on knowledge base page

**User Channels**:

- Format: `user:{userId}`
- Events: All events for user's resources
- Always subscribed after authentication

### Subscription Pattern

**Client subscribes** → **Server adds to room** → **Events broadcast to room** → **Only room members receive**

**Benefits**:

- Prevents unauthorized event access
- Reduces bandwidth (only relevant events sent)
- Enables multi-tenancy isolation

---

## Frontend Integration

### React Hooks Pattern

**useWebSocket Hook**:

- Manages connection lifecycle
- Automatic connection on mount
- Cleanup on unmount
- Reconnection handling
- Authentication injection

**Usage**:

```typescript
const { connected, error } = useWebSocket();
```

**useExecutionEvents Hook**:

- Subscribes to specific execution
- Updates local state on events
- Provides typed event handlers
- Auto-unsubscribes on cleanup

**Usage**:

```typescript
const { events, status } = useExecutionEvents(executionId);
```

**useAgentStreaming Hook**:

- Handles agent response streaming
- Token accumulation
- Tool call display
- Streaming state management

**Usage**:

```typescript
const { response, streaming } = useAgentStreaming(agentId);
```

### State Management Integration

**Zustand Store Pattern**:

- WebSocket events update Zustand stores
- Reactive UI updates via store subscriptions
- Optimistic updates with WebSocket confirmation

**Example Flow**:

1. User action triggers API call
2. API returns initial state
3. WebSocket events update state incrementally
4. UI reacts to state changes
5. Final state confirmed via WebSocket completion event

**Benefits**:

- Single source of truth
- Automatic UI updates
- No manual polling required

---

## Backend Implementation

### Event Emission

**From Activities**:

- Temporal activities emit internal events via EventEmitter
- EventEmitter broadcasts to all registered listeners
- EventBridge receives events and translates to WebSocket messages
- WebSocketManager broadcasts to appropriate rooms

**Event Flow**:

```
Node Executor Activity
  → eventEmitter.emit('node:started', data)
  → EventBridge receives event
  → Determines target rooms (execution channel, user channel)
  → WebSocketManager.to(room).emit('node:started', data)
  → Clients in room receive event
```

**Room Targeting**:

- Events emitted to multiple rooms simultaneously
- Execution room: `execution:{executionId}`
- User room: `user:{userId}`
- Ensures users receive updates via both channels
- Event deduplication on client prevents duplicate handling

### Scaling Considerations

**Single Server**:

- EventEmitter works in-process
- All WebSocket connections on single server
- Suitable for small to medium deployments

**Multi-Server (Future)**:

- Redis adapter for Socket.IO required
- EventBridge publishes to Redis pub/sub
- All servers subscribe to Redis
- Events broadcast across all server instances
- Sticky sessions not required

---

## Error Handling

### Connection Errors

**Authentication Failure**:

- Connection rejected immediately
- Client receives `error` event with details
- UI shows authentication required message
- User redirected to login

**Network Interruption**:

- Socket.IO auto-reconnects with exponential backoff
- Client shows "connecting" state during reconnection
- Events queued during disconnect
- Catch-up mechanism on reconnection (fetch missed events via API)

**Protocol Errors**:

- Malformed events logged and ignored
- Client receives `error` event
- Connection maintained
- Error reported to monitoring

### Event Processing Errors

**Missing Data**:

- Events validated before emission
- Invalid events logged but not sent
- Prevents client-side errors

**Subscription Errors**:

- Failed subscriptions return error to client
- Client can retry subscription
- Fall back to polling if WebSocket unavailable
- Logged for debugging

### Monitoring

**Metrics Tracked**:

- Active connection count
- Events emitted per second
- Failed event deliveries
- Reconnection frequency
- Average latency

**Alerting**:

- High reconnection rate indicates network issues
- Failed deliveries indicate client-side problems
- Zero active connections indicates server issue

---

## Related Documentation

- **[SSE Streaming](./sse-streaming.md)**: Server-Sent Events for execution monitoring (alternative to WebSocket)
- **[Workflow System](./workflow-system.md)**: Workflow execution emitting events
- **[Agent Architecture](./agent-architecture.md)**: Agent streaming via WebSocket
- **[Temporal Workflows](./temporal-workflows.md)**: Activity-level event emission

---

## Summary

FlowMaestro's WebSocket system provides:

1. **Real-time Updates**: Zero-latency execution visibility
2. **15 Event Types**: Comprehensive coverage of all async operations
3. **Selective Subscriptions**: Clients receive only relevant events
4. **Type Safety**: Fully typed events across stack
5. **Scalable Architecture**: Ready for multi-server deployments
6. **Robust Error Handling**: Graceful degradation and recovery
7. **React Integration**: Custom hooks for easy frontend integration

The event-driven architecture decouples event producers (workflows, agents) from consumers (UI clients), enabling flexible real-time features without tight coupling.
