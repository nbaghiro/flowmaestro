---
sidebar_position: 3
title: Execute Workflow
---

# Execute Workflow

Execute a workflow asynchronously. Returns immediately with an execution ID that you can use to track progress.

```
POST /api/v1/workflows/:id/execute
```

**Required Scopes:** `workflows:read`, `workflows:execute`

## Request

### Path Parameters

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Workflow ID |

### Body Parameters

| Parameter | Type   | Required | Description                  |
| --------- | ------ | -------- | ---------------------------- |
| `inputs`  | object | No       | Input variables for workflow |

### Example

```bash
curl -X POST "https://api.flowmaestro.io/api/v1/workflows/wf_abc123/execute" \
  -H "X-API-Key: fm_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "customer_email": "john@example.com",
      "customer_name": "John Doe"
    }
  }'
```

## Response

**Status:** `202 Accepted`

```json
{
    "data": {
        "execution_id": "exec_xyz789",
        "workflow_id": "wf_abc123",
        "status": "pending",
        "inputs": {
            "customer_email": "john@example.com",
            "customer_name": "John Doe"
        }
    },
    "meta": {
        "request_id": "550e8400-e29b-41d4-a716-446655440000",
        "timestamp": "2024-01-15T10:30:00.000Z"
    }
}
```

## Next Steps

The workflow executes asynchronously. Use the [Executions API](/api/executions/get) to:

- Poll for completion status
- Stream real-time events
- Get execution results

## Errors

| Status | Code                 | Description        |
| ------ | -------------------- | ------------------ |
| 404    | `resource_not_found` | Workflow not found |
| 400    | `validation_error`   | Invalid input data |
