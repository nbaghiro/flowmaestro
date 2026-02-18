---
sidebar_position: 3
title: Send Message
---

# Send Message

Send a message to a thread and receive an AI response.

```
POST /api/v1/threads/:id/messages
```

**Required Scopes:** `agents:execute`, `threads:write`

## Request

### Path Parameters

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Thread ID   |

### Body Parameters

| Parameter | Type    | Required | Description                      |
| --------- | ------- | -------- | -------------------------------- |
| `content` | string  | Yes      | Message content                  |
| `stream`  | boolean | No       | Stream response (default: false) |

### Example

```bash
curl -X POST "https://api.flowmaestro.ai/v1/threads/thread_xyz789/messages" \
  -H "X-API-Key: fm_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "What is my order status for order #12345?"
  }'
```

## Response

```json
{
    "data": {
        "id": "msg_004",
        "thread_id": "thread_xyz789",
        "role": "assistant",
        "content": "Your order #12345 is currently being shipped and is expected to arrive on January 20th.",
        "tool_calls": [
            {
                "id": "call_001",
                "name": "search_orders",
                "arguments": { "order_id": "12345" }
            }
        ],
        "usage": {
            "prompt_tokens": 150,
            "completion_tokens": 45,
            "total_tokens": 195
        },
        "created_at": "2024-01-15T10:30:18.000Z"
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

## Errors

| Status | Code                 | Description             |
| ------ | -------------------- | ----------------------- |
| 404    | `resource_not_found` | Thread not found        |
| 400    | `validation_error`   | Invalid message content |
