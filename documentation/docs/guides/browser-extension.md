---
sidebar_position: 8
title: Browser Extension Quick Start
---

# Browser Extension Quick Start

Run workflows and chat with agents using page context.

## What You'll Learn

- Install and authenticate the extension
- Run workflows with page data
- Chat with agents about any webpage
- Use screenshots and page content

## Step 1: Install the Extension

1. Open Chrome Web Store
2. Search for "FlowMaestro"
3. Click **Add to Chrome**
4. Confirm the installation

The FlowMaestro icon appears in your toolbar.

<!-- Screenshot: Extension icon in Chrome toolbar -->

## Step 2: Authenticate

1. Click the FlowMaestro icon
2. Click **Sign In**
3. Enter your FlowMaestro credentials
4. Authorize the extension

You're now connected to your workspace.

## Step 3: Run Your First Workflow

### Select a Workflow

1. Click the extension icon
2. Go to the **Workflows** tab
3. Browse or search for a workflow
4. Click to select it

### Include Page Context

Toggle what to include:

| Option         | Description              |
| -------------- | ------------------------ |
| **URL**        | Current page URL         |
| **Title**      | Page title               |
| **Content**    | Extracted text content   |
| **Screenshot** | Visible viewport capture |
| **Metadata**   | Open Graph, meta tags    |

### Execute

1. Fill in any additional inputs
2. Click **Run Workflow**
3. View results in the panel

## Step 4: Chat with an Agent

### Start a Conversation

1. Click the extension icon
2. Go to the **Agents** tab
3. Select an agent
4. Type your message

### Use Page Context

The agent automatically sees:

```
I'm looking at: https://example.com/product/123
Page title: Product Details - Widget Pro

[You can ask me about this page]
```

**Example conversation:**

```
You: Summarize this product page

Agent: This page describes Widget Pro, a productivity tool with:
- Real-time collaboration
- 50+ integrations
- Enterprise security
- Starting at $10/month

Key features highlighted are the API access and
custom workflow builder.
```

## Use Cases

### Research & Analysis

```
You: What are the main points in this article?

Agent: [Analyzes page content]
The article discusses three main topics:
1. Market trends in AI adoption
2. Challenges for enterprise implementation
3. Recommended best practices

Key statistics mentioned: 67% adoption rate,
3x productivity gains...
```

### Data Extraction

Run a workflow to extract structured data:

```typescript
// Workflow extracts from page
{
  trigger: "extension",
  inputs: {
    pageContent: "{{extension.content}}",
    pageUrl: "{{extension.url}}"
  },
  // Outputs structured JSON
}
```

### Content Generation

```
You: Write a tweet thread about this blog post

Agent: [Reads page content]
Here's a thread:

1/ Just read an insightful post on RAG systems...
2/ Key insight: Chunking strategy matters more than model choice...
3/ The author recommends starting with 1000-char chunks...
```

### Competitive Analysis

```
You: How does this pricing compare to our product?

Agent: [Accesses page and your knowledge base]
Comparing to your pricing:

| Feature | This Page | Your Product |
|---------|-----------|--------------|
| Base price | $29/mo | $25/mo |
| Users | 5 | 10 |
| Storage | 10GB | 25GB |

Your product offers better value on storage and
user seats...
```

## Page Context Details

### What's Captured

When you enable page context, the extension extracts:

| Data         | Description                    |
| ------------ | ------------------------------ |
| URL          | Full page URL                  |
| Title        | Document title                 |
| Meta tags    | Description, keywords, OG tags |
| Headings     | H1-H6 hierarchy                |
| Text content | Main body text                 |
| Tables       | Structured table data          |
| Lists        | Bullet and numbered lists      |
| Links        | Anchor text and URLs           |

### Screenshot Capture

Screenshots capture:

- Visible viewport only
- Current scroll position
- Rendered state (after JS)

Use for:

- Visual analysis
- Design review
- Error documentation

### Privacy

- Data sent only when you trigger action
- Not captured while browsing
- No persistent storage
- Respects page robots.txt

## Workflow Integration

### Mapping Extension Data

In your workflow, access extension data:

```typescript
{
  // Page URL
  pageUrl: "{{trigger.extension.url}}",

  // Page title
  pageTitle: "{{trigger.extension.title}}",

  // Extracted text
  pageContent: "{{trigger.extension.content}}",

  // Screenshot (base64)
  screenshot: "{{trigger.extension.screenshot}}",

  // Metadata
  metadata: "{{trigger.extension.metadata}}"
}
```

### Example: Lead Enrichment

1. Visit a LinkedIn profile
2. Click extension > Select "Lead Enrichment" workflow
3. Workflow extracts name, company, role
4. Creates/updates contact in HubSpot

### Example: Bug Report

1. Encounter a bug on your app
2. Click extension > Select "Bug Report" workflow
3. Screenshot + URL automatically captured
4. Creates Jira ticket with context

## Settings

Access extension settings:

1. Click extension icon
2. Click gear icon

### Options

| Setting           | Description                   |
| ----------------- | ----------------------------- |
| Default agent     | Agent to open by default      |
| Auto-capture      | What to capture automatically |
| Keyboard shortcut | Quick access hotkey           |
| Theme             | Light/dark/system             |

### Keyboard Shortcuts

| Shortcut       | Action             |
| -------------- | ------------------ |
| `Ctrl+Shift+F` | Open extension     |
| `Ctrl+Shift+S` | Capture screenshot |
| `Ctrl+Shift+R` | Run last workflow  |

Customize in Chrome: `chrome://extensions/shortcuts`

## Troubleshooting

| Issue                 | Solution                        |
| --------------------- | ------------------------------- |
| Extension not loading | Refresh page, check permissions |
| "Not authenticated"   | Click sign in, re-authorize     |
| Page content empty    | Some sites block extraction     |
| Screenshot blank      | Try scrolling, wait for load    |
| Workflow not found    | Check workspace permissions     |

### Site Restrictions

Some sites block content extraction:

- Banking and financial sites
- Sites with strict CSP
- Paywalled content

For these, use screenshot capture instead.

## Next Steps

- [Page context details](../extension/page-context) — What data is captured
- [Extension workflows](../extension/workflows) — Build extension-triggered workflows
- [Agent chat](../extension/agent-chat) — Advanced agent interactions
