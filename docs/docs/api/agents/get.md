---
title: Get Agent
---

# Get Agent

`GET /v1/agents/{id}`

## Request

```bash
curl https://api.flowmaestro.ai/v1/agents/agent_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Response

```json
{
  "success": true,
  "data": {
    "id": "agent_abc123",
    "name": "Support Assistant",
    "model": "gpt-4",
    "systemPrompt": "You are a helpful customer support agent...",
    "tools": [...],
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```
