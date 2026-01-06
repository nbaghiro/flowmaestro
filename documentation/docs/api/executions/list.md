---
sidebar_position: 1
title: List Executions
---

# List Executions

List workflow executions for the authenticated user.

```
GET /api/v1/executions
```

**Required Scope:** `executions:read`

## Request

### Query Parameters

| Parameter     | Type   | Default | Description              |
| ------------- | ------ | ------- | ------------------------ |
| `page`        | number | 1       | Page number              |
| `per_page`    | number | 20      | Items per page (max 100) |
| `workflow_id` | string | -       | Filter by workflow ID    |
| `status`      | string | -       | Filter by status         |

### Status Values

- `pending` - Queued for execution
- `running` - Currently executing
- `completed` - Finished successfully
- `failed` - Finished with error
- `cancelled` - Cancelled by user

### Example

```bash
curl "https://api.flowmaestro.io/api/v1/executions?status=completed&per_page=10" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": [
        {
            "id": "exec_xyz789",
            "workflow_id": "wf_abc123",
            "workflow_name": "Customer Onboarding",
            "status": "completed",
            "started_at": "2024-01-15T10:30:00.000Z",
            "completed_at": "2024-01-15T10:30:05.000Z",
            "duration_ms": 5000
        }
    ],
    "pagination": {
        "page": 1,
        "per_page": 10,
        "total_count": 150,
        "total_pages": 15,
        "has_next": true,
        "has_prev": false
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```
