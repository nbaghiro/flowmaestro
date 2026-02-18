---
sidebar_position: 2
title: Logic Nodes
---

# Logic Nodes

Logic nodes control workflow execution flow. Use them to make decisions, iterate over data, pause execution, and handle complex branching scenarios.

## Conditional Node

Branch execution based on conditions.

<!-- Screenshot: Conditional node with branches -->

### Modes

| Mode | Description |
|------|-------------|
| **Simple** | Compare two values with an operator |
| **Expression** | Evaluate a JavaScript expression |

### Simple Mode

```typescript
{
  conditionType: "simple",
  leftValue: "{{user.role}}",
  operator: "==",
  rightValue: "admin"
}
```

### Operators

| Operator | Description |
|----------|-------------|
| `==` | Equal to |
| `!=` | Not equal to |
| `>` | Greater than |
| `<` | Less than |
| `>=` | Greater than or equal |
| `<=` | Less than or equal |
| `contains` | String contains |
| `startsWith` | String starts with |
| `endsWith` | String ends with |
| `isEmpty` | Value is empty/null |
| `isNotEmpty` | Value has content |
| `isNull` | Value is null |
| `isNotNull` | Value is not null |

### Expression Mode

```typescript
{
  conditionType: "expression",
  expression: "{{order.total}} > 100 && {{user.isPremium}} == true"
}
```

### Branches

Each conditional node has two outputs:
- **True** — Condition is met
- **False** — Condition is not met

Connect different nodes to each branch to create different execution paths.

### Examples

**User role check:**
```typescript
leftValue: "{{user.role}}"
operator: "=="
rightValue: "admin"
```

**Order value threshold:**
```typescript
expression: "{{order.total}} >= 500"
```

**String validation:**
```typescript
leftValue: "{{input.email}}"
operator: "contains"
rightValue: "@"
```

---

## Switch Node

Route to multiple paths based on a value.

<!-- Screenshot: Switch node with multiple cases -->

### Configuration

```typescript
{
  expression: "{{ticket.priority}}",
  cases: [
    { value: "critical", label: "Critical" },
    { value: "high", label: "High Priority" },
    { value: "medium", label: "Medium Priority" },
    { value: "low", label: "Low Priority" }
  ],
  defaultCase: "default"
}
```

### How It Works

1. Evaluates the expression
2. Matches against case values
3. Routes to matching case output
4. Falls through to default if no match

### Use Cases

- Routing by status or type
- Multi-language handling
- Feature flag routing
- Regional processing

---

## Loop Node

Iterate over arrays or repeat operations.

<!-- Screenshot: Loop node types -->

### Loop Types

| Type | Description |
|------|-------------|
| `forEach` | Iterate over each item in an array |
| `while` | Repeat while condition is true |
| `count` | Repeat a fixed number of times |

### forEach Loop

```typescript
{
  loopType: "forEach",
  arrayPath: "{{api_response.users}}",
  itemVariable: "user",
  indexVariable: "index"
}
```

**Inside the loop, access:**
- `{{loop.item}}` or `{{user}}` — Current item
- `{{loop.index}}` or `{{index}}` — Current index (0-based)
- `{{loop.isFirst}}` — Is first iteration
- `{{loop.isLast}}` — Is last iteration
- `{{loop.length}}` — Total items

### while Loop

```typescript
{
  loopType: "while",
  condition: "{{hasMorePages}} == true",
  maxIterations: 100
}
```

### count Loop

```typescript
{
  loopType: "count",
  count: 5,
  startIndex: 0
}
```

**Inside the loop:**
- `{{loop.index}}` — Current iteration (0-4)
- `{{loop.count}}` — Total count (5)

### Loop Outputs

After the loop completes, collected outputs are available:

```typescript
// If loop body outputs to 'result'
{{loop_node.outputs}}  // Array of all 'result' values
```

### Best Practices

- Set `maxIterations` to prevent infinite loops
- Use `forEach` for known arrays
- Use `while` for pagination or dynamic conditions
- Be mindful of rate limits when calling APIs in loops

---

## Wait Node

Pause workflow execution.

### Wait Types

| Type | Description |
|------|-------------|
| `duration` | Wait for a specific time period |
| `until` | Wait until a specific timestamp |

### Duration Wait

```typescript
{
  waitType: "duration",
  durationValue: 30,
  durationUnit: "seconds"  // ms, seconds, minutes, hours, days
}
```

### Until Wait

```typescript
{
  waitType: "until",
  timestamp: "{{scheduled_time}}",
  timezone: "America/New_York"
}
```

### Duration Units

| Unit | Description |
|------|-------------|
| `ms` | Milliseconds |
| `seconds` | Seconds |
| `minutes` | Minutes |
| `hours` | Hours |
| `days` | Days |

### Use Cases

- Rate limiting between API calls
- Scheduled actions
- Polling with delays
- Time-based orchestration

---

## Human Review Node

Pause for human input or approval.

<!-- Screenshot: Human review node configuration -->

### Configuration

```typescript
{
  prompt: "Please review this content before publishing:",
  description: "Review the generated blog post for accuracy",
  variableName: "approval",
  inputType: "boolean",
  placeholder: "",
  required: true,
  defaultValue: null,
  validation: {},
  outputVariable: "review_result"
}
```

### Input Types

| Type | Description | Widget |
|------|-------------|--------|
| `text` | Single line text | Text input |
| `number` | Numeric value | Number input |
| `boolean` | Yes/No decision | Toggle/checkbox |
| `json` | Structured data | JSON editor |

### How It Works

1. Workflow pauses at this node
2. Notification sent to reviewers
3. Reviewer provides input
4. Workflow continues with input value

### Notifications

Configure who receives review requests:
- Email notifications
- Slack messages
- Dashboard alerts

### Use Cases

- Content approval workflows
- Manual quality checks
- Decision points requiring human judgment
- Data validation before processing

---

## Transform Node

Transform and manipulate data.

### Operations

| Operation | Description |
|-----------|-------------|
| `map` | Transform each item in array |
| `filter` | Filter array items |
| `reduce` | Reduce array to single value |
| `sort` | Sort array |
| `merge` | Combine multiple objects |
| `extract` | Extract specific fields |
| `custom` | Custom JavaScript transformation |
| `parseXML` | Parse XML to JSON |
| `parseJSON` | Parse JSON string |
| `passthrough` | Pass data unchanged |

### Map Operation

```typescript
{
  operation: "map",
  inputData: "{{api_response.users}}",
  expression: "{ name: item.fullName, email: item.email }",
  outputVariable: "mapped_users"
}
```

### Filter Operation

```typescript
{
  operation: "filter",
  inputData: "{{orders}}",
  expression: "item.total > 100",
  outputVariable: "large_orders"
}
```

### Reduce Operation

```typescript
{
  operation: "reduce",
  inputData: "{{orders}}",
  expression: "acc + item.total",
  initialValue: 0,
  outputVariable: "total_sum"
}
```

### Sort Operation

```typescript
{
  operation: "sort",
  inputData: "{{items}}",
  expression: "a.date - b.date",  // or "a.name.localeCompare(b.name)"
  outputVariable: "sorted_items"
}
```

### Custom JavaScript

```typescript
{
  operation: "custom",
  inputData: "{{raw_data}}",
  expression: `
    const result = data.map(item => ({
      ...item,
      formattedDate: new Date(item.date).toISOString(),
      isActive: item.status === 'active'
    }));
    return result.filter(x => x.isActive);
  `,
  outputVariable: "processed_data"
}
```

---

## Shared Memory Node

Store and retrieve data across workflow nodes with optional semantic search.

### Operations

| Operation | Description |
|-----------|-------------|
| `store` | Store a key-value pair |
| `search` | Search stored values |

### Store Operation

```typescript
{
  operation: "store",
  key: "customer_{{customer.id}}",
  value: "{{customer_data}}",
  enableSemanticSearch: true
}
```

### Search Operation

```typescript
{
  operation: "search",
  searchQuery: "customer with billing issues",
  topK: 5,
  similarityThreshold: 0.7
}
```

### Use Cases

- Cache intermediate results
- Share data between parallel branches
- Build context for downstream nodes
- Semantic retrieval from workflow memory

---

## Code Node

Execute custom JavaScript or Python code.

### Languages

| Language | Runtime |
|----------|---------|
| JavaScript | V8 (Node.js compatible) |
| Python | Python 3.11 |

### Configuration

```typescript
{
  language: "javascript",
  code: `
    const items = inputs.data;
    const processed = items.map(item => ({
      ...item,
      total: item.price * item.quantity
    }));
    return { processed, count: processed.length };
  `,
  timeout: 30000,
  memory: 256,
  inputVariables: ["data"],
  outputVariable: "code_result",
  allowNetworkAccess: false,
  allowFileSystemAccess: false
}
```

### Input Variables

Access workflow variables via `inputs`:

```javascript
const users = inputs.users;
const threshold = inputs.threshold;
```

### Python Example

```python
import json

items = inputs["data"]
processed = [
    {**item, "total": item["price"] * item["quantity"]}
    for item in items
]

return {"processed": processed, "count": len(processed)}
```

### Security Options

| Option | Default | Description |
|--------|---------|-------------|
| `allowNetworkAccess` | false | Allow HTTP requests |
| `allowFileSystemAccess` | false | Allow file operations |
| `timeout` | 30000 | Max execution time (ms) |
| `memory` | 256 | Memory limit (MB) |

### Use Cases

- Complex data transformations
- Custom business logic
- Integration with libraries
- Calculations and formatting

---

## Best Practices

### Conditional Nodes

- Use simple mode for basic comparisons
- Use expression mode for complex logic
- Always handle both true/false branches
- Consider edge cases (null, empty values)

### Loops

- Always set `maxIterations` as a safety limit
- Avoid nested loops when possible (performance)
- Use `forEach` for predictable arrays
- Accumulate results for downstream use

### Human Review

- Provide clear, actionable prompts
- Set appropriate timeouts
- Have fallback paths for non-response
- Log decisions for audit trails

### Code Nodes

- Keep code focused and simple
- Handle errors gracefully
- Use typed inputs/outputs
- Test code separately before deploying
