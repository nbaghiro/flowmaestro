---
sidebar_position: 6
title: List Deliveries
---

# List Webhook Deliveries

Get delivery history for a webhook, useful for debugging.

```
GET /api/v1/webhooks/:id/deliveries
```

**Required Scope:** `webhooks:read`

## Request

### Path Parameters

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Webhook ID  |

### Query Parameters

| Parameter  | Type   | Default | Description              |
| ---------- | ------ | ------- | ------------------------ |
| `page`     | number | 1       | Page number              |
| `per_page` | number | 20      | Items per page (max 100) |

### Example

```bash
curl "https://api.flowmaestro.ai/v1/webhooks/wh_abc123/deliveries" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": [
        {
            "id": "delivery_xyz789",
            "webhook_id": "wh_abc123",
            "event_type": "execution.completed",
            "status": "success",
            "attempts": 1,
            "response_status": 200,
            "response_time_ms": 145,
            "created_at": "2024-01-15T10:30:00.000Z",
            "last_attempt_at": "2024-01-15T10:30:00.000Z"
        },
        {
            "id": "delivery_abc456",
            "webhook_id": "wh_abc123",
            "event_type": "execution.failed",
            "status": "failed",
            "attempts": 3,
            "response_status": 500,
            "error_message": "Internal Server Error",
            "created_at": "2024-01-15T09:00:00.000Z",
            "last_attempt_at": "2024-01-15T09:15:00.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total_count": 50,
        "total_pages": 3,
        "has_next": true,
        "has_prev": false
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

## Delivery Status

| Status     | Description                  |
| ---------- | ---------------------------- |
| `pending`  | Queued for delivery          |
| `success`  | Delivered successfully       |
| `failed`   | All retry attempts exhausted |
| `retrying` | Failed, will retry           |

## Errors

| Status | Code                 | Description       |
| ------ | -------------------- | ----------------- |
| 404    | `resource_not_found` | Webhook not found |
