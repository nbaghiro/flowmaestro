---
sidebar_position: 2
title: Webhooks
---

# Webhooks

Webhooks are HTTP endpoints that trigger your workflows when called.

## Creating a Webhook

1. Drag a **Webhook Trigger** node onto your workflow canvas
2. Configure settings (allowed methods, authentication)
3. Save your workflow — webhook URL is generated automatically

## Webhook URL

```
https://api.flowmaestro.ai/webhooks/{workflowId}
```

## Request Handling

```javascript
// Body (for POST/PUT/PATCH)
{
    {
        trigger.body;
    }
}
{
    {
        trigger.body.fieldName;
    }
}

// Query parameters
{
    {
        trigger.query.paramName;
    }
}

// Headers
{
    {
        trigger.headers.authorization;
    }
}
```

## Authentication

### API Key

```bash
curl -X POST https://api.flowmaestro.ai/webhooks/xxx \
  -H "X-API-Key: your-webhook-key"
```

### Signature Verification

Verify webhook authenticity with HMAC signatures.

## Testing

```bash
curl -X POST https://api.flowmaestro.ai/webhooks/xxx \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```
