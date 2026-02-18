---
sidebar_position: 2
title: Get Workflow
---

# Get Workflow

Get details of a specific workflow by ID.

```
GET /api/v1/workflows/:id
```

**Required Scope:** `workflows:read`

## Request

### Path Parameters

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Workflow ID |

### Example

```bash
curl "https://api.flowmaestro.ai/v1/workflows/wf_abc123" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": {
        "id": "wf_abc123",
        "name": "Customer Onboarding",
        "description": "Onboard new customers automatically",
        "status": "active",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_email": {
                    "type": "string",
                    "description": "Customer email address"
                },
                "customer_name": {
                    "type": "string",
                    "description": "Customer full name"
                }
            },
            "required": ["customer_email"]
        },
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z"
    },
    "meta": {
        "request_id": "550e8400-e29b-41d4-a716-446655440000",
        "timestamp": "2024-01-15T10:30:00.000Z"
    }
}
```

## Errors

| Status | Code                 | Description        |
| ------ | -------------------- | ------------------ |
| 404    | `resource_not_found` | Workflow not found |
