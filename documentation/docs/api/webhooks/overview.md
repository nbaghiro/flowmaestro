---
sidebar_position: 1
title: Webhooks Overview
---

# Webhooks

Webhooks allow you to receive real-time notifications when events occur in FlowMaestro.

## How Webhooks Work

1. You create a webhook endpoint in your application
2. Register the webhook URL with FlowMaestro
3. When events occur, FlowMaestro sends HTTP POST requests to your endpoint
4. Your application processes the webhook payload

## Event Types

| Event                       | Description                   |
| --------------------------- | ----------------------------- |
| `execution.started`         | Workflow execution started    |
| `execution.completed`       | Workflow execution completed  |
| `execution.failed`          | Workflow execution failed     |
| `execution.cancelled`       | Workflow execution cancelled  |
| `thread.message.created`    | New message created in thread |
| `thread.message.completed`  | Agent response completed      |
| `thread.message.failed`     | Agent response failed         |
| `agent.execution.started`   | Agent execution started       |
| `agent.execution.completed` | Agent execution completed     |
| `agent.execution.failed`    | Agent execution failed        |

## Webhook Payload Format

```json
{
    "id": "delivery_abc123",
    "event": "execution.completed",
    "created_at": "2024-01-15T10:30:00.000Z",
    "data": {
        "execution_id": "exec_xyz789",
        "workflow_id": "wf_abc123",
        "status": "completed",
        "outputs": {
            "result": "success"
        }
    }
}
```

## Signature Verification

All webhooks include a signature header for verification:

- `X-FlowMaestro-Signature`: HMAC-SHA256 signature
- `X-FlowMaestro-Delivery-ID`: Unique delivery identifier

### Verifying Signatures

```javascript
const crypto = require("crypto");

function verifyWebhook(payload, signature, secret) {
    const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    return signature === `v1=${expectedSignature}`;
}

// In your webhook handler
app.post("/webhook", (req, res) => {
    const signature = req.headers["x-flowmaestro-signature"];
    const payload = JSON.stringify(req.body);

    if (!verifyWebhook(payload, signature, WEBHOOK_SECRET)) {
        return res.status(401).send("Invalid signature");
    }

    // Process the webhook
    console.log("Event:", req.body.event);
    res.status(200).send("OK");
});
```

## Retry Policy

Failed webhook deliveries are automatically retried:

- **Retries**: Up to 3 attempts
- **Backoff**: Exponential backoff between retries
- **Retryable errors**: 429 (rate limit), 5xx (server errors)

## Best Practices

1. **Always verify signatures** before processing webhooks
2. **Return 200 quickly** — process asynchronously if needed
3. **Handle duplicates** — webhooks may be delivered more than once
4. **Use idempotent operations** — design for safe retries
