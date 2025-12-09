# Phase 02: Flow Control Nodes

## Overview

Implement the 5 core flow control nodes that define how data moves through workflows: Input, Output, Router, Loop, and Wait.

---

## Prerequisites

- **Phase 01**: Node registry (`registerNode()`)

---

## Existing Infrastructure

### Current Node Implementations

The codebase already has partial implementations of these nodes:

**File**: `frontend/src/canvas/nodes/InputNode.tsx`

```typescript
// Existing InputNode - needs enhancement
function InputNode({ data, selected }: NodeProps<InputNodeData>) {
    return (
        <BaseNode icon={ArrowRight} label="Input" category="data" selected={selected}>
            {/* Basic display */}
        </BaseNode>
    );
}
```

**File**: `frontend/src/canvas/nodes/ConditionalNode.tsx`

```typescript
// Existing ConditionalNode - Router can extend this pattern
// Uses custom handles for true/false outputs
const customHandles = (
    <>
        <Handle type="source" position={Position.Bottom} id="true" style={{ left: "35%" }} />
        <Handle type="source" position={Position.Bottom} id="false" style={{ left: "65%" }} />
    </>
);
```

### Existing Executor Patterns

**File**: `backend/src/temporal/activities/node-executors/wait-executor.ts`

```typescript
// Wait executor already exists
export async function executeWaitNode(
    config: WaitNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const duration = interpolateVariables(config.duration, context);
    await sleep(parseDuration(duration));
    return context; // Passthrough
}
```

**File**: `backend/src/temporal/activities/node-executors/loop-executor.ts`

```typescript
// Loop executor exists - uses Temporal's child workflow pattern
export interface LoopNodeConfig {
    arrayPath: string; // JSONPath to array
    itemVariable: string; // Variable name for current item
    indexVariable?: string; // Variable name for index
    batchSize?: number;
    concurrency?: number;
}
```

### Variable Interpolation Utility

**File**: `backend/src/temporal/activities/node-executors/utils.ts`

```typescript
// Already available for all executors
export function interpolateVariables(template: string, context: JsonObject): string {
    return template.replace(/\$\{([^}]+)\}/g, (match, key) => {
        const value = context[key];
        return value !== undefined ? String(value) : match;
    });
}
```

---

## Nodes (5)

| Node       | Description                          | Category           | Status           |
| ---------- | ------------------------------------ | ------------------ | ---------------- |
| **Input**  | Entry point for workflow data        | tools/flow-control | Exists - enhance |
| **Output** | Exit point with formatted results    | tools/flow-control | Exists - enhance |
| **Router** | Conditional branching (multi-output) | tools/flow-control | NEW              |
| **Loop**   | Iterate over arrays                  | tools/flow-control | Exists - enhance |
| **Wait**   | Delay execution                      | tools/flow-control | Exists - enhance |

---

## Node Specifications

### Input Node

**Purpose**: Entry point that defines workflow input schema and initial data

**Config**:

```typescript
interface InputNodeConfig {
    inputType: "manual" | "json" | "csv" | "form";
    schema?: JsonSchema; // Optional validation schema
    sampleData?: JsonValue; // For testing in canvas
    description?: string; // Document expected input
    requiredFields?: string[];
}
```

**Execution**:

```typescript
// No execution needed - data passed from trigger/manual run
// Validates against schema if provided
export async function executeInputNode(
    config: InputNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    if (config.schema) {
        const valid = validateSchema(context.input, config.schema);
        if (!valid) throw new ValidationError("Input does not match schema");
    }
    return { ...context, ...context.input };
}
```

**Outputs**: `data` (any) - the workflow input

### Output Node

**Purpose**: Format and return workflow results

**Config**:

```typescript
interface OutputNodeConfig {
    format: "json" | "text" | "file";
    template?: string; // For text format: "Result: ${summary}"
    fields?: string[]; // Fields to include in output
    outputVariable?: string; // Name for output
}
```

**Execution**:

```typescript
export async function executeOutputNode(
    config: OutputNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    let output: JsonValue;

    switch (config.format) {
        case "json":
            output = config.fields ? pick(context, config.fields) : context;
            break;
        case "text":
            output = interpolateVariables(config.template || "", context);
            break;
        case "file":
            output = await generateFile(context, config);
            break;
    }

    return { output };
}
```

**Inputs**: `data` (any)
**Outputs**: Formatted result

### Router Node (NEW)

**Purpose**: Branch workflow based on conditions with multiple named outputs

**Config**:

```typescript
interface RouterNodeConfig {
    conditions: Array<{
        name: string; // Output handle name
        expression: string; // JS expression: "data.type === 'urgent'"
        description?: string;
    }>;
    defaultOutput: string; // Fallback output name
    evaluationMode: "first" | "all"; // First match or all matches
}
```

**Frontend** - Dynamic handles based on conditions:

```typescript
// RouterNode.tsx
function RouterNode({ data, selected }: NodeProps<RouterNodeData>) {
    const conditions = data.conditions || [];

    const customHandles = (
        <>
            {conditions.map((cond, i) => (
                <Handle
                    key={cond.name}
                    type="source"
                    position={Position.Bottom}
                    id={cond.name}
                    style={{ left: `${(i + 1) * (100 / (conditions.length + 1))}%` }}
                />
            ))}
        </>
    );

    return (
        <BaseNode
            icon={GitBranch}
            label={data.label || "Router"}
            category="tools"
            subcategory="flow-control"
            customHandles={customHandles}
            hasOutputHandle={false}  // Using custom handles
            configPreview={`${conditions.length} conditions`}
        />
    );
}
```

**Execution**:

```typescript
export async function executeRouterNode(
    config: RouterNodeConfig,
    context: JsonObject
): Promise<JsonObject & { __routeOutputs: string[] }> {
    const matchedOutputs: string[] = [];

    for (const condition of config.conditions) {
        const result = evaluateExpression(condition.expression, context);
        if (result) {
            matchedOutputs.push(condition.name);
            if (config.evaluationMode === "first") break;
        }
    }

    if (matchedOutputs.length === 0) {
        matchedOutputs.push(config.defaultOutput);
    }

    // __routeOutputs tells orchestrator which edges to follow
    return { ...context, __routeOutputs: matchedOutputs };
}
```

### Loop Node

**Purpose**: Iterate over array items, executing downstream nodes for each

**Config**:

```typescript
interface LoopNodeConfig {
    arrayPath: string; // JSONPath: "$.items" or "data.users"
    itemVariable: string; // "item"
    indexVariable?: string; // "index"
    batchSize?: number; // Process N items at a time
    concurrency?: number; // Parallel executions (1 = sequential)
    breakCondition?: string; // Exit early: "item.done === true"
}
```

**Frontend** - Shows loop body output handle:

```typescript
function LoopNode({ data, selected }: NodeProps<LoopNodeData>) {
    const customHandles = (
        <>
            <Handle type="source" position={Position.Bottom} id="loop" style={{ left: "35%" }} />
            <Handle type="source" position={Position.Bottom} id="complete" style={{ left: "65%" }} />
        </>
    );

    return (
        <BaseNode
            icon={Repeat}
            label={data.label || "Loop"}
            category="tools"
            configPreview={data.arrayPath ? `Over: ${data.arrayPath}` : "Configure array"}
            customHandles={customHandles}
            hasOutputHandle={false}
            outputs={[
                { name: data.itemVariable || "item", type: "any" },
                { name: data.indexVariable || "index", type: "number" }
            ]}
        />
    );
}
```

**Execution**: Uses Temporal child workflow for each iteration

### Wait Node

**Purpose**: Pause execution for a duration or until a time

**Config**:

```typescript
interface WaitNodeConfig {
    waitType: "duration" | "until" | "trigger";
    duration?: string; // "5s", "1m", "2h"
    until?: string; // ISO datetime or expression
    triggerEvent?: string; // Resume on event
    outputVariable?: string;
}
```

**Execution**:

```typescript
export async function executeWaitNode(
    config: WaitNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    switch (config.waitType) {
        case "duration":
            const ms = parseDuration(config.duration || "0s");
            await sleep(ms);
            break;
        case "until":
            const targetTime = new Date(interpolateVariables(config.until!, context));
            const waitMs = targetTime.getTime() - Date.now();
            if (waitMs > 0) await sleep(waitMs);
            break;
        case "trigger":
            // Uses Temporal signal to resume
            await waitForSignal(config.triggerEvent!);
            break;
    }

    return context; // Passthrough
}
```

---

## Unit Tests

### Test Pattern

**Pattern A (Pure Logic)**: These nodes have no external dependencies - test executors directly without mocking.

### Files to Create

| Executor | Test File                                                                | Pattern |
| -------- | ------------------------------------------------------------------------ | ------- |
| Input    | `backend/tests/unit/node-executors/flow-control/input-executor.test.ts`  | A       |
| Output   | `backend/tests/unit/node-executors/flow-control/output-executor.test.ts` | A       |
| Router   | `backend/tests/unit/node-executors/flow-control/router-executor.test.ts` | A       |
| Loop     | `backend/tests/unit/node-executors/flow-control/loop-executor.test.ts`   | A       |
| Wait     | `backend/tests/unit/node-executors/flow-control/wait-executor.test.ts`   | A       |

### Required Test Cases

#### input-executor.test.ts

- `should pass through input data to context variables`
- `should validate input against schema when provided`
- `should set default values for missing fields`

#### output-executor.test.ts

- `should format output according to template`
- `should extract specified fields from context`
- `should handle missing variables gracefully`

#### router-executor.test.ts

- `should route to first matching condition`
- `should fall back to default when no match`
- `should return all matches in "all" mode`
- `should throw on invalid expression syntax`
- `should handle nested property access in expressions`
- `should evaluate multiple conditions in order`

#### loop-executor.test.ts

- `should iterate over array items`
- `should provide item and index variables`
- `should respect batch size configuration`
- `should handle empty arrays`
- `should break early when break condition met`

#### wait-executor.test.ts

- `should delay execution by specified duration`
- `should parse duration strings (1s, 5m, 1h)`
- `should interpolate duration from variables`
- `should passthrough context unchanged`

---

## Test Workflow: Simple Data Routing

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Input     │───▶│   Router     │───▶│  Output A   │
│  (data)     │    │ type === "A" │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
                          │
                          └───────────▶┌─────────────┐
                             default   │  Output B   │
                                       └─────────────┘
```

**Test Data**:

```json
{ "type": "A", "value": 100 }
```

**Expected**: Routes to Output A (first condition matches)

---

## Files to Create/Modify

### Frontend Components

```
frontend/src/canvas/nodes/
├── InputNode.tsx           # Enhance existing
├── OutputNode.tsx          # Enhance existing
├── RouterNode.tsx          # NEW - multi-output conditional
├── LoopNode.tsx            # Enhance existing
├── WaitNode.tsx            # Enhance existing
└── configs/
    ├── InputNodeConfig.tsx
    ├── OutputNodeConfig.tsx
    ├── RouterNodeConfig.tsx   # NEW - condition builder UI
    ├── LoopNodeConfig.tsx
    └── WaitNodeConfig.tsx
```

### Backend Executors

```
backend/src/temporal/activities/node-executors/
├── input-executor.ts       # Schema validation
├── output-executor.ts      # Formatting logic
├── router-executor.ts      # NEW - expression evaluation
├── loop-executor.ts        # Iteration with child workflows
└── wait-executor.ts        # Duration/until/trigger
```

### Shared Expression Evaluator

```typescript
// backend/src/shared/expression-evaluator.ts
// Safe JavaScript expression evaluation for Router conditions

import { createContext, runInContext } from "vm";

/**
 * Safely evaluate a JavaScript expression with limited operations.
 *
 * Allowed:
 * - Property access: data.type, user.email, items[0]
 * - Comparisons: ==, ===, !=, !==, >, <, >=, <=
 * - Logical operators: &&, ||, !
 * - Arithmetic: +, -, *, /, %
 * - Literals: strings, numbers, booleans, null
 * - typeof operator
 *
 * NOT Allowed:
 * - Function calls: data.toString(), fetch(), eval()
 * - Object construction: new Date(), {}
 * - Assignment: =, +=, etc.
 * - Global access: window, process, require
 */
export function evaluateExpression(expression: string, context: JsonObject): boolean {
    // Validate expression doesn't contain dangerous patterns
    const dangerousPatterns = [
        /\bfunction\b/,
        /\bnew\b/,
        /\beval\b/,
        /\bFunction\b/,
        /\brequire\b/,
        /\bimport\b/,
        /\bprocess\b/,
        /\bglobal\b/,
        /\bwindow\b/,
        /\bdocument\b/,
        /\.__proto__/,
        /\bconstructor\b/,
        /\[["']constructor["']\]/
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(expression)) {
            throw new Error(`Unsafe expression: ${expression}`);
        }
    }

    // Create sandboxed context with only the workflow context
    const sandbox = createContext({
        ...context,
        // Add safe utilities
        typeof: (val: unknown) => typeof val,
        Array: { isArray: Array.isArray },
        String: { prototype: {} },
        Number: { isNaN, isFinite }
    });

    try {
        const result = runInContext(`Boolean(${expression})`, sandbox, {
            timeout: 100, // 100ms max execution
            displayErrors: false
        });
        return Boolean(result);
    } catch (error) {
        throw new Error(`Expression evaluation failed: ${expression} - ${error.message}`);
    }
}

// Example usage:
// evaluateExpression("data.type === 'urgent'", { data: { type: "urgent" } }) // true
// evaluateExpression("score > 80 && status !== 'rejected'", { score: 95, status: "pending" }) // true
// evaluateExpression("items.length > 0", { items: [1, 2, 3] }) // true
```

### Expression Examples for Router

| Condition          | Expression                                               |
| ------------------ | -------------------------------------------------------- |
| Type check         | `data.type === "urgent"`                                 |
| Numeric comparison | `data.score >= 80`                                       |
| Null check         | `data.email != null`                                     |
| Array length       | `items.length > 0`                                       |
| Boolean field      | `user.isVerified === true`                               |
| Combined           | `data.priority === "high" && data.status !== "resolved"` |
| Nested property    | `order.customer.tier === "premium"`                      |
| In range           | `value >= 10 && value <= 100`                            |

---

## Node Registration

```typescript
// frontend/src/config/node-registrations/flow-control.ts
import { registerNode } from "../node-registry";

registerNode({
    type: "input",
    label: "Input",
    description: "Entry point for workflow data",
    category: "tools",
    subcategory: "flow-control",
    icon: "ArrowDownToLine",
    keywords: ["start", "entry", "begin", "data", "input"]
});

registerNode({
    type: "output",
    label: "Output",
    description: "Format and return workflow results",
    category: "tools",
    subcategory: "flow-control",
    icon: "ArrowUpFromLine",
    keywords: ["end", "result", "return", "finish", "output"]
});

registerNode({
    type: "router",
    label: "Router",
    description: "Branch workflow based on conditions",
    category: "tools",
    subcategory: "flow-control",
    icon: "GitBranch",
    keywords: ["if", "condition", "branch", "switch", "route"]
});

registerNode({
    type: "loop",
    label: "Loop",
    description: "Iterate over array items",
    category: "tools",
    subcategory: "flow-control",
    icon: "Repeat",
    keywords: ["for", "each", "iterate", "array", "loop", "repeat"]
});

registerNode({
    type: "wait",
    label: "Wait",
    description: "Pause execution for a duration",
    category: "tools",
    subcategory: "flow-control",
    icon: "Clock",
    keywords: ["delay", "pause", "sleep", "timer", "wait"]
});
```

---

## How to Deliver

1. Register all 5 nodes in node-registry
2. Enhance existing InputNode with schema validation UI
3. Enhance existing OutputNode with format options
4. Create RouterNode with dynamic output handles
5. Enhance LoopNode with batch/concurrency options
6. Enhance WaitNode with until/trigger options
7. Create/update config forms for each node
8. Implement/update backend executors
9. Add expression evaluator for Router conditions
10. Test each node individually
11. Test the routing workflow end-to-end

---

## How to Test

| Test                        | Expected Result                           |
| --------------------------- | ----------------------------------------- |
| Drag Input node to canvas   | Node appears with Tools/slate styling     |
| Configure Input schema      | Schema editor works                       |
| Configure Router conditions | Output handles appear dynamically         |
| Run routing workflow        | Data routes to correct output             |
| Configure Loop with array   | Items processed with item/index variables |
| Set Wait to 5 seconds       | Execution pauses for 5 seconds            |
| Wait until specific time    | Resumes at correct time                   |

### Integration Test

```typescript
describe("Flow Control Nodes", () => {
    it("routes data based on condition", async () => {
        const result = await executeWorkflow(
            {
                nodes: {
                    input: { type: "input", config: {} },
                    router: {
                        type: "router",
                        config: {
                            conditions: [{ name: "typeA", expression: "data.type === 'A'" }],
                            defaultOutput: "other"
                        }
                    },
                    outputA: { type: "output", config: { format: "json" } },
                    outputOther: { type: "output", config: { format: "json" } }
                },
                edges: [
                    { source: "input", target: "router" },
                    { source: "router", target: "outputA", sourceHandle: "typeA" },
                    { source: "router", target: "outputOther", sourceHandle: "other" }
                ]
            },
            { input: { type: "A", value: 100 } }
        );

        expect(result.executedNodes).toContain("outputA");
        expect(result.executedNodes).not.toContain("outputOther");
    });

    it("loops over array items", async () => {
        const result = await executeWorkflow(
            {
                nodes: {
                    input: { type: "input" },
                    loop: {
                        type: "loop",
                        config: { arrayPath: "$.items", itemVariable: "item" }
                    },
                    transform: { type: "transform", config: { expression: "item.toUpperCase()" } }
                },
                edges: [
                    { source: "input", target: "loop" },
                    { source: "loop", target: "transform", sourceHandle: "loop" }
                ]
            },
            { input: { items: ["a", "b", "c"] } }
        );

        expect(result.output).toEqual(["A", "B", "C"]);
    });
});
```

---

## Acceptance Criteria

- [ ] Input node validates against schema if provided
- [ ] Input node shows sample data preview in canvas
- [ ] Output node formats data correctly (JSON, text, file)
- [ ] Router evaluates JavaScript expressions safely
- [ ] Router creates dynamic output handles based on conditions
- [ ] Router supports default/fallback output
- [ ] Loop iterates over array from JSONPath
- [ ] Loop provides item and index variables
- [ ] Loop respects batch size and concurrency limits
- [ ] Wait delays execution accurately (±100ms)
- [ ] Wait supports "until specific time"
- [ ] Wait can resume on external trigger (Temporal signal)
- [ ] All nodes display with Tools category styling (slate)
- [ ] All nodes appear in Node Library under Tools → Flow Control
- [ ] All nodes work with variable interpolation (`${varName}`)

---

## Dependencies

These nodes are fundamental building blocks used by all subsequent phases.
