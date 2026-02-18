---
sidebar_position: 1
title: Browser Extension
---

# FlowMaestro Browser Extension

The FlowMaestro Chrome extension brings workflows, agents, and knowledge bases directly into your browser. Run automations on any webpage, chat with AI agents using page context, and save web content to your knowledge bases.

<!-- Screenshot: Extension side panel on a webpage -->

## Features

- **Run workflows** on any webpage with automatic context extraction
- **Chat with agents** and include page content in conversations
- **Save pages** to knowledge bases for future reference
- **Screenshot capture** for visual AI analysis
- **Multi-workspace** support for team use

## Installation

### Chrome Web Store

1. Visit the [FlowMaestro Extension](https://chrome.google.com/webstore/detail/flowmaestro) page
2. Click **Add to Chrome**
3. Confirm the installation
4. Click the FlowMaestro icon in your toolbar

### Manual Installation (Development)

1. Download the extension from your FlowMaestro dashboard
2. Go to `chrome://extensions` in Chrome
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the extension folder

## Authentication

### Initial Setup

1. Click the FlowMaestro extension icon
2. Click **Sign In**
3. You'll be redirected to FlowMaestro's login page
4. Sign in with your account
5. Authorize the extension

The extension stores your authentication securely and refreshes tokens automatically.

### OAuth Support

The extension supports multiple sign-in methods:

- Email and password
- Google OAuth
- Microsoft OAuth
- Two-factor authentication (2FA)

### Switching Workspaces

If you have access to multiple workspaces:

1. Click the workspace name in the sidebar header
2. Select a different workspace
3. Your workflows, agents, and KBs will refresh

## Side Panel Interface

The extension uses Chrome's side panel for a non-intrusive experience:

<!-- Screenshot: Side panel with all three tabs -->

### Opening the Panel

- Click the FlowMaestro icon in your toolbar
- Or use the keyboard shortcut (configurable)
- Or right-click and select "Open FlowMaestro"

### Tabs

| Tab                | Purpose                         |
| ------------------ | ------------------------------- |
| **Agents**         | Chat with AI agents             |
| **Workflows**      | Run workflows with page context |
| **Knowledge Base** | Save pages to your KBs          |

## Permissions

The extension requests these permissions:

| Permission  | Purpose                          |
| ----------- | -------------------------------- |
| `activeTab` | Access current tab content       |
| `storage`   | Save authentication and settings |
| `sidePanel` | Display the side panel interface |
| `scripting` | Extract page content             |

### Privacy

- The extension only accesses page content when you explicitly request it
- Page data is sent directly to FlowMaestro servers (encrypted)
- No data is stored locally except authentication tokens
- You control what content is shared in each operation

## Settings

Access settings from the extension menu:

### API Endpoint

For self-hosted deployments:

```
API URL: https://your-flowmaestro-instance.com
```

### Default Tab

Choose which tab opens first:

- Agents (default)
- Workflows
- Knowledge Base

### Blocked Domains

Some domains are blocked for security:

- `accounts.google.com`
- `login.microsoftonline.com`
- Other authentication pages

## Keyboard Shortcuts

Configure shortcuts in Chrome:

1. Go to `chrome://extensions/shortcuts`
2. Find FlowMaestro
3. Set your preferred shortcuts

Suggested shortcuts:

- Open extension: `Ctrl+Shift+F` (Windows) / `Cmd+Shift+F` (Mac)
- Run last workflow: `Ctrl+Shift+R`

## Troubleshooting

### Extension Not Loading

1. Refresh the page
2. Check if Chrome is up to date
3. Disable and re-enable the extension
4. Clear extension storage and re-authenticate

### Authentication Issues

1. Sign out and sign back in
2. Clear browser cookies for FlowMaestro
3. Check if 2FA is required
4. Verify your account is active

### Page Context Not Extracting

Some pages block content extraction:

- PDFs viewed in browser
- Protected/DRM content
- Some single-page applications
- Browser internal pages (chrome://)

### Slow Performance

1. Reduce page text extraction size
2. Disable screenshot capture if not needed
3. Close other resource-heavy extensions

## What's Next

- [Learn about page context extraction](./page-context)
- [Run workflows from the extension](./workflows)
- [Chat with agents](./agent-chat)
