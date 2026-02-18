---
sidebar_position: 6
title: Error Handling
---

# Error Handling

FlowMaestro provides robust error handling capabilities to ensure your workflows can recover gracefully from failures. Configure error strategies, retry policies, and fallback paths to build resilient automations.

## Error Types

### Node Errors

Errors that occur within a node's execution:
- API request failures
- Invalid data formats
- Authentication issues
- Timeout exceeded

### System Errors

Platform-level issues:
- Network connectivity
- Service unavailability
- Resource limits exceeded

### Validation Errors

Input/output validation failures:
- Missing required fields
- Type mismatches
- Schema violations

## Error Strategies

Each node can have an error handling strategy configured.

### Continue

Skip the failed node and continue execution with the next node.

```typescript
{
  errorStrategy: "continue",
  outputOnError: null  // What to output when skipped
}
```

**Use when:**
- Node is optional (e.g., sending a notification)
- Downstream nodes can handle missing data
- Partial success is acceptable

### Fallback

Execute an alternative path when a node fails.

```typescript
{
  errorStrategy: "fallback",
  fallbackNodeId: "node_backup_api"
}
```

**Use when:**
- Alternative approaches exist
- Backup services are available
- Redundancy is required

### Goto

Jump to a specific node on error.

```typescript
{
  errorStrategy: "goto",
  gotoNodeId: "node_error_handler"
}
```

**Use when:**
- Centralized error handling is preferred
- Custom error processing is needed
- Error logging/alerting is required

### Fail

Stop workflow execution immediately.

```typescript
{
  errorStrategy: "fail",
  errorMessage: "Critical API failure"
}
```

**Use when:**
- Continuing would cause data corruption
- Error is unrecoverable
- Manual intervention is required

## Retry Policies

Configure automatic retries for transient failures.

### Configuration

```typescript
{
  retry: {
    enabled: true,
    maxAttempts: 3,
    initialDelay: 1000,    // ms
    maxDelay: 30000,       // ms
    backoffMultiplier: 2,
    retryableErrors: ["TIMEOUT", "RATE_LIMIT", "SERVER_ERROR"]
  }
}
```

### Backoff Strategies

| Strategy | Description |
|----------|-------------|
| **Fixed** | Same delay between retries |
| **Exponential** | Delay doubles each retry |
| **Linear** | Delay increases by fixed amount |

### Exponential Backoff Example

```
Attempt 1: Fail
Wait: 1000ms
Attempt 2: Fail
Wait: 2000ms
Attempt 3: Fail
Wait: 4000ms
Attempt 4: Success
```

### Retryable Errors

| Error Type | Description |
|------------|-------------|
| `TIMEOUT` | Request timed out |
| `RATE_LIMIT` | Rate limit exceeded (429) |
| `SERVER_ERROR` | 5xx HTTP errors |
| `NETWORK` | Network connectivity issues |
| `TRANSIENT` | Temporary service issues |

## Error Context

When an error occurs, context is captured:

```typescript
{
  error: {
    code: "API_ERROR",
    message: "Request failed with status 500",
    nodeId: "node_external_api",
    nodeName: "Call External API",
    timestamp: "2024-01-15T10:30:00Z",
    attempt: 2,
    stack: "...",
    details: {
      httpStatus: 500,
      responseBody: "Internal Server Error"
    }
  }
}
```

Access in error handling nodes:

```
{{error.code}}
{{error.message}}
{{error.nodeId}}
{{error.details.httpStatus}}
```

## Error Handling Patterns

### Try-Catch Pattern

Use conditional routing after a potentially failing node:

```
[API Call] → [Conditional: error?]
                ├── Yes → [Error Handler]
                └── No → [Continue Processing]
```

### Fallback Chain

Multiple fallback options in sequence:

```
[Primary API] → fallback → [Secondary API] → fallback → [Cached Data]
```

### Circuit Breaker

Track failures and skip problematic services:

```typescript
// Check failure count before calling
condition: "{{shared.api_failures}} < 5"
  → Yes: [Call API]
  → No: [Use Fallback]

// After API failure, increment count
{{shared.api_failures + 1}}
```

### Error Notification

Alert on critical failures:

```
[Failing Node]
    → error → [Send Slack Alert]
            → [Log to Database]
            → [Fail Workflow]
```

## Configuring Error Handling

### Per-Node Configuration

Set error handling when configuring a node:

<!-- Screenshot: Node error handling configuration -->

1. Select the node
2. Open the **Error Handling** section
3. Choose strategy (Continue, Fallback, Goto, Fail)
4. Configure retry policy
5. Set error output if applicable

### Global Defaults

Set workspace-level defaults:

```typescript
{
  defaultErrorStrategy: "fail",
  defaultRetry: {
    enabled: true,
    maxAttempts: 3,
    backoffMultiplier: 2
  },
  notifyOnError: true,
  errorWebhook: "https://your-webhook.com/errors"
}
```

## Error Handler Nodes

### Dedicated Error Handlers

Create nodes specifically for error processing:

```typescript
// Error Logger Node
{
  type: "http",
  method: "POST",
  url: "https://logging.service/errors",
  body: {
    workflow: "{{workflow.id}}",
    error: "{{error.message}}",
    context: "{{error.details}}",
    timestamp: "{{error.timestamp}}"
  }
}
```

### Error Transformation

Transform errors for downstream systems:

```typescript
// Transform Node
{
  operation: "custom",
  expression: `
    return {
      level: error.code === "TIMEOUT" ? "warn" : "error",
      service: error.nodeId,
      message: error.message,
      recoverable: ["TIMEOUT", "RATE_LIMIT"].includes(error.code)
    };
  `
}
```

## Best Practices

### 1. Classify Errors

Distinguish between:
- **Retryable** — Transient issues that may succeed on retry
- **Fatal** — Unrecoverable errors requiring manual intervention
- **Expected** — Business logic failures (e.g., "user not found")

### 2. Set Appropriate Retries

- **HTTP APIs**: 3 retries with exponential backoff
- **Database queries**: 2 retries with short delay
- **External services**: Based on SLA/reliability
- **User input**: No retry (wait for user)

### 3. Preserve Context

Always capture relevant context for debugging:
- Input parameters
- Request/response data
- Timestamps
- Correlation IDs

### 4. Notify Appropriately

- **Critical errors**: Immediate alerts (Slack, PagerDuty)
- **Non-critical**: Log for review
- **Expected errors**: Silent handling

### 5. Test Error Paths

Regularly test error scenarios:
- Simulate API failures
- Test timeout handling
- Verify fallback chains
- Check notification delivery

## Monitoring Errors

### Execution History

View errors in workflow execution history:

1. Go to **Workflows** > your workflow > **Executions**
2. Filter by status: **Failed**
3. Click an execution to see error details

### Error Analytics

Track error patterns over time:
- Error rate by node
- Most common error types
- Retry success rates
- Mean time to failure

### Alerting

Set up alerts for error conditions:

```typescript
{
  alerts: [
    {
      condition: "error_rate > 0.1",
      window: "5m",
      notify: ["slack:#alerts", "email:team@company.com"]
    },
    {
      condition: "consecutive_failures >= 3",
      notify: ["pagerduty:service_key"]
    }
  ]
}
```

## Common Scenarios

### API Rate Limiting

```typescript
{
  errorStrategy: "fallback",
  retry: {
    enabled: true,
    maxAttempts: 5,
    initialDelay: 10000,  // Wait longer for rate limits
    retryableErrors: ["RATE_LIMIT"]
  },
  fallbackNodeId: "queue_for_later"
}
```

### Database Connection Issues

```typescript
{
  retry: {
    enabled: true,
    maxAttempts: 3,
    initialDelay: 500,
    backoffMultiplier: 2,
    retryableErrors: ["NETWORK", "TIMEOUT"]
  },
  errorStrategy: "goto",
  gotoNodeId: "use_cached_data"
}
```

### Third-Party Service Outage

```typescript
{
  errorStrategy: "fallback",
  fallbackChain: [
    "secondary_provider",
    "tertiary_provider",
    "return_unavailable_message"
  ]
}
```
