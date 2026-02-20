---
sidebar_position: 1
title: Integrations Overview
---

# Integrations

Connect FlowMaestro to your favorite tools.

## How Integrations Work

1. **Connect** — Authenticate with OAuth or API key
2. **Configure** — Select which accounts/resources to access
3. **Use** — Add integration nodes to workflows or tools to agents

## Integration Capabilities

Integrations can be used in multiple ways:

| Capability                | Description                                    | Examples                       |
| ------------------------- | ---------------------------------------------- | ------------------------------ |
| **Workflow Nodes**        | Use in workflow automations                    | Send email, create task        |
| **Agent Tools**           | Give agents access to external services        | Search calendar, post to Slack |
| **Knowledge Base Import** | Import documents with optional continuous sync | Google Drive, Dropbox, Notion  |

### Document Import Integrations

Some integrations support importing documents into knowledge bases:

- **File storage**: Google Drive, Dropbox, OneDrive, Box
- **Knowledge tools**: Notion, Confluence

These integrations can:

- Browse and select files/pages
- Import entire folders
- Continuously sync changes
- Convert structured content (Notion pages) to searchable text

See [Knowledge Base Documents](../knowledge-bases/documents) for details.

## Integration Types

### OAuth Integrations

Most integrations use OAuth for secure authentication:

- Click "Connect" to authorize
- Grant specific permissions
- Tokens managed automatically

### API Key Integrations

Some integrations use API keys:

- Enter your API key in settings
- Keys stored securely encrypted

## Managing Connections

From the **Connections** page:

- View all connected accounts
- Add new connections
- Reconnect expired authorizations
- Remove connections

:::warning
Removing a connection will break any workflows using that integration.
:::
