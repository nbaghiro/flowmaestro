---
sidebar_position: 3
title: Using Personas
---

# Using Personas

Learn how to run persona tasks effectively, manage approvals, track progress, and collect deliverables.

## Running a Persona Task

### 1. Select a Persona

Browse the persona gallery and choose one that matches your task:

<!-- Screenshot: Persona gallery with categories -->

### 2. Fill Structured Inputs

Complete the required fields:

<!-- Screenshot: Persona input form -->

Each persona has specific inputs tailored to its task. Fields may include:
- Text inputs for names, descriptions
- Selections for options and preferences
- Tags for topics or keywords
- File uploads for reference materials
- URLs for external resources

### 3. Configure Execution

Set limits for the task:

| Setting | Description | Recommendation |
|---------|-------------|----------------|
| **Max Duration** | Maximum hours to run | Start with persona's estimate |
| **Max Cost** | Maximum credits to spend | 2-3x estimated cost |
| **Autonomy Level** | Approval requirements | `approve_high_risk` for new personas |

### 4. Connect Integrations

If the persona requires external tools, connect them:

<!-- Screenshot: Connection requirements panel -->

Required connections must be set up before running. Optional connections enhance capabilities but aren't mandatory.

### 5. Launch

Click **Start Task** to begin execution.

## Monitoring Progress

### Progress Dashboard

Track your persona task in real-time:

<!-- Screenshot: Persona progress dashboard -->

The dashboard shows:
- **Current step** — Which SOP step is active
- **Progress bar** — Visual completion percentage
- **Cost tracker** — Credits consumed so far
- **Duration** — Time elapsed
- **Activity log** — Detailed actions taken

### SOP Progress

Each SOP step has a status:

| Status | Description |
|--------|-------------|
| Pending | Not yet started |
| In Progress | Currently executing |
| Completed | Successfully finished |
| Skipped | Bypassed (not applicable) |

```
Step Progress:
[x] 1. Review project requirements
[x] 2. Analyze code repository
[>] 3. Identify API endpoints      <- Current step
[ ] 4. Document schemas
[ ] 5. Write authentication guide
[ ] 6. Create code examples
[ ] 7. Generate summary
[ ] 8. Final review
```

### Activity Log

Real-time log of persona actions:

```
10:32:15 - Started task: Q4 Competitive Analysis
10:32:18 - Step 1: Reviewing project requirements
10:32:45 - Searched web for "Acme Corp company info"
10:33:12 - Found 15 relevant results
10:33:30 - Step 2: Analyzing public information
10:34:15 - Scraped website: acmecorp.com
10:35:02 - Extracted pricing information
10:35:30 - [APPROVAL NEEDED] Request to access LinkedIn data
```

### Real-Time Messages

View the conversation between you and the persona:

```
Persona: I've completed the initial research phase. I found that Acme Corp
         recently launched three new products. Should I focus on all three,
         or would you like me to prioritize specific ones?

You:     Focus on their enterprise product line, specifically the API offering.

Persona: Understood. I'll focus the competitive analysis on their enterprise
         API products. Moving to the detailed feature comparison...
```

## Approval Workflows

### How Approvals Work

When `autonomyLevel` is set to `approve_high_risk` or `approve_all`, the persona pauses for certain actions:

1. Persona identifies an action requiring approval
2. Task pauses with status `waiting_approval`
3. You receive a notification (email, Slack, etc.)
4. You review and approve or reject
5. Persona continues or adjusts based on your decision

### Approval Requests

Approval requests include:

```typescript
{
  action: "github:create_issue",
  description: "Create GitHub issue for documentation gaps",
  parameters: {
    repository: "acme/api-docs",
    title: "Missing endpoint documentation",
    body: "The following endpoints need documentation..."
  },
  risk: "medium",
  reasoning: "This will create a visible issue in your repository"
}
```

### Responding to Approvals

You have three options:

| Action | Description |
|--------|-------------|
| **Approve** | Allow the action to proceed |
| **Reject** | Deny the action, persona will find alternative |
| **Modify** | Change parameters before approving |

<!-- Screenshot: Approval dialog with options -->

### Notification Channels

Configure where you receive approval requests:

```typescript
{
  notificationConfig: {
    onApprovalNeeded: true,
    onCompletion: true,
    slackChannelId: "C12345678"  // Optional Slack notifications
  }
}
```

## Completion

### Task Status

Tasks complete with one of these statuses:

| Status | Description |
|--------|-------------|
| `completed` | Successfully finished with all deliverables |
| `max_duration` | Hit time limit |
| `max_cost` | Hit credit limit |
| `cancelled` | Manually cancelled |
| `failed` | Encountered unrecoverable error |
| `user_completed` | User marked as done early |

### Deliverables

When a task completes, collect your deliverables:

<!-- Screenshot: Deliverables panel with download buttons -->

Each deliverable includes:
- **Preview** — View content inline
- **Download** — Save to your device
- **Copy** — Copy content to clipboard
- **Send** — Export to connected services

### Deliverable Types

| Type | Format | Actions |
|------|--------|---------|
| `markdown` | .md | Preview, Download, Copy |
| `csv` | .csv | Preview, Download |
| `json` | .json | Preview, Download, Copy |
| `pdf` | .pdf | Preview, Download |
| `code` | Various | Preview, Download, Copy |
| `image` | .png/.jpg | Preview, Download |
| `html` | .html | Preview, Download |

## Cost Tracking

### Credits

Persona tasks consume credits based on:
- LLM tokens (input and output)
- Tool calls (web search, integrations)
- File processing (documents, images)

### Cost Breakdown

```
Task: Q4 Competitive Analysis
Duration: 45 minutes
Total Cost: 67 credits

Breakdown:
- LLM (Claude Sonnet): 42 credits
  - Input: 125,000 tokens
  - Output: 18,000 tokens
- Web Search: 12 credits (8 searches)
- Website Scraping: 8 credits (4 pages)
- Document Generation: 5 credits
```

### Cost Controls

Prevent runaway costs with limits:

```typescript
{
  maxCostCredits: 100,      // Hard cap
  warningThreshold: 80,     // Alert at 80%
  pauseOnWarning: true      // Pause for confirmation
}
```

## Advanced Usage

### Providing Additional Context

Beyond structured inputs, you can provide:

**Knowledge Bases:**
Link relevant knowledge bases for the persona to reference:

```typescript
{
  additionalContext: {
    knowledgeBases: ["kb_company_docs", "kb_competitors"]
  }
}
```

**Files:**
Upload reference documents:

```typescript
{
  additionalContext: {
    files: [
      { name: "brand_guidelines.pdf", url: "..." },
      { name: "previous_analysis.md", url: "..." }
    ]
  }
}
```

**URLs:**
Provide web pages for context:

```typescript
{
  additionalContext: {
    urls: [
      "https://competitor.com/pricing",
      "https://docs.competitor.com/api"
    ]
  }
}
```

### Interacting During Execution

For personas with `approve_high_risk` or `approve_all`, you can:

1. **Provide guidance** — Answer questions and clarify requirements
2. **Redirect focus** — Adjust priorities mid-task
3. **Skip steps** — Mark steps as not needed
4. **Add information** — Provide additional context as needed

### Early Completion

If you're satisfied with partial results:

1. Click **Mark as Complete**
2. Confirm you want to stop execution
3. Deliverables generated so far are saved

This is useful when:
- You have what you need
- The task is taking longer than expected
- You want to iterate on partial results

### Resuming Tasks

If a task is paused (waiting for approval or input):

1. Go to **Personas** > **My Tasks**
2. Find the paused task
3. Provide the required input or approval
4. Task resumes automatically

## Best Practices

### Start with Estimates

Use the persona's estimated duration and cost as a baseline, then adjust based on your specific task complexity.

### Clear Inputs

Provide detailed, specific inputs:

```
Good: "Analyze Acme Corp's enterprise API pricing vs our $99/month plan,
       focusing on feature parity and value proposition for mid-market companies"

Poor: "Compare competitors"
```

### Iterative Approach

For complex tasks:
1. Start with a shorter duration limit
2. Review partial results
3. Run again with refinements if needed

### Monitor Actively

For important tasks:
- Watch the progress dashboard
- Respond to questions promptly
- Provide guidance when asked

### Review Deliverables

Always review generated content before using:
- Check factual accuracy
- Verify calculations
- Ensure brand/style alignment

## Troubleshooting

### Task Stuck

If a task isn't progressing:
1. Check for pending approvals
2. Verify connected services are working
3. Check if cost/duration limits are reached
4. Review activity log for errors

### Poor Quality Results

If deliverables aren't meeting expectations:
1. Provide more specific inputs
2. Add additional context (files, URLs)
3. Use `approve_all` to guide each step
4. Try a different persona for the task

### Connection Errors

If integrations fail:
1. Verify connections in Settings
2. Re-authenticate if needed
3. Check required permissions/scopes
4. Test connection independently
