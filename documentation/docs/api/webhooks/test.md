---
sidebar_position: 5
title: Test Webhook
---

# Test Webhook

Send a test event to verify your webhook endpoint is working.

```
POST /api/v1/webhooks/:id/test
```

**Required Scope:** `webhooks:write`

## Request

### Path Parameters

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Webhook ID  |

### Example

```bash
curl -X POST "https://api.flowmaestro.ai/v1/webhooks/wh_abc123/test" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": {
        "webhook_id": "wh_abc123",
        "delivery_id": "delivery_xyz789",
        "success": true,
        "status_code": 200,
        "response_time_ms": 145
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

## Failed Test Response

```json
{
    "data": {
        "webhook_id": "wh_abc123",
        "delivery_id": "delivery_xyz789",
        "success": false,
        "status_code": 500,
        "error_message": "Connection refused",
        "response_time_ms": 30000
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

## Errors

| Status | Code                 | Description       |
| ------ | -------------------- | ----------------- |
| 404    | `resource_not_found` | Webhook not found |
