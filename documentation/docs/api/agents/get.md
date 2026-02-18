---
sidebar_position: 2
title: Get Agent
---

# Get Agent

Get details of a specific agent by ID.

```
GET /api/v1/agents/:id
```

**Required Scope:** `agents:read`

## Request

### Path Parameters

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Agent ID    |

### Example

```bash
curl "https://api.flowmaestro.ai/v1/agents/agent_abc123" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": {
        "id": "agent_abc123",
        "name": "Support Assistant",
        "description": "Customer support chatbot",
        "model": "gpt-4",
        "system_prompt": "You are a helpful customer support agent...",
        "temperature": 0.7,
        "max_tokens": 2048,
        "available_tools": [
            {
                "name": "search_orders",
                "description": "Search customer orders"
            },
            {
                "name": "get_product_info",
                "description": "Get product information"
            }
        ],
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z"
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

## Errors

| Status | Code                 | Description     |
| ------ | -------------------- | --------------- |
| 404    | `resource_not_found` | Agent not found |
