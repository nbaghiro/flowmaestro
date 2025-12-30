---
title: Delete Workflow
---

# Delete Workflow

`DELETE /v1/workflows/{id}`

## Request

```bash
curl -X DELETE https://api.flowmaestro.ai/v1/workflows/wf_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Response

```json
{
    "success": true,
    "data": {
        "id": "wf_abc123",
        "deleted": true
    }
}
```

:::warning
Deleting a workflow also deletes all associated triggers and execution history.
:::
