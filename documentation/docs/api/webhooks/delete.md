---
sidebar_position: 4
title: Delete Webhook
---

# Delete Webhook

Delete a webhook.

```
DELETE /api/v1/webhooks/:id
```

**Required Scope:** `webhooks:write`

## Request

### Path Parameters

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Webhook ID  |

### Example

```bash
curl -X DELETE "https://api.flowmaestro.io/api/v1/webhooks/wh_abc123" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": {
        "id": "wh_abc123",
        "deleted": true
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
