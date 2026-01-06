---
sidebar_position: 2
title: List Webhooks
---

# List Webhooks

List all configured webhooks.

```
GET /api/v1/webhooks
```

**Required Scope:** `webhooks:read`

## Request

### Query Parameters

| Parameter  | Type   | Default | Description              |
| ---------- | ------ | ------- | ------------------------ |
| `page`     | number | 1       | Page number              |
| `per_page` | number | 20      | Items per page (max 100) |

### Example

```bash
curl "https://api.flowmaestro.io/api/v1/webhooks" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": [
        {
            "id": "wh_abc123",
            "name": "Production Notifications",
            "url": "https://api.example.com/webhooks/flowmaestro",
            "events": ["execution.completed", "execution.failed"],
            "is_active": true,
            "created_at": "2024-01-01T00:00:00.000Z",
            "updated_at": "2024-01-15T10:30:00.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total_count": 2,
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
