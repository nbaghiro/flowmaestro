# FlowMaestro Integration Test Suite

## Overview

FlowMaestro has a comprehensive integration test suite with **746 tests across 28 test files**, organized into 8 logical phases. The tests use **mocked activities** rather than real Temporal execution to enable fast, deterministic testing while validating the core workflow engine logic.

**Key Characteristics:**

- No external API calls during tests (fully mocked)
- No running Temporal server required
- Test execution time < 5 seconds for full suite
- Tests serve as documentation for workflow patterns

---

## Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test category
npm run test:integration:simple      # Simple workflow tests
npm run test:integration:real-world  # Real-world scenario tests

# Run specific test file
npm test -- --testPathPattern="rate-limiting" --no-coverage

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

---

## Test Directory Structure

```
backend/tests/
├── __mocks__/                    # Jest mocks for external modules
│   └── nanoid.ts
├── fixtures/                     # Test data and fixtures
│   ├── activities.ts             # Mock activity implementations
│   ├── contexts.ts               # Pre-built context snapshots
│   └── workflows.ts              # Test workflow definitions
├── helpers/                      # Test utilities
│   └── ...
├── unit/                         # Unit tests
│   └── context/                  # Context management tests
└── integration/                  # Integration tests (746 tests)
    ├── base-level/               # Phase 1: Handler & orchestrator tests
    │   ├── handlers/
    │   │   ├── http-handler.test.ts
    │   │   └── llm-handler.test.ts
    │   └── orchestrator/
    │       ├── conditional-branching.test.ts
    │       ├── error-propagation.test.ts
    │       ├── loop-execution.test.ts
    │       └── parallel-execution.test.ts
    ├── simple/                   # Phase 2: Simple workflows
    │   └── linear-execution.test.ts
    ├── branching/                # Phase 3: Branching tests
    │   └── conditional-if-else.test.ts
    ├── loops/                    # Phase 4: Loop tests
    │   ├── for-each-iteration.test.ts
    │   ├── while-loop.test.ts
    │   ├── nested-loops.test.ts
    │   └── loop-with-conditionals.test.ts
    ├── parallel/                 # Phase 5: Parallel execution tests
    │   ├── parallel-branches.test.ts
    │   ├── parallel-with-join.test.ts
    │   └── concurrent-api-calls.test.ts
    ├── error-handling/           # Phase 6: Error handling tests
    │   ├── node-failure-cascade.test.ts
    │   ├── retry-behavior.test.ts
    │   ├── timeout-handling.test.ts
    │   └── error-recovery.test.ts
    ├── real-world/               # Phase 7: Real-world scenario tests
    │   ├── lead-enrichment.test.ts
    │   ├── content-generation.test.ts
    │   ├── data-sync.test.ts
    │   ├── notification-pipeline.test.ts
    │   └── multi-step-approval.test.ts
    └── edge-cases/               # Phase 8: Edge case tests
        ├── large-payloads.test.ts
        ├── rate-limiting.test.ts
        ├── context-size-limits.test.ts
        └── concurrent-execution-limits.test.ts
```

---

## Phase 1: Base-Level Handler & Orchestrator Tests

### `base-level/handlers/http-handler.test.ts`

**Critical System Component:** HTTP node execution engine

| Coverage Area       | What It Tests                                           | Why It's Critical                                         |
| ------------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| URL Building        | Variable interpolation in URLs (`{{nodeId.field}}`)     | Users build dynamic API calls using previous node outputs |
| Query Parameters    | Dynamic query string construction                       | API integrations often require parameterized queries      |
| Header Construction | Auth headers, custom headers with interpolation         | OAuth/API key authentication must work correctly          |
| Body Interpolation  | JSON body with embedded variables                       | POST/PUT requests need dynamic payloads                   |
| Timeout Handling    | Request timeout configuration                           | Prevents workflows from hanging on slow APIs              |
| Retry Logic         | Which status codes trigger retries (429, 500, 502, 503) | Rate limiting and transient failures are common           |
| Auth Types          | Bearer, Basic, API Key authentication                   | Different APIs require different auth mechanisms          |

### `base-level/handlers/llm-handler.test.ts`

**Critical System Component:** LLM node execution (OpenAI, Anthropic, etc.)

| Coverage Area        | What It Tests                                                 | Why It's Critical                                |
| -------------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| Prompt Interpolation | Variables in prompts: `{{userData.name}}`                     | Users build prompts from workflow data           |
| Nested Path Access   | Deep property access: `{{node.profile.preferences.language}}` | Complex data structures are common               |
| Retry Classification | Rate limits (429), overloaded errors, server errors           | LLM APIs frequently rate-limit                   |
| Non-Retryable Errors | Auth errors (401), content policy violations                  | These should fail fast, not retry forever        |
| Output Formatting    | Token usage, model info, response text                        | Consistent output structure for downstream nodes |
| Context Integration  | Storing LLM output for subsequent nodes                       | Chaining multiple LLM calls is a key pattern     |

### `base-level/orchestrator/conditional-branching.test.ts`

**Critical System Component:** Conditional node evaluation

| Coverage Area        | What It Tests                                              | Why It's Critical                          |
| -------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| Branch Selection     | True/false path activation                                 | Core routing logic for if/else workflows   |
| Comparison Operators | `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `startsWith` | Users need flexible condition expressions  |
| Type Coercion        | String vs number comparisons                               | Loose typing in user-configured conditions |
| Edge Activation      | Only correct outgoing edge fires                           | Prevents duplicate execution               |

### `base-level/orchestrator/error-propagation.test.ts`

**Critical System Component:** Error handling during execution

| Coverage Area     | What It Tests                       | Why It's Critical                                 |
| ----------------- | ----------------------------------- | ------------------------------------------------- |
| Error Capture     | Error details stored in context     | Debugging requires error visibility               |
| Cascade Behavior  | Dependent nodes marked as skipped   | Prevents executing nodes with missing inputs      |
| Partial Execution | Completed work preserved on failure | Recovery and debugging require state preservation |

### `base-level/orchestrator/loop-execution.test.ts`

**Critical System Component:** Loop node orchestration

| Coverage Area        | What It Tests                                       | Why It's Critical                      |
| -------------------- | --------------------------------------------------- | -------------------------------------- |
| Iteration Variables  | `{{loop.item}}`, `{{loop.index}}`, `{{loop.total}}` | Core loop functionality                |
| Results Accumulation | `{{loop.results}}` array building                   | Collecting outputs from each iteration |
| Empty Array Handling | Zero iterations gracefully                          | Edge case that shouldn't crash         |
| Context Isolation    | Loop-local variables don't leak                     | Prevents variable pollution            |

### `base-level/orchestrator/parallel-execution.test.ts`

**Critical System Component:** Parallel branch execution

| Coverage Area        | What It Tests                     | Why It's Critical        |
| -------------------- | --------------------------------- | ------------------------ |
| Concurrent Execution | Multiple nodes run simultaneously | Performance optimization |
| Branch Isolation     | No cross-contamination of state   | Correctness guarantee    |
| Join Behavior        | All branches complete before join | Synchronization point    |

---

## Phase 2: Simple Workflow Tests

### `simple/linear-execution.test.ts` (15 tests)

**Critical System Component:** Basic execution engine, context management

| Coverage Area        | What It Tests                         | Why It's Critical                                |
| -------------------- | ------------------------------------- | ------------------------------------------------ |
| Single Node          | Trigger -> Output execution           | Simplest workflow must work                      |
| Three-Node Chain     | A -> B -> C execution order           | Sequential dependency resolution                 |
| Five-Node Chain      | Longer chains with timing             | Verifies order even with varying execution times |
| Variable Passing     | `{{nodeId.field}}` access             | Core data flow mechanism                         |
| Context Accumulation | `context.nodeOutputs` grows correctly | Debugging and downstream access                  |
| Metadata Tracking    | Node count, total size                | Observability and limits enforcement             |
| Final Outputs        | Output node collection                | Workflow result building                         |

---

## Phase 3: Branching Tests

### `branching/conditional-if-else.test.ts` (52 tests)

**Critical System Component:** Conditional routing logic

| Coverage Area         | What It Tests                                                          | Why It's Critical          |
| --------------------- | ---------------------------------------------------------------------- | -------------------------- |
| True/False Paths      | Correct branch activation                                              | Core if/else functionality |
| All Operators         | `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `startsWith`, `endsWith` | Full expression language   |
| Type Handling         | String, number, boolean, null comparisons                              | Type coercion rules        |
| Nested Conditionals   | 2-3 levels deep                                                        | Complex business logic     |
| LLM-Based Routing     | Router node with AI classification                                     | Advanced routing pattern   |
| Expression Evaluation | Compound conditions with AND/OR                                        | Complex condition logic    |

---

## Phase 4: Loop Tests

### `loops/for-each-iteration.test.ts` (27 tests)

**Critical System Component:** ForEach loop execution

| Coverage Area      | What It Tests                                       | Why It's Critical        |
| ------------------ | --------------------------------------------------- | ------------------------ |
| Array Iteration    | String arrays, object arrays                        | Core loop pattern        |
| Loop Variables     | `{{loop.item}}`, `{{loop.index}}`, `{{loop.total}}` | Iteration context access |
| Results Collection | `{{loop.results}}` accumulation                     | Output aggregation       |
| Empty/Single Item  | Edge cases                                          | Robustness               |
| Large Arrays       | 100+ items                                          | Performance verification |

### `loops/while-loop.test.ts` (24 tests)

**Critical System Component:** Condition-based loops

| Coverage Area         | What It Tests                    | Why It's Critical        |
| --------------------- | -------------------------------- | ------------------------ |
| Condition Termination | Loop until condition false       | Core while-loop behavior |
| Counter Patterns      | Count up/down with step          | Common use case          |
| Max Iterations        | Safety limit enforcement         | Infinite loop prevention |
| Variable Mutation     | State changes between iterations | Accumulator patterns     |
| Break Conditions      | Early exit on specific value     | Optimization             |

### `loops/nested-loops.test.ts` (22 tests)

**Critical System Component:** Multi-level loop nesting

| Coverage Area            | What It Tests                          | Why It's Critical        |
| ------------------------ | -------------------------------------- | ------------------------ |
| Inner/Outer Coordination | Inner completes per outer iteration    | Correct nesting behavior |
| Parent Context Access    | Inner loop reads outer `{{loop.item}}` | Cross-level data access  |
| Results Structure        | Nested array building                  | Complex data aggregation |

### `loops/loop-with-conditionals.test.ts` (18 tests)

**Critical System Component:** Mixed control flow

| Coverage Area           | What It Tests                    | Why It's Critical |
| ----------------------- | -------------------------------- | ----------------- |
| Conditional Inside Loop | Different branches per iteration | Common pattern    |
| Early Exit              | Break on condition               | Optimization      |
| Skipped Iterations      | Continue-like behavior           | Filtering pattern |

---

## Phase 5: Parallel Execution Tests

### `parallel/parallel-branches.test.ts` (26 tests)

**Critical System Component:** Parallel split/fan-out

| Coverage Area       | What It Tests                                 | Why It's Critical     |
| ------------------- | --------------------------------------------- | --------------------- |
| 2/3/10 Branches     | Varying parallelism                           | Scalability           |
| Context Isolation   | No state sharing                              | Correctness           |
| Parallel Variables  | `{{parallel.index}}`, `{{parallel.branchId}}` | Branch identification |
| Timing Verification | Concurrent not sequential                     | Performance guarantee |
| Input Access        | All branches read trigger data                | Data availability     |

### `parallel/parallel-with-join.test.ts` (26 tests)

**Critical System Component:** Parallel join/fan-in

| Coverage Area        | What It Tests                            | Why It's Critical         |
| -------------------- | ---------------------------------------- | ------------------------- |
| Wait for All         | Join blocks until all complete           | Synchronization           |
| Merge Strategies     | Object merge, array, first, last, custom | Flexible output handling  |
| Branch Output Access | Individual branch results after join     | Post-join processing      |
| Aggregation          | Sum, filter, combine                     | Common join operations    |
| Error Handling       | Branches with errors                     | Partial failure scenarios |

### `parallel/concurrent-api-calls.test.ts` (25 tests)

**Critical System Component:** Real-world parallel patterns

| Coverage Area       | What It Tests                   | Why It's Critical                |
| ------------------- | ------------------------------- | -------------------------------- |
| Multiple HTTP Calls | Parallel API requests           | Common integration pattern       |
| Multiple LLM Calls  | Parallel AI processing          | Multi-model comparison           |
| Mixed Node Types    | HTTP + LLM + Transform          | Realistic heterogeneous parallel |
| maxConcurrentNodes  | 1, 2, 5, 10 limits              | Resource management              |
| Timing Verification | Parallel faster than sequential | Performance validation           |
| Partial Failures    | Some calls fail, others succeed | Resilience                       |

---

## Phase 6: Error Handling Tests

### `error-handling/node-failure-cascade.test.ts` (32 tests)

**Critical System Component:** Failure propagation

| Coverage Area        | What It Tests                               | Why It's Critical         |
| -------------------- | ------------------------------------------- | ------------------------- |
| Linear Cascade       | A fails -> B, C, D skipped                  | Dependency chain handling |
| Diamond Cascade      | Converging dependencies                     | Complex graph failure     |
| Independent Branches | Sibling failure doesn't affect other branch | Isolation                 |
| Error Details        | Type, message, stack preserved              | Debugging                 |
| Context Snapshot     | State at failure point                      | Recovery/debugging        |
| Multiple Failures    | Several nodes fail                          | Compound error scenarios  |

### `error-handling/retry-behavior.test.ts` (41 tests)

**Critical System Component:** Automatic retry logic

| Coverage Area       | What It Tests                                    | Why It's Critical                |
| ------------------- | ------------------------------------------------ | -------------------------------- |
| Retryable Errors    | 429, 500, 502, 503, RateLimitError, NetworkError | Transient failure recovery       |
| Non-Retryable       | 400, 401, 403, 404, ValidationError              | Fast failure on permanent errors |
| Exponential Backoff | Delay increases: 1s -> 2s -> 4s                  | Rate limit respect               |
| Max Retries         | Stop after N attempts                            | Prevent infinite retry           |
| Success After Retry | 2nd, 3rd, last attempt success                   | Happy path verification          |
| Custom Config       | Custom retryable codes/errors                    | Flexibility                      |

### `error-handling/timeout-handling.test.ts` (36 tests)

**Critical System Component:** Timeout enforcement

| Coverage Area     | What It Tests                | Why It's Critical      |
| ----------------- | ---------------------------- | ---------------------- |
| Activity Timeout  | Generic timeout failure      | Core timeout mechanism |
| HTTP Timeout      | Slow API calls               | Network timeout        |
| LLM Timeout       | Slow AI generation           | Model timeout          |
| Database Timeout  | Slow queries                 | DB timeout             |
| Error Messages    | Clear, actionable messages   | Debugging              |
| Parallel Timeouts | Independent timeout handling | Isolation              |
| Very Short/Long   | Edge cases (10ms, 300s)      | Boundary conditions    |

### `error-handling/error-recovery.test.ts` (27 tests)

**Critical System Component:** Recovery patterns

| Coverage Area               | What It Tests                          | Why It's Critical             |
| --------------------------- | -------------------------------------- | ----------------------------- |
| Error Edge Activation       | Error handler node triggers            | Workflow-level error handling |
| Fallback Nodes              | Primary -> Fallback pattern            | Graceful degradation          |
| Graceful Degradation        | Partial success with optional services | Resilience pattern            |
| Error Output                | Error details to output node           | Error reporting               |
| Circuit Breaker             | Failure count, open circuit, cooldown  | Advanced resilience           |
| Retry with Different Params | Recovery strategy                      | Self-healing                  |

---

## Phase 7: Real-World Scenario Tests

### `real-world/lead-enrichment.test.ts` (30 tests)

**Workflow:** `Trigger -> HTTP (Clearbit) -> LLM (Score) -> Conditional -> CRM/Notification`

| Coverage Area          | What It Tests              | Why It's Critical               |
| ---------------------- | -------------------------- | ------------------------------- |
| Complete Pipeline      | End-to-end lead enrichment | Validates full workflow pattern |
| High/Warm/Cold Scoring | LLM classification paths   | Business logic branching        |
| API Failure Handling   | Enrichment API down        | Resilience                      |
| Missing Data           | Incomplete lead info       | Edge case handling              |
| CRM Integration        | Update simulation          | Integration pattern             |
| Notification Routing   | Email/Slack based on score | Multi-channel output            |

### `real-world/content-generation.test.ts` (36 tests)

**Workflow:** `Trigger -> LLM (Outline) -> Loop[LLM (Section)] -> Transform (Combine) -> Output`

| Coverage Area            | What It Tests                      | Why It's Critical       |
| ------------------------ | ---------------------------------- | ----------------------- |
| Multi-Section Generation | 2-10 sections                      | Variable loop iteration |
| Style Consistency        | Professional/casual/technical tone | LLM configuration       |
| Token Limits             | Stop on limit, mark incomplete     | Resource management     |
| Content Combination      | Section aggregation                | Transform pattern       |
| Keyword Tracking         | Density calculation                | Metadata extraction     |
| Error Recovery           | Section generation failure         | Partial completion      |

### `real-world/data-sync.test.ts` (33 tests)

**Workflow:** `Trigger -> Database (Fetch) -> Loop[Transform -> HTTP (Sync)] -> Output`

| Coverage Area     | What It Tests                   | Why It's Critical |
| ----------------- | ------------------------------- | ----------------- |
| Batch Processing  | 10, 100+ records                | Scalability       |
| Incremental Sync  | Filter by lastSyncTimestamp     | Efficiency        |
| Conflict Handling | 409 status, conflict details    | Data integrity    |
| Field Mapping     | Transform to target schema      | ETL pattern       |
| CRUD Detection    | Create/Update/Delete operations | Change detection  |
| Partial Failure   | Continue after record failure   | Resilience        |
| Error Aggregation | Collect all sync errors         | Reporting         |

### `real-world/notification-pipeline.test.ts` (32 tests)

**Workflow:** `Trigger -> Conditional (Priority) -> Parallel[Email, Slack, SMS, Push] -> Join -> Output`

| Coverage Area          | What It Tests                               | Why It's Critical |
| ---------------------- | ------------------------------------------- | ----------------- |
| Multi-Channel Delivery | 1-4 channels                                | Fan-out pattern   |
| Priority Routing       | Urgent/High/Medium/Low -> channel selection | Business rules    |
| Partial Success        | Some channels fail                          | Resilience        |
| Template Variables     | User data in messages                       | Personalization   |
| Join Aggregation       | Success count, results collection           | Summary building  |
| Channel Skipping       | Exclude specific channels                   | Opt-out           |

### `real-world/multi-step-approval.test.ts` (26 tests)

**Workflow:** `Trigger -> Loop[Wait (Approval) -> Conditional] -> Final Action`

| Coverage Area    | What It Tests             | Why It's Critical       |
| ---------------- | ------------------------- | ----------------------- |
| Approval Granted | Happy path                | Core approval flow      |
| Approval Denied  | Rejection handling        | Business logic          |
| Multi-Approver   | Sequential approvals      | Complex approval chains |
| Timeout          | No response handling      | Time-bound processes    |
| Escalation       | Auto-escalate on timeout  | Business rules          |
| Audit Trail      | Approval history tracking | Compliance              |

---

## Phase 8: Edge Case Tests

### `edge-cases/large-payloads.test.ts` (34 tests)

**Critical System Component:** Memory and size limits

| Coverage Area         | What It Tests                      | Why It's Critical         |
| --------------------- | ---------------------------------- | ------------------------- |
| 1MB Node Output       | Just under, exactly at, over limit | Per-node size enforcement |
| 50MB Total Context    | Context size limits                | Memory protection         |
| Context Pruning       | FIFO removal of old outputs        | Memory management         |
| Large Array Iteration | 1000, 5000, 10000 items            | Performance at scale      |
| Unicode/Base64        | Special encoding handling          | Data integrity            |
| Nested Structures     | Deep object hierarchies            | Complex data              |

### `edge-cases/rate-limiting.test.ts` (30 tests)

**Critical System Component:** Rate limit handling

| Coverage Area         | What It Tests                    | Why It's Critical        |
| --------------------- | -------------------------------- | ------------------------ |
| Single 429            | One rate limit, retry success    | Basic rate limiting      |
| Multiple 429s         | 2-3 consecutive rate limits      | Persistent rate limiting |
| Retry-After Header    | Respect server-specified delay   | Protocol compliance      |
| Exponential Backoff   | Increasing delays without header | Fallback behavior        |
| Max Retries Exhausted | Eventually fail                  | Prevent infinite retry   |
| Workflow-Level        | Multiple nodes rate limited      | Aggregate handling       |

### `edge-cases/context-size-limits.test.ts` (29 tests)

**Critical System Component:** Context management

| Coverage Area     | What It Tests            | Why It's Critical      |
| ----------------- | ------------------------ | ---------------------- |
| Size Rejection    | Output exceeds limit     | Enforcement            |
| Pruning Strategy  | Oldest removed first     | FIFO guarantee         |
| Size Calculation  | JSON.stringify accuracy  | Correct measurement    |
| Node Count Limits | Max nodes in context     | Memory protection      |
| Combined Limits   | Size AND count limits    | Multi-constraint       |
| Performance       | Fast metrics calculation | Observability overhead |

### `edge-cases/concurrent-execution-limits.test.ts` (36 tests)

**Critical System Component:** Concurrency control

| Coverage Area       | What It Tests             | Why It's Critical                 |
| ------------------- | ------------------------- | --------------------------------- |
| maxConcurrent = 1   | Sequential execution      | Resource-constrained environments |
| maxConcurrent = 5   | Limited parallelism       | Balanced execution                |
| maxConcurrent = 10  | High parallelism          | Performance mode                  |
| Queue Management    | Wait times, ordering      | Fairness                          |
| 0 or Negative Limit | Defaults to 1             | Edge case safety                  |
| 500 Nodes           | Large workflow            | Scalability                       |
| Execution Order     | Start order matches queue | Determinism                       |

---

## Coverage Summary by System Component

| System Component        | Test Files | Tests | Key Guarantees                                      |
| ----------------------- | ---------- | ----- | --------------------------------------------------- |
| **Context Service**     | 25+ files  | ~600  | Immutable state, variable resolution, size limits   |
| **Queue Management**    | 15+ files  | ~300  | Execution order, dependency resolution, concurrency |
| **Node Execution**      | 10+ files  | ~200  | Handler logic, retry, timeout, error handling       |
| **Control Flow**        | 8 files    | ~200  | Conditionals, loops, parallel, join                 |
| **Error Handling**      | 4 files    | 136   | Cascade, retry, timeout, recovery patterns          |
| **Real-World Patterns** | 5 files    | 157   | End-to-end workflow validation                      |
| **Edge Cases**          | 4 files    | 129   | Limits, rate limiting, large data                   |

---

## Why This Coverage Matters

### 1. Immutable Context

Tests verify that `storeNodeOutput`, `setVariable`, etc. return new snapshots without mutating originals. This is critical for Temporal's replay semantics where the same workflow code may run multiple times.

### 2. Variable Resolution

Extensive testing of `{{nodeId.path.to.field}}` interpolation ensures user-configured templates work correctly. This is the primary way users connect nodes together.

### 3. Error Boundaries

Tests verify that errors are contained, cascaded appropriately, and don't corrupt workflow state. Users need predictable failure behavior.

### 4. Resource Protection

Size limits, concurrency limits, and timeout tests prevent runaway workflows from consuming unbounded resources. This protects both the platform and other users.

### 5. Real-World Validation

The 5 real-world scenario tests validate that common workflow patterns (lead enrichment, content generation, data sync, notifications, approvals) work end-to-end with realistic data flows.

---

## Test Fixtures

### Workflow Fixtures (`tests/fixtures/workflows.ts`)

Pre-built workflow definitions for testing:

```typescript
// Linear workflow: A -> B -> C
createLinearWorkflow();

// Diamond pattern: A -> [B, C] -> D (parallel testing)
createDiamondWorkflow();

// Conditional workflow: A -> Cond -> [T1/F1] -> End
createConditionalWorkflow();

// Error cascade: A -> B(fails) -> C(skipped) with parallel D -> E
createErrorCascadeWorkflow();

// Loop workflow: Start -> Loop(items) -> Process -> End
createLoopWorkflow();
```

### Context Fixtures (`tests/fixtures/contexts.ts`)

Pre-built context snapshots:

```typescript
// Empty context with defaults
createEmptyContext(inputs?)

// Context with sample node outputs
createContextWithOutputs()

// Context approaching 50MB limit (for pruning tests)
createLargeContext(targetSizeBytes?)

// Loop iteration state
createLoopState(index, total, item?)
createLoopStateWithResults(index, total, item, results)

// Parallel branch state
createParallelState(index, branchId, currentItem?)
```

### Activity Mocks (`tests/fixtures/activities.ts`)

Mock implementations for Temporal activities:

```typescript
// Create mock activities for testing
createMockActivities({
    executeNodeResult: { success: true, output: {...} },
    validateInputsResult: { valid: true }
})

// Create activities that fail on specific nodes
createFailingActivities(failingNodeIds: string[])

// Create activities with predefined outputs
withOutputs(nodeId, output)
```

---

## Writing New Tests

When adding new node types or features:

1. **Add handler tests** in `base-level/handlers/` for the node executor logic
2. **Add orchestrator tests** if the node affects control flow (loops, conditionals, parallel)
3. **Add a real-world scenario** that demonstrates the feature in a practical workflow
4. **Add edge case tests** for limits, errors, and boundary conditions

### Example Test Structure

```typescript
import {
    createContext,
    storeNodeOutput,
    initializeQueue,
    getReadyNodes,
    markCompleted
} from "../../../src/temporal/core/services/context";

describe("My Feature", () => {
    describe("happy path", () => {
        it("should do the expected thing", async () => {
            let context = createContext({ input: "value" });

            // Simulate node execution
            context = storeNodeOutput(context, "MyNode", {
                result: "success"
            });

            expect(context.nodeOutputs.get("MyNode")).toEqual({
                result: "success"
            });
        });
    });

    describe("error handling", () => {
        it("should handle failures gracefully", async () => {
            // Test error scenarios
        });
    });

    describe("edge cases", () => {
        it("should handle empty input", async () => {
            // Test boundary conditions
        });
    });
});
```

---

## CI Integration

Tests run automatically in GitHub Actions:

```yaml
- name: Run Integration Tests
  run: npm run test:integration
  env:
      NODE_ENV: test
```

No external services or secrets are required since all APIs are mocked.
