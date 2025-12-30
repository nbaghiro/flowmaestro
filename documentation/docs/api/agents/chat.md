---
title: Chat with Agent
---

# Chat with Agent

`POST /v1/agents/{id}/chat`

## Request

```bash
curl -X POST https://api.flowmaestro.ai/v1/agents/agent_abc123/chat \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is my order status?",
    "threadId": "thread_xyz789"
  }'
```

## Response

```json
{
    "success": true,
    "data": {
        "messageId": "msg_123",
        "threadId": "thread_xyz789",
        "response": "I'd be happy to help! Could you provide your order number?",
        "usage": {
            "promptTokens": 150,
            "completionTokens": 45
        }
    }
}
```

## Streaming

For streaming responses:

```bash
curl -X POST https://api.flowmaestro.ai/v1/agents/agent_abc123/chat/stream \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is my order status?"}'
```

Returns Server-Sent Events stream.
