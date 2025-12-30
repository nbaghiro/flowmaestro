---
title: Create Workflow
---

# Create Workflow

`POST /v1/workflows`

## Request

```bash
curl -X POST https://api.flowmaestro.ai/v1/workflows \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Onboarding",
    "description": "Automated onboarding sequence"
  }'
```

## Response

```json
{
    "success": true,
    "data": {
        "id": "wf_abc123",
        "name": "Customer Onboarding",
        "status": "inactive",
        "createdAt": "2024-01-15T10:30:00Z"
    }
}
```
