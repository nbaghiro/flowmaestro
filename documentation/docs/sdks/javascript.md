---
sidebar_position: 1
title: JavaScript SDK
---

# JavaScript SDK

Official JavaScript/TypeScript SDK for FlowMaestro.

## Installation

```bash
npm install @flowmaestro/sdk
```

Or with yarn:

```bash
yarn add @flowmaestro/sdk
```

## Quick Start

```typescript
import { FlowMaestroClient } from "@flowmaestro/sdk";

const client = new FlowMaestroClient({
    apiKey: process.env.FLOWMAESTRO_API_KEY
});

// Execute a workflow
const { data } = await client.workflows.execute("wf_abc123", {
    inputs: { customer_email: "john@example.com" }
});

// Wait for completion
const execution = await client.executions.waitForCompletion(data.execution_id);
console.log("Result:", execution.outputs);
```

## Configuration

```typescript
const client = new FlowMaestroClient({
    // Required: Your API key
    apiKey: "fm_live_your_api_key",

    // Optional: Custom base URL (default: https://api.flowmaestro.io)
    baseUrl: "https://api.flowmaestro.io",

    // Optional: Request timeout in ms (default: 30000)
    timeout: 30000,

    // Optional: Max retry attempts (default: 3)
    maxRetries: 3,

    // Optional: Custom headers
    headers: {
        "X-Custom-Header": "value"
    }
});
```

## Workflows

### List Workflows

```typescript
const { data, pagination } = await client.workflows.list({
    page: 1,
    per_page: 20
});

console.log(`Found ${pagination.total_count} workflows`);
for (const workflow of data) {
    console.log(`${workflow.name} (${workflow.id})`);
}
```

### Get Workflow

```typescript
const { data: workflow } = await client.workflows.get("wf_abc123");

console.log("Workflow:", workflow.name);
console.log("Input Schema:", workflow.input_schema);
```

### Execute Workflow

```typescript
const { data } = await client.workflows.execute("wf_abc123", {
    inputs: {
        customer_email: "john@example.com",
        customer_name: "John Doe"
    }
});

console.log("Execution ID:", data.execution_id);
console.log("Status:", data.status); // "pending"
```

## Executions

### Get Execution Status

```typescript
const { data: execution } = await client.executions.get("exec_xyz789");

console.log("Status:", execution.status);
if (execution.status === "completed") {
    console.log("Outputs:", execution.outputs);
}
```

### Wait for Completion

```typescript
// Wait up to 5 minutes for completion
const execution = await client.executions.waitForCompletion("exec_xyz789", {
    timeout: 300000, // 5 minutes
    pollInterval: 1000 // Check every second
});

if (execution.status === "completed") {
    console.log("Success:", execution.outputs);
} else {
    console.error("Failed:", execution.error);
}
```

### Stream Execution Events

```typescript
// Using callbacks
const stream = client.executions.stream("exec_xyz789", {
    onEvent: (event) => {
        console.log(`Event: ${event.type}`, event.data);
    },
    onComplete: (execution) => {
        console.log("Done:", execution.outputs);
    },
    onError: (error) => {
        console.error("Error:", error);
    }
});

// Later, close the stream
stream.close();
```

### Stream with Async Iterator

```typescript
for await (const event of client.executions.streamIterator("exec_xyz789")) {
    console.log(`Event: ${event.type}`);

    if (event.type === "execution:completed") {
        console.log("Outputs:", event.outputs);
        break;
    }

    if (event.type === "execution:failed") {
        console.error("Error:", event.error);
        break;
    }
}
```

### Cancel Execution

```typescript
const { data } = await client.executions.cancel("exec_xyz789");
console.log("Cancelled:", data.status === "cancelled");
```

## Agents & Threads

### List Agents

```typescript
const { data: agents } = await client.agents.list();

for (const agent of agents) {
    console.log(`${agent.name} (${agent.model})`);
}
```

### Create Thread

```typescript
const { data: thread } = await client.agents.createThread("agent_abc123");
console.log("Thread ID:", thread.id);
```

### Send Message

```typescript
const { data: message } = await client.threads.sendMessage("thread_xyz789", {
    content: "What is my order status?"
});

console.log("Response:", message.content);
console.log("Tokens used:", message.usage.total_tokens);
```

### Get Thread Messages

```typescript
const { data: messages } = await client.threads.listMessages("thread_xyz789");

for (const msg of messages) {
    console.log(`[${msg.role}]: ${msg.content}`);
}
```

## Knowledge Bases

### Query Knowledge Base

```typescript
const { data } = await client.knowledgeBases.query("kb_abc123", {
    query: "How do I reset my password?",
    top_k: 5
});

for (const result of data.results) {
    console.log(`Score: ${result.score}`);
    console.log(`Content: ${result.content}`);
    console.log(`Source: ${result.document_name}`);
    console.log("---");
}
```

## Triggers

### Execute Trigger

```typescript
const { data } = await client.triggers.execute("trigger_abc123", {
    inputs: {
        event_type: "user_signup",
        user_id: "user_123"
    }
});

console.log("Execution ID:", data.execution_id);
```

## Webhooks

### Create Webhook

```typescript
const { data: webhook } = await client.webhooks.create({
    name: "My Webhook",
    url: "https://api.example.com/webhook",
    events: ["execution.completed", "execution.failed"]
});

// Store the secret securely!
console.log("Secret:", webhook.secret);
```

### Test Webhook

```typescript
const { data: result } = await client.webhooks.test("wh_abc123");

if (result.success) {
    console.log(`Webhook working! Response time: ${result.response_time_ms}ms`);
} else {
    console.error("Webhook failed:", result.error_message);
}
```

## Error Handling

```typescript
import {
    FlowMaestroClient,
    FlowMaestroError,
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    ValidationError
} from "@flowmaestro/sdk";

try {
    const { data } = await client.workflows.execute("wf_invalid");
} catch (error) {
    if (error instanceof NotFoundError) {
        console.error("Workflow not found");
    } else if (error instanceof AuthenticationError) {
        console.error("Invalid API key");
    } else if (error instanceof RateLimitError) {
        console.error(`Rate limited. Retry after ${error.retryAfter}s`);
    } else if (error instanceof ValidationError) {
        console.error("Validation error:", error.details);
    } else if (error instanceof FlowMaestroError) {
        console.error(`API error: ${error.code} - ${error.message}`);
    } else {
        throw error;
    }
}
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import type {
    Workflow,
    Execution,
    Agent,
    Thread,
    Message,
    KnowledgeBase,
    Trigger,
    Webhook
} from "@flowmaestro/sdk";

async function processWorkflow(workflow: Workflow): Promise<void> {
    console.log(`Processing: ${workflow.name}`);
}
```
