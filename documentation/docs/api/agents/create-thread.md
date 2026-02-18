---
sidebar_position: 3
title: Create Thread
---

# Create Thread

Create a new conversation thread for an agent. Threads maintain conversation history across multiple messages.

```
POST /api/v1/agents/:id/threads
```

**Required Scopes:** `agents:read`, `threads:write`

## Request

### Path Parameters

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Agent ID    |

### Example

```bash
curl -X POST "https://api.flowmaestro.ai/v1/agents/agent_abc123/threads" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

**Status:** `201 Created`

```json
{
    "data": {
        "id": "thread_xyz789",
        "agent_id": "agent_abc123",
        "status": "active",
        "created_at": "2024-01-15T10:30:00.000Z"
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

## Next Steps

After creating a thread, use the [Threads API](/api/threads/send-message) to send messages and receive responses.

## Errors

| Status | Code                 | Description     |
| ------ | -------------------- | --------------- |
| 404    | `resource_not_found` | Agent not found |
