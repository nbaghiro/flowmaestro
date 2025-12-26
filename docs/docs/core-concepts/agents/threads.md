---
sidebar_position: 3
title: Threads
---

# Threads

Threads are individual conversations with an agent.

## What is a Thread?

A thread represents a single conversation session containing:

- **Messages** — The back-and-forth between user and agent
- **Context** — Memory and state for this conversation
- **Metadata** — Custom data you attach

## Managing Threads

### Creating Threads

```bash
curl -X POST https://api.flowmaestro.ai/agents/{agentId}/threads \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"metadata": {"userId": "user_123"}}'
```

### Sending Messages

```bash
curl -X POST https://api.flowmaestro.ai/threads/{threadId}/messages \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content": "What is my order status?"}'
```

## Thread Metadata

Attach custom data to threads for filtering and context:

```json
{
    "metadata": {
        "userId": "user_123",
        "orderId": "order_456",
        "channel": "website"
    }
}
```

:::tip
Use metadata to track conversations by user, order, or any custom dimension.
:::
