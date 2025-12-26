---
title: Update Workflow
---

# Update Workflow

`PATCH /v1/workflows/{id}`

## Request

```bash
curl -X PATCH https://api.flowmaestro.ai/v1/workflows/wf_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Workflow Name",
    "status": "active"
  }'
```

## Response

```json
{
    "success": true,
    "data": {
        "id": "wf_abc123",
        "name": "Updated Workflow Name",
        "status": "active",
        "updatedAt": "2024-01-20T14:22:00Z"
    }
}
```
