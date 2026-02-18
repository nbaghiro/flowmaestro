---
sidebar_position: 7
title: Using Personas
---

# Using Personas

Execute structured AI tasks with built-in approval workflows.

## What We're Building

A persona-based workflow that:

- Gathers structured inputs
- Follows a defined SOP
- Produces specific deliverables
- Requires approval at checkpoints

## What are Personas?

Personas are **pre-configured AI specialists** designed for specific tasks. Unlike open-ended chat agents, personas:

| Feature  | Agents        | Personas             |
| -------- | ------------- | -------------------- |
| Input    | Freeform chat | Structured fields    |
| Output   | Conversation  | Defined deliverables |
| Process  | Dynamic       | SOP-based            |
| Approval | Optional      | Built-in checkpoints |

## Step 1: Browse Available Personas

1. Navigate to **Personas** in the sidebar
2. Browse by category:
    - **Research** — Market research, competitor analysis
    - **Content** — Blog posts, social media, documentation
    - **Development** — Code review, architecture, testing
    - **Data** — Analysis, reporting, visualization
    - **Business** — Strategy, proposals, planning

## Step 2: Select a Persona

For this guide, we'll use **Blog Post Writer**:

```typescript
{
  name: "Blog Post Writer",
  category: "content",
  description: "Creates engaging blog posts from topic briefs",
  model: "claude-sonnet-4-5"
}
```

## Step 3: Start a New Task

1. Click **Run Task**
2. Fill in the structured inputs:

| Field           | Type      | Example                                |
| --------------- | --------- | -------------------------------------- |
| Topic           | text      | "Introduction to RAG"                  |
| Target Audience | select    | "Technical developers"                 |
| Tone            | select    | "Professional but approachable"        |
| Word Count      | number    | 1500                                   |
| Key Points      | multiline | "What RAG is, How it works, Use cases" |
| Reference URLs  | url_list  | "https://docs.example.com/rag"         |

<!-- Screenshot: Persona input form -->

## Step 4: Monitor Progress

The persona follows its SOP:

```
✓ Step 1: Research topic and references
✓ Step 2: Create outline
→ Step 3: Write first draft (in progress)
○ Step 4: Review and revise
○ Step 5: Final polish
```

Each step shows:

- Status (pending, in progress, complete)
- Time spent
- Output preview

## Step 5: Review at Checkpoints

At approval checkpoints, the persona pauses:

```
Checkpoint: Outline Review

The outline is ready for your review:

1. Introduction - What is RAG?
2. The Problem with Traditional LLMs
3. How RAG Works
   3.1 Retrieval
   3.2 Augmentation
   3.3 Generation
4. Implementation Examples
5. Best Practices
6. Conclusion

[Approve] [Request Changes] [Cancel]
```

**Options:**

- **Approve** — Continue to next step
- **Request Changes** — Provide feedback, persona revises
- **Cancel** — Stop the task

## Step 6: Receive Deliverables

When complete, access your outputs:

```typescript
{
    deliverables: [
        {
            type: "document",
            name: "blog-post-rag-intro.md",
            format: "markdown"
        },
        {
            type: "document",
            name: "social-snippets.txt",
            format: "text"
        },
        {
            type: "summary",
            name: "seo-keywords.json",
            format: "json"
        }
    ];
}
```

Download or copy each deliverable as needed.

## Approval Workflows

### Approval Levels

| Level         | Behavior                          |
| ------------- | --------------------------------- |
| `none`        | Runs autonomously to completion   |
| `checkpoints` | Pauses at defined review points   |
| `all_steps`   | Requires approval after each step |

### Setting Approval Level

When starting a task:

```typescript
{
  approvalLevel: "checkpoints",
  notifyOn: ["checkpoint", "completion"],
  notifyChannels: ["email", "slack"]
}
```

### Responding to Approvals

Approvals can be handled via:

1. **Dashboard** — Click notification, review, approve
2. **Email** — Reply with "Approved" or feedback
3. **Slack** — Use button actions in message
4. **API** — Programmatically approve

```bash
POST /api/personas/tasks/{taskId}/approve
{
  "decision": "approved",
  "feedback": "Looks good, proceed."
}
```

## Cost Tracking

Monitor resource usage:

```typescript
{
  task: "Blog Post Writer - RAG Introduction",
  cost: {
    tokens: 45000,
    credits: 12.5,
    estimatedUsd: 0.45
  },
  duration: "18 minutes"
}
```

Set cost limits when starting tasks:

```typescript
{
  costLimits: {
    maxCredits: 50,
    maxDuration: "1 hour",
    pauseOnLimit: true  // Pause instead of fail
  }
}
```

## Example: Research Report

Using the **Market Research** persona:

**Inputs:**

```typescript
{
  company: "Acme Corp",
  industry: "SaaS",
  researchAreas: ["Market size", "Competitors", "Trends"],
  depth: "comprehensive",
  sources: ["public_data", "news", "reports"]
}
```

**SOP Steps:**

1. Gather company background
2. Analyze market landscape
3. Identify key competitors
4. Research industry trends
5. Synthesize findings
6. Generate report

**Checkpoints:**

- After competitor analysis (verify competitors)
- Before final report (review draft)

**Deliverables:**

- Market research report (PDF)
- Competitor comparison table (spreadsheet)
- Key insights summary (document)

## Creating Custom Personas

Build your own personas:

1. Go to **Personas** > **Create Persona**
2. Define inputs, SOP, and deliverables
3. Configure approval checkpoints
4. Test with sample tasks
5. Share with your team

See [Creating Personas](../personas/creating-personas) for details.

## Best Practices

### Input Design

- Use specific field types (select vs freeform)
- Provide helpful descriptions
- Set sensible defaults
- Mark required vs optional fields

### SOP Design

- Break work into clear steps
- Add checkpoints at decision points
- Include time estimates
- Handle edge cases

### Approval Strategy

- More checkpoints = more control, slower
- Fewer checkpoints = faster, less oversight
- Match approval level to task criticality

## Troubleshooting

| Issue                    | Solution                               |
| ------------------------ | -------------------------------------- |
| Task stuck at checkpoint | Check notifications, approve or cancel |
| Cost exceeded            | Increase limit or optimize persona     |
| Poor quality output      | Refine inputs, add examples            |
| Persona not finding info | Add reference URLs or documents        |

## Next Steps

- [Creating Personas](../personas/creating-personas) — Build custom personas
- [Persona reference](../personas/) — All available personas
- [Using Personas](../personas/using-personas) — Complete persona workflow guide
