---
sidebar_position: 1
title: Personas Overview
---

# Personas

Personas are pre-configured AI specialists designed for specific tasks. Unlike general-purpose agents, personas come with structured inputs, defined deliverables, and step-by-step processes (SOPs) that guide their work.

<!-- Screenshot: Personas gallery in the dashboard -->

## What Are Personas?

A persona is an AI worker optimized for a specific job. Each persona includes:

- **Structured inputs** — Defined fields for task requirements
- **Deliverables** — Guaranteed output formats
- **SOP steps** — Step-by-step process the AI follows
- **Tool integrations** — Pre-configured connections (GitHub, Slack, etc.)
- **Cost controls** — Duration and credit limits

Think of personas as expert consultants you can hire on-demand for specific tasks.

## Persona Categories

### Research

AI researchers that gather, analyze, and synthesize information:

| Persona                          | Description                                 |
| -------------------------------- | ------------------------------------------- |
| **Competitive Intel Analyst**    | Research competitors and market positioning |
| **Market Research Analyst**      | Analyze market trends and opportunities     |
| **Technical Research Assistant** | Deep-dive into technical topics             |
| **Academic Literature Reviewer** | Survey academic papers and studies          |

### Content

AI writers and creators for various content types:

| Persona                  | Description                              |
| ------------------------ | ---------------------------------------- |
| **Blog Post Writer**     | Create SEO-optimized blog content        |
| **Social Media Manager** | Generate posts and engagement strategies |
| **Technical Writer**     | Document features and create guides      |
| **Newsletter Editor**    | Curate and write email newsletters       |

### Development

AI developers for code and technical tasks:

| Persona                     | Description                                 |
| --------------------------- | ------------------------------------------- |
| **Code Reviewer**           | Review PRs for quality and best practices   |
| **DevOps Assistant**        | Help with CI/CD, infrastructure, monitoring |
| **Bug Hunter**              | Analyze codebases for potential issues      |
| **Documentation Generator** | Create API docs and code documentation      |

### Data

AI analysts for data processing and insights:

| Persona                  | Description                           |
| ------------------------ | ------------------------------------- |
| **Data Analyst**         | Analyze datasets and generate reports |
| **SQL Query Expert**     | Write and optimize database queries   |
| **Dashboard Designer**   | Design metrics and visualizations     |
| **Data Quality Auditor** | Identify and fix data issues          |

### Operations

AI assistants for business operations:

| Persona                      | Description                       |
| ---------------------------- | --------------------------------- |
| **Project Manager**          | Plan tasks and track progress     |
| **Meeting Summarizer**       | Transcribe and summarize meetings |
| **Process Optimizer**        | Analyze and improve workflows     |
| **Customer Success Manager** | Manage customer relationships     |

### Business

AI advisors for strategy and planning:

| Persona                 | Description                          |
| ----------------------- | ------------------------------------ |
| **Business Analyst**    | Create business cases and analyses   |
| **Proposal Writer**     | Draft business proposals and RFPs    |
| **Strategy Consultant** | Develop strategic recommendations    |
| **Financial Analyst**   | Analyze financial data and forecasts |

### Proposals

AI specialists for formal documents:

| Persona               | Description                       |
| --------------------- | --------------------------------- |
| **Grant Writer**      | Write grant applications          |
| **RFP Responder**     | Respond to requests for proposals |
| **Contract Reviewer** | Analyze and summarize contracts   |
| **Policy Writer**     | Draft policies and procedures     |

## Personas vs Agents

| Feature          | Personas                            | Agents                              |
| ---------------- | ----------------------------------- | ----------------------------------- |
| **Purpose**      | Specific tasks with defined outputs | General conversation and assistance |
| **Inputs**       | Structured fields with validation   | Free-form messages                  |
| **Outputs**      | Guaranteed deliverables             | Variable responses                  |
| **Process**      | Step-by-step SOP                    | Autonomous reasoning                |
| **Duration**     | Minutes to hours                    | Real-time                           |
| **Cost control** | Built-in limits                     | Manual monitoring                   |
| **Approvals**    | Configurable checkpoints            | Not applicable                      |
| **Best for**     | Complex, repeatable tasks           | Interactive help                    |

## Key Features

### Structured Inputs

Each persona defines required and optional inputs:

```typescript
{
    inputFields: [
        {
            name: "company_name",
            label: "Target Company",
            type: "text",
            required: true,
            placeholder: "e.g., Acme Corp"
        },
        {
            name: "focus_areas",
            label: "Research Focus",
            type: "multiselect",
            options: ["Pricing", "Features", "Marketing", "Team"]
        },
        {
            name: "timeframe",
            label: "Analysis Period",
            type: "select",
            options: ["Last 30 days", "Last quarter", "Last year"]
        }
    ];
}
```

### Guaranteed Deliverables

Personas specify what they'll produce:

```typescript
{
    deliverables: [
        {
            name: "competitive_analysis",
            description: "Detailed competitor analysis report",
            type: "markdown",
            guaranteed: true
        },
        {
            name: "comparison_chart",
            description: "Feature comparison spreadsheet",
            type: "csv",
            guaranteed: true
        },
        {
            name: "executive_summary",
            description: "One-page executive summary",
            type: "pdf",
            guaranteed: false
        }
    ];
}
```

### SOP Steps

Each persona follows a defined process:

```typescript
{
    sopSteps: [
        "Gather initial information about the target company",
        "Research public information (website, press, social)",
        "Analyze product features and pricing",
        "Compare with key competitors",
        "Identify strengths, weaknesses, opportunities",
        "Generate comprehensive report",
        "Create summary deliverables"
    ];
}
```

Progress is tracked step-by-step with real-time updates.

### Autonomy Levels

Control how much oversight the persona requires:

| Level               | Description                                |
| ------------------- | ------------------------------------------ |
| `full_auto`         | Runs without approval (within cost limits) |
| `approve_high_risk` | Pauses for high-risk actions               |
| `approve_all`       | Requires approval at each step             |

### Cost Controls

Set limits to prevent runaway tasks:

```typescript
{
  maxDurationHours: 2,
  maxCostCredits: 100,
  estimatedDuration: {
    minMinutes: 15,
    maxMinutes: 45
  }
}
```

## Getting Started

1. **Browse personas** — Explore the gallery by category
2. **Select a persona** — Choose one that matches your task
3. **Fill inputs** — Provide the required information
4. **Configure limits** — Set duration and cost controls
5. **Launch** — Start the persona task
6. **Monitor** — Track progress and approve if needed
7. **Collect deliverables** — Download generated outputs

[Learn how to create custom personas](./creating-personas)

[Learn how to use personas effectively](./using-personas)

## API Access

Run personas programmatically:

```bash
# Start a persona task
POST /api/personas/{personaId}/instances

{
  "taskTitle": "Q4 Competitive Analysis",
  "structuredInputs": {
    "company_name": "Acme Corp",
    "focus_areas": ["Pricing", "Features"]
  },
  "maxDurationHours": 2,
  "maxCostCredits": 100
}

# Check progress
GET /api/personas/instances/{instanceId}

# Get deliverables
GET /api/personas/instances/{instanceId}/deliverables
```

See the [API Reference](/api/introduction) for complete documentation.
