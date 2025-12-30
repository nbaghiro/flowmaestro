# FlowMaestro Temporal Orchestration

Architectural guide to Temporal orchestration in FlowMaestro for durable workflow and agent execution.

---

## Table of Contents

1. [Overview](#overview)
2. [Worker Configuration](#worker-configuration)
3. [Workflow Types](#workflow-types)
4. [Activity Patterns](#activity-patterns)
5. [Execution Methods](#execution-methods)
6. [Management](#management)
7. [Best Practices](#best-practices)

---

## Overview

FlowMaestro uses [Temporal](https://temporal.io) as its workflow orchestration engine to provide:

- **Reliability**: Automatic retries, state persistence, crash recovery
- **Scalability**: Horizontal worker scaling, concurrent execution control
- **Observability**: Complete execution history and real-time monitoring
- **Durability**: Workflows survive process crashes and restarts
- **Determinism**: Reproducible execution through workflow bundling

### Why Temporal?

Traditional workflow systems fail when processes crash. Temporal ensures:

- Workflows continue from where they left off after crashes
- Activities retry automatically with exponential backoff
- State persists across restarts
- Complex multi-step processes complete reliably

---

## Worker Configuration

### Orchestrator Worker

**Location**: `backend/src/temporal/worker.ts`

**Purpose**: Executes workflows and activities for FlowMaestro workflow nodes

**Configuration**:

- **Task Queue**: `flowmaestro-orchestrator`
- **Connection**: Temporal server address (default: localhost:7233)
- **Max Concurrent Workflows**: 10
- **Max Concurrent Activities**: 10
- **Workflow Bundling**: Ensures determinism by bundling workflow code
- **Ignored Modules**: External dependencies excluded from workflows

**Starting the Worker**:

- Development: `npm run worker:dev`
- Production: `npm run worker`
- Docker Compose: Auto-starts as service

---

## Workflow Types

FlowMaestro implements four Temporal workflows for different execution scenarios.

### 1. Orchestrator Workflow (Main)

**Location**: `backend/src/temporal/workflows/orchestrator-workflow.ts`

**Purpose**: Execute node-based workflow definitions

**Input**:

- Workflow definition (nodes and edges)
- Input variables
- Execution ID for tracking

**Execution Strategy**:

1. Build dependency graph from nodes and edges
2. Perform topological sort for execution order
3. Execute nodes in dependency order
4. Independent nodes run in parallel
5. Each node outputs update context
6. Return complete outputs

**Key Features**:

- Parallel execution of independent nodes
- Sequential execution of dependent nodes
- Context propagation through execution
- Error handling and retry logic

---

### 2. Triggered Workflow

**Location**: `backend/src/temporal/workflows/triggered-workflow.ts`

**Purpose**: Wrapper for scheduled/webhook-triggered executions

**Execution Flow**:

1. **Preparation Activity**: Fetch workflow definition, create execution record
2. **Execute Main Workflow**: Run orchestrator workflow with prepared data
3. **Completion Activity**: Update execution status and store results

**Use Cases**:

- Scheduled cron jobs
- Webhook-triggered workflows
- Event-driven executions

---

### 3. User Input Workflow

**Location**: `backend/src/temporal/workflows/user-input-workflow.ts`

**Purpose**: Human-in-the-loop functionality - pause workflows for user input

**Features**:

- Pauses execution until user provides input
- Configurable timeout (default: 5 minutes)
- Query handler to check input status
- Signal handler to receive user input

**Workflow Mechanics**:

- Uses Temporal signals for input delivery
- Condition wait with timeout
- Throws ApplicationFailure on timeout
- Resumes execution after input received

**Usage Scenarios**:

- Approval workflows
- Form data collection
- Interactive decision points

---

### 4. Long-Running Task Workflow

**Location**: `backend/src/temporal/workflows/long-running-task-workflow.ts`

**Purpose**: Execute tasks exceeding standard timeout limits

**Features**:

- Supports tasks running over 5 minutes
- Heartbeat mechanism (every 30 seconds)
- Enhanced retry logic (5 attempts)
- Batch processing support

**Configuration**:

- Start-to-close timeout: 60 minutes
- Heartbeat timeout: 30 seconds
- Retry: 5 attempts with exponential backoff

**Use Cases**:

- Large dataset processing
- Complex computations
- Multi-step batch operations

---

## Activity Patterns

Activities are side-effecting functions executed by Temporal workers.

### Key Principles

1. **Idempotent**: Safe to retry multiple times
2. **Timeout-aware**: Complete within configured limits
3. **Heartbeat-enabled**: For long-running tasks (>30s)
4. **Error-handled**: Graceful failure handling

### Handler Registry Pattern

**Location**: `backend/src/temporal/activities/execution/`

The execution system uses a priority-based handler registry instead of a switch-statement router:

```typescript
// Handlers auto-register on module load
registerHandler(createLLMNodeHandler(), "ai", 10);
registerHandler(createHTTPNodeHandler(), "integrations", 30);
registerHandler(createGenericNodeHandler(), "generic", 999); // fallback

// First-match lookup with caching
const handler = findHandler("llm"); // Returns LLMNodeHandler
const output = await handler.execute(input);
```

**Benefits**:

- **Extensible**: New node types require no core changes
- **Prioritized**: Handlers can override others (fallback pattern)
- **Type-safe**: Each handler implements `NodeHandler` interface
- **Cached**: Handler lookups are cached for performance

### Handler Structure

Each handler extends `BaseNodeHandler` with helper methods:

```typescript
class LLMNodeHandler extends BaseNodeHandler {
    readonly name = "LLMNodeHandler";
    readonly supportedNodeTypes = ["llm"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        // 1. Validate config with Zod schema
        // 2. Execute node logic
        // 3. Return result with signals
        return this.success(output, metrics);
    }
}
```

**Supported Node Types** (20+):

- **AI**: LLM, Vision, Audio, Embeddings, Router
- **Logic**: Conditional, Switch, Loop, Wait
- **Data**: Transform, Variable, Output
- **Integrations**: HTTP, Code, Database, File, KB-Query, Integration
- **Control**: Input (pause for human input)

### Activity Configuration

**Timeout Settings**:

- **Start-to-close**: Maximum execution time (typically 10 minutes)
- **Schedule-to-close**: Total time including queue wait (typically 15 minutes)
- **Heartbeat**: Keep-alive interval for long tasks (typically 30 seconds)

**Retry Configuration**:

- **Maximum Attempts**: 3 (standard) to 5 (long-running)
- **Initial Interval**: 1 second
- **Backoff Coefficient**: 2 (exponential)
- **Maximum Interval**: 1 minute

### Key Node Handlers

**LLM Handler** (`backend/src/temporal/activities/execution/handlers/ai/llm.ts`):

- Validates config with `LLMNodeConfigSchema`
- Retrieves connection with decrypted credentials
- Interpolates variables in prompt using `{{variable}}` syntax
- Calls LLM API with retry logic and circuit breakers
- Returns response with token usage metrics via `this.success()`

**HTTP Handler** (`backend/src/temporal/activities/execution/handlers/integrations/http.ts`):

- Validates config with `HTTPNodeConfigSchema`
- Interpolates URL, headers, and body
- Makes HTTP request with configurable timeout
- Handles various HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Returns response data with status metrics

**Router Handler** (`backend/src/temporal/activities/execution/handlers/ai/router.ts`):

- LLM-based classification into predefined routes
- Returns `selectedRoute` signal for workflow branching
- Uses `this.selectBranch()` for multi-output routing

**Input Handler** (`backend/src/temporal/activities/execution/handlers/control/input.ts`):

- Pauses workflow for human-in-the-loop input
- Returns `pause` signal with `PauseContext`
- Workflow resumes when user provides input via signal

### Signal-Based Flow Control

Handlers return structured signals for workflow control flow:

```typescript
interface ExecutionSignals {
    pause?: boolean; // Pause for human input
    pauseContext?: PauseContext;
    selectedRoute?: string; // Router/Conditional branch selection
    branchesToSkip?: string[]; // Skip false branches
    loopMetadata?: LoopMetadata;
    isTerminal?: boolean; // End workflow
}
```

**Use Cases**:

- **Conditional/Switch**: `selectedRoute` + `branchesToSkip` for branching
- **Loop**: `loopMetadata` for iteration control
- **Input**: `pause` + `pauseContext` for human-in-the-loop
- **Output**: `isTerminal` to end workflow

### 4-Stage Workflow Builder

**Location**: `backend/src/temporal/activities/execution/builder.ts`

The workflow builder transforms node definitions into an executable graph:

```
Stage 1: PathConstructor
  → BFS reachability from trigger node
  → Build execution dependency graph

Stage 2: LoopConstructor
  → Insert loop sentinel nodes (loop-start/loop-end)
  → Track loop contexts for iteration

Stage 3: NodeConstructor
  → Expand parallel nodes into branches
  → Track parallel execution metadata

Stage 4: EdgeConstructor
  → Wire edges with typed handles (default, true, false, loop-body, case-*)
  → Determine conditional branching targets
```

**Advantages**:

- Pure & deterministic (Temporal workflow compatible)
- Explicit loop/parallel handling
- Edge type information for proper routing
- Validation at each stage

### Core Services

**Location**: `backend/src/temporal/core/services/`

| Service               | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `context.ts`          | Immutable context ops, variable resolution |
| `snapshot.ts`         | Pause/resume state persistence             |
| `streaming.ts`        | SSE event management                       |
| `execution-logs.ts`   | Node-level execution logging               |
| `circuit-breakers.ts` | LLM rate limiting                          |
| `heartbeat.ts`        | Activity heartbeat management              |

---

## Execution Methods

FlowMaestro supports three workflow execution methods.

### 1. Manual Execution (API)

**Endpoint**: `POST /api/workflows/:id/execute`

**Flow**:

1. Validate workflow exists
2. Create execution record
3. Start Temporal workflow
4. Wait for result
5. Update execution record
6. Return outputs to client

**Use Case**: User-initiated execution via UI or API

---

### 2. Scheduled Execution

**Service**: `backend/src/temporal/services/SchedulerService.ts`

**Capabilities**:

- Create schedules with cron expressions
- Configure timezone
- Trigger manually
- Pause/resume schedules
- Delete schedules

**Schedule Configuration**:

- **Cron Expression**: Standard cron format
- **Timezone**: UTC or specific timezone
- **Overlap Policy**: Prevent concurrent runs (BUFFER_ONE)
- **Catchup Window**: Handle missed runs (1 minute)

**Initialization**: Schedules synced on server startup from database

---

### 3. Webhook Execution

**Service**: `backend/src/temporal/services/WebhookService.ts`

**Features**:

- Validates trigger enabled
- HMAC signature validation (optional)
- Starts workflow with payload
- Returns execution ID

**Security**:

- Optional signature verification
- Timing-safe comparison
- SHA-256 HMAC

**Use Case**: External system-triggered workflows

---

## Management

### Temporal UI

**Access**: http://localhost:8088 (Docker Compose default)

**Capabilities**:

- View workflow execution history
- Inspect workflow state and variables
- Cancel or terminate workflows
- Retry failed workflows
- View activity logs and errors

### Workflow Management

**Cancel Workflow**:

- Graceful cancellation
- Cleanup activities run
- Workflow marked as canceled

**Terminate Workflow**:

- Immediate termination
- No cleanup activities
- Use for unrecoverable errors

**Get Workflow Status**:

- Current execution status
- Start and close times
- Execution duration
- Failure reason (if applicable)

**Query Workflow State**:

- Custom queries for internal state
- Check progress
- Retrieve intermediate results

### Worker Monitoring

**Health Checks**:

- Worker health endpoint
- Active task count
- Queue lag metrics

**Prometheus Metrics** (if enabled):

- Workflow task execution count
- Activity execution count
- Worker task slots used
- Task processing duration

---

## Best Practices

### Workflow Design

**DO**:

- Keep workflows deterministic (no random values, timestamps, or I/O)
- Use activities for all external calls (HTTP, database, file system)
- Keep workflow state small (use references to large data)
- Design for idempotency (safe to replay)

**DON'T**:

- Call external APIs directly from workflows
- Use `Date.now()` or `Math.random()` in workflows
- Store large payloads in workflow state
- Use non-deterministic libraries

### Activity Design

**DO**:

- Make activities idempotent (safe to retry)
- Implement proper timeout and retry strategies
- Use heartbeats for long-running activities (>30s)
- Handle errors gracefully with meaningful messages

**DON'T**:

- Assume activities run only once
- Rely on activity execution order within parallel groups
- Ignore timeout configurations
- Store state between retries (use workflow context)

### Error Handling

**DO**:

- Log errors to database for debugging
- Design for partial success scenarios
- Use workflow cancellation for user-initiated stops
- Set appropriate retry policies per activity type

**DON'T**:

- Silently swallow errors
- Retry indefinitely without backoff
- Block workflows on unrecoverable errors
- Mix retryable and non-retryable errors

### Performance Optimization

**DO**:

- Parallelize independent activities
- Use continue-as-new for long-running workflows
- Batch similar operations
- Configure appropriate timeouts

**DON'T**:

- Create workflows for trivial operations
- Over-parallelize (respect rate limits)
- Ignore workflow history size
- Use Temporal for real-time messaging

---

## Related Documentation

- **[workflows.md](./workflows.md)**: Workflow node types and execution
- **[agents.md](./agents.md)**: Agent execution via Temporal
- **[integrations.md](./integrations.md)**: Using connections in activities

---

## Summary

Temporal provides FlowMaestro with:

1. **Durable Execution**: Workflows survive crashes and continue from checkpoints
2. **Automatic Retries**: Activities retry with exponential backoff
3. **State Persistence**: Complete execution history preserved
4. **Scalability**: Horizontal worker scaling for high throughput
5. **Observability**: Rich monitoring and debugging capabilities
6. **Flexibility**: Multiple trigger methods and execution patterns

The architecture cleanly separates deterministic workflow logic from side-effecting activities, making the system robust and maintainable at scale.
