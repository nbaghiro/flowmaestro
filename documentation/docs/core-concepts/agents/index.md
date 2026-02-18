---
sidebar_position: 1
title: Agents Overview
---

# Agents

Agents are AI-powered assistants that can hold conversations, remember context, and take actions. Unlike workflows which follow fixed paths, agents use AI to decide what to do based on user input.

## Agents vs Workflows

| Feature         | Workflows              | Agents                        |
| --------------- | ---------------------- | ----------------------------- |
| **Execution**   | Linear, predictable    | Dynamic, AI-driven            |
| **State**       | Stateless (per run)    | Maintains conversation memory |
| **Control**     | You define every step  | AI decides what to do         |
| **Interaction** | Single input → output  | Ongoing conversations         |
| **Tools**       | Fixed node sequence    | AI chooses which tools to use |
| **Best for**    | Repeatable automations | Conversational interfaces     |

## Key Capabilities

| Capability        | Description                                           |
| ----------------- | ----------------------------------------------------- |
| **Conversations** | Natural language chat with context retention          |
| **Memory**        | Remember previous interactions and extract key facts  |
| **Tools**         | Execute actions via integrations, workflows, and APIs |
| **Knowledge**     | Access your uploaded documents via semantic search    |
| **Streaming**     | Real-time response generation                         |
| **Safety**        | PII detection, prompt injection protection            |

## How Agents Work

```
User Message → Agent
                 │
                 ├── Process with AI model
                 │
                 ├── Check memory for context
                 │
                 ├── Decide: respond or use tool?
                 │     │
                 │     ├── Tool needed → Execute → Get result
                 │     │
                 │     └── Iterate until satisfied
                 │
                 └── Generate response
                        │
                        ↓
              Streaming Response ← User
```

## Agent Patterns

FlowMaestro includes pre-built patterns for common use cases:

### Basic Patterns

| Pattern                | Description                       | Model             |
| ---------------------- | --------------------------------- | ----------------- |
| **General Assistant**  | Versatile helper for any task     | claude-sonnet-4-5 |
| **Code Helper**        | Programming assistance            | claude-sonnet-4-5 |
| **Customer Support**   | Handle customer inquiries         | gpt-4o            |
| **Data Analyst**       | Analyze data and insights         | gpt-4.1           |
| **Writing Assistant**  | Create and edit content           | claude-sonnet-4-5 |
| **Research Agent**     | Gather and synthesize information | o3-mini           |
| **Sales Assistant**    | Support sales activities          | gpt-4o            |
| **Technical Reviewer** | Review technical documents        | claude-opus-4-5   |
| **Onboarding Guide**   | Help new users get started        | claude-haiku-4-5  |
| **Blank Agent**        | Start from scratch                | (configurable)    |

### Advanced Patterns

Pre-configured with specific integrations:

| Pattern                      | Tools                     | Use Case               |
| ---------------------------- | ------------------------- | ---------------------- |
| **DevOps Assistant**         | GitHub, Jira, Slack       | Development operations |
| **Sales Development Rep**    | HubSpot, Apollo           | Lead qualification     |
| **Support Escalation**       | Zendesk, Slack            | Complex issue handling |
| **Content Operations**       | Notion, Twitter, LinkedIn | Content management     |
| **Code Review Bot**          | GitHub, Slack             | Automated code review  |
| **Customer Success Manager** | HubSpot, Slack, Zendesk   | Customer relationships |

## Real-Time Streaming

Agents support Server-Sent Events (SSE) for real-time response streaming:

```typescript
// Token-by-token streaming
const stream = await agent.chat(threadId, message);

for await (const token of stream) {
    process.stdout.write(token);
}
```

Benefits:

- Users see responses as they're generated
- Better perceived performance
- Can show "thinking" status
- Tool execution progress visible

## Thread Management

Conversations are organized into threads:

```
Agent: Customer Support Bot
├── Thread 1 (Customer A)
│   ├── Message 1: "Hi, I need help"
│   ├── Message 2: "What's your order number?"
│   └── Message 3: ...
├── Thread 2 (Customer B)
│   └── (separate conversation)
└── Thread 3 (Customer C)
    └── (separate conversation)
```

Each thread has:

- **Independent memory** — Context doesn't leak between threads
- **Persistent history** — Resume conversations later
- **Unique ID** — Reference for API calls

## Use Cases

### Customer Support

```
User: I'd like to return my order #12345

Agent: I found your order. It's a blue jacket purchased on January 10th.
       Since it's within our 30-day return window, I can process that
       return for you. Would you like a refund or exchange?

       [Used tools: lookup_order, check_return_policy]
```

### Sales Assistant

```
User: Tell me about the company Acme Corp

Agent: Here's what I found about Acme Corp:
       - Industry: SaaS / Developer Tools
       - Size: 50-200 employees
       - Recent news: Just raised Series B
       - Decision maker: Jane Smith, VP Engineering

       Based on their tech stack, they'd be a good fit for our API plan.
       Should I draft an outreach email?

       [Used tools: search_apollo, enrich_company, search_linkedin]
```

### Internal Helper

```
User: What's our refund policy for enterprise customers?

Agent: According to our internal docs, enterprise customers have:
       - 60-day money-back guarantee (vs 30 for standard)
       - Pro-rated refunds after 60 days
       - Requires VP approval for refunds over $10k

       [Used tools: search_knowledge_base]
```

### E-commerce Bot

```
User: Where's my package?

Agent: Your order #789 shipped yesterday via FedEx.
       Tracking: 123456789
       Estimated delivery: Friday, January 19th

       Current status: In transit - Memphis, TN

       [Used tools: lookup_order, track_shipment]
```

## Getting Started

1. **[Building Agents](./building-agents)** — Create and configure agents
2. **[Agent Memory](./memory)** — Configure memory for context
3. **[Agent Threads](./threads)** — Manage conversations

## API Access

Interact with agents programmatically:

```bash
# Create a new thread
POST /api/agents/{agentId}/threads

# Send a message
POST /api/agents/{agentId}/threads/{threadId}/messages
{
  "message": "Hello, I need help with my order"
}

# Stream the response
GET /api/agents/{agentId}/executions/{executionId}/stream

# List threads
GET /api/agents/{agentId}/threads

# Get thread messages
GET /api/agents/{agentId}/threads/{threadId}/messages
```

See the [API Reference](/api/introduction) for complete documentation.
