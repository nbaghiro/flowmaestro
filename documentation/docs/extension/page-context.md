---
sidebar_position: 2
title: Page Context
---

# Page Context Extraction

The FlowMaestro extension extracts rich context from web pages to power your workflows and agent conversations. This page explains what data is captured and how to use it.

## What is Page Context?

Page context is structured data extracted from the current webpage, including:

- **Basic info** — URL, title, timestamp
- **Visible text** — Main content of the page
- **Metadata** — Description, keywords, Open Graph data
- **Structured data** — Tables, lists, forms, headings
- **User selection** — Any text you've highlighted

## Captured Data

### Basic Information

Always captured when extracting context:

```typescript
{
  url: "https://example.com/article",
  title: "10 Tips for Better Productivity",
  extractedAt: "2024-01-15T10:30:00Z",
  selectedText: "This is the text I highlighted"
}
```

### Metadata

Extracted from `<meta>` tags and Open Graph:

```typescript
{
  metadata: {
    description: "Learn productivity tips from experts...",
    keywords: ["productivity", "tips", "work"],
    author: "Jane Smith",
    publishedDate: "2024-01-10",
    ogImage: "https://example.com/article-image.jpg",
    ogTitle: "10 Productivity Tips",
    canonicalUrl: "https://example.com/article",
    faviconUrl: "https://example.com/favicon.ico"
  }
}
```

### Visible Text

The main content of the page, cleaned and normalized:

```typescript
{
    visibleText: `
    10 Tips for Better Productivity

    In this article, we'll explore proven strategies
    for improving your daily productivity...

    Tip 1: Start with the hardest task
    Research shows that tackling your most challenging
    task first leads to better outcomes...

    [Content continues...]
  `;
}
```

**Processing:**

- Scripts, styles, and hidden elements are removed
- Navigation, headers, and footers are excluded
- Whitespace is normalized
- Content is limited to 100,000 characters

### Structured Data

When enabled, the extension extracts structured elements:

#### Tables

```typescript
{
    tables: [
        {
            caption: "Pricing Comparison",
            headers: ["Plan", "Price", "Features"],
            rows: [
                ["Basic", "$10/mo", "5 users, 10GB"],
                ["Pro", "$25/mo", "25 users, 100GB"],
                ["Enterprise", "Custom", "Unlimited"]
            ]
        }
    ];
}
```

#### Lists

```typescript
{
    lists: [
        {
            type: "ordered",
            items: [
                "First step in the process",
                "Second step to complete",
                "Final step for success"
            ]
        },
        {
            type: "unordered",
            items: ["Feature A", "Feature B", "Feature C"]
        }
    ];
}
```

#### Forms

```typescript
{
    forms: [
        {
            fields: [
                {
                    name: "email",
                    label: "Email Address",
                    type: "email",
                    required: true
                },
                {
                    name: "plan",
                    label: "Select Plan",
                    type: "select",
                    options: ["Basic", "Pro", "Enterprise"]
                }
            ]
        }
    ];
}
```

**Note:** Password field values are never captured.

#### Headings

```typescript
{
    headings: [
        { level: 1, text: "10 Tips for Better Productivity" },
        { level: 2, text: "Tip 1: Start with the hardest task" },
        { level: 2, text: "Tip 2: Use time blocking" },
        { level: 3, text: "How to implement time blocking" }
    ];
}
```

## Screenshots

The extension can capture the visible viewport:

```typescript
{
  screenshot: {
    dataUrl: "data:image/png;base64,iVBORw0KGgo...",
    width: 1920,
    height: 1080
  }
}
```

**Use cases:**

- Visual analysis with AI vision models
- Documentation and reference
- Bug reports and design feedback
- Content verification

## Privacy & Security

### What's NOT Captured

- Password field values
- Hidden elements (`display: none`, `visibility: hidden`)
- Elements with `aria-hidden="true"`
- Screen reader-only content
- Scripts and stylesheets
- Content from `<nav>`, `<header>`, `<footer>` (for main content)

### Data Handling

- Content is transmitted encrypted (HTTPS)
- Data is sent directly to your FlowMaestro workspace
- No data is stored locally (except auth tokens)
- You control when content is captured

### Blocked Pages

The extension won't extract from:

- `chrome://` pages
- `chrome-extension://` pages
- Authentication pages (Google, Microsoft login)

## Using Page Context

### With Workflows

When running a workflow, toggle context options:

<!-- Screenshot: Workflow panel with context toggles -->

| Toggle         | Effect                       |
| -------------- | ---------------------------- |
| **Page Text**  | Include visible text content |
| **Screenshot** | Include viewport screenshot  |

The context is automatically mapped to workflow inputs:

- URL → URL-type inputs
- Text → Text/file inputs
- Screenshot → Image inputs

### With Agents

When chatting with an agent, toggle context options:

<!-- Screenshot: Agent chat with context toggles -->

Context is added to your message:

```
[User message]
---
Page Context:
URL: https://example.com/pricing
Title: Pricing - Example Corp
Content: [extracted text]
```

The agent can then reference and analyze the page content.

### With Knowledge Bases

Save pages to your knowledge base:

1. Select a knowledge base
2. Review the page preview
3. Click **Add to KB**

The page is:

1. Extracted (text, metadata)
2. Chunked for semantic search
3. Embedded and stored
4. Available for RAG queries

## Extraction Limits

To ensure performance:

| Data Type    | Limit              |
| ------------ | ------------------ |
| Visible Text | 100,000 characters |
| Tables       | 20 tables          |
| Lists        | 20 lists           |
| Forms        | 10 forms           |
| Headings     | 50 headings        |
| Table Rows   | 100 rows per table |
| List Items   | 50 items per list  |

## Optimizing Extraction

### Get Better Text

- Scroll to load all content (for infinite scroll pages)
- Wait for dynamic content to load
- Use reader mode for cleaner extraction

### Get Better Screenshots

- Scroll to the relevant section
- Close popups and banners
- Use full-page zoom if needed

### Get Selected Text Only

1. Highlight the text you want
2. The extension captures your selection
3. Selection is included in `selectedText` field

This is useful for:

- Summarizing specific paragraphs
- Analyzing particular data
- Quoting exact content

## Troubleshooting

### Empty or Partial Text

**Cause:** Dynamic content not loaded
**Solution:** Wait for page to fully load, scroll to trigger lazy loading

### Missing Tables/Lists

**Cause:** Non-standard HTML structure
**Solution:** Content may be rendered as styled divs instead of semantic elements

### Blocked Page

**Cause:** Page is on the blocked list or uses restricted permissions
**Solution:** Copy content manually if needed

### Large Pages Slow

**Cause:** Extracting from content-heavy pages
**Solution:** Use selected text for specific sections
