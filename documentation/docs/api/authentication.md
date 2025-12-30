---
sidebar_position: 2
title: Authentication
---

# Authentication

All API requests require authentication via API key.

## Getting an API Key

1. Go to **Settings > API Keys**
2. Click **Create API Key**
3. Name your key
4. Copy the key immediately — it won't be shown again

## Using Your API Key

```bash
curl https://api.flowmaestro.ai/v1/workflows \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## API Key Scopes

| Scope               | Access                         |
| ------------------- | ------------------------------ |
| `workflows:read`    | Read workflow data             |
| `workflows:write`   | Create/update/delete workflows |
| `workflows:execute` | Execute workflows              |
| `agents:read`       | Read agent data                |
| `agents:write`      | Create/update/delete agents    |
| `agents:chat`       | Chat with agents               |

## Security Best Practices

:::warning
Never expose your API key in client-side code or public repositories.
:::

- Store keys in environment variables
- Use the minimum required scopes
- Rotate keys periodically
- Revoke unused keys

## Error Responses

| Code | Description                         |
| ---- | ----------------------------------- |
| 401  | Missing or invalid API key          |
| 403  | API key doesn't have required scope |
| 429  | Rate limit exceeded                 |
