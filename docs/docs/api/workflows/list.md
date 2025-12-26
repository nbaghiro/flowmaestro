---
title: List Workflows
---

# List Workflows

`GET /v1/workflows`

## Request

```bash
curl https://api.flowmaestro.ai/v1/workflows \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Response

```json
{
    "success": true,
    "data": [
        {
            "id": "wf_abc123",
            "name": "Customer Onboarding",
            "status": "active",
            "createdAt": "2024-01-15T10:30:00Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 45
    }
}
```
