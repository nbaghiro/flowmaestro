---
title: Get Workflow
---

# Get Workflow

`GET /v1/workflows/{id}`

## Request

```bash
curl https://api.flowmaestro.ai/v1/workflows/wf_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Response

```json
{
  "success": true,
  "data": {
    "id": "wf_abc123",
    "name": "Customer Onboarding",
    "status": "active",
    "definition": {
      "nodes": [...],
      "edges": [...]
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```
