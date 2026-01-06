---
sidebar_position: 1
title: List Workflows
---

# List Workflows

List all workflows for the authenticated user.

```
GET /api/v1/workflows
```

**Required Scope:** `workflows:read`

## Request

### Query Parameters

| Parameter  | Type   | Default | Description              |
| ---------- | ------ | ------- | ------------------------ |
| `page`     | number | 1       | Page number              |
| `per_page` | number | 20      | Items per page (max 100) |

### Example

```bash
curl "https://api.flowmaestro.io/api/v1/workflows?page=1&per_page=20" \
  -H "X-API-Key: fm_live_your_api_key"
```

## Response

```json
{
    "data": [
        {
            "id": "wf_abc123",
            "name": "Customer Onboarding",
            "description": "Onboard new customers automatically",
            "status": "active",
            "created_at": "2024-01-15T10:30:00.000Z",
            "updated_at": "2024-01-15T10:30:00.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total_count": 45,
        "total_pages": 3,
        "has_next": true,
        "has_prev": false
    },
    "meta": {
        "request_id": "550e8400-e29b-41d4-a716-446655440000",
        "timestamp": "2024-01-15T10:30:00.000Z"
    }
}
```
