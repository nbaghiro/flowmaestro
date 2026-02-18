---
sidebar_position: 3
title: Running Workflows
---

# Running Workflows from the Extension

Execute your FlowMaestro workflows on any webpage. The extension automatically maps page context to workflow inputs for seamless automation.

## Opening Workflows

1. Click the FlowMaestro extension icon
2. Select the **Workflows** tab
3. Browse or search your workflows

<!-- Screenshot: Workflows tab with workflow list -->

## Workflow Organization

### Pinned Workflows

Your most-used workflows for quick access:

- Click the pin icon to add a workflow
- Pinned workflows appear at the top
- Reorder by dragging

### Recent Workflows

Workflows you've run recently, sorted by last use.

### All Workflows

Search and browse your complete workflow library:

```
[Search workflows...]

Marketing
  ├── Social Post Generator
  ├── Blog Outline Creator
  └── SEO Analyzer

Research
  ├── Competitor Analysis
  └── Content Summarizer

Support
  ├── Ticket Creator
  └── Response Generator
```

## Selecting a Workflow

Click a workflow to select it. The panel shows:

- **Workflow name** and description
- **Input fields** detected from the workflow
- **Context toggles** for page data
- **Run button** to execute

<!-- Screenshot: Selected workflow with inputs -->

## Page Context Toggles

Control what page data is included:

| Toggle         | What's Included                                 |
| -------------- | ----------------------------------------------- |
| **Page Text**  | Visible text content, metadata, structured data |
| **Screenshot** | Current viewport as image                       |

Toggle both off to run the workflow without any page context.

## Input Mapping

The extension automatically maps page context to workflow inputs:

### Automatic Mapping

| Workflow Input Type  | Mapped From                   |
| -------------------- | ----------------------------- |
| URL inputs           | Current page URL              |
| Text/textarea inputs | Visible text or selected text |
| File inputs (text)   | Page content as text file     |
| Image inputs         | Screenshot (if enabled)       |

### Example

Workflow with these inputs:

```typescript
{
    inputs: [
        { name: "url", type: "url" },
        { name: "content", type: "textarea" },
        { name: "screenshot", type: "image" }
    ];
}
```

Automatic mapping:

```typescript
{
  url: "https://example.com/article",
  content: "[Extracted page text...]",
  screenshot: "[Screenshot data URL]"
}
```

### Manual Override

Edit any auto-filled input before running:

1. Click the input field
2. Modify the value
3. Your changes override the auto-mapping

## Running a Workflow

1. Select your workflow
2. Toggle page context options
3. Review/edit input values
4. Click **Run Workflow**

### Execution Status

The panel shows real-time status:

```
Running: Content Summarizer
━━━━━━━━━━━━░░░░░░░░ 45%

Current step: Analyzing content structure...
```

### Results

When complete, view the results:

<!-- Screenshot: Workflow results in extension -->

**Result types:**

| Output | Display                        |
| ------ | ------------------------------ |
| Text   | Inline with copy button        |
| JSON   | Formatted with expand/collapse |
| Files  | Download links                 |
| URLs   | Clickable links                |

## Use Cases

### Content Summarization

1. Navigate to an article
2. Run "Content Summarizer" workflow
3. Get key points and summary

### Competitor Analysis

1. Visit competitor's product page
2. Run "Feature Extractor" workflow
3. Get structured feature list

### Bug Reporting

1. Encounter a bug
2. Toggle screenshot on
3. Run "Bug Report Creator" workflow
4. Get formatted bug report with context

### Lead Research

1. View a company's website
2. Run "Company Research" workflow
3. Get enriched company data

### Social Post Generation

1. Read an interesting article
2. Run "Social Post Generator" workflow
3. Get ready-to-publish posts

## Best Practices

### Choose the Right Workflow

- Use workflows designed for web content
- Check input requirements before running
- Consider if screenshot is needed

### Optimize Context

- Select specific text for focused analysis
- Toggle off screenshot for text-only workflows
- Wait for dynamic content to load

### Handle Results

- Copy results directly to clipboard
- Open links in new tabs
- Download files as needed

## Troubleshooting

### Workflow Not Listed

**Cause:** Workflow is in a different workspace
**Solution:** Switch workspaces from the header

### Inputs Not Mapping

**Cause:** Input types don't match page context
**Solution:** Manually enter values or adjust workflow inputs

### Execution Fails

**Cause:** Various (network, permissions, errors)
**Solution:**

1. Check the error message
2. Verify required connections are set up
3. Try running from the main FlowMaestro dashboard

### Slow Execution

**Cause:** Complex workflow or large page context
**Solution:**

1. Use selected text instead of full page
2. Disable screenshot if not needed
3. Check workflow timeout settings

## API Access

Run workflows programmatically from the extension:

```javascript
// From the extension's content script context
chrome.runtime.sendMessage(
    {
        type: "EXECUTE_WORKFLOW",
        payload: {
            workflowId: "wf_abc123",
            includePageText: true,
            includeScreenshot: false
        }
    },
    (response) => {
        if (response.success) {
            console.log("Results:", response.outputs);
        } else {
            console.error("Error:", response.error);
        }
    }
);
```

This enables building custom browser automations on top of FlowMaestro workflows.
