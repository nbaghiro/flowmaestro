# Variable Interpolation System

## Overview

FlowMaestro's variable interpolation system allows dynamic value resolution within workflow node configurations. Variables are referenced using double-brace syntax `{{variableName}}` and can include expressions for conditional logic and fallback values.

The system resolves variables from multiple sources (inputs, node outputs, workflow variables, shared memory, loop/parallel context) and supports sophisticated expressions including comparisons, logical operators, and ternary conditionals.

## Basic Syntax

### Simple Variable Reference

```
{{variableName}}
```

References a variable by name. The system searches for this variable across all available sources.

**Example:**

```json
{
    "prompt": "Hello, {{userName}}!"
}
```

### Nested Object Paths

```
{{nodeId.field}}
{{nodeId.data.nested.value}}
```

Access nested properties using dot notation. The path is traversed from left to right.

**Example:**

```json
{
    "email": "{{userLookup.profile.email}}",
    "firstName": "{{userLookup.profile.name.first}}"
}
```

### Array Index Access

```
{{nodeId.items[0]}}
{{nodeId.data.users[2].name}}
```

Access array elements using bracket notation with numeric indices.

**Example:**

```json
{
    "firstItem": "{{searchResults.items[0]}}",
    "topResult": "{{searchResults.items[0].title}}"
}
```

### Quoted Keys (Special Characters)

```
{{obj['key-with-dash']}}
{{obj["key_with_underscore"]}}
```

Use bracket notation with quotes for keys containing special characters (dashes, spaces, etc.).

**Example:**

```json
{
    "contentType": "{{headers['content-type']}}",
    "customField": "{{data['my-custom-field']}}"
}
```

## Expression Syntax

Expressions allow you to combine variables with operators for conditional logic and fallback values.

### Fallback/Coalesce Operator (`||`)

Returns the first non-null/non-undefined value in a chain.

```
{{a || b}}
{{a || b || c || "default"}}
```

**Behavior:**

- If the left operand is `null` or `undefined`, returns the right operand
- If the left operand has a value (including falsy values like `0`, `""`, `false`), returns it
- Can be chained for multiple fallbacks

**Examples:**

```json
{
    "identifier": "{{input.id || input.entityId}}",
    "status": "{{order.status || shipment.status || \"pending\"}}",
    "content": "{{llm1.response || llm2.response}}"
}
```

**Important:** The `||` operator checks for `null`/`undefined` specifically, not JavaScript falsy values. This means:

- `{{0 || "default"}}` returns `0` (not "default")
- `{{"" || "default"}}` returns `""` (not "default")
- `{{false || "default"}}` returns `false` (not "default")
- `{{null || "default"}}` returns `"default"`
- `{{undefined || "default"}}` returns `"default"`

### Logical AND Operator (`&&`)

Returns the right operand if the left is truthy, otherwise returns the left operand.

```
{{a && b}}
```

**Behavior:**

- If left operand is falsy, returns the left operand
- If left operand is truthy, returns the right operand
- Useful for conditional inclusion

**Examples:**

```json
{
    "email": "{{user.verified && user.email}}",
    "fullAccess": "{{user.active && user.admin && user.permissions}}"
}
```

### Logical NOT Operator (`!`)

Negates a boolean value.

```
{{!value}}
```

**Examples:**

```json
{
    "showWarning": "{{!user.hasAcceptedTerms}}",
    "isIncomplete": "{{!order.completed}}"
}
```

### Comparison Operators

Compare values and return boolean results.

| Operator | Description           | Example                  |
| -------- | --------------------- | ------------------------ |
| `==`     | Equal to              | `{{status == "active"}}` |
| `!=`     | Not equal to          | `{{count != 0}}`         |
| `>`      | Greater than          | `{{price > 100}}`        |
| `<`      | Less than             | `{{quantity < 10}}`      |
| `>=`     | Greater than or equal | `{{age >= 18}}`          |
| `<=`     | Less than or equal    | `{{score <= 50}}`        |

**Examples:**

```json
{
    "isActive": "{{status == \"active\"}}",
    "hasItems": "{{cart.itemCount > 0}}",
    "needsRestock": "{{inventory.quantity <= inventory.reorderPoint}}"
}
```

**Type Coercion:**

- String to number comparison: `"5" == 5` is `true`
- Null comparisons: `null == undefined` is `true`

### Ternary Operator (`? :`)

Conditional expression that returns one of two values based on a condition.

```
{{condition ? trueValue : falseValue}}
```

**Behavior:**

- Evaluates the condition
- If truthy, returns the value after `?`
- If falsy, returns the value after `:`

**Examples:**

```json
{
    "label": "{{isActive ? \"Active\" : \"Inactive\"}}",
    "discount": "{{total > 100 ? 0.1 : 0}}",
    "greeting": "{{user.name ? user.name : \"Guest\"}}",
    "tier": "{{score >= 90 ? \"gold\" : score >= 70 ? \"silver\" : \"bronze\"}}"
}
```

### Combined Expressions

Operators can be combined with proper precedence.

**Operator Precedence (highest to lowest):**

1. `!` (unary NOT)
2. `>`, `<`, `>=`, `<=`, `==`, `!=` (comparisons)
3. `&&` (logical AND)
4. `||` (logical OR)
5. `? :` (ternary)

**Examples:**

```json
{
    "message": "{{hasError ? errorMessage || \"Unknown error\" : successMessage}}",
    "canProceed": "{{user.active && user.verified || user.admin}}",
    "action": "{{status == \"paid\" && amount > 0 ? \"process\" : \"hold\"}}"
}
```

## Variable Resolution Sources

Variables are resolved from multiple sources in a specific priority order.

### Priority Order (Highest to Lowest)

1. **Loop Context** - Variables within a loop iteration
2. **Parallel Context** - Variables within a parallel branch
3. **Shared Memory** - Cross-node state storage
4. **Workflow Variables** - Variables set during execution
5. **Node Outputs** - Results from previous nodes
6. **Inputs** - Initial workflow inputs

### Loop Context Variables

Available inside loop constructs (forEach, while loops).

| Variable       | Description                       | Example            |
| -------------- | --------------------------------- | ------------------ |
| `loop.index`   | Current iteration index (0-based) | `{{loop.index}}`   |
| `loop.item`    | Current item in forEach           | `{{loop.item}}`    |
| `loop.total`   | Total number of iterations        | `{{loop.total}}`   |
| `loop.results` | Array of accumulated results      | `{{loop.results}}` |

**Examples:**

```json
{
    "currentUser": "{{loop.item.name}}",
    "label": "Item {{loop.index}} of {{loop.total}}",
    "isFirst": "{{loop.index == 0}}"
}
```

### Parallel Context Variables

Available inside parallel branch execution.

| Variable               | Description                        | Example                    |
| ---------------------- | ---------------------------------- | -------------------------- |
| `parallel.index`       | Branch index (0-based)             | `{{parallel.index}}`       |
| `parallel.branchId`    | Unique branch identifier           | `{{parallel.branchId}}`    |
| `parallel.currentItem` | Item for collection-based parallel | `{{parallel.currentItem}}` |

### Shared Memory Variables

Access cross-node state storage using the `shared` prefix.

```
{{shared.keyName}}
{{shared.keyName.nested.path}}
```

**Example:**

```json
{
    "previousCount": "{{shared.runningTotal}}",
    "cachedUser": "{{shared.userCache.userId123}}"
}
```

### Node Outputs

Access outputs from previously executed nodes using the node ID.

```
{{nodeId}}
{{nodeId.fieldName}}
```

**Example:**

```json
{
    "llmResponse": "{{llm1}}",
    "extractedText": "{{pdfExtract.text}}",
    "firstResult": "{{searchNode.results[0].title}}"
}
```

### Inputs

Access initial workflow inputs.

```
{{inputField}}
```

**Example:**

```json
{
    "userEmail": "{{email}}",
    "originalMessage": "{{message}}"
}
```

## String Interpolation

Variables and expressions can be embedded within larger strings.

### Multiple Variables

```
"Hello {{firstName}} {{lastName}}, welcome to {{companyName}}!"
```

### Mixed Content

```
"Order #{{orderId}} status: {{status == \"shipped\" ? \"On its way!\" : \"Processing\"}}"
```

### Object Stringification

When a variable resolves to an object or array, it's automatically JSON-stringified.

```json
{
    "debug": "User data: {{user}}"
}
// Result: "User data: {\"name\":\"John\",\"age\":30}"
```

## Edge Cases and Behavior

### Missing Variables

- **Non-strict mode (default):** Returns `null`, preserves `{{variable}}` in string interpolation
- **Strict mode:** Throws `InterpolationError`

### Null Path Traversal

Attempting to access a path through `null` or `undefined` returns `null`.

```
{{user.profile.name}}
// If user.profile is null, returns null (doesn't throw)
```

### Out-of-Bounds Array Access

Returns `null` without throwing an error.

```
{{items[999]}}
// Returns null if array has fewer elements
```

### Whitespace Handling

Whitespace around variable names is trimmed.

```
{{  variableName  }}
// Equivalent to {{variableName}}
```

### Empty Expressions

Empty braces return `null`.

```
{{}}
// Returns null
```

## What's NOT Supported

The following are intentionally not supported. Use transform nodes for these operations:

| Not Supported                   | Reason                           | Alternative                    |
| ------------------------------- | -------------------------------- | ------------------------------ |
| Arithmetic (`+`, `-`, `*`, `/`) | Complex type coercion            | Transform node with JavaScript |
| String concatenation            | Use string interpolation instead | `"{{a}} and {{b}}"`            |
| Function calls                  | Security risk                    | Transform node with JavaScript |
| Array methods                   | Too complex for inline           | Transform node                 |
| Regular expressions             | Security risk                    | Transform node                 |

## Security Considerations

The interpolation system is designed to be safe from injection attacks:

- **No code execution:** Variable paths are purely property access, not evaluated as JavaScript
- **No prototype pollution:** `__proto__`, `constructor`, etc. are treated as literal property names
- **No environment access:** `process.env`, `global`, etc. cannot be accessed
- **No function calls:** Syntax like `func()` is not supported

**Safe examples:**

```
{{constructor}}           // Just looks for a "constructor" property
{{__proto__}}             // Just looks for a "__proto__" property
{{process.env.SECRET}}    // Just navigates process -> env -> SECRET path
```

## Error Handling

### InterpolationError

Thrown in strict mode when a variable cannot be resolved.

```typescript
class InterpolationError extends TemporalActivityError {
    constructor(message: string, variablePath?: string);
    name: "InterpolationError";
}
```

**Error message format:**

```
Interpolation error for 'user.profile.email': Variable not found
```

## Best Practices

1. **Use descriptive node IDs** - Makes variable references self-documenting

    ```
    {{userLookupNode.email}}  // Better than {{node1.email}}
    ```

2. **Provide fallbacks for optional data**

    ```
    {{user.nickname || user.firstName || "User"}}
    ```

3. **Keep expressions simple** - Complex logic belongs in transform nodes

    ```
    // OK: Simple ternary
    {{active ? "Yes" : "No"}}

    // Too complex: Move to transform node
    {{a && b || c ? d != e ? f : g : h}}
    ```

4. **Use string interpolation for messages**

    ```
    "Hello {{name}}, your order {{orderId}} is {{status}}"
    ```

5. **Test edge cases** - Verify behavior with null/undefined inputs
