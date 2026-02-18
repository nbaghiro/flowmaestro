---
sidebar_position: 2
title: Execute Trigger
---

# Execute Trigger

Manually execute a workflow trigger with optional input data.

```
POST /api/v1/triggers/:id/execute
```

**Required Scopes:** `triggers:read`, `triggers:execute`

## Request

### Path Parameters

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Trigger ID  |

### Body Parameters

| Parameter | Type   | Required | Description                |
| --------- | ------ | -------- | -------------------------- |
| `inputs`  | object | No       | Input data for the trigger |

### Example

```bash
curl -X POST "https://api.flowmaestro.ai/v1/triggers/trigger_abc123/execute" \
  -H "X-API-Key: fm_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "customer_id": "cust_12345",
      "event_type": "signup"
    }
  }'
```

## Response

**Status:** `202 Accepted`

```json
{
    "data": {
        "execution_id": "exec_xyz789",
        "trigger_id": "trigger_abc123",
        "workflow_id": "wf_xyz789",
        "status": "pending",
        "inputs": {
            "customer_id": "cust_12345",
            "event_type": "signup"
        }
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

## Next Steps

Use the [Executions API](/api/executions/get) to track the execution status and get results.

## Errors

| Status | Code                 | Description         |
| ------ | -------------------- | ------------------- |
| 404    | `resource_not_found` | Trigger not found   |
| 400    | `validation_error`   | Trigger is disabled |
