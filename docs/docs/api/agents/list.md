---
title: List Agents
---

# List Agents

`GET /v1/agents`

## Request

```bash
curl https://api.flowmaestro.ai/v1/agents \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Response

```json
{
    "success": true,
    "data": [
        {
            "id": "agent_abc123",
            "name": "Support Assistant",
            "model": "gpt-4",
            "status": "active",
            "createdAt": "2024-01-15T10:30:00Z"
        }
    ]
}
```
