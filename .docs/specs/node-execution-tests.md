# Node Testing Framework Specification

## Purpose

**INTERNAL DEVELOPER TOOL ONLY** - This framework is for developers to write regression tests for workflow node implementations. Since no real-world workflows exist yet, these tests will catch bugs, validate node behavior, and serve as executable documentation before nodes are integrated into production workflows.

## Quick Start

**What you're building:** A test framework that runs individual workflow nodes in isolation (without Temporal orchestrator) to validate their behavior.

**Why it matters:** No real workflows = bugs undiscovered. These tests catch issues before users build workflows.

**How it works:**

```
NodeTestRunner → calls executeNode() → runs actual node executor → returns outputs → validate with assertions
```

## Prerequisites

Before starting implementation:

1. **Understand node architecture** - Read `backend/src/temporal/activities/node-executors/index.ts`
2. **Familiar with Jest** - Tests use Jest framework
3. **Know variable interpolation** - Understand `${variable}` syntax in node configs
4. **Context concept** - Context is accumulated outputs from previous nodes in a workflow

## Key Concepts

### What is Context?

In production workflows, **context** accumulates outputs from all previous nodes. Each node adds its outputs to the context, making them available to downstream nodes.

**Example workflow context flow:**

```typescript
// Workflow starts
context = { userId: "123" }

// After HTTP node executes
context = { userId: "123", httpResponse: { status: 200, data: {...} } }

// After LLM node executes
context = { userId: "123", httpResponse: {...}, llmOutput: "Generated text" }
```

### What are Node Outputs?

Each node returns a plain object with its results. Common output patterns:

```typescript
// HTTP Node
{ status: 200, data: {...}, headers: {...} }

// LLM Node
{ text: "Generated response", usage: { tokens: 150 } }

// Transform Node
{ result: [...transformed data...] }

// Database Node
{ rows: [...], rowCount: 5 }

// Conditional Node
{ result: true, branch: "then" }
```

### How Tests Differ from Workflow Integration Tests

| Aspect           | Node Tests (this spec)      | Workflow Integration Tests        |
| ---------------- | --------------------------- | --------------------------------- |
| **Scope**        | Single node in isolation    | Full workflow with multiple nodes |
| **Execution**    | Direct `executeNode()` call | Temporal orchestrator             |
| **Speed**        | Fast (~50ms per test)       | Slow (~5s per workflow)           |
| **Dependencies** | No Temporal worker needed   | Requires Temporal worker running  |
| **Purpose**      | Validate node logic         | Validate workflow orchestration   |

## Architecture Overview

### How Node Testing Works

```
┌────────────────────────────────────────────────────────────┐
│  Test File (http-node.test.ts)                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  describe("HTTP Node", () => {                        │ │
│  │    it("should make GET request", async () => {        │ │
│  │      const result = await runner.executeNode({        │ │
│  │        nodeType: "http",                              │ │
│  │        nodeConfig: { method: "GET", url: "..." },     │ │
│  │        context: {}                                    │ │
│  │      });                                              │ │
│  │    });                                                │ │
│  │  });                                                  │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│  NodeTestRunner                                            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  async executeNode(testCase) {                        │ │
│  │    return await executeNode({                         │ │
│  │      nodeType,                                        │ │
│  │      nodeConfig,                                      │ │
│  │      context                                          │ │
│  │    });                                                │ │
│  │  }                                                    │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│  executeNode() - Router (index.ts)                         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  switch (nodeType) {                                  │ │
│  │    case "http": return executeHTTPNode(config, ctx);  │ │
│  │    case "llm": return executeLLMNode(config, ctx);    │ │
│  │    ...                                                │ │
│  │  }                                                    │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│  Actual Node Executor (http-executor.ts)                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  async function executeHTTPNode(config, context) {    │ │
│  │    const url = interpolateVariables(config.url, ctx); │ │
│  │    const response = await fetch(url);                 │ │
│  │    return { status, data };                           │ │
│  │  }                                                    │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### File Structure

```
backend/
├── src/
│   └── temporal/
│       └── activities/
│           └── node-executors/
│               ├── index.ts              # executeNode() router
│               ├── utils.ts              # interpolateVariables()
│               ├── http-executor.ts      # HTTP node implementation
│               └── llm-executor.ts       # LLM node implementation
└── tests/
    ├── helpers/
    │   ├── NodeTestRunner.ts             # [CREATE] Test execution wrapper
    │   └── NodeAssertions.ts             # [CREATE] Assertion utilities
    └── node-tests/
        ├── http-node.test.ts             # [CREATE] HTTP node tests
        ├── llm-node.test.ts              # [CREATE] LLM node tests
        ├── transform-node.test.ts        # [CREATE] Transform node tests
        └── database-node.test.ts         # [CREATE] Database node tests
```

## Complete Example Walkthrough

Let's walk through creating a complete test file from scratch.

### Step 1: Create Test File

**File:** `backend/tests/node-tests/http-node.test.ts`

```typescript
import { NodeTestRunner } from "../helpers/NodeTestRunner";

describe("HTTP Node", () => {
    let runner: NodeTestRunner;

    beforeAll(() => {
        runner = new NodeTestRunner();
    });

    it("should make successful GET request", async () => {
        // Execute node with test config
        const result = await runner.executeNode({
            name: "GET request test",
            nodeType: "http",
            nodeConfig: {
                method: "GET",
                url: "https://jsonplaceholder.typicode.com/users/1"
            },
            context: {},
            timeout: 5000
        });

        // Validate outputs
        expect(result.success).toBe(true);
        expect(result.outputs).toBeDefined();
        expect(result.outputs?.status).toBe(200);
        expect(result.outputs?.data).toHaveProperty("id", 1);
        expect(result.duration).toBeLessThan(5000);
    });

    it("should interpolate variables in URL", async () => {
        const result = await runner.executeNode({
            name: "Variable interpolation test",
            nodeType: "http",
            nodeConfig: {
                method: "GET",
                url: "https://jsonplaceholder.typicode.com/users/${userId}"
            },
            context: {
                userId: 2 // This gets interpolated into URL
            }
        });

        expect(result.success).toBe(true);
        expect(result.outputs?.data).toHaveProperty("id", 2);
    });

    it("should handle errors gracefully", async () => {
        const result = await runner.executeNode({
            name: "Error handling test",
            nodeType: "http",
            nodeConfig: {
                method: "GET",
                url: "https://jsonplaceholder.typicode.com/invalid-endpoint"
            },
            context: {},
            expectError: true // Mark that we expect this to fail
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
});
```

### Step 2: Run Tests

```bash
# Run all node tests
npm run test:nodes

# Run specific test file
npm run test:nodes -- http-node.test.ts

# Run tests in watch mode
npm run test:nodes -- --watch
```

### Step 3: See Results

```
PASS  backend/tests/node-tests/http-node.test.ts
  HTTP Node
    ✓ should make successful GET request (324ms)
    ✓ should interpolate variables in URL (156ms)
    ✓ should handle errors gracefully (89ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

## Implementation Guide

### Phase 1: Core Test Runner (3-4 hours)

**Goal:** Get basic test execution working for HTTP nodes

#### 1.1 Create NodeTestRunner (~200 lines)

**File:** `backend/tests/helpers/NodeTestRunner.ts`

```typescript
import { executeNode, ExecuteNodeInput } from "../../src/temporal/activities/node-executors";
import type { JsonObject } from "@flowmaestro/shared";

export interface NodeTestCase {
    name: string;
    nodeType: string;
    nodeConfig: JsonObject;
    context?: JsonObject;
    timeout?: number;
    expectedOutputs?: JsonObject;
    expectError?: boolean;
}

export interface NodeTestResult {
    name: string;
    success: boolean;
    outputs?: JsonObject;
    error?: string;
    duration: number;
}

export class NodeTestRunner {
    private defaultTimeout = 30000;

    async executeNode(testCase: NodeTestCase): Promise<NodeTestResult> {
        const startTime = Date.now();
        const timeout = testCase.timeout || this.defaultTimeout;

        try {
            const executionPromise = this.runNode(testCase);
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
            });

            const outputs = await Promise.race([executionPromise, timeoutPromise]);

            if (testCase.expectedOutputs && !testCase.expectError) {
                this.validateOutputs(outputs, testCase.expectedOutputs);
            }

            return {
                name: testCase.name,
                success: true,
                outputs,
                duration: Date.now() - startTime
            };
        } catch (error) {
            return {
                name: testCase.name,
                success: testCase.expectError ? true : false,
                error: error instanceof Error ? error.message : String(error),
                duration: Date.now() - startTime
            };
        }
    }

    private async runNode(testCase: NodeTestCase): Promise<JsonObject> {
        return await executeNode({
            nodeType: testCase.nodeType,
            nodeConfig: testCase.nodeConfig,
            context: testCase.context || {}
        });
    }

    private validateOutputs(actual: JsonObject, expected: JsonObject): void {
        for (const [key, expectedValue] of Object.entries(expected)) {
            if (!(key in actual)) {
                throw new Error(`Expected output "${key}" not found`);
            }
            const actualValue = actual[key];
            if (typeof expectedValue === "object" && expectedValue !== null) {
                if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
                    throw new Error(
                        `"${key}" mismatch.\nExpected: ${JSON.stringify(expectedValue)}\nActual: ${JSON.stringify(actualValue)}`
                    );
                }
            } else if (actualValue !== expectedValue) {
                throw new Error(
                    `"${key}" mismatch. Expected: ${expectedValue}, Actual: ${actualValue}`
                );
            }
        }
    }

    async executeBatch(cases: NodeTestCase[]): Promise<NodeTestResult[]> {
        return Promise.all(cases.map((testCase) => this.executeNode(testCase)));
    }
}
```

#### 1.2 Create HTTP Node Tests (~150 lines)

**File:** `backend/tests/node-tests/http-node.test.ts`

See "Complete Example Walkthrough" above for full implementation.

#### 1.3 Add npm Script

**File:** `backend/package.json`

```json
{
    "scripts": {
        "test:nodes": "jest --testMatch='**/tests/node-tests/**/*.test.ts'"
    }
}
```

### Phase 2: Assertion Library + Transform Tests (2-3 hours)

#### 2.1 Create NodeAssertions (~150 lines)

**File:** `backend/tests/helpers/NodeAssertions.ts`

```typescript
import type { NodeTestResult } from "./NodeTestRunner";
import type { JsonObject } from "@flowmaestro/shared";

export class NodeAssertions {
    /**
     * Assert that result contains expected outputs
     */
    static assertOutputContains(result: NodeTestResult, expected: JsonObject): void {
        if (!result.success) {
            throw new Error(`Test failed: ${result.error}`);
        }

        if (!result.outputs) {
            throw new Error("No outputs returned");
        }

        for (const [key, expectedValue] of Object.entries(expected)) {
            if (!(key in result.outputs)) {
                throw new Error(`Expected output "${key}" not found`);
            }

            const actualValue = result.outputs[key];

            if (typeof expectedValue === "object" && expectedValue !== null) {
                if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
                    throw new Error(
                        `Output "${key}" mismatch.\nExpected: ${JSON.stringify(expectedValue)}\nActual: ${JSON.stringify(actualValue)}`
                    );
                }
            } else if (actualValue !== expectedValue) {
                throw new Error(
                    `Output "${key}" mismatch.\nExpected: ${expectedValue}\nActual: ${actualValue}`
                );
            }
        }
    }

    /**
     * Assert that a numeric field is within a range
     */
    static assertFieldInRange(
        result: NodeTestResult,
        field: string,
        min: number,
        max: number
    ): void {
        if (!result.success || !result.outputs) {
            throw new Error("Cannot assert on failed result");
        }

        const value = this.getNestedValue(result.outputs, field);

        if (typeof value !== "number") {
            throw new Error(`Field "${field}" is not a number: ${typeof value}`);
        }

        if (value < min || value > max) {
            throw new Error(`Field "${field}" value ${value} not in range [${min}, ${max}]`);
        }
    }

    /**
     * Assert that a field matches a regex pattern
     */
    static assertFieldMatches(result: NodeTestResult, field: string, pattern: RegExp): void {
        if (!result.success || !result.outputs) {
            throw new Error("Cannot assert on failed result");
        }

        const value = this.getNestedValue(result.outputs, field);

        if (typeof value !== "string") {
            throw new Error(`Field "${field}" is not a string`);
        }

        if (!pattern.test(value)) {
            throw new Error(`Field "${field}" value "${value}" does not match pattern ${pattern}`);
        }
    }

    /**
     * Assert that an array field has expected length
     */
    static assertArrayLength(result: NodeTestResult, field: string, expectedLength: number): void {
        if (!result.success || !result.outputs) {
            throw new Error("Cannot assert on failed result");
        }

        const value = this.getNestedValue(result.outputs, field);

        if (!Array.isArray(value)) {
            throw new Error(`Field "${field}" is not an array`);
        }

        if (value.length !== expectedLength) {
            throw new Error(
                `Field "${field}" length ${value.length} does not match expected ${expectedLength}`
            );
        }
    }

    /**
     * Get nested value from object using dot notation
     */
    private static getNestedValue(obj: JsonObject, path: string): unknown {
        const keys = path.split(".");
        let value: unknown = obj;

        for (const key of keys) {
            if (value === null || typeof value !== "object") {
                throw new Error(`Cannot access "${key}" on non-object`);
            }
            value = (value as Record<string, unknown>)[key];
        }

        return value;
    }
}
```

#### 2.2 Create Transform Node Tests

**File:** `backend/tests/node-tests/transform-node.test.ts`

```typescript
import { NodeTestRunner } from "../helpers/NodeTestRunner";
import { NodeAssertions } from "../helpers/NodeAssertions";

describe("Transform Node", () => {
    let runner: NodeTestRunner;

    beforeAll(() => {
        runner = new NodeTestRunner();
    });

    it("should map array", async () => {
        const result = await runner.executeNode({
            name: "Map operation",
            nodeType: "transform",
            nodeConfig: {
                operation: "map",
                input: "${users}",
                expression: "{ name: $.name, upper: $uppercase($.name) }"
            },
            context: {
                users: [
                    { name: "Alice", age: 30 },
                    { name: "Bob", age: 25 }
                ]
            }
        });

        expect(result.success).toBe(true);
        NodeAssertions.assertOutputContains(result, {
            result: [
                { name: "Alice", upper: "ALICE" },
                { name: "Bob", upper: "BOB" }
            ]
        });
    });

    it("should filter array", async () => {
        const result = await runner.executeNode({
            name: "Filter operation",
            nodeType: "transform",
            nodeConfig: {
                operation: "filter",
                input: "${numbers}",
                expression: "$ > 5"
            },
            context: {
                numbers: [1, 3, 5, 7, 9]
            }
        });

        NodeAssertions.assertOutputContains(result, {
            result: [7, 9]
        });
        NodeAssertions.assertArrayLength(result, "result", 2);
    });
});
```

### Phase 3: Comprehensive Node Coverage (4-5 hours)

Create test files for remaining node types:

- `llm-node.test.ts` - See "Mocking External Services" section
- `database-node.test.ts` - See "Mocking External Services" section
- `conditional-node.test.ts` - See "Test Scenarios" section
- `error-handling.test.ts` - General error cases

### Phase 4: CI/CD Integration (1-2 hours)

**File:** `.github/workflows/node-tests.yml`

```yaml
name: Node Tests

on:
    push:
        branches: [main, develop]
    pull_request:
        branches: [main, develop]

jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - uses: actions/setup-node@v3
              with:
                  node-version: "20"
            - run: npm ci
            - run: npm run test:nodes
```

## Mocking External Services

### HTTP Nodes - Use JSONPlaceholder

```typescript
describe("HTTP Node", () => {
    it("should make GET request", async () => {
        const result = await runner.executeNode({
            name: "GET request",
            nodeType: "http",
            nodeConfig: {
                method: "GET",
                url: "https://jsonplaceholder.typicode.com/users/1" // Free mock API
            },
            context: {}
        });

        expect(result.success).toBe(true);
        expect(result.outputs?.status).toBe(200);
        expect(result.outputs?.data).toHaveProperty("id");
    });
});
```

### LLM Nodes - Mock API Calls

Mock the actual LLM provider APIs to avoid requiring real API keys and ensure consistent test results.

```typescript
import { NodeTestRunner } from "../helpers/NodeTestRunner";

// Mock the fetch function used by LLM executor
global.fetch = jest.fn();

describe("LLM Node", () => {
    let runner: NodeTestRunner;

    beforeAll(() => {
        runner = new NodeTestRunner();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should call OpenAI API successfully", async () => {
        // Mock OpenAI API response
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [
                    {
                        message: {
                            content: "This is a test response",
                            role: "assistant"
                        },
                        finish_reason: "stop"
                    }
                ],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 20,
                    total_tokens: 30
                }
            })
        });

        const result = await runner.executeNode({
            name: "OpenAI test",
            nodeType: "llm",
            nodeConfig: {
                provider: "openai",
                model: "gpt-4",
                prompt: "Test prompt",
                temperature: 0.7
            },
            context: {}
        });

        expect(result.success).toBe(true);
        expect(result.outputs?.text).toBe("This is a test response");
        expect(result.outputs?.usage?.total_tokens).toBe(30);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("openai.com"),
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    "Content-Type": "application/json"
                })
            })
        );
    });

    it("should interpolate variables in prompt", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: "Response", role: "assistant" } }],
                usage: { total_tokens: 20 }
            })
        });

        const result = await runner.executeNode({
            name: "Variable interpolation",
            nodeType: "llm",
            nodeConfig: {
                provider: "openai",
                model: "gpt-4",
                prompt: "Summarize this: ${article}"
            },
            context: {
                article: "FlowMaestro is a workflow automation platform."
            }
        });

        expect(result.success).toBe(true);

        // Verify the prompt was interpolated correctly
        const callArgs = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        expect(body.messages[0].content).toContain("FlowMaestro is a workflow automation platform");
    });

    it("should handle API errors gracefully", async () => {
        // Mock API error
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 429,
            statusText: "Too Many Requests",
            json: async () => ({
                error: {
                    message: "Rate limit exceeded",
                    type: "rate_limit_error"
                }
            })
        });

        const result = await runner.executeNode({
            name: "API error",
            nodeType: "llm",
            nodeConfig: {
                provider: "openai",
                model: "gpt-4",
                prompt: "Test"
            },
            context: {},
            expectError: true
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Rate limit");
    });

    it("should support multiple providers", async () => {
        // Test Anthropic
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                content: [{ text: "Claude response" }],
                usage: { input_tokens: 10, output_tokens: 15 }
            })
        });

        const result = await runner.executeNode({
            name: "Anthropic test",
            nodeType: "llm",
            nodeConfig: {
                provider: "anthropic",
                model: "claude-3-5-sonnet-20241022",
                prompt: "Test prompt"
            },
            context: {}
        });

        expect(result.success).toBe(true);
        expect(result.outputs?.text).toBe("Claude response");
    });
});
```

### Database Nodes - Use SQLite In-Memory

```typescript
describe("Database Node", () => {
    const testDbUrl = "sqlite::memory:";

    beforeAll(async () => {
        // Set up test database with sample data
        await setupTestDatabase(testDbUrl);
    });

    it("should execute SELECT query", async () => {
        const result = await runner.executeNode({
            name: "SELECT query",
            nodeType: "database",
            nodeConfig: {
                connectionString: testDbUrl,
                query: "SELECT * FROM test_users WHERE id = 1"
            },
            context: {}
        });

        expect(result.success).toBe(true);
        expect(result.outputs?.rows).toHaveLength(1);
    });
});
```

### Transform Nodes - Pure Logic

No mocking needed - these are pure functions with no external dependencies.

## Additional Node Type Examples

### Conditional Node Tests

**File:** `backend/tests/node-tests/conditional-node.test.ts`

```typescript
import { NodeTestRunner } from "../helpers/NodeTestRunner";

describe("Conditional Node", () => {
    let runner: NodeTestRunner;

    beforeAll(() => {
        runner = new NodeTestRunner();
    });

    it("should evaluate simple equality condition", async () => {
        const result = await runner.executeNode({
            name: "Equality test",
            nodeType: "conditional",
            nodeConfig: {
                condition: {
                    leftOperand: "${status}",
                    operator: "==",
                    rightOperand: "success"
                }
            },
            context: {
                status: "success"
            }
        });

        expect(result.success).toBe(true);
        expect(result.outputs?.result).toBe(true);
        expect(result.outputs?.branch).toBe("then");
    });

    it("should evaluate numeric comparison", async () => {
        const result = await runner.executeNode({
            name: "Greater than test",
            nodeType: "conditional",
            nodeConfig: {
                condition: {
                    leftOperand: "${count}",
                    operator: ">",
                    rightOperand: "10"
                }
            },
            context: {
                count: 15
            }
        });

        expect(result.outputs?.result).toBe(true);
    });

    it("should handle AND logic", async () => {
        const result = await runner.executeNode({
            name: "AND condition",
            nodeType: "conditional",
            nodeConfig: {
                condition: {
                    logic: "AND",
                    conditions: [
                        {
                            leftOperand: "${age}",
                            operator: ">=",
                            rightOperand: "18"
                        },
                        {
                            leftOperand: "${hasLicense}",
                            operator: "==",
                            rightOperand: "true"
                        }
                    ]
                }
            },
            context: {
                age: 25,
                hasLicense: true
            }
        });

        expect(result.outputs?.result).toBe(true);
    });

    it("should handle OR logic", async () => {
        const result = await runner.executeNode({
            name: "OR condition",
            nodeType: "conditional",
            nodeConfig: {
                condition: {
                    logic: "OR",
                    conditions: [
                        {
                            leftOperand: "${isAdmin}",
                            operator: "==",
                            rightOperand: "true"
                        },
                        {
                            leftOperand: "${isModerator}",
                            operator: "==",
                            rightOperand: "true"
                        }
                    ]
                }
            },
            context: {
                isAdmin: false,
                isModerator: true
            }
        });

        expect(result.outputs?.result).toBe(true);
    });

    it("should handle null/undefined values", async () => {
        const result = await runner.executeNode({
            name: "Null check",
            nodeType: "conditional",
            nodeConfig: {
                condition: {
                    leftOperand: "${email}",
                    operator: "!=",
                    rightOperand: null
                }
            },
            context: {
                email: null
            }
        });

        expect(result.outputs?.result).toBe(false);
    });
});
```

### Variable Node Tests

**File:** `backend/tests/node-tests/variable-node.test.ts`

```typescript
import { NodeTestRunner } from "../helpers/NodeTestRunner";

describe("Variable Node", () => {
    let runner: NodeTestRunner;

    beforeAll(() => {
        runner = new NodeTestRunner();
    });

    it("should set a string variable", async () => {
        const result = await runner.executeNode({
            name: "Set string",
            nodeType: "variable",
            nodeConfig: {
                operation: "set",
                variableName: "greeting",
                value: "Hello, World!"
            },
            context: {}
        });

        expect(result.success).toBe(true);
        expect(result.outputs?.greeting).toBe("Hello, World!");
    });

    it("should set a variable with interpolation", async () => {
        const result = await runner.executeNode({
            name: "Set with interpolation",
            nodeType: "variable",
            nodeConfig: {
                operation: "set",
                variableName: "fullName",
                value: "${firstName} ${lastName}"
            },
            context: {
                firstName: "John",
                lastName: "Doe"
            }
        });

        expect(result.outputs?.fullName).toBe("John Doe");
    });

    it("should set an object variable", async () => {
        const result = await runner.executeNode({
            name: "Set object",
            nodeType: "variable",
            nodeConfig: {
                operation: "set",
                variableName: "user",
                value: {
                    id: 123,
                    name: "Alice",
                    active: true
                }
            },
            context: {}
        });

        expect(result.outputs?.user).toEqual({
            id: 123,
            name: "Alice",
            active: true
        });
    });

    it("should set an array variable", async () => {
        const result = await runner.executeNode({
            name: "Set array",
            nodeType: "variable",
            nodeConfig: {
                operation: "set",
                variableName: "numbers",
                value: [1, 2, 3, 4, 5]
            },
            context: {}
        });

        expect(result.outputs?.numbers).toEqual([1, 2, 3, 4, 5]);
    });

    it("should get an existing variable", async () => {
        const result = await runner.executeNode({
            name: "Get variable",
            nodeType: "variable",
            nodeConfig: {
                operation: "get",
                variableName: "existingVar"
            },
            context: {
                existingVar: "test value"
            }
        });

        expect(result.outputs?.value).toBe("test value");
    });

    it("should handle non-existent variable", async () => {
        const result = await runner.executeNode({
            name: "Get non-existent",
            nodeType: "variable",
            nodeConfig: {
                operation: "get",
                variableName: "nonExistent"
            },
            context: {}
        });

        expect(result.outputs?.value).toBeUndefined();
    });
});
```

### Wait Node Tests

**File:** `backend/tests/node-tests/wait-node.test.ts`

```typescript
import { NodeTestRunner } from "../helpers/NodeTestRunner";

describe("Wait Node", () => {
    let runner: NodeTestRunner;

    beforeAll(() => {
        runner = new NodeTestRunner();
    });

    it("should wait for specified duration", async () => {
        const startTime = Date.now();

        const result = await runner.executeNode({
            name: "Wait 100ms",
            nodeType: "wait",
            nodeConfig: {
                duration: 100 // milliseconds
            },
            context: {}
        });

        const endTime = Date.now();
        const elapsed = endTime - startTime;

        expect(result.success).toBe(true);
        expect(elapsed).toBeGreaterThanOrEqual(100);
        expect(elapsed).toBeLessThan(150); // Allow 50ms tolerance
    });

    it("should wait with seconds unit", async () => {
        const startTime = Date.now();

        const result = await runner.executeNode({
            name: "Wait 1 second",
            nodeType: "wait",
            nodeConfig: {
                duration: 1,
                unit: "seconds"
            },
            context: {},
            timeout: 2000
        });

        const elapsed = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(elapsed).toBeGreaterThanOrEqual(1000);
        expect(elapsed).toBeLessThan(1100);
    });

    it("should support variable interpolation for duration", async () => {
        const result = await runner.executeNode({
            name: "Wait dynamic",
            nodeType: "wait",
            nodeConfig: {
                duration: "${waitTime}"
            },
            context: {
                waitTime: 50
            }
        });

        expect(result.success).toBe(true);
        expect(result.duration).toBeGreaterThanOrEqual(50);
    });

    it("should return immediately for zero duration", async () => {
        const result = await runner.executeNode({
            name: "No wait",
            nodeType: "wait",
            nodeConfig: {
                duration: 0
            },
            context: {}
        });

        expect(result.success).toBe(true);
        expect(result.duration).toBeLessThan(10);
    });
});
```

### Echo Node Tests

**File:** `backend/tests/node-tests/echo-node.test.ts`

```typescript
import { NodeTestRunner } from "../helpers/NodeTestRunner";

describe("Echo Node", () => {
    let runner: NodeTestRunner;

    beforeAll(() => {
        runner = new NodeTestRunner();
    });

    it("should echo simple string", async () => {
        const result = await runner.executeNode({
            name: "Echo string",
            nodeType: "echo",
            nodeConfig: {
                message: "Hello, Echo!"
            },
            context: {}
        });

        expect(result.success).toBe(true);
        expect(result.outputs?.message).toBe("Hello, Echo!");
    });

    it("should echo with variable interpolation", async () => {
        const result = await runner.executeNode({
            name: "Echo interpolated",
            nodeType: "echo",
            nodeConfig: {
                message: "User ${userName} logged in at ${time}"
            },
            context: {
                userName: "alice",
                time: "10:30 AM"
            }
        });

        expect(result.outputs?.message).toBe("User alice logged in at 10:30 AM");
    });

    it("should echo objects", async () => {
        const testObject = {
            id: 123,
            name: "Test",
            nested: { value: 42 }
        };

        const result = await runner.executeNode({
            name: "Echo object",
            nodeType: "echo",
            nodeConfig: {
                message: testObject
            },
            context: {}
        });

        expect(result.outputs?.message).toEqual(testObject);
    });

    it("should echo arrays", async () => {
        const testArray = [1, 2, 3, 4, 5];

        const result = await runner.executeNode({
            name: "Echo array",
            nodeType: "echo",
            nodeConfig: {
                message: testArray
            },
            context: {}
        });

        expect(result.outputs?.message).toEqual(testArray);
    });
});
```

### Code Node Tests

**File:** `backend/tests/node-tests/code-node.test.ts`

```typescript
import { NodeTestRunner } from "../helpers/NodeTestRunner";

describe("Code Node", () => {
    let runner: NodeTestRunner;

    beforeAll(() => {
        runner = new NodeTestRunner();
    });

    it("should execute simple JavaScript", async () => {
        const result = await runner.executeNode({
            name: "Simple JS",
            nodeType: "code",
            nodeConfig: {
                language: "javascript",
                code: "return 2 + 2;"
            },
            context: {}
        });

        expect(result.success).toBe(true);
        expect(result.outputs?.result).toBe(4);
    });

    it("should access context variables", async () => {
        const result = await runner.executeNode({
            name: "Context access",
            nodeType: "code",
            nodeConfig: {
                language: "javascript",
                code: `
                    const sum = context.a + context.b;
                    return sum * 2;
                `
            },
            context: {
                a: 5,
                b: 10
            }
        });

        expect(result.outputs?.result).toBe(30);
    });

    it("should handle array operations", async () => {
        const result = await runner.executeNode({
            name: "Array operations",
            nodeType: "code",
            nodeConfig: {
                language: "javascript",
                code: `
                    const numbers = context.numbers;
                    const doubled = numbers.map(n => n * 2);
                    const sum = doubled.reduce((a, b) => a + b, 0);
                    return { doubled, sum };
                `
            },
            context: {
                numbers: [1, 2, 3, 4, 5]
            }
        });

        expect(result.outputs?.result.doubled).toEqual([2, 4, 6, 8, 10]);
        expect(result.outputs?.result.sum).toBe(30);
    });

    it("should handle string manipulation", async () => {
        const result = await runner.executeNode({
            name: "String operations",
            nodeType: "code",
            nodeConfig: {
                language: "javascript",
                code: `
                    const text = context.text;
                    return {
                        upper: text.toUpperCase(),
                        lower: text.toLowerCase(),
                        length: text.length,
                        reversed: text.split('').reverse().join('')
                    };
                `
            },
            context: {
                text: "Hello World"
            }
        });

        expect(result.outputs?.result.upper).toBe("HELLO WORLD");
        expect(result.outputs?.result.lower).toBe("hello world");
        expect(result.outputs?.result.length).toBe(11);
        expect(result.outputs?.result.reversed).toBe("dlroW olleH");
    });

    it("should handle errors in code", async () => {
        const result = await runner.executeNode({
            name: "Error handling",
            nodeType: "code",
            nodeConfig: {
                language: "javascript",
                code: `
                    throw new Error("Intentional test error");
                `
            },
            context: {},
            expectError: true
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Intentional test error");
    });

    it("should support async operations", async () => {
        const result = await runner.executeNode({
            name: "Async code",
            nodeType: "code",
            nodeConfig: {
                language: "javascript",
                code: `
                    async function process() {
                        await new Promise(resolve => setTimeout(resolve, 50));
                        return "async result";
                    }
                    return await process();
                `
            },
            context: {}
        });

        expect(result.success).toBe(true);
        expect(result.outputs?.result).toBe("async result");
    });
});
```

### Integration Node Tests

**File:** `backend/tests/node-tests/integration-node.test.ts`

```typescript
import { NodeTestRunner } from "../helpers/NodeTestRunner";

// Mock fetch for integration API calls
global.fetch = jest.fn();

describe("Integration Node", () => {
    let runner: NodeTestRunner;

    beforeAll(() => {
        runner = new NodeTestRunner();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Slack Integration", () => {
        it("should send Slack message successfully", async () => {
            // Mock Slack API response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    ok: true,
                    channel: "C1234567890",
                    ts: "1234567890.123456",
                    message: {
                        text: "Hello from FlowMaestro!",
                        user: "U1234567890"
                    }
                })
            });

            const result = await runner.executeNode({
                name: "Send Slack message",
                nodeType: "integration",
                nodeConfig: {
                    service: "slack",
                    action: "sendMessage",
                    connectionId: "slack-conn-123",
                    params: {
                        channel: "#general",
                        text: "Hello from FlowMaestro!",
                        username: "FlowBot"
                    }
                },
                context: {}
            });

            expect(result.success).toBe(true);
            expect(result.outputs?.ok).toBe(true);
            expect(result.outputs?.channel).toBe("C1234567890");
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("slack.com/api"),
                expect.objectContaining({
                    method: "POST"
                })
            );
        });

        it("should send Slack message with variable interpolation", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ok: true })
            });

            const result = await runner.executeNode({
                name: "Dynamic Slack message",
                nodeType: "integration",
                nodeConfig: {
                    service: "slack",
                    action: "sendMessage",
                    connectionId: "slack-conn-123",
                    params: {
                        channel: "${slackChannel}",
                        text: "User ${userName} completed task: ${taskName}"
                    }
                },
                context: {
                    slackChannel: "#notifications",
                    userName: "Alice",
                    taskName: "Deploy to production"
                }
            });

            expect(result.success).toBe(true);

            // Verify interpolation occurred
            const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            expect(body.text).toBe("User Alice completed task: Deploy to production");
            expect(body.channel).toBe("#notifications");
        });

        it("should handle Slack API errors", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    ok: false,
                    error: "channel_not_found"
                })
            });

            const result = await runner.executeNode({
                name: "Invalid channel",
                nodeType: "integration",
                nodeConfig: {
                    service: "slack",
                    action: "sendMessage",
                    connectionId: "slack-conn-123",
                    params: {
                        channel: "#nonexistent",
                        text: "Test"
                    }
                },
                context: {},
                expectError: true
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain("channel_not_found");
        });
    });

    describe("GitHub Integration", () => {
        it("should create GitHub issue", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 123456789,
                    number: 42,
                    title: "Bug: Login fails",
                    state: "open",
                    html_url: "https://github.com/org/repo/issues/42"
                })
            });

            const result = await runner.executeNode({
                name: "Create GitHub issue",
                nodeType: "integration",
                nodeConfig: {
                    service: "github",
                    action: "createIssue",
                    connectionId: "github-conn-123",
                    params: {
                        owner: "myorg",
                        repo: "myrepo",
                        title: "Bug: Login fails",
                        body: "Users are unable to login",
                        labels: ["bug", "high-priority"]
                    }
                },
                context: {}
            });

            expect(result.success).toBe(true);
            expect(result.outputs?.number).toBe(42);
            expect(result.outputs?.state).toBe("open");
            expect(result.outputs?.html_url).toContain("/issues/42");
        });

        it("should add comment to GitHub issue", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 987654321,
                    body: "This has been fixed",
                    created_at: "2025-01-01T12:00:00Z"
                })
            });

            const result = await runner.executeNode({
                name: "Add issue comment",
                nodeType: "integration",
                nodeConfig: {
                    service: "github",
                    action: "addIssueComment",
                    connectionId: "github-conn-123",
                    params: {
                        owner: "myorg",
                        repo: "myrepo",
                        issueNumber: "${issueNumber}",
                        body: "This has been fixed"
                    }
                },
                context: {
                    issueNumber: 42
                }
            });

            expect(result.success).toBe(true);
            expect(result.outputs?.body).toBe("This has been fixed");
        });
    });

    describe("Email Integration", () => {
        it("should send email via SMTP", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    messageId: "abc123@mail.example.com",
                    accepted: ["recipient@example.com"],
                    rejected: []
                })
            });

            const result = await runner.executeNode({
                name: "Send email",
                nodeType: "integration",
                nodeConfig: {
                    service: "email",
                    action: "send",
                    connectionId: "email-conn-123",
                    params: {
                        to: "recipient@example.com",
                        subject: "Workflow Completed",
                        body: "Your workflow has completed successfully.",
                        from: "noreply@flowmaestro.com"
                    }
                },
                context: {}
            });

            expect(result.success).toBe(true);
            expect(result.outputs?.messageId).toBeDefined();
            expect(result.outputs?.accepted).toContain("recipient@example.com");
        });

        it("should send email with HTML content", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    messageId: "def456@mail.example.com",
                    accepted: ["user@example.com"]
                })
            });

            const result = await runner.executeNode({
                name: "Send HTML email",
                nodeType: "integration",
                nodeConfig: {
                    service: "email",
                    action: "send",
                    connectionId: "email-conn-123",
                    params: {
                        to: "${userEmail}",
                        subject: "Hello ${userName}",
                        html: "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
                        from: "welcome@flowmaestro.com"
                    }
                },
                context: {
                    userEmail: "user@example.com",
                    userName: "Alice"
                }
            });

            expect(result.success).toBe(true);

            // Verify interpolation
            const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            expect(body.to).toBe("user@example.com");
            expect(body.subject).toBe("Hello Alice");
        });
    });

    describe("Webhook Integration", () => {
        it("should send webhook POST request", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    received: true,
                    processingTime: 45
                })
            });

            const result = await runner.executeNode({
                name: "Send webhook",
                nodeType: "integration",
                nodeConfig: {
                    service: "webhook",
                    action: "send",
                    params: {
                        url: "https://example.com/webhook",
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Custom-Header": "value"
                        },
                        body: {
                            event: "user.created",
                            userId: "${userId}",
                            timestamp: "${timestamp}"
                        }
                    }
                },
                context: {
                    userId: "user-123",
                    timestamp: "2025-01-01T12:00:00Z"
                }
            });

            expect(result.success).toBe(true);
            expect(result.outputs?.received).toBe(true);
        });

        it("should handle webhook timeout", async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Request timeout"));

            const result = await runner.executeNode({
                name: "Webhook timeout",
                nodeType: "integration",
                nodeConfig: {
                    service: "webhook",
                    action: "send",
                    params: {
                        url: "https://slow-endpoint.example.com/webhook",
                        method: "POST",
                        body: { test: true }
                    }
                },
                context: {},
                expectError: true,
                timeout: 1000
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain("timeout");
        });
    });

    describe("Twilio Integration", () => {
        it("should send SMS via Twilio", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    sid: "SM1234567890abcdef",
                    status: "queued",
                    to: "+15555551234",
                    from: "+15555559876",
                    body: "Your verification code is 123456"
                })
            });

            const result = await runner.executeNode({
                name: "Send SMS",
                nodeType: "integration",
                nodeConfig: {
                    service: "twilio",
                    action: "sendSMS",
                    connectionId: "twilio-conn-123",
                    params: {
                        to: "+15555551234",
                        from: "+15555559876",
                        body: "Your verification code is ${verificationCode}"
                    }
                },
                context: {
                    verificationCode: "123456"
                }
            });

            expect(result.success).toBe(true);
            expect(result.outputs?.sid).toBe("SM1234567890abcdef");
            expect(result.outputs?.status).toBe("queued");
        });

        it("should make Twilio voice call", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    sid: "CA1234567890abcdef",
                    status: "initiated",
                    to: "+15555551234",
                    from: "+15555559876"
                })
            });

            const result = await runner.executeNode({
                name: "Make call",
                nodeType: "integration",
                nodeConfig: {
                    service: "twilio",
                    action: "makeCall",
                    connectionId: "twilio-conn-123",
                    params: {
                        to: "+15555551234",
                        from: "+15555559876",
                        url: "https://example.com/twiml/greeting.xml"
                    }
                },
                context: {}
            });

            expect(result.success).toBe(true);
            expect(result.outputs?.sid).toBe("CA1234567890abcdef");
            expect(result.outputs?.status).toBe("initiated");
        });
    });

    describe("Google Sheets Integration", () => {
        it("should append row to Google Sheet", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    spreadsheetId: "abc123",
                    updatedRange: "Sheet1!A2:C2",
                    updatedRows: 1,
                    updatedColumns: 3
                })
            });

            const result = await runner.executeNode({
                name: "Append to sheet",
                nodeType: "integration",
                nodeConfig: {
                    service: "googlesheets",
                    action: "appendRow",
                    connectionId: "gsheets-conn-123",
                    params: {
                        spreadsheetId: "abc123",
                        range: "Sheet1!A:C",
                        values: [["${userName}", "${email}", "${timestamp}"]]
                    }
                },
                context: {
                    userName: "Alice",
                    email: "alice@example.com",
                    timestamp: "2025-01-01T12:00:00Z"
                }
            });

            expect(result.success).toBe(true);
            expect(result.outputs?.updatedRows).toBe(1);
        });

        it("should read data from Google Sheet", async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    range: "Sheet1!A1:C3",
                    majorDimension: "ROWS",
                    values: [
                        ["Name", "Email", "Status"],
                        ["Alice", "alice@example.com", "Active"],
                        ["Bob", "bob@example.com", "Active"]
                    ]
                })
            });

            const result = await runner.executeNode({
                name: "Read sheet",
                nodeType: "integration",
                nodeConfig: {
                    service: "googlesheets",
                    action: "readRange",
                    connectionId: "gsheets-conn-123",
                    params: {
                        spreadsheetId: "abc123",
                        range: "Sheet1!A1:C3"
                    }
                },
                context: {}
            });

            expect(result.success).toBe(true);
            expect(result.outputs?.values).toHaveLength(3);
            expect(result.outputs?.values[0]).toEqual(["Name", "Email", "Status"]);
        });
    });
});
```

## Common Issues

### "Node type not yet implemented"

**Cause:** Typo in nodeType or node not registered in switch-case
**Fix:** Check spelling matches `backend/src/temporal/activities/node-executors/index.ts`

### "Variable interpolation not working"

**Cause:** Context missing the variable
**Fix:** Ensure `context.userId` exists when using `${userId}`

### "Timeout errors"

**Cause:** Node takes longer than 30s default
**Fix:** Increase timeout: `{ timeout: 60000 }`

### "Connection/credential errors"

**Cause:** Missing API keys or connection strings
**Fix:** Set environment variables or use `it.skipIf(!process.env.API_KEY)`

## Success Criteria

**MVP (Phase 1-2):**

- HTTP and Transform node tests working
- Can run via `npm run test:nodes`
- Basic assertions implemented

**Complete (All Phases):**

- All 20+ node types have tests
- CI/CD integration working
- 50+ test cases covering common scenarios

**Timeline:** 10-14 hours total
