---
sidebar_position: 1
title: List Triggers
---

# List Triggers

List all workflow triggers for the authenticated user.

```
GET /api/v1/triggers
```

**Required Scope:** `triggers:read`

## Request

### Query Parameters

| Parameter  | Type   | Default | Description              |
| ---------- | ------ | ------- | ------------------------ |
| `page`     | number | 1       | Page number              |
| `per_page` | number | 20      | Items per page (max 100) |

### Example

```bash
curl "https://api.flowmaestro.io/api/v1/triggers" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": [
        {
            "id": "trigger_abc123",
            "workflow_id": "wf_xyz789",
            "workflow_name": "Customer Onboarding",
            "name": "New Customer Signup",
            "type": "webhook",
            "enabled": true,
            "trigger_count": 1542,
            "last_triggered_at": "2024-01-15T10:30:00.000Z",
            "created_at": "2024-01-01T00:00:00.000Z"
        },
        {
            "id": "trigger_def456",
            "workflow_id": "wf_abc123",
            "workflow_name": "Daily Report",
            "name": "Daily 9am",
            "type": "schedule",
            "enabled": true,
            "trigger_count": 45,
            "last_triggered_at": "2024-01-15T09:00:00.000Z",
            "created_at": "2024-01-01T00:00:00.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total_count": 2,
        "total_pages": 1,
        "has_next": false,
        "has_prev": false
    },
    "meta": {
        "request_id": "...",
        "timestamp": "..."
    }
}
```

## Trigger Types

| Type       | Description                    |
| ---------- | ------------------------------ |
| `webhook`  | Triggered via HTTP webhook     |
| `schedule` | Triggered on a schedule (cron) |
| `event`    | Triggered by internal events   |
