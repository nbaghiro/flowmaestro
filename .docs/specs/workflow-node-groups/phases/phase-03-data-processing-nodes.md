# Phase 03: Data Processing Nodes

## Overview

Implement 4 data processing nodes for transforming, filtering, aggregating, and deduplicating data.

---

## Prerequisites

- **Phase 02**: Flow Control nodes (Router, Loop for testing)

---

## Existing Infrastructure

### Transform Executor Already Exists

**File**: `backend/src/temporal/activities/node-executors/transform-executor.ts`

```typescript
// The transform executor already supports multiple operations
export interface TransformNodeConfig {
    operation:
        | "map"
        | "filter"
        | "reduce"
        | "sort"
        | "merge"
        | "extract"
        | "custom"
        | "parseXML"
        | "parseJSON";
    inputData: string; // Variable reference like "${httpResponse}"
    expression: string; // JSONata or JavaScript expression
    outputVariable: string;
}

// Already uses JSONata for expressions
import jsonata from "jsonata";

// Supports both JavaScript arrow functions and JSONata
async function executeMap(data, expression, context) {
    if (expression.includes("=>")) {
        const fn = eval(`(${expression})`);
        return data.map(fn);
    }
    const expr = jsonata(expression);
    return await expr.evaluate({ items: data, ...context });
}
```

### Variable Interpolation Utility

**File**: `backend/src/temporal/activities/node-executors/utils.ts`

```typescript
/**
 * Interpolate variables in a string using ${varName} syntax
 * Supports nested paths: ${user.profile.name}, ${users[0].name}
 */
export function interpolateVariables(
    str: string,
    context: Record<string, unknown>,
    options?: { stringifyObjects?: boolean }
): string;
```

### Node Executor Registry

**File**: `backend/src/temporal/activities/node-executors/index.ts`

```typescript
// Add new executors to the switch statement:
switch (nodeType) {
    // ... existing cases ...
    case "filter":
        return await executeFilterNode(nodeConfig, context);
    case "aggregate":
        return await executeAggregateNode(nodeConfig, context);
    case "deduplicate":
        return await executeDeduplicateNode(nodeConfig, context);
}
```

### JSONata Already Available

The codebase already uses JSONata for data transformation. Leverage it for expressions:

```typescript
import jsonata from "jsonata";

// JSONata examples:
// Sum: "$sum(items.price)"
// Filter: "items[status = 'active']"
// Group: "$group(items, 'category')"
// Average: "$average(items.score)"
```

---

## Nodes (4)

| Node            | Description                         | Category              |
| --------------- | ----------------------------------- | --------------------- |
| **Transform**   | JSONPath/JavaScript transformations | tools/data-processing |
| **Filter**      | Remove items not matching criteria  | tools/data-processing |
| **Aggregate**   | Compute sum/count/avg/min/max       | tools/data-processing |
| **Deduplicate** | Remove duplicates by key            | tools/data-processing |

---

## Node Specifications

### Transform Node

**Purpose**: Transform data using JSONata or JavaScript expressions

**Config**:

```typescript
interface TransformNodeConfig {
    // Transform mode
    mode: "jsonata" | "javascript" | "template";

    // Input data reference
    inputData: string; // "${variableName}" syntax

    // Expression based on mode
    expression: string;
    // JSONata: "$.items[price > 100].name"
    // JavaScript: "(item) => ({ ...item, total: item.price * item.qty })"
    // Template: "Hello ${user.name}, your total is ${order.total}"

    // Output configuration
    outputVariable: string; // Variable name to store result
}
```

**Frontend Component**:

```typescript
// frontend/src/canvas/nodes/TransformNode.tsx
function TransformNode({ id, data, selected }: NodeProps<TransformNodeData>) {
    return (
        <>
            <BaseNode
                id={id}
                icon={Wand2}
                label={data.label || "Transform"}
                category="tools"
                selected={selected}
                configPreview={
                    data.mode === "jsonata"
                        ? `JSONata: ${truncate(data.expression, 30)}`
                        : data.mode
                }
                inputs={[{ name: "data", type: "any" }]}
                outputs={[{ name: data.outputVariable || "result", type: "any" }]}
            />
            <NodeConfigWrapper nodeId={id} title="Transform" category="tools">
                <TransformNodeConfig data={data} onUpdate={(cfg) => updateNode(id, cfg)} />
            </NodeConfigWrapper>
        </>
    );
}
```

**Inputs**: `data` (any)
**Outputs**: `result` (any)

### Filter Node

**Purpose**: Filter array items based on criteria

**Config**:

```typescript
interface FilterNodeConfig {
    inputArray: string; // "${items}" - array to filter
    expression: string; // Boolean expression: "item.status === 'active'"
    mode: "keep" | "remove"; // Keep or remove matching items
    outputVariable: string;
    removedVariable?: string; // Optional: store removed items
}
```

**Backend Executor**:

```typescript
// backend/src/temporal/activities/node-executors/filter-executor.ts
export async function executeFilterNode(
    config: FilterNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const array = getVariableValue(config.inputArray, context);
    if (!Array.isArray(array)) {
        throw new Error("Filter requires array input");
    }

    const expr = jsonata(`$[${config.expression}]`);
    const matching = await expr.evaluate(array);

    const filtered =
        config.mode === "keep" ? matching : array.filter((item) => !matching.includes(item));
    const removed =
        config.mode === "keep" ? array.filter((item) => !matching.includes(item)) : matching;

    return {
        [config.outputVariable]: filtered,
        ...(config.removedVariable && { [config.removedVariable]: removed }),
        [`${config.outputVariable}_count`]: filtered.length
    };
}
```

**Inputs**: `array` (array)
**Outputs**: `filtered` (array), `removed` (array), `count` (number)

### Aggregate Node

**Purpose**: Compute aggregations over arrays

**Config**:

```typescript
interface AggregateNodeConfig {
    inputArray: string; // "${items}"
    operation: "sum" | "count" | "avg" | "min" | "max" | "first" | "last" | "custom";
    field?: string; // Field to aggregate: "price"
    groupBy?: string; // Optional grouping: "category"
    customExpression?: string; // For custom: JSONata expression
    outputVariable: string;
}
```

**Backend Executor**:

```typescript
// backend/src/temporal/activities/node-executors/aggregate-executor.ts
export async function executeAggregateNode(
    config: AggregateNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const array = getVariableValue(config.inputArray, context);
    if (!Array.isArray(array)) {
        throw new Error("Aggregate requires array input");
    }

    let result: JsonValue;

    if (config.groupBy) {
        // Grouped aggregation
        const groups = groupBy(array, config.groupBy);
        result = Object.fromEntries(
            Object.entries(groups).map(([key, items]) => [
                key,
                computeAggregate(items, config.operation, config.field)
            ])
        );
    } else {
        // Simple aggregation
        result = computeAggregate(array, config.operation, config.field);
    }

    return { [config.outputVariable]: result };
}

function computeAggregate(items: JsonArray, operation: string, field?: string): JsonValue {
    const values = field ? items.map((item) => getNestedValue(item, field)) : items;

    switch (operation) {
        case "sum":
            return values.reduce((a, b) => a + b, 0);
        case "count":
            return values.length;
        case "avg":
            return values.reduce((a, b) => a + b, 0) / values.length;
        case "min":
            return Math.min(...values);
        case "max":
            return Math.max(...values);
        case "first":
            return values[0];
        case "last":
            return values[values.length - 1];
        default:
            throw new Error(`Unknown operation: ${operation}`);
    }
}
```

**Inputs**: `array` (array)
**Outputs**: `result` (number | object)

### Deduplicate Node

**Purpose**: Remove duplicate items by key

**Config**:

```typescript
interface DeduplicateNodeConfig {
    inputArray: string; // "${items}"
    keyFields: string[]; // ["email"] or ["firstName", "lastName"]
    keep: "first" | "last"; // Which duplicate to keep
    caseSensitive: boolean; // For string comparisons
    outputVariable: string;
    duplicatesVariable?: string; // Optional: store duplicates
}
```

**Backend Executor**:

```typescript
// backend/src/temporal/activities/node-executors/deduplicate-executor.ts
export async function executeDeduplicateNode(
    config: DeduplicateNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const array = getVariableValue(config.inputArray, context);
    if (!Array.isArray(array)) {
        throw new Error("Deduplicate requires array input");
    }

    const seen = new Map<string, number>();
    const unique: JsonValue[] = [];
    const duplicates: JsonValue[] = [];

    const getKey = (item: JsonObject): string => {
        return config.keyFields
            .map((field) => {
                let val = getNestedValue(item, field);
                if (typeof val === "string" && !config.caseSensitive) {
                    val = val.toLowerCase();
                }
                return String(val);
            })
            .join("|");
    };

    // Process based on keep strategy
    const items = config.keep === "last" ? [...array].reverse() : array;

    for (const item of items) {
        const key = getKey(item as JsonObject);
        if (!seen.has(key)) {
            seen.set(key, unique.length);
            unique.push(item);
        } else {
            duplicates.push(item);
        }
    }

    // Restore order if we reversed
    const result = config.keep === "last" ? unique.reverse() : unique;

    return {
        [config.outputVariable]: result,
        ...(config.duplicatesVariable && { [config.duplicatesVariable]: duplicates }),
        [`${config.outputVariable}_count`]: result.length,
        duplicateCount: duplicates.length
    };
}
```

**Inputs**: `array` (array)
**Outputs**: `unique` (array), `duplicates` (array), `count` (number)

---

## Unit Tests

### Test Pattern

**Pattern A (Pure Logic)**: Data processing nodes use JSONata/JavaScript expressions with no external dependencies.

### Files to Create

| Executor    | Test File                                                                        | Pattern |
| ----------- | -------------------------------------------------------------------------------- | ------- |
| Transform   | `backend/tests/unit/node-executors/data-processing/transform-executor.test.ts`   | A       |
| Filter      | `backend/tests/unit/node-executors/data-processing/filter-executor.test.ts`      | A       |
| Aggregate   | `backend/tests/unit/node-executors/data-processing/aggregate-executor.test.ts`   | A       |
| Deduplicate | `backend/tests/unit/node-executors/data-processing/deduplicate-executor.test.ts` | A       |

### Required Test Cases

#### transform-executor.test.ts

- `should map array items using expression`
- `should evaluate JSONata expressions`
- `should evaluate JavaScript arrow functions`
- `should handle nested property access`
- `should throw on invalid expression`
- `should support parseJSON operation`
- `should support parseXML operation`

#### filter-executor.test.ts

- `should filter items matching condition`
- `should return empty array when no matches`
- `should support complex boolean expressions`
- `should handle nested property comparisons`
- `should preserve original item structure`

#### aggregate-executor.test.ts

- `should sum numeric values`
- `should calculate average`
- `should find min/max values`
- `should count items`
- `should group by field`
- `should handle empty arrays`

#### deduplicate-executor.test.ts

- `should remove duplicates by key`
- `should keep first occurrence by default`
- `should optionally keep last occurrence`
- `should return duplicates list`
- `should handle complex key expressions`
- `should handle case-insensitive comparison`

---

## Test Workflow: Lead List Cleanup

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   Input     │───▶│  Transform   │───▶│ Deduplicate │───▶│   Output    │
│ (CSV leads) │    │ (normalize)  │    │ (by email)  │    │ (clean list)│
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
```

**Test Data**:

```json
[
    { "Name": "John Smith", "EMAIL": "john@acme.com", "company": "Acme Inc" },
    { "Name": "john smith", "EMAIL": "JOHN@ACME.COM", "company": "ACME" },
    { "Name": "Jane Doe", "EMAIL": "jane@example.com", "company": "Example Corp" }
]
```

**Transform Expression** (normalize):

```javascript
{
  name: item.Name.trim(),
  email: item.EMAIL.toLowerCase().trim(),
  company: item.company
}
```

**Expected Output**: 2 records (John and Jane), normalized format

---

## Files to Create

### Frontend Components

```
frontend/src/canvas/nodes/tools/data-processing/
├── TransformNode.tsx
├── FilterNode.tsx
├── AggregateNode.tsx
├── DeduplicateNode.tsx
├── config/
│   ├── TransformNodeConfig.tsx
│   ├── FilterNodeConfig.tsx
│   ├── AggregateNodeConfig.tsx
│   └── DeduplicateNodeConfig.tsx
└── index.ts
```

### Backend Executors

```
backend/src/temporal/activities/node-executors/
├── transform-executor.ts
├── filter-executor.ts
├── aggregate-executor.ts
└── deduplicate-executor.ts
```

---

## Node Registration

```typescript
// frontend/src/config/node-registrations/data-processing.ts
import { registerNode } from "../node-registry";

registerNode({
    type: "transform",
    label: "Transform",
    description: "Transform data using JSONata or JavaScript",
    category: "tools",
    subcategory: "data-processing",
    icon: "Wand2",
    keywords: ["transform", "map", "convert", "modify", "jsonata", "expression"]
});

registerNode({
    type: "filter",
    label: "Filter",
    description: "Filter array items based on criteria",
    category: "tools",
    subcategory: "data-processing",
    icon: "Filter",
    keywords: ["filter", "where", "select", "match", "criteria"]
});

registerNode({
    type: "aggregate",
    label: "Aggregate",
    description: "Compute sum, count, avg, min, max over arrays",
    category: "tools",
    subcategory: "data-processing",
    icon: "Calculator",
    keywords: ["sum", "count", "average", "min", "max", "aggregate", "total", "group"]
});

registerNode({
    type: "deduplicate",
    label: "Deduplicate",
    description: "Remove duplicate items by key fields",
    category: "tools",
    subcategory: "data-processing",
    icon: "Copy",
    keywords: ["dedupe", "unique", "distinct", "remove duplicates"]
});
```

---

## How to Deliver

1. Register all 4 nodes in `node-registry.ts` (see Node Registration above)
2. Create frontend node components following BaseNode pattern
3. Create config forms with expression editors (consider Monaco editor for JSONata)
4. Implement backend executors (Filter, Aggregate, Deduplicate are new; Transform exists)
5. Leverage existing JSONata library (already installed)
6. Add executors to `node-executors/index.ts` switch statement
7. Test each node individually
8. Test the lead cleanup workflow

---

## How to Test

| Test                         | Expected Result                 |
| ---------------------------- | ------------------------------- |
| Transform with JSONPath      | Extracts nested fields          |
| Transform with JavaScript    | Applies custom logic            |
| Filter with expression       | Returns matching items          |
| Aggregate sum                | Calculates correct total        |
| Deduplicate by email         | Removes exact duplicates        |
| Deduplicate case-insensitive | Removes case-variant duplicates |

### Unit Tests

```typescript
describe("Transform Node", () => {
    it("applies JSONPath expression", async () => {
        const input = { users: [{ name: "Alice" }] };
        const result = await transform(input, "$.users[0].name");
        expect(result).toBe("Alice");
    });
});

describe("Deduplicate Node", () => {
    it("removes duplicates by key", async () => {
        const input = [{ email: "a@test.com" }, { email: "A@TEST.COM" }, { email: "b@test.com" }];
        const result = await deduplicate(input, "email", { caseSensitive: false });
        expect(result.unique).toHaveLength(2);
    });
});
```

---

## Acceptance Criteria

- [ ] Transform applies JSONPath expressions correctly
- [ ] Transform applies JavaScript transformations safely
- [ ] Transform shows preview of output structure
- [ ] Filter removes/keeps items based on expression
- [ ] Filter returns both filtered and removed arrays
- [ ] Aggregate computes sum/count/avg/min/max
- [ ] Aggregate supports group-by operations
- [ ] Deduplicate removes duplicates by key field
- [ ] Deduplicate supports case-insensitive comparison
- [ ] Deduplicate keeps first/last as configured
- [ ] All nodes display with Tools category styling

---

## Dependencies

These nodes process data between triggers and outputs, used extensively in automation workflows.
