---
sidebar_position: 7
title: Parallel Execution
---

# Parallel Execution

FlowMaestro supports parallel execution to run multiple operations simultaneously. This improves performance by processing independent tasks concurrently rather than sequentially.

## How Parallel Execution Works

When workflow nodes don't depend on each other, they can run in parallel:

```
         ┌──→ [Node A] ──┐
[Start] ─┼──→ [Node B] ──┼→ [Merge] → [Continue]
         └──→ [Node C] ──┘
```

The execution engine automatically identifies independent branches and runs them concurrently.

## Creating Parallel Branches

### Visual Editor

1. From any node, drag multiple connections to different nodes
2. Nodes without data dependencies run in parallel
3. Connect parallel branches back to a single node to merge results

<!-- Screenshot: Parallel branches in workflow editor -->

### Branch Configuration

Each parallel branch can have its own:

- Error handling strategy
- Timeout settings
- Retry policies

## Parallel Loop Execution

Process array items in parallel instead of sequentially.

### Configuration

```typescript
{
  loopType: "forEach",
  arrayPath: "{{users}}",
  parallel: true,
  maxConcurrency: 10,  // Limit concurrent executions
  itemVariable: "user",
  outputVariable: "results"
}
```

### Concurrency Control

| Setting          | Description                 |
| ---------------- | --------------------------- |
| `maxConcurrency` | Maximum parallel executions |
| `rateLimit`      | Requests per second limit   |
| `batchSize`      | Process items in batches    |

### Example: Parallel API Calls

```
[Get User List] → [Parallel Loop] → [Enrich User Data] → [Collect Results]
                       ↓
              Process 10 users at once
              instead of one at a time
```

## Queue Management

For high-volume parallel processing, FlowMaestro manages execution queues.

### Queue Behavior

1. Items enter the queue
2. Workers pick items based on concurrency limit
3. Completed items move to results
4. Failed items go to retry or error handling

### Queue Configuration

```typescript
{
  queue: {
    maxSize: 1000,
    priority: "fifo",  // fifo, lifo, priority
    timeout: 300000,   // Max queue wait time
    deadLetterQueue: true
  }
}
```

## Merging Parallel Results

When parallel branches converge, results are merged.

### Automatic Merge

Results from all branches are combined:

```typescript
// After parallel branches complete
{
  branch_a: { result: "..." },
  branch_b: { result: "..." },
  branch_c: { result: "..." }
}
```

### Custom Merge Logic

Use a Transform node to combine results:

```typescript
{
  operation: "custom",
  expression: `
    const combined = {
      totalUsers: branch_a.count + branch_b.count,
      allEmails: [...branch_a.emails, ...branch_b.emails],
      merged: Date.now()
    };
    return combined;
  `
}
```

## Workflow Signals

Control running workflows with signals.

### Pause Signal

Temporarily stop execution:

```typescript
// Send pause signal
POST /api/executions/{executionId}/signal
{
  "type": "pause",
  "reason": "Awaiting approval"
}
```

Workflow state is preserved. Resume when ready.

### Resume Signal

Continue paused execution:

```typescript
POST /api/executions/{executionId}/signal
{
  "type": "resume",
  "data": {
    "approved": true,
    "approver": "user@example.com"
  }
}
```

### Cancel Signal

Stop execution permanently:

```typescript
POST /api/executions/{executionId}/signal
{
  "type": "cancel",
  "reason": "User requested cancellation"
}
```

### Signal Handlers

Configure how your workflow responds to signals:

```typescript
{
  signalHandlers: {
    "pause": {
      action: "pause",
      cleanup: true
    },
    "cancel": {
      action: "cancel",
      rollback: true,
      notify: ["admin@company.com"]
    },
    "priority_change": {
      action: "custom",
      handler: "update_priority_node"
    }
  }
}
```

## Parallel Variables

Access parallel execution context:

### In Parallel Loops

```
{{parallel.index}}      // Current parallel index
{{parallel.total}}      // Total parallel items
{{parallel.batchId}}    // Current batch identifier
```

### In Parallel Branches

```
{{branch.id}}           // Current branch identifier
{{branch.name}}         // Branch name if configured
```

## Performance Considerations

### When to Use Parallel Execution

| Use Case                | Parallel? | Reason               |
| ----------------------- | --------- | -------------------- |
| Independent API calls   | Yes       | No data dependencies |
| Sequential dependencies | No        | Order matters        |
| Rate-limited APIs       | Limited   | Control concurrency  |
| Database writes         | Careful   | Avoid conflicts      |
| Batch processing        | Yes       | Improve throughput   |

### Concurrency Limits

Set appropriate limits based on:

- External API rate limits
- Database connection pools
- Memory constraints
- Service agreements

### Best Practices

1. **Start conservative** — Begin with low concurrency and increase
2. **Monitor resources** — Watch memory and CPU usage
3. **Handle partial failures** — Some branches may fail
4. **Set timeouts** — Prevent hung parallel operations
5. **Log branch IDs** — For debugging parallel issues

## Common Patterns

### Fan-Out / Fan-In

Distribute work, then aggregate results:

```
[Input] → [Fan-Out] → [Process 1] ──┐
                   → [Process 2] ──┼→ [Aggregate] → [Output]
                   → [Process 3] ──┘
```

### Parallel with Fallback

Run primary and backup in parallel, use first success:

```
         ┌──→ [Primary API] ──┐
[Start] ─┤                    ├→ [Use First Success]
         └──→ [Backup API] ───┘
```

### Parallel Validation

Validate multiple conditions simultaneously:

```
                ┌──→ [Check Inventory]
[Order] ────────┼──→ [Validate Payment]
                └──→ [Check Shipping]
                          │
                          ↓
              [All Passed?] → [Process Order]
```

### Batch Processing

Process large datasets efficiently:

```typescript
{
  loopType: "forEach",
  arrayPath: "{{large_dataset}}",
  parallel: true,
  batchSize: 100,
  maxConcurrency: 5,
  delayBetweenBatches: 1000
}
```

## Debugging Parallel Execution

### Execution Timeline

View parallel execution in the timeline:

<!-- Screenshot: Parallel execution timeline -->

- Horizontal bars show concurrent execution
- Click any branch to see its details
- Identify bottlenecks and failures

### Logging

Add logging to parallel branches:

```typescript
{
  type: "transform",
  expression: `
    console.log('Branch ${branch.id} processing item ${parallel.index}');
    return input;
  `
}
```

### Tracing

Each parallel execution has a trace ID:

```
Main: trace-abc123
├── Branch 1: trace-abc123-001
├── Branch 2: trace-abc123-002
└── Branch 3: trace-abc123-003
```

## Error Handling in Parallel

### Partial Success

Configure behavior when some branches fail:

```typescript
{
  parallel: {
    onPartialFailure: "continue",  // continue, fail, collect
    minSuccessRate: 0.8,           // 80% must succeed
    collectErrors: true             // Gather all errors
  }
}
```

### Collect Mode

Gather all results, including failures:

```typescript
{
  results: [
    { success: true, data: {...} },
    { success: true, data: {...} },
    { success: false, error: "Timeout" }
  ],
  successCount: 2,
  failureCount: 1
}
```

### Fail-Fast

Stop all branches when one fails:

```typescript
{
  parallel: {
    failFast: true,
    cancelOnFailure: true
  }
}
```

## Timeouts

### Branch Timeout

Set timeout per parallel branch:

```typescript
{
  timeout: 30000,  // 30 seconds per branch
  onTimeout: "cancel"  // cancel, continue, error
}
```

### Overall Timeout

Set timeout for entire parallel section:

```typescript
{
  parallel: {
    totalTimeout: 60000,  // 60 seconds total
    onTimeout: "collect_partial"
  }
}
```
