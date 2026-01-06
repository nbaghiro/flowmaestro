---
sidebar_position: 1
title: Get Thread
---

# Get Thread

Get details of a conversation thread.

```
GET /api/v1/threads/:id
```

**Required Scope:** `threads:read`

## Request

### Path Parameters

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Thread ID   |

### Example

```bash
curl "https://api.flowmaestro.io/api/v1/threads/thread_xyz789" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": {
        "id": "thread_xyz789",
        "agent_id": "agent_abc123",
        "status": "active",
        "message_count": 12,
        "created_at": "2024-01-15T10:30:00.000Z",
        "last_message_at": "2024-01-15T11:45:00.000Z"
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

## Errors

| Status | Code                 | Description      |
| ------ | -------------------- | ---------------- |
| 404    | `resource_not_found` | Thread not found |
