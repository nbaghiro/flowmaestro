---
sidebar_position: 3
title: Create Webhook
---

# Create Webhook

Create a new webhook endpoint.

```
POST /api/v1/webhooks
```

**Required Scope:** `webhooks:write`

## Request

### Body Parameters

| Parameter | Type     | Required | Description                  |
| --------- | -------- | -------- | ---------------------------- |
| `name`    | string   | Yes      | Webhook name                 |
| `url`     | string   | Yes      | Webhook endpoint URL (HTTPS) |
| `events`  | string[] | Yes      | Events to subscribe to       |
| `headers` | object   | No       | Custom headers to include    |

### Example

```bash
curl -X POST "https://api.flowmaestro.ai/v1/webhooks" \
  -H "X-API-Key: fm_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Notifications",
    "url": "https://api.example.com/webhooks/flowmaestro",
    "events": ["execution.completed", "execution.failed"],
    "headers": {
      "X-Custom-Header": "my-value"
    }
  }'
```

## Response

**Status:** `201 Created`

```json
{
    "data": {
        "id": "wh_abc123",
        "name": "Production Notifications",
        "url": "https://api.example.com/webhooks/flowmaestro",
        "events": ["execution.completed", "execution.failed"],
        "secret": "whsec_abc123xyz...",
        "headers": {
            "X-Custom-Header": "my-value"
        },
        "is_active": true,
        "created_at": "2024-01-15T10:30:00.000Z"
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

:::warning
The `secret` is only returned once when creating the webhook. Store it securely — you'll need it to verify webhook signatures.
:::

## Errors

| Status | Code               | Description           |
| ------ | ------------------ | --------------------- |
| 400    | `validation_error` | Invalid URL or events |
