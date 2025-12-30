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
    - Model: GPT-4

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
