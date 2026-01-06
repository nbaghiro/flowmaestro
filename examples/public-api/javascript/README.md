# FlowMaestro JavaScript/TypeScript Examples

Examples demonstrating the FlowMaestro Public API using the official JavaScript/TypeScript SDK.

## Setup

1. **Install dependencies:**

    ```bash
    npm install
    ```

2. **Configure environment:**

    ```bash
    cp .env.example .env
    # Edit .env with your API key and resource IDs
    ```

3. **Get your API key:**
    - Log in to FlowMaestro
    - Navigate to **Settings > API & Webhooks**
    - Create a new API key with the required scopes

## Examples

| Example                     | Description                               | Required Scopes                                                  |
| --------------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| `01-basic-workflow.ts`      | Execute a workflow and wait for results   | `workflows:read`, `workflows:execute`, `executions:read`         |
| `02-streaming-execution.ts` | Real-time progress tracking with SSE      | `workflows:read`, `workflows:execute`, `executions:read`         |
| `03-batch-processing.ts`    | Process multiple items with rate limiting | `workflows:read`, `workflows:execute`, `executions:read`         |
| `04-agent-chatbot.ts`       | Interactive AI agent conversation         | `agents:read`, `agents:execute`, `threads:read`, `threads:write` |
| `05-semantic-search.ts`     | RAG-powered knowledge base search         | `knowledge-bases:read`, `knowledge-bases:query`                  |
| `06-webhook-receiver.ts`    | Receive and verify webhook notifications  | N/A (server-side)                                                |
| `07-cli-tool.ts`            | Command-line workflow runner              | All workflow/execution scopes                                    |

## Running Examples

```bash
# Basic workflow execution
npm run 01:basic

# Streaming execution with real-time events
npm run 02:streaming

# Batch processing multiple items
npm run 03:batch

# Interactive AI chatbot
npm run 04:chatbot

# Semantic search interface
npm run 05:search

# Start webhook receiver server
npm run 06:webhook

# CLI tool
npm run 07:cli
# Or with arguments:
npx tsx 07-cli-tool.ts list
npx tsx 07-cli-tool.ts run wf_abc123
npx tsx 07-cli-tool.ts status exec_xyz789
```

## Example Details

### 01 - Basic Workflow Execution

The simplest integration pattern:

1. Get workflow details to understand required inputs
2. Execute the workflow with inputs
3. Poll for completion using `waitForCompletion()`
4. Display results

```typescript
const { data } = await client.workflows.execute("wf_123", {
    inputs: { name: "John", email: "john@example.com" }
});

const result = await client.executions.waitForCompletion(data.execution_id);
console.log(result.outputs);
```

### 02 - Streaming Execution

Real-time progress tracking using Server-Sent Events:

1. Execute workflow
2. Stream events via `streamIterator()`
3. Display progress as nodes complete

```typescript
for await (const event of client.executions.streamIterator(executionId)) {
    console.log(`${event.type}: ${event.node_id || ""}`);
    if (event.type === "execution:completed") break;
}
```

### 03 - Batch Processing

Process multiple items through a workflow with:

- Configurable concurrency limits
- Rate limit handling with exponential backoff
- Progress tracking
- Error collection

### 04 - AI Agent Chatbot

Build conversational interfaces:

1. Create a conversation thread
2. Send messages
3. Receive responses
4. Maintain conversation history

### 05 - Semantic Search

Use knowledge bases for RAG:

1. List available knowledge bases
2. Perform semantic queries
3. Display ranked results with similarity scores

### 06 - Webhook Receiver

Set up a server to receive webhook notifications:

1. Verify webhook signatures
2. Route events to handlers
3. Process different event types

For local testing, use ngrok:

```bash
ngrok http 3456
# Then create a webhook in FlowMaestro pointing to your ngrok URL
```

### 07 - CLI Tool

A complete command-line interface for workflows:

```bash
# List all workflows
npx tsx 07-cli-tool.ts list

# Get workflow details
npx tsx 07-cli-tool.ts get wf_abc123

# Run a workflow interactively
npx tsx 07-cli-tool.ts run wf_abc123

# Check execution status
npx tsx 07-cli-tool.ts status exec_xyz789

# Cancel an execution
npx tsx 07-cli-tool.ts cancel exec_xyz789
```

## SDK Reference

Full SDK documentation: [Public API & SDKs](/.docs/public-api.md)

### Client Configuration

```typescript
const client = new FlowMaestroClient({
    apiKey: "fm_live_...", // Required
    baseUrl: "https://...", // Optional (default: production)
    timeout: 30000, // Optional (default: 30s)
    maxRetries: 3 // Optional (default: 3)
});
```

### Error Handling

```typescript
import {
    FlowMaestroError,
    AuthenticationError,
    RateLimitError,
    NotFoundError,
    ValidationError
} from "@flowmaestro/sdk";

try {
    await client.workflows.get("invalid-id");
} catch (error) {
    if (error instanceof NotFoundError) {
        // Handle not found
    } else if (error instanceof RateLimitError) {
        // Wait and retry
        await sleep(error.retryAfter * 1000);
    }
}
```

## Troubleshooting

### "API key is required"

Make sure you've created a `.env` file with your API key.

### "Missing required scopes"

Your API key doesn't have the necessary permissions. Create a new key with the required scopes.

### "Rate limit exceeded"

You've made too many requests. Wait for the retry period or upgrade your plan.

### Connection timeouts

Check your network connection and ensure the API base URL is correct.
