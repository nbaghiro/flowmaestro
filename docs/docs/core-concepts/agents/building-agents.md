---
sidebar_position: 2
title: Building Agents
---

# Building Agents

Create and configure AI agents in FlowMaestro.

## Creating an Agent

1. Navigate to **Agents** and click **New Agent**
2. Set the agent's name, description, and AI model
3. Write the system prompt defining behavior
4. Add tools (integrations and workflows)
5. Attach knowledge bases

## Configuration Options

### Model Selection

- **GPT-4** — Best for complex reasoning
- **GPT-3.5** — Faster, more cost-effective
- **Claude** — Strong at following instructions

### System Prompt

```
You are a helpful customer support agent for Acme Inc.

Your responsibilities:
- Answer questions about products and services
- Help customers track their orders
- Handle basic inquiries professionally

Guidelines:
- Be friendly and professional
- If you don't know something, say so
- For complex issues, offer to escalate to a human
```

### Tools

Add tools the agent can use:

- **Integrations** — Slack, Shopify, HubSpot, etc.
- **Workflows** — Call your custom workflows
- **Knowledge Search** — Query your knowledge bases

## Deploying Agents

Deploy your agent to:

- **Chat widget** — Embed on your website
- **API** — Integrate into your applications
- **Integrations** — Connect to Slack, Discord, etc.
