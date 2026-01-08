# FlowMaestro Test Suite

## Overview

FlowMaestro has a comprehensive test suite covering workflow execution, API routes, and system integration. The tests use **mocked dependencies** for fast, deterministic testing while validating real business logic.

**Test Stats:**

- ~900 tests across 35+ test files
- Execution time: < 10 seconds for full suite
- No external services required (fully mocked)

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific categories
npm run test:integration          # All integration tests
npm run test:integration:simple   # Simple workflow tests
npm run test:integration:real-world  # Real-world scenarios

# Run specific file
npm test -- --testPathPattern="auth.test" --no-coverage

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## Test Directory Structure

```
backend/tests/
├── __mocks__/                      # Jest module mocks
│   └── nanoid.ts
├── fixtures/                       # Test data factories
│   ├── activities.ts               # Mock activity implementations
│   ├── contexts.ts                 # Pre-built context snapshots
│   └── workflows.ts                # Test workflow definitions
├── helpers/                        # Test utilities
│   ├── fastify-test-client.ts      # API route test infrastructure
│   └── database-mock.ts            # Database mocking utilities
├── unit/                           # Unit tests
│   └── context/                    # Context service tests
└── integration/                    # Integration tests
    ├── routes/                     # API route tests (NEW)
    │   ├── auth.test.ts
    │   ├── workflows.test.ts
    │   ├── agents.test.ts
    │   ├── connections.test.ts
    │   ├── executions.test.ts
    │   └── triggers.test.ts
    ├── workflows/                  # Workflow pattern tests (NEW)
    │   ├── chatbot-conversation.test.ts
    │   └── multi-model-ensemble.test.ts
    ├── base-level/                 # Core handler & orchestrator tests
    │   ├── handlers/
    │   └── orchestrator/
    ├── simple/                     # Simple linear workflows
    ├── branching/                  # Conditional branching
    ├── loops/                      # Loop execution
    ├── parallel/                   # Parallel execution
    ├── error-handling/             # Error scenarios
    ├── real-world/                 # End-to-end scenarios
    └── edge-cases/                 # Limits & boundaries
```

---

## Test Categories

### 1. API Route Tests (`integration/routes/`)

Tests the HTTP layer: routes, middleware, validation, and multi-tenancy.

| File                  | Tests | Coverage                                                     |
| --------------------- | ----- | ------------------------------------------------------------ |
| `auth.test.ts`        | ~40   | Registration, login, 2FA, password reset, email verification |
| `workflows.test.ts`   | ~22   | CRUD operations, execution, pagination, multi-tenant         |
| `agents.test.ts`      | ~26   | CRUD, provider validation, parameter bounds                  |
| `connections.test.ts` | ~22   | CRUD, connection methods, filtering                          |
| `executions.test.ts`  | ~17   | List, get, cancel, logs                                      |
| `triggers.test.ts`    | ~21   | Schedule/webhook/manual triggers, webhook receiver           |

**What's Tested vs Mocked:**

```
TESTED (Real Code)              MOCKED (Fake Data)
─────────────────               ──────────────────
Fastify server                  Repositories (DB layer)
Route handlers                  External services (Email, SMS)
Middleware (auth, validation)   Temporal client
Zod schema validation           Redis
Error handling                  Rate limiter
JWT signing/verification
```

**Test Pattern:**

```
1. Arrange: Configure mocks with test data
2. Act: Make HTTP request via fastify.inject()
3. Assert: Verify status code, response body, mock calls
```

---

### 2. Workflow Pattern Tests (`integration/workflows/`)

Tests complete workflow execution patterns with mocked node handlers.

| File                           | Tests | Pattern                                    |
| ------------------------------ | ----- | ------------------------------------------ |
| `chatbot-conversation.test.ts` | 15    | Multi-turn conversation with memory        |
| `multi-model-ensemble.test.ts` | 12    | Parallel LLM calls with result aggregation |

**Covers:**

- Node execution sequencing
- Context variable passing
- Loop iteration with state
- Parallel execution and join
- Error handling in workflows

---

### 3. Node Handler Tests (`base-level/handlers/`)

Tests individual node type execution logic.

| Handler      | Tests | What It Validates                                    |
| ------------ | ----- | ---------------------------------------------------- |
| HTTP Handler | ~45   | URL interpolation, auth types, retry logic, timeouts |
| LLM Handler  | ~40   | Prompt templating, provider switching, rate limits   |

---

### 4. Orchestrator Tests (`base-level/orchestrator/`)

Tests workflow control flow mechanisms.

| Test File                       | Tests | What It Validates                        |
| ------------------------------- | ----- | ---------------------------------------- |
| `conditional-branching.test.ts` | ~30   | Branch selection, comparison operators   |
| `loop-execution.test.ts`        | ~25   | Iteration variables, result accumulation |
| `parallel-execution.test.ts`    | ~25   | Concurrent execution, branch isolation   |
| `error-propagation.test.ts`     | ~20   | Cascade behavior, partial execution      |

---

### 5. Control Flow Tests

| Category  | Files | Tests | Key Patterns                                   |
| --------- | ----- | ----- | ---------------------------------------------- |
| Simple    | 1     | 15    | Linear execution, variable passing             |
| Branching | 1     | 52    | If/else, nested conditionals, all operators    |
| Loops     | 4     | 91    | ForEach, While, nested loops, break conditions |
| Parallel  | 3     | 77    | Fan-out, fan-in, join strategies               |

---

### 6. Error Handling Tests

| Test File                      | Tests | Coverage                          |
| ------------------------------ | ----- | --------------------------------- |
| `node-failure-cascade.test.ts` | 32    | Dependency chain failures         |
| `retry-behavior.test.ts`       | 41    | Retryable vs non-retryable errors |
| `timeout-handling.test.ts`     | 36    | Activity/HTTP/LLM timeouts        |
| `error-recovery.test.ts`       | 27    | Fallback nodes, circuit breaker   |

---

### 7. Real-World Scenario Tests

End-to-end tests for common workflow patterns.

| Scenario              | Tests | Workflow Pattern                                 |
| --------------------- | ----- | ------------------------------------------------ |
| Lead Enrichment       | 30    | HTTP → LLM → Conditional → CRM                   |
| Content Generation    | 36    | LLM → Loop[LLM] → Transform                      |
| Data Sync             | 33    | DB → Loop[Transform → HTTP]                      |
| Notification Pipeline | 32    | Conditional → Parallel[Email, Slack, SMS] → Join |
| Multi-Step Approval   | 26    | Loop[Wait → Conditional]                         |

---

### 8. Edge Case Tests

| Test File                             | Tests | What It Validates                    |
| ------------------------------------- | ----- | ------------------------------------ |
| `large-payloads.test.ts`              | 34    | 1MB node output, 50MB context limits |
| `rate-limiting.test.ts`               | 30    | 429 handling, Retry-After, backoff   |
| `context-size-limits.test.ts`         | 29    | Size rejection, pruning strategy     |
| `concurrent-execution-limits.test.ts` | 36    | maxConcurrent enforcement            |

---

## Test Architecture

### API Route Tests

```
┌─────────────────────────────────────────────────────────┐
│                    TEST BOUNDARY                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │              TESTED (Real Code)                   │  │
│  │  Fastify → Routes → Middleware → Zod Validation   │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                              │
│  ┌───────────────────────▼───────────────────────────┐  │
│  │              MOCKED (Fake Data)                   │  │
│  │  Repositories │ Services │ Temporal │ Redis      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Workflow Tests

```
┌─────────────────────────────────────────────────────────┐
│                    TEST BOUNDARY                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │              TESTED (Real Code)                   │  │
│  │  Orchestrator → Queue → Context → Control Flow    │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                              │
│  ┌───────────────────────▼───────────────────────────┐  │
│  │              MOCKED (Fake Data)                   │  │
│  │  Activities (HTTP calls, LLM calls, DB queries)   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Adding New Tests

### Adding API Route Tests

1. **Create test file** in `tests/integration/routes/`
2. **Set up mocks** before imports using `jest.mock()`
3. **Import test helpers** from `fastify-test-client.ts`
4. **Write tests** following the pattern:

```typescript
describe("GET /myresource", () => {
    it("should return resource for owner", async () => {
        // Arrange
        const testUser = createTestUser();
        mockRepo.findById.mockResolvedValue(mockResource);

        // Act
        const response = await authenticatedRequest(fastify, testUser, {
            method: "GET",
            url: "/myresource/123"
        });

        // Assert
        expectStatus(response, 200);
        expect(response.json().data.id).toBe("123");
    });
});
```

**Required test categories for routes:**

- Happy path (valid request → success response)
- Validation errors (invalid input → 400)
- Authentication (no token → 401)
- Authorization (other user's resource → 404)
- Not found (non-existent resource → 404)

### Adding Workflow Tests

1. **Create test file** in `tests/integration/workflows/`
2. **Use workflow fixtures** from `tests/fixtures/workflows.ts`
3. **Mock activities** using `createMockActivities()`
4. **Test the execution flow**:

```typescript
describe("My Workflow Pattern", () => {
    it("should execute nodes in order", async () => {
        // Arrange
        const workflow = createMyWorkflow();
        const activities = createMockActivities({
            executeNodeResult: { success: true, output: { result: "ok" } }
        });

        // Act
        const result = await executeWorkflow(workflow, { input: "test" }, activities);

        // Assert
        expect(result.status).toBe("completed");
        expect(result.outputs.finalNode).toBeDefined();
    });
});
```

### Adding Node Handler Tests

1. **Create test file** in `tests/integration/base-level/handlers/`
2. **Test the handler function directly**
3. **Cover:**
    - Input interpolation (`{{nodeId.field}}`)
    - Output format
    - Error classification (retryable vs non-retryable)
    - Timeout behavior

---

## Test Utilities

### `fastify-test-client.ts`

```typescript
// Create isolated test server
const fastify = await createTestServer();

// Make authenticated request
const response = await authenticatedRequest(fastify, testUser, {
    method: "POST",
    url: "/workflows",
    payload: { name: "Test" }
});

// Make unauthenticated request
const response = await unauthenticatedRequest(fastify, {
    method: "GET",
    url: "/health"
});

// Assertion helpers
expectStatus(response, 200);
expectSuccessResponse<{ id: string }>(response);
expectErrorResponse(response, 401);

// Test data factories
const user = createTestUser({ email: "test@example.com" });
const workflow = createTestWorkflowDefinition("My Workflow");
const agent = createTestAgentConfig("My Agent");
const connection = createTestConnectionConfig("openai", "api_key");
```

### `fixtures/workflows.ts`

```typescript
// Pre-built workflow definitions
createLinearWorkflow(); // A → B → C
createDiamondWorkflow(); // A → [B, C] → D
createConditionalWorkflow(); // A → Cond → [T/F] → End
createLoopWorkflow(); // Start → Loop → Process → End
createErrorCascadeWorkflow(); // Tests error propagation
```

### `fixtures/contexts.ts`

```typescript
// Pre-built context states
createEmptyContext(inputs?)
createContextWithOutputs()
createLargeContext(targetSizeBytes?)
createLoopState(index, total, item?)
createParallelState(index, branchId, currentItem?)
```

---

## Maintaining Tests

### When to Update Tests

| Code Change        | Test Update Required                                   |
| ------------------ | ------------------------------------------------------ |
| New API endpoint   | Add route tests                                        |
| New node type      | Add handler tests + orchestrator tests if control flow |
| Changed validation | Update validation tests                                |
| New error type     | Add error handling tests                               |
| Performance change | Update edge case tests                                 |

### Test Hygiene

- **Keep tests focused**: One behavior per test
- **Use descriptive names**: `it("should return 404 for other user's workflow")`
- **Don't test mocks**: Verify behavior, not mock calls (unless testing integration points)
- **Reset mocks**: Use `beforeEach(() => jest.clearAllMocks())`
- **Avoid test interdependence**: Each test should work in isolation

### Common Issues

| Issue                             | Solution                                      |
| --------------------------------- | --------------------------------------------- |
| Test passes alone, fails in suite | Missing mock reset in `beforeEach`            |
| Flaky timeout tests               | Use `jest.useFakeTimers()`                    |
| Import order errors               | Ensure `jest.mock()` calls are before imports |
| Type errors in mocks              | Use `as jest.Mock` for type assertions        |

---

## Coverage Goals

| Category       | Target | Current |
| -------------- | ------ | ------- |
| API Routes     | 80%+   | ~85%    |
| Node Handlers  | 90%+   | ~92%    |
| Control Flow   | 90%+   | ~95%    |
| Error Handling | 85%+   | ~88%    |

**Not covered by unit/integration tests:**

- Real database queries (use E2E tests)
- Real Temporal workflow execution (use E2E tests)
- Real external API calls (use contract tests)
- Performance/load testing (use dedicated tools)

---

## CI Integration

Tests run automatically in GitHub Actions:

```yaml
- name: Run Tests
  run: npm test
  env:
      NODE_ENV: test
```

No external services or secrets required since all dependencies are mocked.
