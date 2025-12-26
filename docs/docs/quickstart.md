---
sidebar_position: 2
title: Quick Start
---

# Quick Start Guide

Get up and running with FlowMaestro in under 5 minutes.

## Prerequisites

- A FlowMaestro account ([sign up here](https://app.flowmaestro.ai))

## Step 1: Create Your First Workflow

1. From your dashboard, click **New Workflow** to open the visual canvas
2. Drag a **Webhook Trigger** from the sidebar onto the canvas
3. Drag an **LLM Node** and connect it to your trigger
4. Connect an **Output Node** to return the AI's response
5. Click **Save**, then use the **Test** button to run your workflow

## Step 2: Test Your Workflow

Once saved, test your workflow using the built-in testing panel:

```bash
curl -X POST https://api.flowmaestro.ai/webhooks/your-webhook-id \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, FlowMaestro!"}'
```

## What's Next?

- [Key Concepts](/key-concepts) — Understand workflows, agents, and triggers
- [Building Agents](/guides/first-agent) — Create an intelligent AI assistant
