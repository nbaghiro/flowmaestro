---
title: Execute Workflow
---

# Execute Workflow

`POST /v1/workflows/{id}/execute`

## Request

```bash
curl -X POST https://api.flowmaestro.ai/v1/workflows/wf_abc123/execute \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "customerId": "cust_123"
    }
  }'
```

## Response (Synchronous)

```json
{
    "success": true,
    "data": {
        "executionId": "exec_xyz789",
        "status": "completed",
        "output": {
            "result": "Customer onboarded successfully"
        },
        "duration": 2345
    }
}
```

## Response (Asynchronous)

```json
{
    "success": true,
    "data": {
        "executionId": "exec_xyz789",
        "status": "running"
    }
}
```
