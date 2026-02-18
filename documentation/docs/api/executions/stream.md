---
sidebar_position: 4
title: Stream Events
---

# Stream Execution Events

Stream real-time execution events using Server-Sent Events (SSE).

```
GET /api/v1/executions/:id/events
```

**Required Scope:** `executions:read`

## Request

### Path Parameters

| Parameter | Type   | Description  |
| --------- | ------ | ------------ |
| `id`      | string | Execution ID |

### Example

```bash
curl -N "https://api.flowmaestro.ai/v1/executions/exec_xyz789/events" \
  -H "X-API-Key: fm_live_your_api_key" \
  -H "Accept: text/event-stream"
```

## Response

**Content-Type:** `text/event-stream`

Events are sent as Server-Sent Events:

```
event: connected
data: {"execution_id": "exec_xyz789"}

event: execution:started
data: {"execution_id": "exec_xyz789", "started_at": "2024-01-15T10:30:00.000Z"}

event: node:started
data: {"node_id": "node_1", "node_type": "ai_chat", "started_at": "..."}

event: execution:progress
data: {"progress": 25, "current_node": "node_1"}

event: node:completed
data: {"node_id": "node_1", "outputs": {...}, "duration_ms": 1200}

event: execution:completed
data: {"execution_id": "exec_xyz789", "status": "completed", "outputs": {...}}
```

## Event Types

| Event                 | Description                      |
| --------------------- | -------------------------------- |
| `connected`           | SSE connection established       |
| `execution:started`   | Execution has started            |
| `execution:progress`  | Progress update                  |
| `node:started`        | Node execution started           |
| `node:completed`      | Node execution completed         |
| `node:failed`         | Node execution failed            |
| `execution:completed` | Execution completed successfully |
| `execution:failed`    | Execution failed                 |
| `execution:cancelled` | Execution was cancelled          |

## JavaScript Example

```javascript
const eventSource = new EventSource("https://api.flowmaestro.ai/v1/executions/exec_xyz789/events", {
    headers: {
        "X-API-Key": "fm_live_your_api_key"
    }
});

eventSource.addEventListener("execution:completed", (event) => {
    const data = JSON.parse(event.data);
    console.log("Execution completed:", data.outputs);
    eventSource.close();
});

eventSource.addEventListener("execution:failed", (event) => {
    const data = JSON.parse(event.data);
    console.error("Execution failed:", data.error);
    eventSource.close();
});
```

## Using the SDK

The SDK provides a simpler interface for streaming:

```typescript
import { FlowMaestroClient } from "@flowmaestro/sdk";

const client = new FlowMaestroClient({ apiKey: "fm_live_..." });

// Using async iterator
for await (const event of client.executions.streamIterator("exec_xyz789")) {
    if (event.type === "execution:completed") {
        console.log("Done:", event.outputs);
        break;
    }
}
```
