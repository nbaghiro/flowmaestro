# Workflow Test Suite

This document describes the workflow execution test suite, including architecture analysis, test coverage, and recommendations for additional tests.

## Test Coverage Summary

| Area                        | Status      | Test Count                       |
| --------------------------- | ----------- | -------------------------------- |
| Handler unit tests          | ✅ Complete | 39 handlers                      |
| Inline function tests       | ✅ Complete | 45 tests                         |
| Handler/Orchestrator parity | ✅ Complete | 43 tests                         |
| Pattern structure tests     | ✅ Complete | 186 tests                        |
| Loop execution tests        | ✅ Complete | Covered in inline tests          |
| Variable interpolation      | ✅ Complete | Covered in inline + parity tests |
| Edge routing                | ✅ Complete | 11 tests                         |
| Error propagation           | ✅ Complete | 21 tests                         |
| E2E with Temporal           | 🟡 Optional | -                                |

---

## Architecture Overview

### Special Node Type Handling

The workflow orchestrator in `backend/src/temporal/workflows/workflow-orchestrator.ts` handles certain node types with inline code rather than delegating to handlers:

| Node Type     | Handling | Notes                                      |
| ------------- | -------- | ------------------------------------------ |
| `input`       | Inline   | Direct mapping, handler never called       |
| `conditional` | Inline   | Uses `evaluateConditionalNode()` function  |
| `loop-start`  | Inline   | Uses `evaluateLoopStart()` function        |
| `loop-end`    | Inline   | Returns hardcoded `{ loopComplete: true }` |
| All others    | Handler  | Delegates to `executeNode()`               |

This means handler tests for `conditional`, `loop`, and `input` nodes don't test the actual production code path. The inline function tests were created to address this gap.

### Pattern Tests

The pattern tests in `__tests__/integration/patterns/` use `simulatePatternExecution()` which:

- Validates workflow structure (nodes, edges, entry points)
- Stores mock outputs for each node
- Does NOT execute actual handler code
- Does NOT run workflow orchestrator code

These tests are valuable for ensuring pattern definitions are valid, but don't catch execution bugs.

---

## Test Files

### 1. Inline Function Tests

**File:** `backend/__tests__/unit/temporal/workflows/workflow-orchestrator-inline.test.ts`

Tests the inline evaluation functions that run in production:

**`evaluateConditionalNode()` tests:**

- Equality operator (`==`) - case-insensitive string comparison
- Inequality operator (`!=`)
- Comparison operators (`>`, `<`, `>=`, `<=`) - numeric comparison
- String operators (`contains`, `startsWith`, `endsWith`)
- Variable interpolation (`{{variable}}` syntax)
- Output structure validation

**`evaluateLoopStart()` tests:**

- `forEach` loop - array iteration, empty arrays, non-array values
- `count` loop - iteration count, edge cases (0, missing count)
- `while` loop - maxIterations, default limit (1000)
- Iteration variable handling

### 2. Handler-Orchestrator Parity Tests

**File:** `backend/__tests__/integration/execution/conditional-parity.test.ts`

Verifies that the inline orchestrator code produces identical results to the handler for all conditional operators. This catches any divergence between the two implementations.

### 3. Edge Routing Tests

**File:** `backend/__tests__/integration/execution/edge-routing.test.ts`

Tests the queue management functions that determine which nodes are executed vs skipped:

**Conditional Edge Routing:**

- Execute true branch and skip false branch when condition is true
- Execute false branch and skip true branch when condition is false
- Cascade skip to dependent nodes on non-taken branch

**Router Edge Routing:**

- Execute only the selected route and skip others
- Handle default route when no match

**Merge Node Behavior:**

- Execute merge node when one branch completes and other is skipped

**Loop Edge Routing:**

- Mark loop body as ready when loop continues

**Complex Workflows:**

- Handle nested conditionals correctly
- Handle parallel branches that merge

### 4. Error Propagation Tests

**File:** `backend/__tests__/integration/execution/error-propagation.test.ts`

Tests error handling, message storage, retry behavior, and failure cascading:

**Error Message Storage:**

- Store error message in node state when node fails
- Preserve error messages with special characters
- Handle empty error messages
- Set completedAt timestamp on failure

**Error Propagation to Dependents:**

- Skip all downstream nodes when upstream fails
- Don't skip merge nodes if only one dependency fails
- Skip merge node when ALL dependencies fail

**Retry Behavior:**

- Increment retry count when marking for retry
- Clear error and timestamps on retry
- Move node from failed to ready on retry
- Track multiple retry attempts
- Document that retry doesn't undo cascade to dependents

**Multiple Failure Scenarios:**

- Handle multiple parallel failures
- Preserve all error messages from multiple failures

**Failure at Different Stages:**

- Handle failure at entry point
- Handle failure at final node
- Handle failure in middle of workflow

**Conditional Branch Failures:**

- Handle failure in taken branch

**Execution State Consistency:**

- Node cannot be in multiple states simultaneously
- Maintain correct counts after multiple operations

---

## Bug History

### Conditional Operator Bug (Fixed)

**Location:** `backend/src/temporal/workflows/workflow-orchestrator.ts`

**The Bug:**

```typescript
// What the code was doing (BROKEN):
const conditionMet = leftInterpolated.toLowerCase() === rightInterpolated.toLowerCase();
// IGNORED the operator field completely!
```

**Impact:**

- Any workflow using `>`, `<`, `>=`, `<=`, `!=`, `contains`, `startsWith`, `endsWith` operators would fail silently
- All conditions were evaluated as equality checks
- Example: `10 > 5` would return `false` because `"10" !== "5"`

**Fix Applied:**
The `evaluateConditionalNode` function now properly evaluates all operators using helper functions (`parseValue`, `evaluateCondition`, etc.):

```typescript
// Fixed implementation:
const leftParsed = parseValue(leftInterpolated);
const rightParsed = parseValue(rightInterpolated);
const conditionMet = evaluateCondition(leftParsed, operator, rightParsed);
```

---

## Recommended Additional Tests

### E2E Tests (Requires Temporal)

```typescript
// File: __tests__/e2e/workflow-execution.test.ts

describe("End-to-End Workflow Execution", () => {
    it("should execute simple linear workflow");
    it("should execute conditional branching workflow");
    it("should execute looping workflow");
    it("should handle workflow timeouts");
    it("should handle activity retries");
});
```

---

## Handlers with Heavy Mocking

These handlers have unit tests but rely heavily on mocks:

| Handler                  | External Dependency | Limitation              |
| ------------------------ | ------------------- | ----------------------- |
| `llm.ts`                 | LLM APIs            | Streaming untested      |
| `code.ts`                | VM2, spawn()        | Real execution untested |
| `http.ts`                | HTTP requests       | All requests mocked     |
| `vision.ts`              | Vision API          | API mocked              |
| `audio-transcription.ts` | Transcription API   | API mocked              |

Consider adding integration tests with:

- Local test servers for HTTP tests
- Smaller/faster models for LLM tests
- Safe sandbox code for code execution tests

---

## Running the Tests

```bash
# Run all workflow-related tests
npm test -- --testPathPattern="workflow-orchestrator|conditional-parity|edge-routing|execution/error-propagation|patterns" --no-coverage

# Run just the inline function tests
npm test -- --testPathPattern="workflow-orchestrator-inline" --no-coverage

# Run parity tests
npm test -- --testPathPattern="conditional-parity" --no-coverage

# Run edge routing tests
npm test -- --testPathPattern="edge-routing" --no-coverage

# Run error propagation tests
npm test -- --testPathPattern="execution/error-propagation" --no-coverage

# Run pattern tests
npm test -- --testPathPattern="patterns" --no-coverage
```
