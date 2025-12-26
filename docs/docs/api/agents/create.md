---
title: Create Agent
---

# Create Agent

`POST /v1/agents`

## Request

```bash
curl -X POST https://api.flowmaestro.ai/v1/agents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Support Assistant",
    "model": "gpt-4",
    "systemPrompt": "You are a helpful customer support agent..."
  }'
```

## Response

```json
{
    "success": true,
    "data": {
        "id": "agent_abc123",
        "name": "Support Assistant",
        "model": "gpt-4",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00Z"
    }
}
```
