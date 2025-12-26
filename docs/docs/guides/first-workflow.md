---
sidebar_position: 1
title: Your First Workflow
---

# Your First Workflow

Build a complete workflow from scratch.

## What We're Building

A simple AI assistant that:

1. Receives a question via webhook
2. Processes it with GPT-4
3. Returns the answer

## Step 1: Create the Workflow

1. From your dashboard, click **Workflows**
2. Click **New Workflow**
3. Name it "AI Q&A Assistant"

## Step 2: Add the Trigger

1. Find **Webhook Trigger** in the node palette
2. Drag it onto the canvas
3. Configure: Method = POST

## Step 3: Add the AI Node

1. Drag an **LLM** node onto the canvas
2. Connect the Webhook to the LLM node
3. Configure:
    - Model: GPT-4
    - System Prompt: "You are a helpful assistant."
    - User Message: `{{trigger.body.question}}`

## Step 4: Add the Output

1. Drag an **Output** node onto the canvas
2. Connect the LLM node to the Output node
3. Configure: Output = `{{llm.output.content}}`

## Step 5: Test

1. Click **Save**
2. Click **Test**
3. Enter test data:

```json
{
    "question": "What is the capital of France?"
}
```

You should see the AI's response in the execution log!
