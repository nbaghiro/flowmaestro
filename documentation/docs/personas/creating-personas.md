---
sidebar_position: 2
title: Creating Personas
---

# Creating Personas

Build custom personas for your specific use cases. This guide covers the full persona definition structure and best practices.

## Persona Structure

A persona definition includes:

```typescript
{
  // Identity
  name: "Competitive Intel Analyst",
  slug: "competitive-intel-analyst",
  title: "Research competitors and market positioning",
  description: "...",
  category: "research",
  avatarUrl: "...",

  // Expertise
  expertiseAreas: [...],
  exampleTasks: [...],
  specialty: "Market research and competitive analysis",

  // Inputs
  inputFields: [...],

  // Outputs
  deliverables: [...],

  // Process
  sopSteps: [...],

  // Execution
  systemPrompt: "...",
  model: "claude-sonnet-4-20250514",
  provider: "anthropic",
  temperature: 0.7,
  maxTokens: 8192,

  // Tools
  defaultTools: [...],
  connectionRequirements: [...],

  // Limits
  estimatedDuration: { minMinutes: 15, maxMinutes: 45 },
  estimatedCostCredits: 50,
  defaultMaxDurationHours: 2,
  defaultMaxCostCredits: 100,
  autonomyLevel: "approve_high_risk"
}
```

## Identity

### Basic Information

```typescript
{
  name: "Technical Documentation Writer",
  slug: "technical-doc-writer",  // URL-safe identifier
  title: "Create comprehensive technical documentation",
  description: "An AI specialist that creates clear, well-structured technical documentation including API references, user guides, and architecture documents.",
  category: "content",  // research | content | development | data | operations | business | proposals
  avatarUrl: "https://..."  // Optional custom avatar
}
```

### Tags and Specialty

```typescript
{
  tags: ["documentation", "technical-writing", "api-docs"],
  specialty: "API documentation and developer guides"
}
```

## Expertise Definition

### Expertise Areas

List the persona's competencies:

```typescript
{
    expertiseAreas: [
        "API documentation and reference guides",
        "User manuals and getting started guides",
        "Architecture diagrams and system documentation",
        "Code examples and tutorials",
        "Changelog and release notes"
    ];
}
```

### Example Tasks

Concrete examples of what the persona can do:

```typescript
{
    exampleTasks: [
        "Document a REST API with endpoints, parameters, and examples",
        "Create a user guide for a new feature",
        "Write architecture decision records (ADRs)",
        "Generate SDK documentation from code comments",
        "Create a migration guide between versions"
    ];
}
```

## Input Fields

Define the data users provide when running the persona.

### Field Types

| Type          | Description            | Options         |
| ------------- | ---------------------- | --------------- |
| `text`        | Single-line text input | -               |
| `textarea`    | Multi-line text input  | -               |
| `select`      | Dropdown selection     | `options` array |
| `multiselect` | Multiple selection     | `options` array |
| `tags`        | Free-form tags         | -               |
| `number`      | Numeric input          | `min`, `max`    |
| `checkbox`    | Boolean toggle         | -               |

### Field Definition

```typescript
{
    inputFields: [
        {
            name: "project_name",
            label: "Project Name",
            type: "text",
            required: true,
            placeholder: "e.g., Acme API",
            helpText: "The name of the project to document"
        },
        {
            name: "doc_type",
            label: "Documentation Type",
            type: "select",
            required: true,
            options: ["API Reference", "User Guide", "Architecture Doc", "Tutorial", "Changelog"],
            defaultValue: "API Reference"
        },
        {
            name: "target_audience",
            label: "Target Audience",
            type: "multiselect",
            options: ["Developers", "DevOps", "Product Managers", "End Users"]
        },
        {
            name: "code_repository",
            label: "Code Repository URL",
            type: "text",
            required: false,
            placeholder: "https://github.com/...",
            validation: {
                pattern: "^https://(github|gitlab)\\.com/.*",
                message: "Must be a GitHub or GitLab URL"
            }
        },
        {
            name: "include_examples",
            label: "Include Code Examples",
            type: "checkbox",
            defaultValue: true
        },
        {
            name: "focus_areas",
            label: "Focus Areas",
            type: "tags",
            placeholder: "Add topics to emphasize"
        }
    ];
}
```

### Validation Rules

```typescript
{
  validation: {
    required: true,
    minLength: 10,
    maxLength: 500,
    pattern: "^[a-z-]+$",
    message: "Custom error message"
  }
}
```

## Deliverables

Define the outputs the persona will produce.

### Deliverable Types

| Type       | Description       | File Extension |
| ---------- | ----------------- | -------------- |
| `markdown` | Markdown document | `.md`          |
| `csv`      | Spreadsheet data  | `.csv`         |
| `json`     | Structured data   | `.json`        |
| `pdf`      | PDF document      | `.pdf`         |
| `code`     | Source code       | Varies         |
| `image`    | Generated image   | `.png`         |
| `html`     | HTML document     | `.html`        |

### Deliverable Definition

```typescript
{
    deliverables: [
        {
            name: "api_reference",
            description: "Complete API reference documentation",
            type: "markdown",
            guaranteed: true,
            fileExtension: ".md"
        },
        {
            name: "endpoint_summary",
            description: "Summary table of all endpoints",
            type: "csv",
            guaranteed: true
        },
        {
            name: "architecture_diagram",
            description: "System architecture diagram",
            type: "image",
            guaranteed: false // Best-effort, not guaranteed
        },
        {
            name: "openapi_spec",
            description: "OpenAPI 3.0 specification",
            type: "json",
            guaranteed: true
        }
    ];
}
```

**Note:** Guaranteed deliverables are always produced. Non-guaranteed deliverables are best-effort based on available information.

## SOP Steps

Define the step-by-step process the persona follows:

```typescript
{
    sopSteps: [
        "Review project requirements and documentation scope",
        "Analyze code repository and existing documentation",
        "Identify all API endpoints and their parameters",
        "Document request/response schemas with examples",
        "Write authentication and getting started sections",
        "Create code examples in multiple languages",
        "Generate endpoint summary and quick reference",
        "Review for completeness and consistency",
        "Format and finalize all deliverables"
    ];
}
```

### Best Practices

- **Be specific** — Each step should be concrete and measurable
- **Logical order** — Steps should flow naturally
- **7-12 steps** — Enough detail without overwhelming
- **Include validation** — Add review/verification steps

## Agent Configuration

### System Prompt

Write a detailed prompt that guides the persona's behavior:

```typescript
{
    systemPrompt: `You are a Technical Documentation Writer specializing in API documentation.

## Your Expertise
- Creating clear, comprehensive API references
- Writing developer-friendly guides with practical examples
- Documenting complex systems in accessible ways
- Following industry standards (OpenAPI, JSDoc, etc.)

## Guidelines
- Use clear, concise language
- Include working code examples in multiple languages
- Follow the company's documentation style guide
- Structure content with clear headings and navigation
- Explain concepts before diving into details

## Output Format
- Use markdown with proper heading hierarchy
- Include code blocks with language annotations
- Add tables for parameters and responses
- Use admonitions for warnings and tips

## Process
Follow the SOP steps provided. At each step:
1. Explain what you're doing
2. Show your work/findings
3. Ask for clarification if needed
4. Proceed to the next step

Always prioritize accuracy over speed.`;
}
```

### Model Configuration

```typescript
{
  model: "claude-sonnet-4-20250514",
  provider: "anthropic",
  temperature: 0.7,
  maxTokens: 8192
}
```

**Model recommendations:**

| Task Type     | Recommended Model        | Temperature |
| ------------- | ------------------------ | ----------- |
| Research      | claude-sonnet-4          | 0.5-0.7     |
| Writing       | claude-sonnet-4, gpt-4.1 | 0.7-0.9     |
| Code          | claude-sonnet-4, gpt-4.1 | 0.3-0.5     |
| Data Analysis | gpt-4.1, claude-sonnet-4 | 0.3-0.5     |

## Tools

### Default Tools

Configure tools the persona has access to:

```typescript
{
    defaultTools: [
        {
            type: "mcp",
            provider: "github",
            config: { scopes: ["repo:read", "contents:read"] }
        },
        {
            type: "knowledge_base",
            knowledgeBaseId: "kb_company_docs"
        },
        {
            type: "builtin",
            name: "web_search"
        },
        {
            type: "workflow",
            workflowId: "wf_generate_diagram"
        }
    ];
}
```

### Connection Requirements

Specify required integrations:

```typescript
{
    connectionRequirements: [
        {
            provider: "github",
            required: true,
            scopes: ["repo", "read:org"],
            reason: "Access code repositories for documentation"
        },
        {
            provider: "notion",
            required: false,
            reason: "Publish documentation directly to Notion"
        }
    ];
}
```

## Execution Limits

### Duration and Cost

```typescript
{
  estimatedDuration: {
    minMinutes: 30,
    maxMinutes: 120
  },
  estimatedCostCredits: 75,
  defaultMaxDurationHours: 3,
  defaultMaxCostCredits: 150
}
```

### Autonomy Level

```typescript
{
  autonomyLevel: "approve_high_risk",
  toolRiskOverrides: {
    "github:create_pr": "high",      // Always requires approval
    "github:read_file": "low",       // Never requires approval
    "web_search": "medium"           // Uses default threshold
  }
}
```

| Level               | Behavior                              |
| ------------------- | ------------------------------------- |
| `full_auto`         | No approvals required (within limits) |
| `approve_high_risk` | Pause for high-risk tool calls        |
| `approve_all`       | Pause at every step                   |

## Task Templates

Create reusable templates for common tasks:

```typescript
{
    taskTemplates: [
        {
            name: "API Documentation from OpenAPI",
            taskTemplate:
                "Create complete API documentation for {{project_name}} based on the OpenAPI specification at {{openapi_url}}. Target audience: {{audience}}.",
            variables: [
                { name: "project_name", type: "text", required: true },
                { name: "openapi_url", type: "text", required: true },
                { name: "audience", type: "select", options: ["developers", "partners", "public"] }
            ],
            suggestedDuration: 60,
            suggestedCost: 50
        }
    ];
}
```

## Best Practices

### Clear Scope

- Define exactly what the persona does and doesn't do
- Set appropriate limits
- Be specific about deliverables

### Quality System Prompt

- Include persona's expertise and personality
- Provide clear guidelines and constraints
- Explain expected output format
- Reference the SOP steps

### Appropriate Tools

- Only include tools needed for the task
- Set proper risk levels
- Document connection requirements

### Realistic Estimates

- Test with real tasks
- Account for variability
- Build in buffer time

### User Experience

- Use clear, descriptive field labels
- Provide helpful placeholder text
- Add validation for inputs
- Group related fields logically
