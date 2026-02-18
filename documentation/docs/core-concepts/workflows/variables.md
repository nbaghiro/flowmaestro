---
sidebar_position: 5
title: Variables
---

# Variables

Variables are how data flows through your workflows. They allow nodes to pass information to each other, reference trigger data, and access environment configuration.

## Variable Syntax

Use double curly braces to reference variables:

```
{{variable_name}}
{{node_name.output.field}}
{{trigger.body.message}}
```

## Variable Sources

### Trigger Variables

Data from the event that started the workflow:

```
{{trigger.body}}         // Request body (webhooks)
{{trigger.headers}}      // HTTP headers
{{trigger.params}}       // URL parameters
{{trigger.query}}        // Query string parameters
{{trigger.method}}       // HTTP method
```

### Node Output Variables

Results from previous nodes:

```
{{node_name.output}}              // Complete output
{{node_name.output.field}}        // Specific field
{{node_name.output.nested.field}} // Nested access
{{node_name.output[0]}}           // Array index
{{node_name.output.items[0].name}} // Combined access
```

### Environment Variables

Secure configuration values:

```
{{env.API_KEY}}
{{env.DATABASE_URL}}
{{env.SECRET_TOKEN}}
```

### Loop Variables

Inside loop nodes:

```
{{loop.item}}        // Current item
{{loop.index}}       // Current index (0-based)
{{loop.length}}      // Total items
{{loop.isFirst}}     // Is first iteration
{{loop.isLast}}      // Is last iteration
```

### Parallel Variables

Inside parallel executions:

```
{{parallel.index}}   // Parallel execution index
{{parallel.total}}   // Total parallel executions
{{parallel.batchId}} // Current batch ID
```

### Shared Memory

Workflow-level shared state:

```
{{shared.key}}       // Access shared memory value
```

## Expression Support

Variables support JavaScript expressions for dynamic values.

### Logical Operators

```
{{value || "default"}}           // OR with fallback
{{condition && "yes"}}           // AND with value
{{!flag}}                        // NOT operator
```

### Comparison Operators

```
{{count == 5}}                   // Equality
{{status != "error"}}            // Inequality
{{total > 100}}                  // Greater than
{{price <= 50}}                  // Less than or equal
```

### Ternary Operator

```
{{status == "active" ? "Yes" : "No"}}
{{items.length > 0 ? items[0] : null}}
```

### Arithmetic

```
{{price * quantity}}
{{total + tax}}
{{(price * 1.1).toFixed(2)}}
```

### String Operations

```
{{name.toUpperCase()}}
{{email.toLowerCase()}}
{{message.trim()}}
{{`Hello, ${name}!`}}
```

### Array Operations

```
{{items.length}}
{{items.join(", ")}}
{{items.map(i => i.name)}}
{{items.filter(i => i.active)}}
{{items.find(i => i.id == targetId)}}
```

### Object Operations

```
{{Object.keys(data)}}
{{Object.values(config)}}
{{JSON.stringify(result)}}
```

## Resolution Hierarchy

When resolving a variable, FlowMaestro checks sources in this order:

1. **Node outputs** — Results from workflow nodes
2. **Loop context** — If inside a loop
3. **Parallel context** — If in parallel execution
4. **Shared memory** — Workflow-level storage
5. **Trigger data** — Input that started the workflow
6. **Environment** — Workspace environment variables
7. **Globals** — System-level constants

## Null and Undefined Handling

Handle missing values gracefully:

```
{{user.name || "Anonymous"}}              // Default if null/undefined
{{user?.profile?.avatar}}                 // Optional chaining
{{data ?? "fallback"}}                    // Nullish coalescing
```

## Type Coercion

Variables maintain their types through the workflow:

| Type    | Examples                     |
| ------- | ---------------------------- |
| String  | `"hello"`, `{{name}}`        |
| Number  | `42`, `{{count}}`            |
| Boolean | `true`, `{{isActive}}`       |
| Array   | `[1,2,3]`, `{{items}}`       |
| Object  | `{key: "value"}`, `{{data}}` |
| Null    | `null`, `{{missing}}`        |

### Explicit Type Conversion

```
{{Number(stringValue)}}           // To number
{{String(numericValue)}}          // To string
{{Boolean(value)}}                // To boolean
{{JSON.parse(jsonString)}}        // Parse JSON
```

## Common Patterns

### Conditional Default Values

```
{{user.nickname || user.firstName || "User"}}
```

### Safe Property Access

```
{{order?.customer?.email || "no-email"}}
```

### Array Processing

```
// Get names from array of objects
{{users.map(u => u.name).join(", ")}}

// Filter and count
{{orders.filter(o => o.status == "pending").length}}

// Find specific item
{{products.find(p => p.sku == targetSku)}}
```

### Template Strings

```
{{`Order #${order.id} for ${customer.name}`}}
{{`Total: $${(price * quantity).toFixed(2)}`}}
```

### Date Formatting

```
{{new Date().toISOString()}}
{{new Date(timestamp).toLocaleDateString()}}
```

## Using Variables in Nodes

### In Text Fields

Simply insert the variable:

```
Hello, {{user.name}}! Your order #{{order.id}} is ready.
```

### In JSON Fields

Use within JSON structures:

```json
{
    "to": "{{customer.email}}",
    "subject": "Order {{order.id}} Confirmed",
    "body": "{{email_body}}"
}
```

### In Code Nodes

Access via the `inputs` object:

```javascript
const userName = inputs.user.name;
const orderTotal = inputs.order.total;

return {
    greeting: `Hello, ${userName}!`,
    formattedTotal: `$${orderTotal.toFixed(2)}`
};
```

## Variable Explorer

Use the Variable Explorer to browse available variables:

1. Click in any variable field
2. Press **Cmd/Ctrl + Space**
3. Browse and select from available variables

<!-- Screenshot: Variable explorer dropdown -->

## Debugging Variables

### Preview Values

In the workflow editor, hover over a variable to see its current value in test mode.

### Execution Logs

View resolved variables in execution details:

```json
{
    "nodeId": "llm_1",
    "resolvedInputs": {
        "prompt": "Summarize this: Lorem ipsum...",
        "temperature": 0.7
    }
}
```

## Best Practices

### Use Descriptive Names

```typescript
// Good
outputVariable: "customer_order_details";

// Avoid
outputVariable: "data";
```

### Handle Missing Data

```
// Always provide fallbacks for optional data
{{user.preferences?.theme || "light"}}
```

### Keep Expressions Simple

```
// For complex logic, use a Transform node instead of inline expressions
```

### Validate Before Use

Use conditional nodes to check for required data before processing.

### Document Variables

Add descriptions to output variables:

```typescript
{
  outputVariable: "processed_results",
  description: "Array of validated customer records"
}
```
