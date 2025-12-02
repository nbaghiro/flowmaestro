# Node Testing Framework Specification

## Overview

This specification outlines a **developer-focused regression testing framework** for validating workflow node execution logic in isolation. This enables testing individual node implementations before integrating them into real workflows, catching breaking changes early in the development cycle.

## Target Users & Use Case

- **Primary Users**: Internal development team
- **Primary Use Case**: Automated regression testing in CI/CD pipeline
- **Secondary Use Case**: Manual node validation during development

## Architecture Design

### Core Components

#### 1. NodeTestRunner Class (`backend/tests/helpers/NodeTestRunner.ts`)

**Purpose**: Execute individual nodes in isolation with mock context

**Key Features**:

- Direct invocation of `executeNode()` from existing node executor infrastructure
- Mock context/variable injection for testing interpolation
- Timeout handling for long-running nodes
- Error capturing with detailed stack traces
- Support for batch test execution

**API**:

```typescript
class NodeTestRunner {
    async executeNode(input: NodeTestCase): Promise<NodeTestResult>;
    async executeBatch(cases: NodeTestCase[]): Promise<NodeTestResult[]>;
    async loadFromJSON(filePath: string): Promise<NodeTestCase[]>;
}

interface NodeTestCase {
    name: string;
    nodeType: string;
    nodeConfig: JsonObject;
    context?: JsonObject;
    globalStore?: Record<string, JsonValue>;
    timeout?: number;
    expectedOutputs?: JsonObject;
    expectError?: boolean;
}

interface NodeTestResult {
    name: string;
    success: boolean;
    outputs?: JsonObject;
    error?: string;
    duration: number;
}
```

#### 2. NodeAssertions Helper (`backend/tests/helpers/NodeAssertions.ts`)

**Purpose**: Specialized assertion utilities for node output validation

**Features**:

- Structure matching for complex objects
- Field presence/type checking
- Numeric range validation
- String pattern matching (regex)
- Array element validation

**API**:

```typescript
class NodeAssertions {
    static assertOutputContains(result: NodeTestResult, expected: JsonObject): void;
    static assertOutputStructure(result: NodeTestResult, schema: JsonSchema): void;
    static assertFieldInRange(
        result: NodeTestResult,
        field: string,
        min: number,
        max: number
    ): void;
    static assertFieldMatches(result: NodeTestResult, field: string, pattern: RegExp): void;
    static assertArrayLength(result: NodeTestResult, field: string, expectedLength: number): void;
}
```

#### 3. CLI Test Runner (`backend/scripts/test-nodes.ts`)

**Purpose**: Command-line interface for running node tests

**Commands**:

```bash
# Run JSON test cases
npm run test:nodes:run <file.json>

# Generate test case templates
npm run test:nodes:generate <nodeType> [-o output.json]

# List available test cases
npm run test:nodes:list [directory]

# Validate test case JSON schema
npm run test:nodes:validate <file.json>
```

#### 4. JSON Test Case Format

**Purpose**: Allow non-developers to write tests without TypeScript knowledge

**Schema**:

```json
{
    "testSuite": "HTTP Node Tests",
    "tests": [
        {
            "name": "Simple GET request",
            "nodeType": "http",
            "nodeConfig": {
                "method": "GET",
                "url": "https://api.example.com/users"
            },
            "context": {},
            "expectedOutputs": {
                "status": 200
            }
        },
        {
            "name": "POST with variable interpolation",
            "nodeType": "http",
            "nodeConfig": {
                "method": "POST",
                "url": "https://api.example.com/users",
                "body": "{\"name\": \"${userName}\"}"
            },
            "context": {
                "userName": "John Doe"
            },
            "expectedOutputs": {
                "status": 201
            }
        }
    ]
}
```

## Implementation Phases

### Phase 1: Core Test Runner (3-4 hours)

**Goal**: Basic test execution infrastructure

**Tasks**:

1. Create `NodeTestRunner` class with single node execution
2. Implement timeout handling
3. Add error capturing and formatting
4. Create basic TypeScript test examples for HTTP node
5. Add npm script: `npm run test:nodes`

**Files to Create**:

- `backend/tests/helpers/NodeTestRunner.ts` (200 lines)
- `backend/tests/node-tests/http-node.test.ts` (150 lines)

**Files to Reference**:

- `backend/src/temporal/activities/node-executors/index.ts` (executeNode function)
- `backend/src/temporal/activities/node-executors/utils.ts` (interpolateVariables)
- `backend/tests/helpers/WorkflowTestHarness.ts` (assertion patterns)

### Phase 2: Assertion Library (2-3 hours)

**Goal**: Rich assertion utilities for node outputs

**Tasks**:

1. Create `NodeAssertions` class
2. Implement structure validation
3. Add range and pattern matching
4. Create test examples using assertions
5. Document assertion API

**Files to Create**:

- `backend/tests/helpers/NodeAssertions.ts` (150 lines)
- `backend/tests/node-tests/transform-node.test.ts` (200 lines)

### Phase 3: JSON Test Case Support (2-3 hours)

**Goal**: Enable non-developer test authoring

**Tasks**:

1. Define JSON schema for test cases
2. Implement JSON loader in `NodeTestRunner`
3. Add schema validation
4. Create example JSON test cases
5. Add batch execution support

**Files to Create**:

- `backend/tests/node-tests/cases/http-basic.json` (100 lines)
- `backend/tests/node-tests/cases/llm-providers.json` (150 lines)
- `backend/tests/schemas/node-test-case.schema.json` (80 lines)

**Files to Modify**:

- `backend/tests/helpers/NodeTestRunner.ts` (+100 lines for JSON support)

### Phase 4: CLI Tool (2-3 hours)

**Goal**: Command-line interface for test management

**Tasks**:

1. Create CLI script with Commander.js
2. Implement `run`, `generate`, `list`, `validate` commands
3. Add colored console output (chalk)
4. Create template generation for all node types
5. Add npm scripts to package.json

**Files to Create**:

- `backend/scripts/test-nodes.ts` (300 lines)
- `backend/templates/node-test-templates.ts` (200 lines)

**Files to Modify**:

- `backend/package.json` (add scripts)

### Phase 5: Comprehensive Test Coverage (3-4 hours)

**Goal**: Test all critical node types

**Tasks**:

1. Create tests for LLM nodes (with provider switching)
2. Create tests for Transform nodes (JSONata operations)
3. Create tests for Database nodes (with mock connections)
4. Create tests for Conditional/Switch nodes
5. Create tests for Error handling scenarios

**Files to Create**:

- `backend/tests/node-tests/llm-node.test.ts` (250 lines)
- `backend/tests/node-tests/database-node.test.ts` (200 lines)
- `backend/tests/node-tests/conditional-node.test.ts` (150 lines)
- `backend/tests/node-tests/error-handling.test.ts` (150 lines)

### Phase 6: CI/CD Integration (1-2 hours)

**Goal**: Automated testing in GitHub Actions

**Tasks**:

1. Create GitHub Actions workflow
2. Add test coverage reporting
3. Add pre-commit hooks for node tests
4. Update documentation

**Files to Create**:

- `.github/workflows/node-tests.yml` (50 lines)
- `backend/tests/node-tests/README.md` (documentation)

**Files to Modify**:

- `.github/workflows/test.yml` (add node test step)

## Critical Files Reference

### Files to Study Before Implementation

1. **`backend/src/temporal/activities/node-executors/index.ts`**
    - Main `executeNode()` function - routing logic
    - Node type registry via switch-case
    - All node executor exports

2. **`backend/src/temporal/activities/node-executors/utils.ts`**
    - `interpolateVariables()` - variable interpolation engine
    - Nested path resolution
    - Deep clone utilities

3. **`backend/tests/helpers/WorkflowTestHarness.ts`**
    - Existing test patterns and assertions
    - Result validation structure
    - Error handling patterns

### Node Executors to Reference

- `backend/src/temporal/activities/node-executors/http-executor.ts`
- `backend/src/temporal/activities/node-executors/llm-executor.ts`
- `backend/src/temporal/activities/node-executors/transform-executor.ts`
- `backend/src/temporal/activities/node-executors/conditional-executor.ts`

## Example Test Cases

### TypeScript Test Example

```typescript
import { NodeTestRunner } from "../helpers/NodeTestRunner";
import { NodeAssertions } from "../helpers/NodeAssertions";

describe("HTTP Node Tests", () => {
    let runner: NodeTestRunner;

    beforeAll(() => {
        runner = new NodeTestRunner();
    });

    it("should execute GET request successfully", async () => {
        const result = await runner.executeNode({
            name: "GET request",
            nodeType: "http",
            nodeConfig: {
                method: "GET",
                url: "https://jsonplaceholder.typicode.com/users/1"
            },
            context: {},
            timeout: 5000
        });

        NodeAssertions.assertOutputContains(result, {
            status: 200
        });
        NodeAssertions.assertFieldInRange(result, "status", 200, 299);
    });

    it("should interpolate variables in URL", async () => {
        const result = await runner.executeNode({
            name: "GET with variable",
            nodeType: "http",
            nodeConfig: {
                method: "GET",
                url: "https://jsonplaceholder.typicode.com/users/${userId}"
            },
            context: {
                userId: 1
            }
        });

        expect(result.success).toBe(true);
        expect(result.outputs?.data).toHaveProperty("id", 1);
    });

    it("should handle network errors gracefully", async () => {
        const result = await runner.executeNode({
            name: "Invalid URL",
            nodeType: "http",
            nodeConfig: {
                method: "GET",
                url: "https://invalid-domain-that-does-not-exist-12345.com"
            },
            context: {},
            expectError: true
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
});
```

### JSON Test Case Example

```json
{
    "testSuite": "LLM Node Provider Tests",
    "tests": [
        {
            "name": "OpenAI GPT-4 basic completion",
            "nodeType": "llm",
            "nodeConfig": {
                "provider": "openai",
                "model": "gpt-4",
                "prompt": "Say 'test successful' and nothing else",
                "temperature": 0,
                "maxTokens": 10
            },
            "context": {},
            "skipIfNoCredentials": true,
            "expectedOutputs": {
                "provider": "openai"
            }
        },
        {
            "name": "LLM with variable interpolation",
            "nodeType": "llm",
            "nodeConfig": {
                "provider": "openai",
                "model": "gpt-4",
                "prompt": "Summarize: ${articleText}",
                "temperature": 0.7
            },
            "context": {
                "articleText": "FlowMaestro is a workflow automation platform."
            },
            "skipIfNoCredentials": true
        }
    ]
}
```

## Implementation Details

### NodeTestRunner Implementation Guide

```typescript
import { executeNode, ExecuteNodeInput } from "../../src/temporal/activities/node-executors";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";

export class NodeTestRunner {
    private defaultTimeout = 30000; // 30 seconds

    async executeNode(testCase: NodeTestCase): Promise<NodeTestResult> {
        const startTime = Date.now();
        const timeout = testCase.timeout || this.defaultTimeout;

        try {
            // Create promise for node execution
            const executionPromise = this.runNode(testCase);

            // Create timeout promise
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Node execution timed out after ${timeout}ms`));
                }, timeout);
            });

            // Race between execution and timeout
            const outputs = await Promise.race([executionPromise, timeoutPromise]);

            // Validate expected outputs if provided
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
            if (testCase.expectError) {
                return {
                    name: testCase.name,
                    success: true,
                    error: error instanceof Error ? error.message : String(error),
                    duration: Date.now() - startTime
                };
            }

            return {
                name: testCase.name,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                duration: Date.now() - startTime
            };
        }
    }

    private async runNode(testCase: NodeTestCase): Promise<JsonObject> {
        const input: ExecuteNodeInput = {
            nodeType: testCase.nodeType,
            nodeConfig: testCase.nodeConfig,
            context: testCase.context || {},
            globalStore: testCase.globalStore
                ? new Map(Object.entries(testCase.globalStore))
                : undefined
        };

        return await executeNode(input);
    }

    private validateOutputs(actual: JsonObject, expected: JsonObject): void {
        for (const [key, expectedValue] of Object.entries(expected)) {
            if (!(key in actual)) {
                throw new Error(`Expected output key "${key}" not found`);
            }

            const actualValue = actual[key];

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

    async executeBatch(cases: NodeTestCase[]): Promise<NodeTestResult[]> {
        return Promise.all(cases.map((testCase) => this.executeNode(testCase)));
    }

    async loadFromJSON(filePath: string): Promise<NodeTestCase[]> {
        const fs = await import("fs/promises");
        const content = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(content);
        return data.tests || [];
    }
}
```

### Dependencies to Install

```json
{
    "devDependencies": {
        "commander": "^11.0.0",
        "chalk": "^5.3.0",
        "ajv": "^8.12.0"
    }
}
```

### package.json Scripts to Add

```json
{
    "scripts": {
        "test:nodes": "jest --testMatch='**/tests/node-tests/**/*.test.ts'",
        "test:nodes:run": "tsx backend/scripts/test-nodes.ts run",
        "test:nodes:generate": "tsx backend/scripts/test-nodes.ts generate",
        "test:nodes:list": "tsx backend/scripts/test-nodes.ts list",
        "test:nodes:validate": "tsx backend/scripts/test-nodes.ts validate"
    }
}
```

## Key Architectural Context

### How Node Execution Currently Works

1. **In Production Workflows**:
    - Temporal orchestrator calls `executeNode()` activity
    - Context accumulates outputs from previous nodes
    - Variables interpolated using `${variable}` syntax
    - Results merged into context for downstream nodes

2. **Node Executor Pattern**:

    ```typescript
    export async function executeHTTPNode(
        config: HTTPNodeConfig,
        context: JsonObject
    ): Promise<JsonObject> {
        // 1. Interpolate variables
        const url = interpolateVariables(config.url, context);

        // 2. Execute logic
        const response = await fetch(url, { method: config.method });

        // 3. Return outputs (not merged - orchestrator does that)
        return {
            status: response.status,
            data: await response.json()
        };
    }
    ```

3. **Variable Interpolation**:
    - Simple: `${userId}` → context.userId
    - Nested: `${user.profile.name}` → context.user.profile.name
    - Arrays: `${users[0].name}` → context.users[0].name
    - Handled by `interpolateVariables()` in utils.ts

4. **Node Types to Handle Specially**:
    - **Control Flow Nodes** (conditional, switch, loop): Throw error - must be handled by orchestrator
    - **Input Nodes**: Return value from context
    - **Credential-Required Nodes**: Need connectionId or env vars (OPENAI_API_KEY, etc.)

### Credential Handling for Tests

**Option 1: Use Environment Variables**

```typescript
// For LLM tests
process.env.OPENAI_API_KEY = "test-key";
```

**Option 2: Create Test Connections**

```typescript
// Use existing connection management
const testConnectionId = await createTestConnection({
    provider: "openai",
    apiKey: process.env.OPENAI_API_KEY
});
```

**Option 3: Skip Tests Without Credentials**

```typescript
it.skipIf(!process.env.OPENAI_API_KEY)("should call OpenAI", async () => {
    // Test code
});
```

## Testing Strategy

### Unit Tests for Test Framework

Test the testing mechanism itself:

```typescript
describe("NodeTestRunner", () => {
    it("should execute simple echo node", async () => { ... });
    it("should handle timeouts correctly", async () => { ... });
    it("should capture errors properly", async () => { ... });
    it("should interpolate context variables", async () => { ... });
});

describe("NodeAssertions", () => {
    it("should validate output structure", async () => { ... });
    it("should check field ranges", async () => { ... });
    it("should match patterns", async () => { ... });
});
```

### Edge Cases to Handle

1. **Timeout Scenarios**: Long-running nodes (Wait node with 30s delay)
2. **Missing Credentials**: LLM nodes without API keys (skip or mock)
3. **Invalid Context**: Variable interpolation with missing variables
4. **Malformed Config**: Invalid node configurations
5. **Network Failures**: HTTP nodes with unreachable endpoints
6. **Concurrent Execution**: Multiple tests running in parallel

### Integration with Existing Tests

- Node tests run alongside workflow integration tests
- Separate test suite: `npm run test:nodes` vs `npm run test:integration`
- Share test helpers: `NodeTestRunner` can be imported in workflow tests
- CI/CD runs both test suites

## Troubleshooting Guide

### Common Issues

1. **"Node type not yet implemented"**
    - Check node type spelling matches switch-case in index.ts
    - Verify node executor is imported and exported

2. **"Variable interpolation not working"**
    - Ensure context object has the variable
    - Check variable syntax: `${varName}` not `{varName}` or `$varName`
    - Nested paths must exist: `${user.name}` requires context.user to be defined

3. **"Timeout errors"**
    - Increase timeout for slow nodes (LLM, HTTP to slow APIs)
    - Default is 30s, some nodes may need 60s+

4. **"Connection/credential errors"**
    - Set environment variables or create test connections
    - Use `skipIfNoCredentials` in JSON tests
    - Mock credential lookups if needed

5. **"Control flow nodes failing"**
    - Conditional, switch, loop nodes cannot be tested in isolation
    - They're handled by orchestrator, not executeNode()
    - Test them via workflow integration tests instead

## Success Criteria

### MVP (Phase 1-2 Complete)

- Execute HTTP and Transform nodes in isolation
- Basic assertions for output validation
- TypeScript test examples
- Run via `npm run test:nodes`

### Full Implementation (All Phases Complete)

- All node types testable (20+ node types)
- JSON test case support for non-developers
- CLI tool for test management
- CI/CD integration
- Comprehensive documentation
- 50+ test cases covering critical scenarios

## Benefits

1. **Faster Development**: Test node changes without full workflow execution
2. **Early Bug Detection**: Catch breaking changes before they reach workflows
3. **Documentation**: Test cases serve as usage examples
4. **Confidence**: Regression suite prevents accidental breakage
5. **Developer Experience**: Quick feedback loop for node development

## Timeline Estimate

- **MVP (Phases 1-2)**: 5-7 hours
- **Full Implementation (All Phases)**: 13-17 hours
- **Maintenance per new node type**: 1-2 hours

## Future Enhancements

1. **Visual Test Results Dashboard**
    - Web UI showing test runs, pass/fail rates
    - Historical test results tracking
    - Performance trends over time

2. **Mock HTTP Server**
    - Built-in mock server for HTTP node tests
    - Predefined responses for common scenarios
    - No external API dependencies

3. **Credential Mocking**
    - Mock credential resolver for offline testing
    - Fake API responses for LLM/integration nodes
    - Deterministic outputs for regression tests

4. **Performance Benchmarking**
    - Track node execution times
    - Alert on performance regressions
    - Compare node implementations (e.g., different LLM providers)

5. **Test Case Generator from Workflows**
    - Extract nodes from existing workflows
    - Generate test cases with actual context
    - Regression tests from production workflows
