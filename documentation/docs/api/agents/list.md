---
sidebar_position: 1
title: List Agents
---

# List Agents

List all agents for the authenticated user.

```
GET /api/v1/agents
```

**Required Scope:** `agents:read`

## Request

### Query Parameters

| Parameter  | Type   | Default | Description              |
| ---------- | ------ | ------- | ------------------------ |
| `page`     | number | 1       | Page number              |
| `per_page` | number | 20      | Items per page (max 100) |

### Example

```bash
curl "https://api.flowmaestro.ai/v1/agents" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": [
        {
            "id": "agent_abc123",
            "name": "Support Assistant",
            "description": "Customer support chatbot",
            "model": "gpt-4",
            "created_at": "2024-01-15T10:30:00.000Z",
            "updated_at": "2024-01-15T10:30:00.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total_count": 5,
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
