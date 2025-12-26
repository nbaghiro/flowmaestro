# Workflow Execution Engine Improvement Plan

## Executive Summary

After analyzing FlowMaestro's Temporal-based execution system and SIM Studio's production-grade implementation, this plan outlines improvements to the workflow execution engine. We will **keep Temporal** as our execution backbone while adopting key patterns from SIM to address current gaps.

**Key Decision: Keep Temporal, Adopt SIM Patterns**

Temporal provides battle-tested durability, automatic retries, and workflow history. Rather than replacing it, we'll build SIM's superior patterns on top of Temporal:

- **4-stage construction pipeline** → Pre-process workflow before execution
- **Error-as-routing** → Activities return structured results; workflow routes errors
- **Parallel execution** → Use Temporal's native activity fan-out
- **Pause/Resume** → Temporal signals + snapshot serialization
- **Handler registry** → Refactor executors into pluggable handlers

---

## Why Keep Temporal

### Temporal Advantages We Want to Preserve

1. **Durability** - Automatic persistence via event history, no custom implementation needed
2. **Automatic Retries** - Built-in retry policies with exponential backoff
3. **Workflow History** - Complete audit trail of every execution step
4. **Long-Running Support** - Handles workflows that run for days/weeks via continue-as-new
5. **Worker Management** - Scalable worker pools with automatic load balancing
6. **Observability** - Native integration with Temporal UI for debugging

### What SIM Does Differently (That We'll Adopt)

| Pattern                | Current FlowMaestro      | SIM Approach     | Our Adaptation                                                |
| ---------------------- | ------------------------ | ---------------- | ------------------------------------------------------------- |
| **Construction**       | Runtime topological sort | 4-stage pipeline | Pre-build node execution order before running                 |
| **Error Handling**     | Fail workflow            | Error-as-routing | Activities return `{ success, data, error }`; workflow routes |
| **Parallel Execution** | Sequential               | Ready queue      | Use Temporal's `Promise.all` for parallel activities          |
| **Context**            | Unbounded growth         | Pruning + limits | ContextManager with output limits                             |
| **Pause/Resume**       | Limited signals          | Full snapshots   | Enhance signals with serialized state                         |
| **Events**             | Redis pub/sub            | SSE              | Add SSE endpoint that consumes Redis                          |
| **Handlers**           | Switch statement         | Handler registry | Refactor into pluggable handlers                              |

---

## Current State Analysis

### FlowMaestro Strengths

- Temporal provides durable execution with automatic retries and history
- Clean separation of workflows, activities, and events
- Redis pub/sub for real-time updates
- Hierarchical span tracking for observability
- Agent orchestrator with continue-as-new pattern

### Critical Gaps Identified

| Gap                       | FlowMaestro                     | SIM                                        | Impact                                      |
| ------------------------- | ------------------------------- | ------------------------------------------ | ------------------------------------------- |
| **Workflow Construction** | Runtime topological sort        | 4-stage construction pipeline              | Race conditions in complex workflows        |
| **Error Handling**        | Fail workflow on error          | Error-as-routing with ports                | Users can't build resilient workflows       |
| **Parallel Execution**    | Sequential node execution       | Concurrent independent nodes               | 2-10x slower for parallelizable workflows   |
| **Context Management**    | Unbounded growth                | Token-aware sliding window                 | Memory blowup on large workflows            |
| **Pause/Resume**          | Limited to UserInputWorkflow    | Full snapshot serialization                | Can't pause mid-workflow for human approval |
| **Variable Resolution**   | Basic interpolation             | Lazy resolution with loop/parallel context | Limited expressiveness                      |
| **Streaming**             | Redis pub/sub (fire-and-forget) | SSE with stream splitter pattern           | Lost events, inconsistent UX                |

---

## Design Patterns Reference

The following sections document the key patterns from SIM that we'll adapt for our enhanced Temporal engine. These are reference materials - the actual implementation plan is in the "Implementation Plan: Enhanced Temporal Engine" section below.

---

## Pattern Details

### 1. Workflow Construction Pipeline

**Current Problem:** `orchestrator-workflow.ts` builds the execution graph at runtime with manual topological sorting and two-phase branching to prevent race conditions.

**SIM Pattern:** Four-stage construction pipeline that pre-resolves complexity:

```
PathConstructor → LoopConstructor → NodeConstructor → EdgeConstructor
```

**Recommended Changes:**

**Files to modify:**

- `backend/src/temporal/workflows/orchestrator-workflow.ts`
- Create `backend/src/temporal/workflow-builder/` directory with:
    - `path-constructor.ts` - BFS reachability from trigger
    - `loop-constructor.ts` - Loop sentinels (START/END pairs)
    - `node-constructor.ts` - Expand parallels into branch nodes
    - `edge-constructor.ts` - Wire edges with handle types
    - `builder.ts` - Orchestrate construction

**Implementation Steps:**

1. Create `ExecutableNode` interface extending existing node types with execution metadata
2. Implement PathConstructor for reachability analysis
3. Implement LoopConstructor to insert sentinel nodes
4. Implement NodeConstructor to expand parallel nodes
5. Implement EdgeConstructor to wire conditional/router/loop handles
6. Refactor orchestrator to build execution order once at start, then execute
7. Store execution state in workflow for resume capability

**Benefits:**

- Eliminates two-phase branching hack
- Enables parallel execution (nodes with satisfied dependencies)
- Cleaner loop/parallel handling
- Resume capability with execution state

---

### 2. Error-as-Routing Pattern

**Current Problem:** Node errors stop dependent branches. Users can't design error recovery flows.

**SIM Pattern:** Nodes can have `error` output ports. Errors route to error branches instead of failing.

**Recommended Changes:**

**Files to modify:**

- `shared/src/types/workflow.ts` - Add `errorPort` to node definition
- `backend/src/temporal/workflows/orchestrator-workflow.ts` - Handle error routing
- `backend/src/temporal/executors/index.ts` - Return error outputs instead of throwing
- `frontend/src/components/canvas/` - Add error port UI

**New Types:**

```typescript
interface NodeDefinition {
    // ... existing fields
    errorPort?: boolean; // Can this node have an error output?
}

interface EdgeDefinition {
    // ... existing fields
    handleType?: "source" | "error" | "condition" | "router";
}

interface NodeOutput {
    success: boolean;
    data?: JsonObject;
    error?: { message: string; code?: string; stack?: string };
}
```

**Implementation Steps:**

1. Add `errorPort` field to node definition schema
2. Modify `executeNode` activity to catch errors and return structured output
3. In orchestrator, check if error occurred:
    - If node has error port + error edge → activate error edge
    - If no error port → propagate failure (current behavior)
4. Add error handle to React Flow node components
5. Allow users to connect error handles to recovery nodes

**Benefits:**

- Users can build retry logic (different provider on failure)
- Human escalation via error → pause node
- Graceful degradation (return cached response on error)
- Error logging before completion

---

### 3. Parallel Node Execution

**Current Problem:** `executeNodeAndDependents` executes nodes sequentially, even when independent.

**SIM Pattern:** Maintains `readyQueue` and executes all ready nodes concurrently.

**Recommended Changes:**

**Files to modify:**

- `backend/src/temporal/workflows/orchestrator-workflow.ts`
- `backend/src/temporal/shared/execution-queue.ts` (new)

**New Execution Pattern:**

```typescript
interface ExecutionQueue {
    readyNodes: Set<string>; // Nodes ready to execute
    executing: Map<string, Promise<void>>; // In-flight executions
    completed: Set<string>; // Finished nodes

    initialize(nodes: ExecutableNode[], edges: Edge[]): void;
    getReadyNodes(): string[];
    markCompleted(nodeId: string): void;
    getNextBatch(): string[];
}
```

**Implementation Steps:**

1. Create ExecutionQueue class with queue management
2. Initialize with nodes that have no dependencies (or all deps satisfied)
3. Execute ALL ready nodes concurrently using Temporal's activity fan-out
4. As each completes, update context and check if dependents are now ready
5. Use Temporal's built-in concurrency controls for activity limits
6. Continue until queue empty and no executing

**Temporal Integration:**

- Use `Promise.all()` to fan out multiple `executeNode` activity calls
- Temporal handles activity retries and timeouts automatically
- Use `workflow.allHandled()` to wait for all pending activities

**Benefits:**

- 2-10x faster for workflows with parallelizable branches
- Better resource utilization
- More responsive real-time updates

---

### 4. Context Memory Management

**Current Problem:** `context` object grows unbounded. Large workflows accumulate gigabytes.

**SIM Pattern:**

- Token-aware sliding window for agent memory
- Node outputs stored in `nodeStates` map, not flattened
- Lazy resolution only fetches needed values

**Recommended Changes:**

**Files to modify:**

- `backend/src/temporal/workflows/orchestrator-workflow.ts`
- `backend/src/temporal/workflows/agent-orchestrator-workflow.ts`
- `backend/src/temporal/shared/context-manager.ts` (new)

**New Context Architecture:**

```typescript
interface ExecutionContext {
    // Current approach: flat object that grows
    // context: JsonObject;

    // New approach: structured state
    nodeOutputs: Map<string, JsonObject>; // nodeId → output
    workflowVariables: Map<string, JsonValue>; // user-defined vars
    inputs: JsonObject; // Original inputs (immutable)

    // Memory limits
    maxNodeOutputSize: number; // Truncate large outputs
    retainedNodes: Set<string>; // Never evict these
}

interface ContextManager {
    getVariable(path: string): JsonValue; // Lazy resolution
    setNodeOutput(nodeId: string, output: JsonObject): void;
    getNodeOutput(nodeId: string): JsonObject | undefined;
    pruneUnusedOutputs(executedNodes: string[], currentNode: string): void;
}
```

**Implementation Steps:**

1. Create ContextManager class with Map-based storage
2. Track which nodes' outputs are referenced by downstream nodes (via edge analysis)
3. After node execution, check if any upstream outputs are no longer needed
4. Prune unreferenced outputs (with configurable retention policy)
5. Add output size limits with truncation for debugging
6. For agents: implement token-aware sliding window (keep last N tokens)

**Benefits:**

- Bounded memory usage
- Faster serialization for continue-as-new
- Clearer data lineage (nodeId → output)

---

### 5. Robust Pause/Resume System

**Current Problem:** `UserInputWorkflow` handles simple input collection. No mid-workflow pause for human approval or long waits.

**SIM Pattern:** Full snapshot serialization with:

- Complete execution state
- Node outputs
- Workflow variables
- Loop/parallel iteration state
- Resume queue for multiple inputs

**Recommended Changes:**

**Files to modify:**

- `backend/src/temporal/workflows/orchestrator-workflow.ts`
- Create `backend/src/temporal/shared/snapshot.ts`
- Create `backend/src/temporal/shared/pause-manager.ts`
- `backend/src/storage/repositories/ExecutionRepository.ts`

**Snapshot Structure:**

```typescript
interface WorkflowSnapshot {
    executionId: string;
    workflowId: string;

    // Execution state
    completedNodes: string[];
    pendingNodes: string[];

    // Context
    nodeOutputs: Record<string, JsonObject>;
    workflowVariables: Record<string, JsonValue>;

    // Control flow state
    loopState: Map<string, LoopIterationState>;
    parallelState: Map<string, ParallelBranchState>;

    // Pause info
    pauseContext: {
        nodeId: string;
        reason: string;
        pausedAt: Date;
        expectedInputSchema?: JsonSchema;
    };
}
```

**Implementation Steps:**

1. Create WorkflowSnapshot class with serialization
2. Add `pause` signal handler to orchestrator workflow (Temporal signals)
3. When pause signal received:
    - Complete current activity
    - Serialize full state to snapshot
    - Store in database
    - Return workflow with `status: paused`
4. Create resume endpoint that:
    - Loads snapshot
    - Sends resume signal with user input
    - Restores context, control flow state
    - Continues from pending nodes
5. Add pause node type for explicit pause points

**Benefits:**

- Human-in-the-loop approval workflows
- Long-running waits (days/weeks) without resource consumption
- Graceful handling of external dependencies

---

### 6. Advanced Variable Resolution

**Current Problem:** Basic `{{path.to.var}}` interpolation. No loop context, no parallel context.

**SIM Pattern:** Prioritized resolver chain:

```
<loop.index/item/iteration>
<parallel.index/currentItem>
<variable.name>
<nodeId.path>
{{ENV_VAR}}
```

**Recommended Changes:**

**Files to modify:**

- `backend/src/temporal/shared/utils.ts` - Enhance interpolation
- Create `backend/src/temporal/shared/variable-resolver.ts`

**Resolver Architecture:**

```typescript
interface VariableResolver {
    resolve(expression: string, context: ResolutionContext): JsonValue;
}

interface ResolutionContext {
    nodeOutputs: Map<string, JsonObject>;
    workflowVariables: Map<string, JsonValue>;
    environmentVariables: Map<string, string>;

    // Loop/parallel context (set by orchestrators)
    loop?: {
        index: number;
        item: JsonValue;
        iteration: number;
        total: number;
    };
    parallel?: {
        index: number;
        currentItem: JsonValue;
        branchId: string;
    };
}
```

**Supported Syntax:**

```
{{nodeId.path.to.value}}     - Node output access
{{loop.index}}               - Current loop iteration
{{loop.item}}                - Current loop item
{{parallel.index}}           - Parallel branch index
{{parallel.currentItem}}     - Current parallel item
{{var.myVariable}}           - Workflow variable
{{env.API_KEY}}              - Environment variable
{{nodeId.data[0].name}}      - Array access
```

**Implementation Steps:**

1. Create VariableResolver class with priority chain
2. Parse expressions to detect type (loop/parallel/node/var/env)
3. Resolve from appropriate source
4. Support nested property access with safe navigation
5. Add validation for circular references
6. Integrate with LoopOrchestrator and ParallelOrchestrator

**Benefits:**

- Natural loop/parallel expressions
- Clear variable scoping
- Safer than current string replacement

---

### 7. Reliable Event Delivery

**Current Problem:** Redis pub/sub events are fire-and-forget with 5-second timeout. Events can be lost.

**SIM Pattern:** Server-Sent Events (SSE) with:

- Persistent connection per execution
- Stream splitter for streaming + billing
- Event acknowledgment

**Recommended Changes:**

**Files to modify:**

- `backend/src/api/routes/executions/stream.ts` (new)
- `backend/src/temporal/orchestration/events.ts`
- `frontend/src/lib/execution-stream.ts` (new)

**SSE Implementation:**

```typescript
// API endpoint
app.get("/api/executions/:id/stream", async (req, reply) => {
    reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
    });

    const sendEvent = (event: ExecutionEvent) => {
        reply.raw.write(`event: ${event.type}\n`);
        reply.raw.write(`data: ${JSON.stringify(event.data)}\n\n`);
    };

    // Subscribe to Redis + forward to SSE
    await redisSubscriber.subscribe(`execution:${id}:events`);
    // ...
});
```

**Frontend Hook:**

```typescript
function useExecutionStream(executionId: string) {
    const [events, setEvents] = useState<ExecutionEvent[]>([]);

    useEffect(() => {
        const eventSource = new EventSource(`/api/executions/${executionId}/stream`);

        eventSource.addEventListener("node:completed", (e) => {
            const data = JSON.parse(e.data);
            setEvents((prev) => [...prev, data]);
        });

        return () => eventSource.close();
    }, [executionId]);

    return events;
}
```

**Implementation Steps:**

1. Create SSE endpoint for execution streaming
2. Each execution gets unique Redis channel
3. Activities publish to channel, SSE endpoint forwards
4. Add event sequence numbers for ordering
5. Store events in database for replay (if client reconnects)
6. Implement stream splitter for LLM streaming (one stream to client, one for token counting)

**Benefits:**

- Guaranteed delivery (SSE reconnects automatically)
- Event ordering via sequence numbers
- Replay capability on reconnect
- Better streaming UX for LLM outputs

---

### 8. Signal-Based Node Handler Protocol

**Current Problem:** `executeNode` switch statement with 15+ cases. Adding nodes requires modifying core routing.

**SIM Pattern:** Handler registry with signal-based returns:

- Handlers return intent signals (`__pauseExecution`, `__activateErrorPort`)
- Engine interprets signals and controls flow
- 137 node types using only 13 handlers

**Recommended Changes:**

**Files to modify:**

- Refactor `backend/src/temporal/executors/` structure
- Create `backend/src/temporal/node-handlers/` directory
- Create `backend/src/temporal/node-handlers/registry.ts`

**Handler Interface:**

```typescript
interface NodeHandler {
    canHandle(nodeType: string): boolean;
    execute(input: NodeHandlerInput): Promise<NodeHandlerOutput>;
}

interface NodeHandlerOutput {
    success: boolean;
    data?: JsonObject;
    signals?: {
        pause?: boolean; // Pause workflow
        activateErrorPort?: boolean; // Route to error
        selectedRoute?: string; // For routers
        isTerminal?: boolean; // End branch
    };
}

// Registry
class NodeHandlerRegistry {
    private handlers: NodeHandler[] = [];

    register(handler: NodeHandler): void;

    getHandler(nodeType: string): NodeHandler {
        return this.handlers.find((h) => h.canHandle(nodeType)) ?? this.genericHandler;
    }
}
```

**Handler Categories:**

1. `LLMNodeHandler` - All LLM nodes (text, vision, audio)
2. `HTTPNodeHandler` - HTTP requests
3. `TransformNodeHandler` - Data transformations (JSONata, JS)
4. `LogicNodeHandler` - Conditions, routers, switches
5. `IntegrationNodeHandler` - Third-party integrations
6. `ControlFlowNodeHandler` - Loop, parallel, wait
7. `AgentNodeHandler` - Agent orchestration
8. `GenericNodeHandler` - Fallback

**Implementation Steps:**

1. Define `NodeHandler` interface with `canHandle` and `execute`
2. Create handler implementations for each category
3. Build registry with first-match-wins lookup
4. Refactor `executeNode` to use registry
5. Add signal interpretation in orchestrator
6. Extract node-type-specific logic from switch to handlers

**Benefits:**

- Adding new node types doesn't touch core routing
- Cleaner separation of concerns
- Easier testing (mock handlers)
- Signals decouple handlers from orchestration

---

## Implementation Plan: Enhanced Temporal Engine

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     API Server (Fastify)                    │
│  - SSE streaming endpoints                                  │
│  - Execution triggers (manual, webhook, schedule)           │
│  - Resume endpoints                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                   Temporal Workflows                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Workflow    │  │  Execution   │  │   Variable   │       │
│  │   Builder    │→ │    Queue     │→ │   Resolver   │       │
│  │  (4 stages)  │  │  (parallel)  │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                │                    │             │
│         ▼                ▼                    ▼             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Snapshot    │  │ NodeHandler  │  │ Orchestrators│       │
│  │  Manager     │  │   Registry   │  │ (Loop/Para)  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                             │
└────────────────┬────────────────────────────────────────────┘
                 │
         ┌───────┴───────┐
         ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Temporal   │  │  PostgreSQL  │  │    Redis     │
│   Server     │  │  - Snapshots │  │  - Events    │
│  - History   │  │  - Node logs │  │  - Pub/Sub   │
│  - Workers   │  │  - Executions│  │  - Caching   │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

### Phase 1: Workflow Builder & Execution Queue

**Goal:** Add 4-stage workflow construction and parallel execution to existing Temporal workflows.

#### 1.1 Workflow Builder (`backend/src/temporal/workflow-builder/`)

**Files to create:**

- `types.ts` - ExecutableNode, execution metadata types
- `path-constructor.ts` - BFS reachability from trigger
- `loop-constructor.ts` - Insert loop sentinel nodes (START/END)
- `node-constructor.ts` - Expand parallel nodes into branches
- `edge-constructor.ts` - Wire edges with handle types
- `builder.ts` - Orchestrate 4-stage construction

**Key Types:**

```typescript
interface ExecutableNode {
    id: string;
    type: string;
    config: JsonObject;
    dependencies: string[]; // Node IDs this depends on
    dependents: string[]; // Node IDs that depend on this
    handleType?: "source" | "error" | "condition" | "router";
}

interface ExecutionPlan {
    nodes: Map<string, ExecutableNode>;
    startNodes: string[]; // Nodes with no dependencies
    executionOrder: string[][]; // Nodes grouped by execution level
}
```

#### 1.2 Execution Queue (`backend/src/temporal/shared/`)

**Files to create:**

- `execution-queue.ts` - Queue-based parallel execution within Temporal
- `context-manager.ts` - Node output management with pruning

**Integration with Temporal:**

```typescript
// In orchestrator-workflow.ts
async function orchestratorWorkflow(input: WorkflowInput) {
    // Build execution plan once at start
    const plan = buildExecutionPlan(input.definition);

    // Initialize queue and context
    const queue = new ExecutionQueue(plan);
    const context = new ContextManager();

    // Execute in batches (parallel within each batch)
    while (queue.hasWork()) {
        const batch = queue.getNextBatch();

        // Fan out activities in parallel using Temporal
        const results = await Promise.all(batch.map((nodeId) => executeNode(nodeId, context)));

        // Update context and queue
        for (const result of results) {
            context.setNodeOutput(result.nodeId, result.output);
            queue.markCompleted(result.nodeId);
        }
    }

    return context.getFinalOutputs();
}
```

#### 1.3 Node Handlers (`backend/src/temporal/node-handlers/`)

**Files to create:**

- `types.ts` - NodeHandler interface, NodeHandlerOutput with signals
- `registry.ts` - Handler lookup
- `llm-node-handler.ts` - LLM calls (streaming support)
- `http-node-handler.ts` - HTTP requests
- `transform-node-handler.ts` - JSONata/JS transforms
- `logic-node-handler.ts` - Conditions, routers
- `integration-node-handler.ts` - Third-party integrations
- `control-flow-node-handler.ts` - Wait, pause
- `generic-node-handler.ts` - Fallback

**Handler Interface:**

```typescript
interface NodeHandler {
    canHandle(nodeType: string): boolean;
    execute(input: NodeHandlerInput): Promise<NodeHandlerOutput>;
}

interface NodeHandlerOutput {
    success: boolean;
    data?: JsonObject;
    error?: { message: string; code?: string };
    signals?: {
        pause?: { reason: string; expectedInput?: JsonSchema };
        activateErrorPort?: boolean;
        selectedRoute?: string;
        isTerminal?: boolean;
    };
    streaming?: {
        stream: ReadableStream;
        onComplete: () => Promise<{ tokenCount: number }>;
    };
}
```

---

### Phase 2: State Management & Enhanced Logging

**Goal:** Add snapshot persistence and structured node logging (Temporal provides base durability).

#### 2.1 Snapshot Manager (`backend/src/temporal/shared/snapshot/`)

**Files to create:**

- `types.ts` - WorkflowSnapshot structure
- `snapshot-manager.ts` - Serialize/deserialize
- `storage.ts` - Database operations

**Snapshot Structure:**

```typescript
interface WorkflowSnapshot {
    // Metadata
    executionId: string;
    workflowId: string;
    userId: string;
    startedAt: Date;

    // Execution state
    completedNodes: string[];
    pendingNodes: string[];

    // Context
    nodeOutputs: Record<string, JsonObject>;
    workflowVariables: Record<string, JsonValue>;
    inputs: JsonObject;

    // Control flow state
    loopStates: Record<string, LoopState>;
    parallelStates: Record<string, ParallelState>;

    // Pause info (if paused)
    pauseContext?: {
        nodeId: string;
        reason: string;
        expectedInput?: JsonSchema;
        pausedAt: Date;
    };
}
```

#### 2.2 Node Logging (`backend/src/temporal/shared/logging/`)

**Files to create:**

- `types.ts` - NodeLog structure
- `node-logger.ts` - Log creation and storage

**Node Log:**

```typescript
interface NodeLog {
    id: string;
    executionId: string;
    nodeId: string;
    nodeType: string;

    // Execution data
    input: JsonObject;
    output: JsonObject;
    success: boolean;
    error?: string;

    // Timing
    startedAt: Date;
    completedAt: Date;
    durationMs: number;

    // For LLM nodes
    tokenUsage?: { input: number; output: number; model: string };
}
```

#### 2.3 Pause/Resume with Temporal Signals

**Files to modify:**

- `backend/src/temporal/workflows/orchestrator-workflow.ts` - Add signal handlers
- `backend/src/api/routes/executions/resume.ts` - Resume endpoint

**Temporal Signal Integration:**

```typescript
// In orchestrator-workflow.ts
const pauseSignal = wf.defineSignal<[PauseRequest]>("pause");
const resumeSignal = wf.defineSignal<[ResumeInput]>("resume");

wf.setHandler(pauseSignal, (request) => {
    // Save snapshot to database
    // Set workflow to paused state
});

wf.setHandler(resumeSignal, (input) => {
    // Restore from snapshot
    // Continue execution with user input
});
```

---

### Phase 3: Streaming & Events

**Goal:** Implement SSE-based real-time updates and LLM streaming.

#### 3.1 SSE Manager (`backend/src/temporal/shared/streaming/`)

**Files to create:**

- `sse-manager.ts` - Server-sent events handling
- `event-types.ts` - Event definitions

**Events:**

```typescript
type ExecutionEvent =
    | { type: "execution:started"; executionId: string; workflowId: string }
    | { type: "execution:completed"; executionId: string; outputs: JsonObject }
    | { type: "execution:paused"; executionId: string; nodeId: string; reason: string }
    | { type: "execution:error"; executionId: string; error: string }
    | { type: "node:started"; executionId: string; nodeId: string; nodeType: string }
    | { type: "node:completed"; executionId: string; nodeId: string; output: JsonObject }
    | { type: "node:error"; executionId: string; nodeId: string; error: string }
    | { type: "stream:chunk"; executionId: string; nodeId: string; content: string }
    | { type: "stream:done"; executionId: string; nodeId: string };
```

#### 3.2 Stream Splitter Pattern (`backend/src/temporal/shared/streaming/`)

**Files to create:**

- `stream-splitter.ts` - Split stream for client + metrics

**Implementation:**

```typescript
function splitStream(llmStream: ReadableStream): {
    clientStream: ReadableStream;
    metricsPromise: Promise<{ tokens: number }>;
} {
    const [stream1, stream2] = llmStream.tee();

    // Client gets stream1 directly
    const clientStream = stream1;

    // Background consumer counts tokens
    const metricsPromise = consumeForMetrics(stream2);

    return { clientStream, metricsPromise };
}
```

#### 3.3 API Routes (`backend/src/api/routes/executions/`)

**Files to create/modify:**

- `execute.ts` - POST /workflows/:id/execute (returns SSE stream)
- `resume.ts` - POST /executions/:id/resume
- `stream.ts` - GET /executions/:id/stream (reconnect)
- `status.ts` - GET /executions/:id

---

### Phase 4: Variable Resolution & Orchestrators

**Goal:** Implement advanced variable resolution and loop/parallel handling.

#### 4.1 Variable Resolver (`backend/src/temporal/shared/variables/`)

**Files to create:**

- `types.ts` - Resolution context
- `resolver.ts` - Priority chain resolution
- `parser.ts` - Expression parsing

**Syntax Support:**

```
{{nodeId.path.to.value}}     - Node output
{{loop.index}}               - Loop iteration (0-based)
{{loop.item}}                - Current loop item
{{loop.iteration}}           - Loop iteration (1-based)
{{parallel.index}}           - Parallel branch index
{{parallel.currentItem}}     - Current parallel item
{{var.myVariable}}           - Workflow variable
{{env.API_KEY}}              - Environment variable
```

#### 4.2 Loop Orchestrator (`backend/src/temporal/orchestrators/`)

**Files to create:**

- `loop-orchestrator.ts` - Handle loop iterations

**Loop Types:**

- `for` - Fixed count iterations
- `forEach` - Iterate over collection
- `while` - Condition-based
- `doWhile` - At least one iteration

#### 4.3 Parallel Orchestrator (`backend/src/temporal/orchestrators/`)

**Files to create:**

- `parallel-orchestrator.ts` - Handle parallel branches

**Parallel Types:**

- Count-based: Execute N branches with index
- Collection-based: Execute branch per item

---

### Phase 5: Frontend Updates & Polish

**Goal:** Update frontend for new features, add error port UI, improve UX.

#### 5.1 Database Migrations

**New tables:**

- `workflow_snapshots` - Serialized execution state for pause/resume
- `node_logs` - Per-node execution logs with timing and tokens
- `resume_queue` - Pending resume requests

**Modified tables:**

- `executions` - Add snapshot_id for pause/resume support

#### 5.2 Frontend Updates

**Files to modify:**

- `frontend/src/lib/execution-stream.ts` - SSE client hook
- `frontend/src/stores/execution/` - Update for new event types
- `frontend/src/components/canvas/` - Error port UI, execution path visualization

#### 5.3 Refactor Existing Code

**Files to refactor:**

- `backend/src/temporal/workflows/orchestrator-workflow.ts` - Use new WorkflowBuilder
- `backend/src/temporal/activities/execute-node.ts` - Use NodeHandler registry
- `backend/src/temporal/shared/utils.ts` - Use new VariableResolver

**Keep and enhance:**

- Span tracking → integrate with NodeLogger
- Heartbeat → use for long-running node handlers
- Error classes → enhance with error port support

---

## Prioritized Implementation Phases

### 🔴 Phase 1: Workflow Builder & Parallel Execution (CRITICAL - Foundation)

**Priority: HIGHEST** | **Blocking: Performance improvements**

Adds 4-stage construction and parallel execution to existing Temporal workflows.

| Task                        | Files                                                       | Effort |
| --------------------------- | ----------------------------------------------------------- | ------ |
| ExecutableNode Types        | `backend/src/temporal/workflow-builder/types.ts`            | S      |
| Path Constructor            | `backend/src/temporal/workflow-builder/path-constructor.ts` | M      |
| Loop Constructor            | `backend/src/temporal/workflow-builder/loop-constructor.ts` | M      |
| Node Constructor            | `backend/src/temporal/workflow-builder/node-constructor.ts` | M      |
| Edge Constructor            | `backend/src/temporal/workflow-builder/edge-constructor.ts` | M      |
| Workflow Builder            | `backend/src/temporal/workflow-builder/builder.ts`          | M      |
| Execution Queue             | `backend/src/temporal/shared/execution-queue.ts`            | M      |
| Context Manager             | `backend/src/temporal/shared/context-manager.ts`            | M      |
| Integrate with orchestrator | `backend/src/temporal/workflows/orchestrator-workflow.ts`   | L      |

**Exit Criteria:** Orchestrator uses WorkflowBuilder; nodes execute in parallel batches.

---

### 🔴 Phase 2: Node Handler Registry (CRITICAL - Maintainability)

**Priority: HIGHEST** | **Blocking: Clean node execution**

Refactors executors into pluggable handler pattern.

| Task                          | Files                                                            | Effort |
| ----------------------------- | ---------------------------------------------------------------- | ------ |
| NodeHandler Interface         | `backend/src/temporal/node-handlers/types.ts`                    | S      |
| Handler Registry              | `backend/src/temporal/node-handlers/registry.ts`                 | M      |
| LLM Node Handler              | `backend/src/temporal/node-handlers/llm-node-handler.ts`         | L      |
| HTTP Node Handler             | `backend/src/temporal/node-handlers/http-node-handler.ts`        | M      |
| Transform Node Handler        | `backend/src/temporal/node-handlers/transform-node-handler.ts`   | M      |
| Logic Node Handler            | `backend/src/temporal/node-handlers/logic-node-handler.ts`       | M      |
| Integration Node Handler      | `backend/src/temporal/node-handlers/integration-node-handler.ts` | L      |
| Refactor executeNode activity | `backend/src/temporal/activities/execute-node.ts`                | M      |

**Exit Criteria:** executeNode uses handler registry; adding new node types doesn't modify core code.

---

### 🟠 Phase 3: Snapshot & Node Logging (HIGH - Observability)

**Priority: HIGH** | **Enables: Pause/resume, debugging**

Adds structured logging and snapshot persistence.

| Task                             | Files                                                      | Effort |
| -------------------------------- | ---------------------------------------------------------- | ------ |
| Snapshot Types                   | `backend/src/temporal/shared/snapshot/types.ts`            | S      |
| Snapshot Manager                 | `backend/src/temporal/shared/snapshot/snapshot-manager.ts` | M      |
| Snapshot Storage                 | `backend/src/temporal/shared/snapshot/storage.ts`          | M      |
| Node Log Types                   | `backend/src/temporal/shared/logging/types.ts`             | S      |
| Node Logger                      | `backend/src/temporal/shared/logging/node-logger.ts`       | M      |
| DB Migration: workflow_snapshots | `backend/src/storage/migrations/`                          | S      |
| DB Migration: node_logs          | `backend/src/storage/migrations/`                          | S      |

**Exit Criteria:** Each node execution logged with timing/tokens; snapshots saved for pause/resume.

---

### 🟠 Phase 4: SSE Streaming (HIGH - UX Critical)

**Priority: HIGH** | **Blocking: Real-time frontend**

Reliable event delivery and LLM streaming.

| Task                    | Files                                                      | Effort |
| ----------------------- | ---------------------------------------------------------- | ------ |
| SSE Event Types         | `backend/src/temporal/shared/streaming/event-types.ts`     | S      |
| SSE Manager             | `backend/src/temporal/shared/streaming/sse-manager.ts`     | M      |
| Stream Splitter         | `backend/src/temporal/shared/streaming/stream-splitter.ts` | M      |
| Stream API Route        | `backend/src/api/routes/executions/stream.ts`              | M      |
| Frontend SSE Client     | `frontend/src/lib/execution-stream.ts`                     | M      |
| Update Execution Stores | `frontend/src/stores/execution/`                           | M      |

**Exit Criteria:** Frontend receives SSE events; LLM streaming works with token counting.

---

### 🟡 Phase 5: Error-as-Routing (MEDIUM - Resilience)

**Priority: MEDIUM** | **Enables: User-built error recovery**

Allows workflows to route errors instead of failing.

| Task                             | Files                                                     | Effort |
| -------------------------------- | --------------------------------------------------------- | ------ |
| Add errorPort to NodeDefinition  | `shared/src/types/workflow.ts`                            | S      |
| Add handleType to EdgeDefinition | `shared/src/types/workflow.ts`                            | S      |
| Error routing in orchestrator    | `backend/src/temporal/workflows/orchestrator-workflow.ts` | M      |
| Error handle UI component        | `frontend/src/components/canvas/`                         | M      |
| Error edge connection logic      | `frontend/src/components/canvas/`                         | M      |

**Exit Criteria:** Nodes can have error ports; errors route to connected nodes.

---

### 🟡 Phase 6: Pause/Resume with Signals (MEDIUM - Human-in-the-Loop)

**Priority: MEDIUM** | **Enables: Approval workflows**

Enhanced pause/resume using Temporal signals + snapshots.

| Task                       | Files                                                     | Effort |
| -------------------------- | --------------------------------------------------------- | ------ |
| Pause/Resume Signals       | `backend/src/temporal/workflows/orchestrator-workflow.ts` | M      |
| Resume API Route           | `backend/src/api/routes/executions/resume.ts`             | M      |
| DB Migration: resume_queue | `backend/src/storage/migrations/`                         | S      |
| Pause Node UI              | `frontend/src/components/canvas/`                         | M      |

**Exit Criteria:** Workflows can pause; users provide input via signal; execution resumes.

---

### 🟢 Phase 7: Variable Resolver (LOWER - Expressiveness)

**Priority: LOWER** | **Enhances: Loop/parallel syntax**

Priority-chain variable resolution with loop/parallel context.

| Task                         | Files                                               | Effort |
| ---------------------------- | --------------------------------------------------- | ------ |
| Variable Types               | `backend/src/temporal/shared/variables/types.ts`    | S      |
| Expression Parser            | `backend/src/temporal/shared/variables/parser.ts`   | M      |
| Variable Resolver            | `backend/src/temporal/shared/variables/resolver.ts` | M      |
| Integrate with orchestrators | `backend/src/temporal/orchestrators/`               | M      |

**Exit Criteria:** Support for `{{loop.index}}`, `{{parallel.currentItem}}` syntax.

---

### 🟢 Phase 8: Loop & Parallel Enhancements (LOWER - Control Flow)

**Priority: LOWER** | **Enhances: Complex patterns**

Improved loop and parallel orchestration.

| Task                           | Files                                                         | Effort |
| ------------------------------ | ------------------------------------------------------------- | ------ |
| Enhanced Loop Orchestrator     | `backend/src/temporal/orchestrators/loop-orchestrator.ts`     | L      |
| Enhanced Parallel Orchestrator | `backend/src/temporal/orchestrators/parallel-orchestrator.ts` | L      |

**Exit Criteria:** Support for `for`, `forEach`, `while` loops; parallel with aggregation.

---

### ⚪ Phase 9: Frontend Polish & Testing (FINAL)

**Priority: LOWEST** | **Timing: After core features stable**

Polish UI, comprehensive testing, documentation.

| Task                         | Files                             | Effort |
| ---------------------------- | --------------------------------- | ------ |
| Execution path visualization | `frontend/src/components/canvas/` | M      |
| Comprehensive tests          | `backend/tests/`                  | L      |
| Update documentation         | `.docs/`                          | M      |

**Exit Criteria:** All features tested; documentation updated.

---

## Quick Reference: Priority Summary

| Priority    | Phase | What               | Why                              |
| ----------- | ----- | ------------------ | -------------------------------- |
| 🔴 CRITICAL | 1     | Workflow Builder   | Parallel execution, 2-10x faster |
| 🔴 CRITICAL | 2     | Handler Registry   | Maintainability, pluggable nodes |
| 🟠 HIGH     | 3     | Snapshot & Logging | Observability, debugging         |
| 🟠 HIGH     | 4     | SSE Streaming      | Real-time UX                     |
| 🟡 MEDIUM   | 5     | Error-as-Routing   | Resilience                       |
| 🟡 MEDIUM   | 6     | Pause/Resume       | Human-in-the-loop                |
| 🟢 LOWER    | 7     | Variable Resolver  | Expressiveness                   |
| 🟢 LOWER    | 8     | Loop/Parallel      | Advanced control flow            |
| ⚪ FINAL    | 9     | Polish & Testing   | Quality assurance                |

---

## Effort Key

- **S** = Small (< 1 day)
- **M** = Medium (1-3 days)
- **L** = Large (3-5 days)

---

## Files Summary (Enhanced Temporal Engine)

**New Directories in `backend/src/temporal/`:**

```
backend/src/temporal/
├── workflow-builder/            # 4-stage construction pipeline
│   ├── types.ts
│   ├── path-constructor.ts
│   ├── loop-constructor.ts
│   ├── node-constructor.ts
│   ├── edge-constructor.ts
│   └── builder.ts
├── node-handlers/               # Pluggable node handlers
│   ├── types.ts
│   ├── registry.ts
│   ├── llm-node-handler.ts
│   ├── http-node-handler.ts
│   ├── transform-node-handler.ts
│   ├── logic-node-handler.ts
│   ├── integration-node-handler.ts
│   ├── control-flow-node-handler.ts
│   └── generic-node-handler.ts
├── shared/
│   ├── execution-queue.ts       # Parallel execution queue
│   ├── context-manager.ts       # Node output management
│   ├── variable-resolver.ts     # Enhanced variable resolution
│   ├── snapshot/                # State persistence
│   │   ├── types.ts
│   │   ├── snapshot-manager.ts
│   │   └── storage.ts
│   ├── logging/                 # Node logging
│   │   ├── types.ts
│   │   └── node-logger.ts
│   ├── streaming/               # SSE and LLM streaming
│   │   ├── sse-manager.ts
│   │   ├── stream-splitter.ts
│   │   └── event-types.ts
│   └── variables/               # Variable resolution
│       ├── types.ts
│       ├── resolver.ts
│       └── parser.ts
└── orchestrators/               # Enhanced loop/parallel
    ├── loop-orchestrator.ts
    └── parallel-orchestrator.ts
```

**New API Routes:**

```
backend/src/api/routes/executions/
├── stream.ts                    # GET /executions/:id/stream (SSE)
└── resume.ts                    # POST /executions/:id/resume
```

**Frontend Updates:**

```
frontend/src/lib/
└── execution-stream.ts          # SSE client hook

frontend/src/stores/execution/
└── (update existing stores)     # New event types

frontend/src/components/canvas/
└── (add error port UI)          # Error handle components
```

**Database Migrations:**

```
backend/src/storage/migrations/
├── XXX_create_workflow_snapshots.ts
├── XXX_create_node_logs.ts
└── XXX_create_resume_queue.ts
```

**Files to Modify:**

- `backend/src/temporal/workflows/orchestrator-workflow.ts` - Use WorkflowBuilder, ExecutionQueue
- `backend/src/temporal/activities/execute-node.ts` - Use NodeHandler registry
- `shared/src/types/workflow.ts` - Add error ports, handle types
- `frontend/src/components/canvas/` - Error port UI
- `backend/src/storage/repositories/ExecutionRepository.ts` - Snapshot fields

---

## Success Criteria

1. **Performance**: 2-10x faster execution via parallel node execution
2. **Reliability**: Temporal durability + enhanced snapshots for pause/resume
3. **Flexibility**: Error-as-routing, pause/resume, loop/parallel primitives
4. **Streaming**: SSE-based event delivery with LLM streaming
5. **Maintainability**: New node types via handlers without core changes
6. **Observability**: Structured node logs with timing and token tracking

---

## Risk Mitigation

| Risk                        | Mitigation                                                   |
| --------------------------- | ------------------------------------------------------------ |
| Breaking existing workflows | Incremental refactoring; keep existing APIs working          |
| Temporal determinism        | WorkflowBuilder runs in workflow; handlers run in activities |
| Memory in large workflows   | ContextManager with pruning; output size limits              |
| SSE reliability             | Fallback to Redis pub/sub; sequence numbers for ordering     |
| Handler migration           | Gradual migration; generic handler as fallback               |

---

## Testing Strategy

1. **Unit Tests**: Each component in isolation
    - Workflow builder stages
    - Variable resolver
    - Handler signal interpretation
    - Snapshot serialization

2. **Integration Tests**: End-to-end execution
    - Simple linear workflow
    - Conditional branching
    - Loop execution
    - Parallel branches
    - Error-as-routing
    - Pause/resume cycle

3. **Load Tests**: Performance validation
    - Parallel execution speedup
    - Large workflow (100+ nodes)
    - Streaming throughput
    - Concurrent executions
