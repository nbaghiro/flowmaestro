---
sidebar_position: 4
title: Delete Thread
---

# Delete Thread

Delete a conversation thread and all its messages.

```
DELETE /api/v1/threads/:id
```

**Required Scope:** `threads:write`

## Request

### Path Parameters

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Thread ID   |

### Example

```bash
curl -X DELETE "https://api.flowmaestro.io/api/v1/threads/thread_xyz789" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": {
        "id": "thread_xyz789",
        "deleted": true
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
