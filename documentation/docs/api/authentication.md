---
sidebar_position: 2
title: Authentication
---

# Authentication

All API requests require authentication via API key.

## Getting an API Key

1. Go to **Settings > API Keys** in the FlowMaestro dashboard
2. Click **Create API Key**
3. Name your key and select the required scopes
4. Copy the key immediately — it won't be shown again

## API Key Format

API keys use prefixes to identify their environment:

| Prefix     | Environment | Description             |
| ---------- | ----------- | ----------------------- |
| `fm_live_` | Production  | For production use      |
| `fm_test_` | Test        | For development/testing |

## Using Your API Key

You can authenticate using either method:

### X-API-Key Header (Recommended)

```bash
curl https://api.flowmaestro.ai/v1/workflows \
  -H "X-API-Key: fm_live_your_api_key"
```

### Authorization Bearer Header

```bash
curl https://api.flowmaestro.ai/v1/workflows \
  -H "Authorization: Bearer fm_live_your_api_key"
```

## API Key Scopes

Scopes control what operations an API key can perform:

### Workflow Scopes

| Scope               | Description            |
| ------------------- | ---------------------- |
| `workflows:read`    | List and get workflows |
| `workflows:execute` | Execute workflows      |

### Execution Scopes

| Scope               | Description                   |
| ------------------- | ----------------------------- |
| `executions:read`   | Read execution status/results |
| `executions:cancel` | Cancel running executions     |

### Agent Scopes

| Scope            | Description                    |
| ---------------- | ------------------------------ |
| `agents:read`    | List and get agents            |
| `agents:execute` | Execute agents (send messages) |

### Thread Scopes

| Scope           | Description               |
| --------------- | ------------------------- |
| `threads:read`  | Read conversation threads |
| `threads:write` | Create/update threads     |

### Trigger Scopes

| Scope              | Description               |
| ------------------ | ------------------------- |
| `triggers:read`    | List triggers             |
| `triggers:execute` | Execute triggers manually |

### Knowledge Base Scopes

| Scope                   | Description                  |
| ----------------------- | ---------------------------- |
| `knowledge-bases:read`  | List and get knowledge bases |
| `knowledge-bases:query` | Query (semantic search)      |

### Webhook Scopes

| Scope            | Description                   |
| ---------------- | ----------------------------- |
| `webhooks:read`  | List and get webhooks         |
| `webhooks:write` | Create/update/delete webhooks |

## Scope Bundles

Pre-defined scope collections for common use cases:

| Bundle                  | Included Scopes                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `workflow-executor`     | workflows:read, workflows:execute, executions:read, executions:cancel, triggers:read, triggers:execute |
| `agent-executor`        | agents:read, agents:execute, threads:read, threads:write                                               |
| `knowledge-base-reader` | knowledge-bases:read, knowledge-bases:query                                                            |
| `read-only`             | All read scopes                                                                                        |
| `full-access`           | All scopes                                                                                             |

## Managing API Keys

### Rotate a Key

Rotating a key revokes the old key and creates a new one:

1. Go to **Settings > API Keys**
2. Click the **Rotate** button on the key
3. Copy the new key immediately

### Revoke a Key

1. Go to **Settings > API Keys**
2. Click **Delete** on the key to revoke it

## Security Best Practices

:::warning
Never expose your API key in client-side code or public repositories.
:::

- **Store keys securely** — Use environment variables or secret managers
- **Use minimum scopes** — Only grant the permissions you need
- **Rotate regularly** — Rotate keys periodically for security
- **Monitor usage** — Check the "last used" timestamp in the dashboard
- **Set expiration** — Configure key expiration for temporary access
- **Use test keys** — Use `fm_test_` keys during development

## Error Responses

| HTTP Status | Error Code            | Description                         |
| ----------- | --------------------- | ----------------------------------- |
| 401         | `invalid_api_key`     | Missing or invalid API key          |
| 401         | `expired_api_key`     | API key has expired                 |
| 401         | `revoked_api_key`     | API key has been revoked            |
| 403         | `insufficient_scope`  | Missing required scope for endpoint |
| 429         | `rate_limit_exceeded` | Rate limit exceeded                 |
