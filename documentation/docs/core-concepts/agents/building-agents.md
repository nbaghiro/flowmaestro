---
sidebar_position: 2
title: Building Agents
---

# Building Agents

Create and configure AI agents in FlowMaestro. This guide covers agent setup, model selection, tool configuration, and deployment.

## Creating an Agent

1. Navigate to **Agents** in the dashboard
2. Click **New Agent**
3. Choose a starting point:
    - **Blank** — Start from scratch
    - **Template** — Use a pre-configured pattern
4. Configure the agent settings
5. Add tools and knowledge bases
6. Test and deploy

## Basic Configuration

### Identity

```typescript
{
  name: "Customer Support Agent",
  description: "Handles customer inquiries and support requests"
}
```

### System Prompt

Define the agent's behavior and personality:

```
You are a helpful customer support agent for Acme Inc.

## Your Role
- Answer questions about products and services
- Help customers track orders
- Handle returns and refunds
- Escalate complex issues to human agents

## Guidelines
- Be friendly, professional, and empathetic
- Verify customer identity before accessing account details
- If unsure about something, offer to connect with a human
- Never share internal policies or pricing structures

## Tone
- Conversational but professional
- Use customer's name when available
- Keep responses concise but complete
```

## Model Selection

### Providers

| Provider         | Recommended For                   |
| ---------------- | --------------------------------- |
| **OpenAI**       | General purpose, function calling |
| **Anthropic**    | Instruction following, safety     |
| **Google**       | Multi-modal, large context        |
| **Cohere**       | Retrieval, enterprise             |
| **Hugging Face** | Open source, specialized          |
| **x.ai**         | Reasoning, analysis               |

### Models by Use Case

| Use Case         | Model                         | Reason                 |
| ---------------- | ----------------------------- | ---------------------- |
| Customer support | claude-sonnet-4-5             | Instruction following  |
| Code assistance  | gpt-4.1, claude-sonnet-4-5    | Code generation        |
| Research         | claude-opus-4-5, o3           | Deep reasoning         |
| Quick responses  | gpt-4o-mini, claude-haiku-4-5 | Speed and cost         |
| Analysis         | grok-3, o3-mini               | Reasoning capabilities |

### Model Configuration

```typescript
{
  provider: "anthropic",
  model: "claude-sonnet-4-5",
  temperature: 0.7,      // Creativity (0-2)
  max_tokens: 4096,      // Response length limit
  max_iterations: 50     // Max conversation turns
}
```

### Temperature Guidelines

| Temperature | Behavior      | Use For                      |
| ----------- | ------------- | ---------------------------- |
| 0.0 - 0.3   | Deterministic | Facts, code, precise answers |
| 0.4 - 0.7   | Balanced      | General conversation         |
| 0.8 - 1.0   | Creative      | Brainstorming, content       |
| 1.1 - 2.0   | Very creative | Experimental outputs         |

## Tools

Tools give agents capabilities beyond conversation. FlowMaestro supports six tool types.

### Workflow Tools

Call your workflows as agent tools:

```typescript
{
  type: "workflow",
  workflowId: "wf_order_lookup",
  name: "lookup_order",
  description: "Look up order status by order ID"
}
```

**Use cases:**

- Complex multi-step processes
- Integrations requiring multiple API calls
- Business logic encapsulation

### Function Tools

Simple utility functions:

```typescript
{
  type: "function",
  functionName: "calculate_shipping",
  description: "Calculate shipping cost based on weight and destination",
  parameters: {
    weight: { type: "number", description: "Weight in kg" },
    destination: { type: "string", description: "Country code" }
  }
}
```

### Knowledge Base Tools

Query your knowledge bases:

```typescript
{
  type: "knowledge_base",
  knowledgeBaseId: "kb_product_docs",
  name: "search_product_docs",
  description: "Search product documentation and FAQ"
}
```

**Use cases:**

- RAG-powered responses
- FAQ lookup
- Documentation search

### Agent Tools

Call other agents as tools (agent-to-agent):

```typescript
{
  type: "agent",
  agentId: "agent_specialist",
  agentName: "Technical Specialist",
  description: "Handles complex technical questions"
}
```

**Use cases:**

- Specialized expertise
- Multi-domain routing
- Hierarchical agent systems

### MCP Tools (Integrations)

Connect to external services via Model Context Protocol:

```typescript
{
  type: "mcp",
  provider: "hubspot",
  connectionId: "conn_hubspot_prod",
  operations: ["search_contacts", "create_contact", "update_deal"]
}
```

**Available providers include:**

- **CRM**: HubSpot, Salesforce, Pipedrive
- **Communication**: Slack, Discord, Email
- **Productivity**: Notion, Google Sheets, Airtable
- **Development**: GitHub, Jira, Linear

### Built-in Tools

Pre-configured system tools:

```typescript
{
  type: "builtin",
  name: "web_search",
  category: "research"
}
```

**Available built-in tools:**

- `search_thread_memory` — Search conversation history
- `update_working_memory` — Store persistent facts
- `read_shared_memory` — Access workflow shared state
- `write_shared_memory` — Write to workflow shared state
- `search_shared_memory` — Semantic search over shared state

## Memory Configuration

Choose a memory type for conversation context:

```typescript
{
  memory_config: {
    type: "buffer",      // buffer, summary, or vector
    max_messages: 30
  }
}
```

See [Agent Memory](./memory) for detailed configuration.

## Safety Configuration

Protect your agent and users:

```typescript
{
  safety_config: {
    enablePiiDetection: true,
    enablePromptInjectionDetection: true,
    enableContentModeration: true,
    piiRedactionEnabled: true,
    piiRedactionPlaceholder: "[REDACTED]",
    promptInjectionAction: "block",  // allow, block, redact, warn
    contentModerationThreshold: 0.8
  }
}
```

### PII Detection

Detects and optionally redacts:

- Email addresses
- Phone numbers
- Social Security Numbers
- Credit card numbers
- API keys
- Passwords

### Prompt Injection Detection

Identifies manipulation attempts:

- System override attempts
- Role manipulation
- Instruction injection
- Delimiter attacks
- Jailbreak attempts

### Content Moderation

Filters inappropriate content based on configurable thresholds.

## Agent Patterns

Start with a pre-configured pattern:

### Basic Patterns

| Pattern                | Description                |
| ---------------------- | -------------------------- |
| **General Assistant**  | Versatile helper           |
| **Code Helper**        | Programming assistance     |
| **Customer Support**   | Customer inquiries         |
| **Data Analyst**       | Data analysis and insights |
| **Writing Assistant**  | Content creation           |
| **Research Agent**     | Information gathering      |
| **Sales Assistant**    | Sales support              |
| **Technical Reviewer** | Technical review           |
| **Onboarding Guide**   | User onboarding            |

### Advanced Patterns

| Pattern                      | Pre-configured Tools      |
| ---------------------------- | ------------------------- |
| **DevOps Assistant**         | GitHub, Jira, Slack       |
| **Sales Development Rep**    | HubSpot, Apollo           |
| **Support Escalation**       | Zendesk, Slack            |
| **Content Operations**       | Notion, Twitter, LinkedIn |
| **Code Review Bot**          | GitHub, Slack             |
| **Customer Success Manager** | HubSpot, Slack, Zendesk   |

## Cost Controls

Limit agent resource usage:

```typescript
{
  max_cost_credits: 100,      // Maximum credits per session
  max_duration_hours: 2,      // Maximum session duration
  autonomy_level: "approve_high_risk"
}
```

### Autonomy Levels

| Level               | Description              |
| ------------------- | ------------------------ |
| `full_auto`         | Runs without approval    |
| `approve_high_risk` | Pauses for risky actions |
| `approve_all`       | Pauses at every step     |

### Tool Risk Overrides

Set per-tool risk levels:

```typescript
{
  tool_risk_overrides: {
    "hubspot:create_deal": "high",
    "slack:send_message": "low",
    "github:create_issue": "medium"
  }
}
```

## Testing Agents

### In-Dashboard Testing

1. Go to your agent
2. Click **Test**
3. Start a conversation
4. Review tool calls and responses

### Test Scenarios

Create reusable test cases:

```typescript
{
  name: "Order Lookup",
  messages: [
    { role: "user", content: "What's the status of order #12345?" }
  ],
  expectedTools: ["lookup_order"],
  expectedBehavior: "Returns order status"
}
```

## Deploying Agents

### Chat Interface

Deploy to a public chat widget:

1. Go to **Interfaces** > **Chat Interfaces**
2. Create new interface
3. Select your agent
4. Configure branding
5. Publish and embed

### API Access

Programmatic access via API:

```bash
# Create thread
POST /api/agents/{agentId}/threads

# Send message
POST /api/agents/{agentId}/threads/{threadId}/messages
{
  "message": "Hello, I need help with my order"
}

# Stream response
GET /api/agents/{agentId}/threads/{threadId}/stream
```

### Integrations

Connect to messaging platforms:

- Slack
- Discord
- WhatsApp
- Custom webhooks

## Best Practices

### System Prompt Design

1. **Define role clearly** — Who is the agent?
2. **List capabilities** — What can it do?
3. **Set boundaries** — What shouldn't it do?
4. **Establish tone** — How should it communicate?
5. **Provide examples** — Show desired behaviors

### Tool Selection

- Only include tools the agent needs
- Group related tools logically
- Set appropriate risk levels
- Test tool interactions

### Memory Management

- Choose memory type based on conversation length
- Clear memory when context becomes stale
- Use working memory for key facts

### Safety

- Enable PII detection for customer data
- Use prompt injection detection in public agents
- Set content moderation for user-facing deployments
