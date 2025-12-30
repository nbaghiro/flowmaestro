# FlowMaestro Testing Strategy

## Overview

FlowMaestro employs a comprehensive testing strategy that combines developer-focused integration tests with user-focused workflow execution tests. Tests use mocked external APIs, an in-memory database, and run entirely in CI without external dependencies, ensuring fast execution while validating realistic user scenarios.

---

## Testing Philosophy

### Focus on Real-World Scenarios

FlowMaestro's testing approach prioritizes real-world usage patterns over code coverage metrics. Each test represents an actual workflow that users might build, ensuring that:

- **Node types are validated** through practical use cases rather than isolated unit tests
- **Tests serve as documentation** showing developers and users how workflows should be structured
- **Execution speed remains high** since no external services are involved
- **CI runs are reliable** without flaky network calls or rate limits

### Progressive Complexity Approach

Tests are designed in progressive phases that increase in complexity:

```
Phase 1 (Basic)
  ↓ Learn: Basic execution, transforms, outputs
Phase 2 (Intermediate)
  ↓ Add: HTTP requests, parallel execution, error handling
Phase 3 (Intermediate)
  ↓ Add: LLM integration, AI workflows, chat triggers
Phase 4 (Advanced)
  ↓ Add: Conditional logic, branching, route isolation
```

This allows developers and users to:

1. Build confidence with simple workflows first
2. Understand each new concept before adding complexity
3. Debug issues in isolation
4. Progressively test more advanced features

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- arxiv-researcher.test.ts

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

---

## Test Structure

The test suite is organized into multiple categories covering unit tests, integration tests, and end-to-end workflow tests:

```
backend/tests/
├── __mocks__/              # Jest mocks for external modules
│   └── ioredis.ts          # Redis mock for tests
├── fixtures/               # Test data and fixtures
│   ├── activities.ts       # Mock activity implementations
│   ├── contexts.ts         # Pre-built context snapshots
│   ├── workflows.ts        # Test workflow definitions (linear, diamond, etc.)
│   └── workflows/          # Realistic workflow definitions for E2E tests
│       ├── index.ts                      # Central exports
│       ├── seed-workflows.ts             # Seed script
│       ├── hello-world.fixture.ts        # Phase 1: Basic
│       ├── data-enrichment.fixture.ts    # Phase 2: HTTP & parallel
│       ├── text-analysis.fixture.ts      # Phase 3: LLM integration
│       ├── smart-router.fixture.ts       # Phase 4: Conditional logic
│       └── arxiv-researcher.fixture.ts   # Advanced workflow
├── helpers/                # Test utilities
│   ├── mock-apis.ts        # External API mocking (nock/msw)
│   ├── test-server.ts      # Fastify server setup
│   ├── test-temporal.ts    # Temporal test environment
│   └── db-helpers.ts       # In-memory SQLite database
├── unit/                   # Unit tests
│   ├── context/            # Context management tests
│   │   ├── context-service.test.ts      # Context CRUD operations
│   │   ├── variable-resolution.test.ts  # Variable interpolation
│   │   └── queue-state.test.ts          # Execution queue management
│   └── builder/            # Workflow builder tests
│       └── workflow-builder.test.ts     # Graph validation & construction
└── integration/            # Integration tests
    ├── orchestrator/       # Workflow orchestrator tests
    │   ├── parallel-execution.test.ts   # Parallel branch execution
    │   ├── conditional-branching.test.ts # If/else branching
    │   ├── loop-execution.test.ts       # Loop iteration handling
    │   └── error-propagation.test.ts    # Error & retry behavior
    ├── handlers/           # Node handler tests
    │   ├── llm-handler.test.ts          # LLM node execution
    │   └── http-handler.test.ts         # HTTP node execution
    ├── workflows/          # End-to-end workflow tests
    ├── node-executors/     # Node executor tests
    └── api-endpoints/      # API endpoint tests
```

---

## Temporal Workflow Execution Engine Tests

The Temporal workflow execution engine has comprehensive test coverage focusing on **context corruption prevention** and **state management**. These tests validate the core orchestration logic without requiring a running Temporal server.

### Unit Tests

#### Context Service Tests

**File:** `tests/unit/context/context-service.test.ts`

Tests the core context management functions:

```typescript
describe("Context Service", () => {
    describe("storeNodeOutput", () => {
        it("should not mutate original context snapshot");
        it("should handle concurrent output storage from parallel nodes");
        it("should enforce per-node output size limit (1MB)");
        it("should enforce total context size limit (50MB)");
        it("should handle empty/null/undefined outputs");
        it("should deep clone complex object outputs");
    });

    describe("createContext", () => {
        it("should initialize with workflow inputs");
        it("should set metadata with creation timestamp");
    });

    describe("getExecutionContext", () => {
        it("should merge nodeOutputs and workflowVariables");
        it("should not allow variable name collisions to corrupt data");
    });
});
```

#### Variable Resolution Tests

**File:** `tests/unit/context/variable-resolution.test.ts`

Tests variable interpolation and path resolution:

```typescript
describe("Variable Resolution", () => {
    describe("resolveVariable", () => {
        it("should resolve simple variable {{varName}}");
        it("should resolve node output {{nodeId.field}}");
        it("should resolve nested paths {{nodeId.data.items[0].name}}");
        it("should resolve loop context {{loop.index}}, {{loop.item}}, {{loop.results}}");
        it("should resolve parallel context {{parallel.index}}, {{parallel.branchId}}");
        it("should return null for missing variables");
    });

    describe("interpolateString", () => {
        it("should replace multiple variables in string");
        it("should JSON serialize object values");
        it("should preserve original string if no matches");
    });

    describe("resolution priority", () => {
        it("should prioritize: loop > parallel > variables > outputs > inputs");
    });
});
```

#### Queue State Tests

**File:** `tests/unit/context/queue-state.test.ts`

Tests execution queue management:

```typescript
describe("Queue State Management", () => {
    describe("initializeQueue", () => {
        it("should mark start nodes as ready");
        it("should mark nodes with dependencies as pending");
    });

    describe("markCompleted", () => {
        it("should update dependent nodes to ready when all deps met");
        it("should handle nodes with multiple dependents");
    });

    describe("markFailed", () => {
        it("should cascade skip to all downstream dependents");
        it("should not affect parallel branches");
    });

    describe("getReadyNodes", () => {
        it("should respect maxConcurrentNodes limit");
        it("should not return already executing nodes");
    });

    describe("deadlock detection", () => {
        it("should detect when no nodes ready and none executing");
    });
});
```

#### Workflow Builder Tests

**File:** `tests/unit/builder/workflow-builder.test.ts`

Tests workflow graph construction and validation:

```typescript
describe("Workflow Builder", () => {
    describe("validation", () => {
        it("should detect cycles in workflow graph");
        it("should allow legitimate loops (loop-start/loop-end)");
        it("should warn about unreachable nodes");
    });

    describe("path construction", () => {
        it("should determine correct execution levels");
        it("should identify parallel branches");
        it("should calculate dependency graph correctly");
    });
});
```

### Integration Tests

#### Parallel Execution Tests

**File:** `tests/integration/orchestrator/parallel-execution.test.ts`

Tests parallel branch execution and context isolation:

```typescript
describe("Parallel Execution", () => {
    describe("context isolation", () => {
        it("should isolate context between parallel branches");
        it("should merge outputs correctly after parallel join");
        it("should not corrupt shared parent context");
    });

    describe("failure handling", () => {
        it("should allow other branches to complete when one fails");
        it("should mark dependents of failed node as skipped");
    });

    describe("concurrency limits", () => {
        it("should respect max concurrent nodes limit");
    });
});
```

#### Conditional Branching Tests

**File:** `tests/integration/orchestrator/conditional-branching.test.ts`

Tests if/else conditional logic:

```typescript
describe("Conditional Branching", () => {
    describe("branch selection", () => {
        it("should execute true branch when condition is true");
        it("should execute false branch when condition is false");
        it("should skip inactive branch nodes entirely");
    });

    describe("context in branches", () => {
        it("should make parent context available in branches");
        it("should not leak branch variables to other branches");
    });
});
```

#### Loop Execution Tests

**File:** `tests/integration/orchestrator/loop-execution.test.ts`

Tests loop iteration handling:

```typescript
describe("Loop Execution", () => {
    describe("iteration state", () => {
        it("should isolate loop.index per iteration");
        it("should make loop.item available for foreach loops");
        it("should accumulate results in loop.results");
    });

    describe("loop termination", () => {
        it("should terminate when condition becomes false");
        it("should respect maxIterations limit");
    });

    describe("nested loops", () => {
        it("should maintain separate iteration state for nested loops");
    });
});
```

#### Error Propagation Tests

**File:** `tests/integration/orchestrator/error-propagation.test.ts`

Tests error handling and retry behavior:

```typescript
describe("Error Propagation", () => {
    describe("node failure", () => {
        it("should mark node as failed with error details");
        it("should preserve context state at point of failure");
    });

    describe("retry behavior", () => {
        it("should track retry count");
        it("should preserve context across retries");
    });

    describe("cascade behavior", () => {
        it("should skip all dependent nodes on failure");
        it("should not affect independent parallel branches");
    });
});
```

### Handler Tests

#### LLM Handler Tests

**File:** `tests/integration/handlers/llm-handler.test.ts`

Tests LLM node execution (mocked, no real API calls):

```typescript
describe("LLM Handler", () => {
    describe("variable interpolation", () => {
        it("should interpolate variables in prompt");
        it("should interpolate nested object paths");
        it("should handle missing variables gracefully");
    });

    describe("retry logic", () => {
        it("should retry on rate limit (429)");
        it("should retry on server error (500, 502, 503)");
        it("should not retry on auth error (401)");
        it("should not retry on bad request (400)");
    });

    describe("output formatting", () => {
        it("should return structured response with tokens");
        it("should handle response without token usage");
    });
});
```

#### HTTP Handler Tests

**File:** `tests/integration/handlers/http-handler.test.ts`

Tests HTTP node execution:

```typescript
describe("HTTP Handler", () => {
    describe("request building", () => {
        it("should interpolate URL variables");
        it("should interpolate header variables");
        it("should interpolate body variables");
        it("should handle JSON body serialization");
    });

    describe("timeout handling", () => {
        it("should abort on timeout");
    });

    describe("retry configuration", () => {
        it("should retry on configured status codes");
        it("should not retry when disabled");
    });
});
```

### Test Fixtures

#### Workflow Fixtures

**File:** `tests/fixtures/workflows.ts`

Pre-built workflow definitions for testing:

```typescript
// Linear workflow: A → B → C
createLinearWorkflow();

// Diamond pattern: A → [B, C] → D (parallel testing)
createDiamondWorkflow();

// Conditional workflow: A → Cond → [T1/F1] → End
createConditionalWorkflow();

// Error cascade: A → B(fails) → C(skipped) with parallel D → E
createErrorCascadeWorkflow();

// Loop workflow: Start → Loop(items) → Process → End
createLoopWorkflow();

// Complex workflow: Multiple patterns combined
createComplexWorkflow();
```

#### Context Fixtures

**File:** `tests/fixtures/contexts.ts`

Pre-built context snapshots:

```typescript
// Empty context with defaults
createEmptyContext(inputs?)

// Context with sample node outputs
createContextWithOutputs()

// Context approaching 50MB limit (for pruning tests)
createLargeContext(targetSizeBytes?)

// Context with parallel branch outputs
createParallelMergeContext()

// Loop iteration state
createLoopState(index, total, item?)
createLoopStateWithResults(index, total, item, results)

// Parallel branch state
createParallelState(index, branchId, currentItem?)
```

#### Activity Mocks

**File:** `tests/fixtures/activities.ts`

Mock implementations for Temporal activities:

```typescript
// Create mock activities for testing
createMockActivities({
    executeNodeResult: { success: true, output: {...} },
    validateInputsResult: { valid: true }
})

// Create activities that fail on specific nodes
createFailingActivities(failingNodeIds: string[])

// Create activities with custom behavior
createCustomActivities(handlers: Map<string, Function>)
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm test -- tests/unit

# Run integration tests only
npm test -- tests/integration

# Run specific test file
npm test -- tests/unit/context/context-service.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="parallel"

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Test Coverage Summary

| Test Suite            | Tests | Coverage Focus                           |
| --------------------- | ----- | ---------------------------------------- |
| context-service       | 17    | Context CRUD, size limits, immutability  |
| variable-resolution   | 32    | Path resolution, interpolation, scopes   |
| queue-state           | 51    | Queue operations, dependencies, deadlock |
| workflow-builder      | 17    | Graph validation, cycle detection        |
| parallel-execution    | 15    | Context isolation, merge, concurrency    |
| conditional-branching | 13    | Branch selection, skip propagation       |
| loop-execution        | 14    | Iteration state, termination, nesting    |
| error-propagation     | 23    | Failure handling, retry, cascade         |
| llm-handler           | 27    | Prompt interpolation, retry logic        |
| http-handler          | 51    | Request building, timeout, retries       |

**Total: 260 tests**

---

## Test Workflows

### Phase 1: Hello World ⭐

**File:** `backend/tests/fixtures/workflows/hello-world.fixture.ts`

**Purpose:** Basic linear execution testing

**Nodes:** Input → Transform → Output

**Test Scenarios:**

- Happy path with valid name
- Empty name handling
- Special characters in name
- Long name handling

**Validates:**

- Basic workflow execution flow
- Input node functionality
- Transform node operations
- Output node formatting
- Variable interpolation `${variable}`
- String manipulation
- Execution logs generation
- Timeline visualization
- Results panel display

**Duration:** < 1 second
**Credentials:** None required

---

### Phase 2: Data Enrichment ⭐⭐

**File:** `backend/tests/fixtures/workflows/data-enrichment.fixture.ts`

**Purpose:** HTTP requests and parallel execution

**Nodes:** Input → 2x HTTP (parallel) → Transform → Merge → Output

**Test Scenarios:**

- Valid user data fetch
- Webhook trigger execution
- Invalid user ID (404 error)
- Parallel execution verification

**Validates:**

- HTTP node execution
- External API integration
- Parallel node execution (2 simultaneous HTTP calls)
- Data transformation and merging
- JSON response handling
- Network requests tracking
- Webhook trigger functionality
- Error handling (404 responses)
- Retry logic
- Performance (parallel vs sequential)

**Duration:** 2-3 seconds
**Credentials:** None (uses JSONPlaceholder API)

---

### Phase 3: Text Analysis ⭐⭐

**File:** `backend/tests/fixtures/workflows/text-analysis.fixture.ts`

**Purpose:** LLM integration and AI workflows

**Nodes:** Input → 2x LLM (parallel) → Transform → Output

**Test Scenarios:**

- Positive sentiment analysis
- Negative sentiment analysis
- Neutral sentiment analysis
- Chat trigger with conversation context
- Long text handling
- Empty text handling

**Validates:**

- LLM node execution (Anthropic Claude)
- AI credential management
- Parallel LLM calls
- JSON response format from LLM
- Sentiment analysis accuracy
- Topic extraction
- Data merging from multiple LLM calls
- Chat trigger functionality
- Long text handling
- Token usage tracking

**Duration:** 5-8 seconds
**Credentials:** Anthropic API key required

---

### Phase 4: Smart Router ⭐⭐⭐

**File:** `backend/tests/fixtures/workflows/smart-router.fixture.ts`

**Purpose:** Conditional logic and branching

**Nodes:** Input → Conditional → Branch A (HTTP) OR Branch B (LLM) → Output

**Test Scenarios:**

- Data route (Branch A) execution
- Analysis route (Branch B) execution
- Webhook with data route
- Webhook with analysis route
- Branch isolation verification (only one executes)
- Performance check (confirms single branch)

**Validates:**

- Conditional node logic
- Branch execution (only one branch runs)
- Route isolation (Branch A doesn't execute if Branch B chosen)
- Variable coalescing (`${var1 || var2}`)
- HTTP branch path
- LLM branch path
- Performance verification
- Multiple execution paths
- Complex control flow

**Duration:** 3-8 seconds (varies by branch)
**Credentials:** Anthropic API key (for analysis branch)

---

### Advanced: ArXiv Researcher ⭐⭐⭐

**File:** `backend/tests/fixtures/workflows/arxiv-researcher.fixture.ts`

**Purpose:** Complex multi-step workflow

**Nodes:** 8 nodes including API, XML parsing, file operations, LLM

**Test Scenarios:**

- Complete research workflow
- Search query with results
- PDF download and parsing
- LLM analysis
- Error handling

**Validates:**

- HTTP node with ArXiv API
- Transform node (XML parsing, JSONata)
- Variable node for state management
- File operations node (PDF parsing)
- LLM node (Claude integration)
- Output node formatting
- Multi-step orchestration
- Complex data transformations

**Duration:** 10-15 seconds
**Credentials:** Anthropic API key

---

## Test Infrastructure

### Test Helpers

#### MockAPIs

**File:** `backend/tests/helpers/mock-apis.ts`

Provides pre-configured mocks for common external services, eliminating the need for real API keys or network calls:

```typescript
// Mock ArXiv API
MockAPIs.mockArxivSearch("machine learning", [
    /* papers */
]);

// Mock PDF download
MockAPIs.mockPDFDownload("http://arxiv.org/pdf/123.pdf", "PDF content");

// Mock LLM providers
MockAPIs.mockAnthropic("prompt", "response");
MockAPIs.mockOpenAI("prompt", "response");
MockAPIs.mockGoogleAI("prompt", "response");
MockAPIs.mockCohere("prompt", "response");

// Mock generic HTTP
MockAPIs.mockHTTP("https://api.example.com/data", "GET", { data: "value" });
```

#### Database Helpers

**File:** `backend/tests/helpers/db-helpers.ts`

Tests use an in-memory SQLite database for fast, isolated execution. The database is automatically cleaned between tests:

```typescript
// Seed test data
const user = seedTestUser({ email: "test@example.com" });
const workflow = seedTestWorkflow({ user_id: user.id });

// Clean between tests (automatic)
clearTestData();
```

#### Test Server

**File:** `backend/tests/helpers/test-server.ts`

Provides a fully-functional Fastify instance with in-memory database:

```typescript
const server = await setupTestServer();
const token = generateTestToken(server, { id: "user-1" });

// Make requests
const response = await server.inject({
    method: "POST",
    url: "/api/workflows/execute",
    headers: { authorization: `Bearer ${token}` },
    payload: { workflowDefinition, inputs }
});
```

#### Temporal Test Environment

**File:** `backend/tests/helpers/test-temporal.ts`

In-memory Temporal environment for testing:

- No external Temporal server required
- Uses `@temporalio/testing` package
- Supports worker creation with test activities

---

### Seeding Test Workflows

#### Seed Script

**File:** `backend/tests/fixtures/workflows/seed-workflows.ts`

**Features:**

- Converts fixture format to database format
- Inserts all test workflows into database
- CLI with user ID parameter
- Beautiful console output with progress
- Error handling and validation

**Usage:**

```bash
npm run seed:test-workflows -- --user-id=<uuid>
```

#### Fixtures Index

**File:** `backend/tests/fixtures/workflows/index.ts`

**Features:**

- Central export of all test workflows
- Utility functions for filtering by complexity
- Testing order management
- Metadata about each workflow

---

## Writing New Tests

### Creating Workflow Fixtures

Start by defining the workflow structure and any mock data needed:

```typescript
// tests/fixtures/workflows/my-workflow.fixture.ts
export const myWorkflowDefinition = {
    nodes: [
        /* ... */
    ],
    edges: [
        /* ... */
    ]
};

export const myWorkflowMockData = {
    // Mock responses for external APIs
};

export const myWorkflowTestScenarios = [
    {
        name: "Happy path test",
        triggerType: "manual",
        inputs: {
            /* ... */
        },
        expectedOutput: {
            /* ... */
        }
    }
];
```

### Writing Integration Tests

Integration tests execute nodes step-by-step, building context as they go:

```typescript
// tests/integration/workflows/my-workflow.test.ts
import { executeNode } from "../../../src/temporal/activities/node-executors";
import { MockAPIs } from "../../helpers/mock-apis";
import {
    myWorkflowDefinition,
    myWorkflowMockData
} from "../../fixtures/workflows/my-workflow.fixture";

describe("My Workflow", () => {
    beforeAll(() => {
        process.env.REQUIRED_API_KEY = "test-key";
    });

    beforeEach(() => {
        // Setup mocks
        MockAPIs.mockHTTP(/* ... */);
    });

    test("should complete successfully", async () => {
        const context = { input: "value" };

        // Execute nodes step by step
        const result1 = await executeNode({
            nodeType: "http",
            nodeConfig: myWorkflowDefinition.nodes[0].data,
            context
        });

        Object.assign(context, result1);

        // Continue with other nodes...

        // Assert final output
        expect(context).toHaveProperty("expectedOutput");
    });
});
```

---

## Node Type Coverage

### Currently Tested

**AI/ML Nodes:**

- `llm` - Anthropic Claude integration with prompt handling
- `vision` - In development
- `audio` - In development
- `embeddings` - In development

**HTTP Nodes:**

- `http` - External API calls with various methods and authentication

**Data Nodes:**

- `transform` - XML parsing, JSONata expressions, and custom transformations
- `variable` - Workflow-level state management
- `input` - Workflow input handling
- `output` - Result display and formatting
- `fileOperations` - PDF parsing and file handling

**Logic Nodes:**

- `conditional` - Branching logic tested
- `switch` - In development
- `loop` - In development
- `code` - In development
- `wait` - In development

**Integration Nodes:**

- `database` - In development
- `integration` - In development

**User Interaction:**

- `user-input` - Human-in-the-loop (in development)

---

## Test Scenario Format

Each workflow includes test scenarios with comprehensive metadata:

```typescript
{
  name: string,                    // Scenario name
  triggerType: 'manual' | 'webhook' | 'chat' | ...,
  inputs?: Record<string, any>,    // For manual trigger
  config?: {...},                  // For webhook/chat trigger
  expectedOutput?: any,            // Expected results
  expectedError?: boolean,         // Should it fail?
  performanceCheck?: {...},        // Duration expectations
  executionChecks?: {...}          // Node execution verification
}
```

---

## Trigger Type Coverage

The test scenarios cover multiple trigger types:

- ✅ **Manual Trigger:** All phases (primary testing method)
- ✅ **Webhook Trigger:** Phases 2, 4 (HTTP simulation)
- ✅ **Chat Trigger:** Phase 3 (conversational workflows)
- ⏳ **API Trigger:** Not yet implemented in UI
- ⏳ **Form Trigger:** Not yet implemented in UI
- ⏳ **Scheduled Trigger:** Not yet implemented in UI
- ⏳ **File Upload Trigger:** Not yet implemented in UI
- ⏳ **Event Trigger:** Not yet implemented in UI

---

## CI Integration

Tests run automatically in GitHub Actions without requiring any secrets or external service access:

```yaml
- name: Run Integration Tests
  run: npm run test:integration
  env:
      NODE_ENV: test
```

---

## User-Facing Workflow Testing

### Testing Checklist

Users should progressively test workflows in the UI:

**Phase 1: Basic Execution**

- [ ] Test with valid name
- [ ] Test with special characters
- [ ] Test with empty string
- [ ] Verify execution logs
- [ ] Verify timeline visualization

**Phase 2: HTTP & Parallel**

- [ ] Test with valid user ID
- [ ] Test webhook trigger
- [ ] Test error handling (invalid ID)
- [ ] Verify parallel execution performance

**Phase 3: LLM Integration**

- [ ] Test positive sentiment (requires Anthropic key)
- [ ] Test negative sentiment
- [ ] Test chat trigger
- [ ] Verify token tracking

**Phase 4: Conditional Logic**

- [ ] Test data route (Branch A)
- [ ] Test analysis route (Branch B)
- [ ] Verify branch isolation
- [ ] Check performance (only one branch runs)

### Monitoring & Debugging Features

When testing workflows in the UI, users can leverage:

**Real-time Monitoring:**

- Live execution progress
- Node-by-node status updates
- Timeline visualization
- Output preview

**Debugging Tools:**

- Execution logs with timestamps
- Variable values at each step
- Error messages and stack traces
- Network request inspection
- Token usage tracking (LLM nodes)

**Results Inspection:**

- Structured output display
- JSON/object exploration
- Success/failure indicators
- Performance metrics

---

## Known Issues and Limitations

The test suite has a few known limitations being addressed:

- Variable interpolation in nested object paths needs additional debugging
- HTTP node returns data directly rather than using the `outputVariable` config
- LLM executor shows deprecated model warnings (cosmetic issue only)

---

## Contributing New Tests

When adding new node types or features, follow these guidelines:

1. **Create realistic workflows** that demonstrate the new functionality in a practical context
2. **Add comprehensive mocks** for any external APIs the node might call
3. **Follow established patterns** from existing tests for consistency
4. **Ensure tests are self-documenting** so they serve as examples for users
5. **Add test scenarios** covering happy path, error cases, and edge cases
6. **Update this document** with new coverage information

---

## Future Enhancements

### Test Fixtures

- [ ] Add more advanced patterns (loops, switches)
- [ ] Add database integration workflow
- [ ] Add file upload workflow
- [ ] Add error recovery workflow
- [ ] Add long-running workflow example

### Tooling

- [ ] Automated test runner (run all scenarios)
- [ ] Test result comparison (expected vs actual)
- [ ] Performance benchmarking tools
- [ ] Test coverage reporting
- [ ] CI/CD integration for regression testing

### UI Improvements

- [ ] Implement remaining trigger types (API, Form, Scheduled, etc.)
- [ ] Add test scenario templates
- [ ] Add test scenario import/export
- [ ] Add visual regression testing
- [ ] Add test scenario sharing

---

## Resources

- [Jest Documentation](https://jestjs.io/) - Test framework
- [Nock HTTP Mocking](https://github.com/nock/nock) - HTTP request interception
- [Supertest API Testing](https://github.com/visionmedia/supertest) - HTTP assertions
- [Temporal Testing](https://docs.temporal.io/typescript/testing) - Workflow testing patterns

---

## Summary

FlowMaestro's testing strategy combines:

**Developer-Focused Testing:**

- Integration tests with mocked dependencies
- In-memory database and Temporal environment
- Fast, reliable CI execution
- Comprehensive test helpers and utilities

**User-Focused Testing:**

- Progressive complexity workflow fixtures
- Real-world scenario validation
- UI-based execution testing
- Comprehensive monitoring and debugging tools

This dual approach ensures both code quality and user experience are thoroughly validated before deployment.
