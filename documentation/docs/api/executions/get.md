---
sidebar_position: 2
title: Get Execution
---

# Get Execution

Get details of a specific execution including inputs, outputs, and status.

```
GET /api/v1/executions/:id
```

**Required Scope:** `executions:read`

## Request

### Path Parameters

| Parameter | Type   | Description  |
| --------- | ------ | ------------ |
| `id`      | string | Execution ID |

### Example

```bash
curl "https://api.flowmaestro.ai/v1/executions/exec_xyz789" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": {
        "id": "exec_xyz789",
        "workflow_id": "wf_abc123",
        "workflow_name": "Customer Onboarding",
        "status": "completed",
        "inputs": {
            "customer_email": "john@example.com",
            "customer_name": "John Doe"
        },
        "outputs": {
            "welcome_email_sent": true,
            "account_created": true
        },
        "error": null,
        "started_at": "2024-01-15T10:30:00.000Z",
        "completed_at": "2024-01-15T10:30:05.000Z",
        "duration_ms": 5000
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

## Failed Execution Response

When an execution fails, the `error` field contains details:

```json
{
    "data": {
        "id": "exec_xyz789",
        "status": "failed",
        "error": {
            "code": "node_execution_failed",
            "message": "Failed to send email: Invalid recipient",
            "node_id": "node_email_1"
        },
        ...
    }
}
```

## Errors

| Status | Code                 | Description         |
| ------ | -------------------- | ------------------- |
| 404    | `resource_not_found` | Execution not found |
