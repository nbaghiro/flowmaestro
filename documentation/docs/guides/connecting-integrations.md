---
sidebar_position: 3
title: Connecting Integrations
---

# Connecting Integrations

Link your tools and services to FlowMaestro.

## Overview

FlowMaestro connects to 150+ services across categories:

| Category      | Examples                        |
| ------------- | ------------------------------- |
| Communication | Slack, Discord, Teams, Email    |
| CRM           | HubSpot, Salesforce, Pipedrive  |
| E-commerce    | Shopify, Stripe, WooCommerce    |
| Productivity  | Google Sheets, Notion, Airtable |
| Development   | GitHub, Jira, Linear            |

---

## Connection Methods

### OAuth Flow (Recommended)

Most integrations use OAuth for secure authentication:

1. Go to **Settings** > **Connections**
2. Click **Add Connection**
3. Select the provider (e.g., Slack)
4. Click **Connect**
5. Authorize in the provider's OAuth window
6. Grant requested permissions
7. Return to FlowMaestro

<!-- Screenshot: OAuth authorization window -->

**What happens during OAuth:**

- You're redirected to the provider's login
- You authorize FlowMaestro to access your account
- Provider sends back secure access tokens
- Tokens are encrypted and stored securely

### API Key Connections

Some services use API keys instead:

1. Go to **Settings** > **Connections**
2. Click **Add Connection**
3. Select the provider
4. Enter your API key
5. Click **Save**

**Getting your API key:**

| Provider  | Where to Find                       |
| --------- | ----------------------------------- |
| OpenAI    | platform.openai.com/api-keys        |
| Anthropic | console.anthropic.com/settings/keys |
| Stripe    | dashboard.stripe.com/apikeys        |
| SendGrid  | app.sendgrid.com/settings/api_keys  |
| Airtable  | airtable.com/account                |

**API Key Security:**

- Keys are encrypted at rest
- Never exposed in logs or UI
- Can be rotated without downtime

---

## Connecting Common Services

### Slack

1. Add **Slack** connection
2. Click **Connect**
3. Select your Slack workspace
4. Approve FlowMaestro app permissions

**Required scopes:**

- `chat:write` — Send messages
- `channels:read` — List channels
- `users:read` — Get user info

**Using in workflows:**

```typescript
{
  provider: "slack",
  operation: "send_message",
  connectionId: "conn_slack_main",
  parameters: {
    channel: "#alerts",
    message: "New order received: {{order.id}}"
  }
}
```

### HubSpot

1. Add **HubSpot** connection
2. Click **Connect**
3. Log in to your HubSpot account
4. Approve permissions

**Available operations:**

- `search_contacts` — Find contacts
- `create_contact` — Add new contact
- `update_deal` — Modify deals
- `add_note` — Add timeline notes

**Example: Create contact from form:**

```typescript
{
  provider: "hubspot",
  operation: "create_contact",
  connectionId: "conn_hubspot",
  parameters: {
    email: "{{trigger.body.email}}",
    firstname: "{{trigger.body.firstName}}",
    lastname: "{{trigger.body.lastName}}",
    company: "{{trigger.body.company}}"
  }
}
```

### GitHub

1. Add **GitHub** connection
2. Click **Connect**
3. Authorize FlowMaestro GitHub App
4. Select repositories to access

**Available operations:**

- `create_issue` — Open new issue
- `create_pr` — Create pull request
- `add_comment` — Comment on issue/PR
- `trigger_workflow` — Run GitHub Actions

### Google Sheets

1. Add **Google Sheets** connection
2. Click **Connect**
3. Sign in with Google
4. Allow access to Google Sheets

**Example: Append row:**

```typescript
{
  provider: "google_sheets",
  operation: "append_row",
  connectionId: "conn_google",
  parameters: {
    spreadsheetId: "1abc...",
    range: "Sheet1!A:D",
    values: [
      "{{trigger.body.name}}",
      "{{trigger.body.email}}",
      "{{trigger.body.phone}}",
      "{{now()}}"
    ]
  }
}
```

### Shopify

1. Add **Shopify** connection
2. Enter your store URL (e.g., `mystore.myshopify.com`)
3. Install the FlowMaestro app
4. Approve permissions

**Using in workflows:**

```typescript
{
  provider: "shopify",
  operation: "get_order",
  connectionId: "conn_shopify",
  parameters: {
    orderId: "{{trigger.body.orderId}}"
  }
}
```

---

## Multiple Connections

Connect multiple accounts from the same service:

1. Click **Add Connection** again
2. Give it a unique name (e.g., "Slack - Marketing Team")
3. Authorize the new account

**Use cases:**

- Different Slack workspaces
- Multiple Shopify stores
- Separate HubSpot portals

**Selecting connection in workflows:**

```typescript
{
  provider: "slack",
  connectionId: "conn_slack_marketing",  // Specific connection
  operation: "send_message",
  parameters: { ... }
}
```

---

## Testing Connections

### Connection Health Check

1. Go to **Settings** > **Connections**
2. Find your connection
3. Click **Test**
4. View test results

**Test checks:**

- Token validity
- API accessibility
- Required permissions

### Test in Workflow

1. Create a simple test workflow
2. Add an integration node
3. Configure with test parameters
4. Run and verify output

```typescript
// Test Slack connection
{
  provider: "slack",
  operation: "list_channels",
  connectionId: "conn_slack_main"
}
// Should return list of channels
```

---

## Troubleshooting

### Connection Issues

| Issue                 | Cause                    | Solution                     |
| --------------------- | ------------------------ | ---------------------------- |
| **Connection failed** | Missing permissions      | Reconnect with admin account |
| **Token expired**     | OAuth token expired      | Click **Reconnect**          |
| **Rate limited**      | Too many requests        | Add delays between calls     |
| **Invalid API key**   | Key revoked or wrong     | Generate new key             |
| **Missing scopes**    | Insufficient permissions | Reconnect, grant more scopes |

### Reconnecting

If a connection stops working:

1. Go to **Settings** > **Connections**
2. Find the problematic connection
3. Click **Reconnect**
4. Re-authorize in provider's OAuth flow

### Checking Permissions

Some operations require specific permissions:

**Slack:**

- Sending DMs needs `im:write`
- Posting in private channels needs channel membership

**GitHub:**

- Creating PRs needs write access
- Accessing private repos needs explicit approval

**HubSpot:**

- Creating contacts needs CRM permissions
- Sending emails needs marketing permissions

### Debug Mode

Enable verbose logging:

1. Go to workflow settings
2. Enable **Debug Mode**
3. Run the workflow
4. Check execution logs for API details

```
[DEBUG] Integration: slack.send_message
[DEBUG] Request: POST https://slack.com/api/chat.postMessage
[DEBUG] Response: 200 OK { ok: true, ts: "1234567890.123456" }
```

### Common Error Messages

| Error               | Meaning                | Fix                    |
| ------------------- | ---------------------- | ---------------------- |
| `invalid_auth`      | Bad or expired token   | Reconnect              |
| `channel_not_found` | Channel doesn't exist  | Check channel name     |
| `rate_limited`      | Too many requests      | Add retry with backoff |
| `missing_scope`     | Need more permissions  | Reconnect with scopes  |
| `not_found`         | Resource doesn't exist | Verify ID/name         |

---

## Security Best Practices

### Token Management

- Connections use encrypted token storage
- Tokens never exposed in logs
- Automatic token refresh when supported

### Least Privilege

- Only grant permissions you need
- Use separate connections for different purposes
- Regularly audit connected apps in providers

### Monitoring

- Review connection usage in dashboard
- Set up alerts for failed operations
- Rotate API keys periodically

---

## Next Steps

- [Available Integrations](../core-concepts/integrations/available) — All 150+ services
- [Using AI Nodes](./using-ai-nodes) — AI-powered workflows
- [Your First Workflow](./first-workflow) — Build a complete workflow
