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

You should see the AI's response in the execution log.

---

## Using Variables Between Nodes

Variables allow data to flow between nodes. Every node output becomes available for downstream nodes.

### Variable Syntax

Use double curly braces to reference variables:

```
{{nodeName.output.fieldName}}
```

### Common Patterns

**Access trigger data:**

```typescript
{
    {
        trigger.body.question;
    }
} // POST body field
{
    {
        trigger.query.userId;
    }
} // Query parameter
{
    {
        trigger.headers.authorization;
    }
} // Request header
```

**Access node outputs:**

```typescript
{
    {
        llm.output.content;
    }
} // LLM response text
{
    {
        http_request.output.body;
    }
} // HTTP response
{
    {
        transform.output.items;
    }
} // Transform result
```

**Use expressions:**

```typescript
{
    {
        trigger.body.name || "Guest";
    }
} // Default value
{
    {
        llm.output.content.length > 100;
    }
} // Comparison
{
    {
        trigger.body.type == "urgent" ? "high" : "normal";
    }
} // Ternary
```

### Example: Chaining Nodes

```
[Webhook] → [HTTP Request] → [LLM] → [Slack]
```

```typescript
// HTTP Request fetches user data
// LLM summarizes with: {{http_request.output.body.profile}}
// Slack sends: {{llm.output.content}}
```

See [Variables Reference](../core-concepts/workflows/variables) for complete documentation.

---

## Error Handling Setup

Protect your workflow from failures with error handling strategies.

### Node-Level Error Handling

Each node can define what happens on failure:

```typescript
{
  errorStrategy: "continue",  // Options: fail, continue, fallback, goto
  fallbackValue: { content: "Default response" },
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000,
    backoffMultiplier: 2
  }
}
```

### Error Strategies

| Strategy   | Behavior                            |
| ---------- | ----------------------------------- |
| `fail`     | Stop workflow immediately (default) |
| `continue` | Use fallback value, continue        |
| `fallback` | Execute fallback node               |
| `goto`     | Jump to specific node               |

### Adding Retry Logic

For nodes that might fail transiently (API calls, LLM requests):

```typescript
{
  retryPolicy: {
    maxRetries: 3,
    retryableErrors: ["RATE_LIMIT", "TIMEOUT"],
    backoffMs: 1000,
    backoffMultiplier: 2  // 1s, 2s, 4s
  }
}
```

### Example: Resilient API Call

```typescript
// HTTP Request node with error handling
{
  url: "https://api.example.com/data",
  errorStrategy: "fallback",
  fallbackNode: "cached_data_node",
  retryPolicy: {
    maxRetries: 2,
    retryableErrors: ["TIMEOUT", "5XX"]
  }
}
```

See [Error Handling](../core-concepts/workflows/error-handling) for advanced patterns.

---

## Testing and Debugging

### Using the Test Panel

1. Click **Test** in the workflow editor
2. Enter test input data
3. Click **Run Test**
4. View execution results

### Execution Log

The log shows each node execution:

```
✓ trigger (15ms)
  Input: { question: "What is 2+2?" }
  Output: { body: { question: "What is 2+2?" } }

✓ llm (1,234ms)
  Input: { prompt: "What is 2+2?" }
  Output: { content: "2+2 equals 4." }

✓ output (2ms)
  Result: "2+2 equals 4."
```

### Debugging Tips

**Check variable resolution:**

- Hover over `{{variables}}` to see resolved values
- Use the Variables panel to inspect current state

**Test incrementally:**

- Start with just trigger + output
- Add nodes one at a time
- Test after each addition

**Use mock data:**

- Test with various inputs
- Include edge cases
- Test error conditions

### Common Issues

| Issue                 | Solution                          |
| --------------------- | --------------------------------- |
| Variable undefined    | Check node name matches reference |
| LLM not responding    | Verify API key, check rate limits |
| Webhook not receiving | Check URL, verify payload format  |
| Output empty          | Trace variable path through nodes |

### Execution History

View past executions:

1. Go to workflow **Runs** tab
2. Click any execution
3. Inspect inputs, outputs, errors
4. Replay with same or modified inputs

---

## Next Steps

- [Using AI Nodes](./using-ai-nodes) — Advanced LLM configuration
- [Connecting Integrations](./connecting-integrations) — Link external services
- [Node Types Reference](../core-concepts/workflows/nodes) — All available nodes
