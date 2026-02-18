---
sidebar_position: 2
title: Your First Agent
---

# Your First Agent

Create an AI assistant that can take actions.

## What We're Building

A customer support agent that:

- Answers questions about your company
- Looks up order information
- Escalates when needed

## Step 1: Create the Agent

1. Click **Agents** in the sidebar
2. Click **New Agent**
3. Configure:
    - Name: "Support Assistant"
    - Model: claude-sonnet-4-5

## Step 2: Write the System Prompt

```
You are a helpful customer support agent for Acme Inc.

Your responsibilities:
- Answer questions about products and services
- Help customers track their orders
- Handle basic inquiries professionally

Guidelines:
- Be friendly and professional
- If you don't know something, say so honestly
- For complex issues, offer to escalate to a human
```

## Step 3: Add Tools

1. Click the **Tools** tab
2. Add an order lookup tool:
    - Name: `lookup_order`
    - Description: "Look up order details by order ID"
    - Parameters: `orderId` (string, required)

## Step 4: Test

Use the built-in chat:

```
User: Hi, I need help with order #12345

Agent: I'd be happy to help! Let me look that up for you.
[Agent uses lookup_order tool]
Your order was placed on December 20th and is being shipped.
```

## Step 5: Deploy

- **Chat Widget** — Add to your website
- **API** — Integrate into your app
- **Slack** — Connect to a channel

---

## Adding All Tool Types

FlowMaestro supports six tool types. Here's how to add each one.

### 1. Workflow Tools

Call your workflows as agent actions:

```typescript
{
  type: "workflow",
  workflowId: "wf_order_lookup",
  name: "lookup_order",
  description: "Look up order status by order ID"
}
```

**Use for:** Complex multi-step operations, business logic

### 2. Function Tools

Simple utility functions with parameters:

```typescript
{
  type: "function",
  functionName: "calculate_shipping",
  description: "Calculate shipping cost",
  parameters: {
    weight: { type: "number", description: "Weight in kg" },
    destination: { type: "string", description: "Country code" }
  }
}
```

**Use for:** Calculations, formatting, simple operations

### 3. Knowledge Base Tools

Search your uploaded documents:

```typescript
{
  type: "knowledge_base",
  knowledgeBaseId: "kb_product_docs",
  name: "search_docs",
  description: "Search product documentation"
}
```

**Use for:** RAG, FAQ lookup, documentation search

### 4. Agent Tools

Call other agents (agent-to-agent):

```typescript
{
  type: "agent",
  agentId: "agent_specialist",
  agentName: "Technical Specialist",
  description: "Handles complex technical questions"
}
```

**Use for:** Specialized expertise, multi-domain routing

### 5. MCP Tools (Integrations)

Connect to external services:

```typescript
{
  type: "mcp",
  provider: "hubspot",
  connectionId: "conn_hubspot_prod",
  operations: ["search_contacts", "create_contact"]
}
```

**Use for:** CRM, Slack, GitHub, and 150+ integrations

### 6. Built-in Tools

Pre-configured system tools:

```typescript
{
  type: "builtin",
  name: "search_thread_memory",
  category: "memory"
}
```

**Available built-in tools:**

- `search_thread_memory` — Search conversation history
- `update_working_memory` — Store persistent facts
- `read_shared_memory` — Access workflow state
- `write_shared_memory` — Write to workflow state

---

## Memory Configuration

Configure how your agent remembers context.

### Memory Types

| Type        | Description            | Best For            |
| ----------- | ---------------------- | ------------------- |
| **Buffer**  | Last N messages        | Short conversations |
| **Summary** | Periodic summarization | Long conversations  |
| **Vector**  | Semantic search        | Large context needs |

### Buffer Memory (Default)

```typescript
{
  memory_config: {
    type: "buffer",
    max_messages: 30  // Keep last 30 messages
  }
}
```

### Summary Memory

```typescript
{
  memory_config: {
    type: "summary",
    summary_interval: 10,  // Summarize every 10 messages
    max_summaries: 5       // Keep 5 summaries
  }
}
```

### Vector Memory

```typescript
{
  memory_config: {
    type: "vector",
    vector_store_id: "vs_conversation",
    top_k: 10  // Retrieve 10 relevant memories
  }
}
```

### Working Memory

Store key facts the agent should remember:

```typescript
{
  working_memory_enabled: true,
  working_memory_extraction: "auto"  // Auto-extract key facts
}
```

The agent can update working memory during conversations:

```
User: My name is Sarah and I work at Acme Corp.

Agent: Nice to meet you, Sarah! I've noted that you work at Acme Corp.
[Stores: { name: "Sarah", company: "Acme Corp" }]
```

---

## Deploying to Chat Interface

Publish your agent as an embeddable widget.

### Create Chat Interface

1. Go to **Interfaces** > **Chat Interfaces**
2. Click **New Interface**
3. Select your agent
4. Configure settings

### Configure Branding

```typescript
{
  branding: {
    primaryColor: "#4F46E5",
    name: "Support Chat",
    welcomeMessage: "Hi! How can I help you today?",
    iconUrl: "https://yoursite.com/icon.png"
  }
}
```

### Embed on Your Website

**Script tag (recommended):**

```html
<script src="https://cdn.flowmaestro.com/widget.js" data-interface-id="ci_abc123" async></script>
```

**React component:**

```tsx
import { ChatWidget } from "@flowmaestro/react";

function App() {
    return <ChatWidget interfaceId="ci_abc123" />;
}
```

### Configure Sessions

```typescript
{
  sessionTimeout: 30,    // Minutes
  messageLimit: 100,     // Max per session
  rateLimit: 20          // Messages per minute
}
```

See [Deploying a Chat Interface](./deploying-chat-interface) for complete guide.

---

## Best Practices

### System Prompt Design

1. **Define the role** — Who is the agent?
2. **List capabilities** — What can it do?
3. **Set boundaries** — What shouldn't it do?
4. **Establish tone** — How should it communicate?

### Tool Selection

- Only include tools the agent needs
- Write clear descriptions
- Test tool interactions thoroughly

### Safety Configuration

```typescript
{
  safety_config: {
    enablePiiDetection: true,
    enablePromptInjectionDetection: true,
    piiRedactionEnabled: true
  }
}
```

---

## Next Steps

- [Building RAG Agent](./building-rag-agent) — Add knowledge base
- [Deploying Chat Interface](./deploying-chat-interface) — Publish widget
- [Agent Memory](../core-concepts/agents/memory) — Advanced memory config
