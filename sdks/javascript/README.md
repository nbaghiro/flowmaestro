# @flowmaestro/sdk

Official JavaScript/TypeScript SDK for FlowMaestro.

## Installation

```bash
npm install @flowmaestro/sdk
```

## Quick Start

```typescript
import { FlowMaestroClient } from "@flowmaestro/sdk";

const client = new FlowMaestroClient({
    apiKey: process.env.FLOWMAESTRO_API_KEY!
});

// Execute a workflow
const { data } = await client.workflows.execute("wf_123", {
    inputs: { name: "John" }
});

// Wait for completion
const result = await client.executions.waitForCompletion(data.execution_id);
console.log("Result:", result.outputs);
```

## Features

- **Workflows**: List, get, and execute workflows
- **Executions**: Track, stream, and cancel executions
- **Agents**: List agents and create conversation threads
- **Threads**: Send messages with streaming support
- **Triggers**: List and execute workflow triggers
- **Knowledge Bases**: Semantic search across your knowledge bases
- **Webhooks**: Manage outgoing webhooks

## API Reference

### Client Configuration

```typescript
const client = new FlowMaestroClient({
    apiKey: "fm_live_...", // Required: Your API key
    baseUrl: "https://api.flowmaestro.io", // Optional: API base URL
    timeout: 30000, // Optional: Request timeout (ms)
    maxRetries: 3 // Optional: Max retry attempts
});
```

### Workflows

```typescript
// List all workflows
const { data: workflows } = await client.workflows.list();

// Get a specific workflow
const { data: workflow } = await client.workflows.get("wf_123");

// Execute a workflow
const { data } = await client.workflows.execute("wf_123", {
    inputs: { name: "John", email: "john@example.com" }
});
```

### Executions

```typescript
// List executions
const { data: executions } = await client.executions.list({
    workflow_id: "wf_123",
    status: "running"
});

// Get execution details
const { data: execution } = await client.executions.get("exec_123");

// Wait for completion (polling)
const result = await client.executions.waitForCompletion("exec_123", {
    pollInterval: 1000,
    timeout: 300000
});

// Stream execution events (SSE)
const stream = client.executions.stream("exec_123", {
    onEvent: (event) => console.log(event.type),
    onError: (error) => console.error(error),
    onClose: () => console.log("Done")
});

// Cancel execution
await client.executions.cancel("exec_123");
```

### Agents & Threads

```typescript
// List agents
const { data: agents } = await client.agents.list();

// Create a conversation thread
const { data: thread } = await client.agents.createThread("agent_123");

// Send a message
const { data } = await client.threads.sendMessage(thread.id, {
    content: "Hello!"
});

// Stream the response
client.threads.sendMessageStream(thread.id, "Tell me a story", {
    onToken: (token) => process.stdout.write(token),
    onComplete: (message) => console.log("\nDone!"),
    onError: (error) => console.error(error)
});

// Get message history
const { data: messages } = await client.threads.listMessages(thread.id);
```

### Knowledge Bases

```typescript
// List knowledge bases
const { data: kbs } = await client.knowledgeBases.list();

// Semantic search
const { data } = await client.knowledgeBases.query("kb_123", {
    query: "How do I reset my password?",
    top_k: 5
});

for (const result of data.results) {
    console.log(`[${result.similarity.toFixed(3)}] ${result.content}`);
}
```

### Webhooks

```typescript
// Create a webhook
const { data: webhook } = await client.webhooks.create({
    name: "My Webhook",
    url: "https://my-app.com/webhook",
    events: ["execution.completed", "execution.failed"]
});

// Test webhook
const { data: result } = await client.webhooks.test(webhook.id);
console.log(`Response time: ${result.response_time_ms}ms`);

// Delete webhook
await client.webhooks.delete(webhook.id);
```

## Error Handling

```typescript
import {
    FlowMaestroError,
    AuthenticationError,
    RateLimitError,
    NotFoundError
} from "@flowmaestro/sdk";

try {
    await client.workflows.get("invalid-id");
} catch (error) {
    if (error instanceof NotFoundError) {
        console.log("Workflow not found");
    } else if (error instanceof RateLimitError) {
        console.log(`Rate limited. Retry after ${error.retryAfter}s`);
    } else if (error instanceof AuthenticationError) {
        console.log("Invalid API key");
    } else if (error instanceof FlowMaestroError) {
        console.log(`API error: ${error.code} - ${error.message}`);
    }
}
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import type {
    Workflow,
    Execution,
    ExecutionStatus,
    Agent,
    Thread,
    ThreadMessage
} from "@flowmaestro/sdk";
```

## License

MIT
