---
sidebar_position: 3
title: Cancel Execution
---

# Cancel Execution

Cancel a running workflow execution.

```
POST /api/v1/executions/:id/cancel
```

**Required Scopes:** `executions:read`, `executions:cancel`

## Request

### Path Parameters

| Parameter | Type   | Description  |
| --------- | ------ | ------------ |
| `id`      | string | Execution ID |

### Example

```bash
curl -X POST "https://api.flowmaestro.io/api/v1/executions/exec_xyz789/cancel" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": {
        "id": "exec_xyz789",
        "workflow_id": "wf_abc123",
        "status": "cancelled",
        "cancelled_at": "2024-01-15T10:30:02.000Z"
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

## Errors

| Status | Code                 | Description                             |
| ------ | -------------------- | --------------------------------------- |
| 404    | `resource_not_found` | Execution not found                     |
| 400    | `validation_error`   | Execution is not in a cancellable state |
