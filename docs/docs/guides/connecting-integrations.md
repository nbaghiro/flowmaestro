---
sidebar_position: 3
title: Connecting Integrations
---

# Connecting Integrations

Link your tools to FlowMaestro.

## Connecting Slack

1. Go to **Settings > Connections**
2. Click **Add Connection** > **Slack**
3. Click **Connect** and authorize in Slack's OAuth flow
4. Select which workspace to connect

### Using Slack in Workflows

```javascript
{
  node: "Slack - Send Message",
  channel: "#general",
  message: "Hello from FlowMaestro!"
}
```

## Connecting Shopify

1. Add **Shopify** connection
2. Enter your store URL (e.g., `mystore.myshopify.com`)
3. Install the FlowMaestro app
4. Approve permissions

### Using Shopify in Workflows

```javascript
{
  node: "Shopify - Get Order",
  orderId: "{{trigger.body.orderId}}"
}
```

## Multiple Connections

Connect multiple accounts from the same service:

1. Click **Add Connection** again
2. Give it a unique name (e.g., "Slack - Marketing Team")
3. Authorize the new account

## Troubleshooting

- **Connection failed** — Check you have admin permissions
- **Token expired** — Click **Reconnect** in Connections
- **Missing permissions** — Reconnect to grant more scopes
