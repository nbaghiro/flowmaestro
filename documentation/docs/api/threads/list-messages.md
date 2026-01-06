---
sidebar_position: 2
title: List Messages
---

# List Messages

Get messages in a conversation thread.

```
GET /api/v1/threads/:id/messages
```

**Required Scope:** `threads:read`

## Request

### Path Parameters

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Thread ID   |

### Query Parameters

| Parameter  | Type   | Default | Description              |
| ---------- | ------ | ------- | ------------------------ |
| `page`     | number | 1       | Page number              |
| `per_page` | number | 20      | Items per page (max 100) |

### Example

```bash
curl "https://api.flowmaestro.io/api/v1/threads/thread_xyz789/messages" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": [
        {
            "id": "msg_001",
            "role": "user",
            "content": "What is my order status?",
            "created_at": "2024-01-15T10:30:00.000Z"
        },
        {
            "id": "msg_002",
            "role": "assistant",
            "content": "I'd be happy to help! Could you provide your order number?",
            "tool_calls": null,
            "created_at": "2024-01-15T10:30:02.000Z"
        },
        {
            "id": "msg_003",
            "role": "user",
            "content": "Order #12345",
            "created_at": "2024-01-15T10:30:15.000Z"
        },
        {
            "id": "msg_004",
            "role": "assistant",
            "content": "Your order #12345 is currently being shipped...",
            "tool_calls": [
                {
                    "id": "call_001",
                    "name": "search_orders",
                    "arguments": { "order_id": "12345" }
                }
            ],
            "created_at": "2024-01-15T10:30:18.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total_count": 4,
        "total_pages": 1,
        "has_next": false,
        "has_prev": false
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

## Message Roles

| Role        | Description                |
| ----------- | -------------------------- |
| `user`      | Message from the user      |
| `assistant` | Response from the AI agent |
| `system`    | System message             |

## Errors

| Status | Code                 | Description      |
| ------ | -------------------- | ---------------- |
| 404    | `resource_not_found` | Thread not found |
