# Workflow Execution Engine Improvement Plan

## Executive Summary

After analyzing FlowMaestro's Temporal-based execution system and SIM Studio's production-grade implementation, this plan outlines a comprehensive rebuild of the workflow execution engine. Given the clean-slate approach and openness to alternatives, we recommend **replacing Temporal with a custom DAG-based execution engine** similar to SIM's proven architecture.

**Key Decision: Temporal vs Custom Engine**

SIM demonstrates that a custom execution engine can be simpler, more flexible, and equally robust without Temporal's complexity. Their approach handles pause/resume, parallel execution, error routing, and durability through a well-designed snapshot + database persistence model.

---

## Temporal vs Custom Engine Evaluation

### Why SIM Doesn't Use Temporal

SIM's execution engine achieves durability and reliability without Temporal through:

1. **ExecutionSnapshot** - Complete state serialization to database
2. **DAG-Based Execution** - Clear dependency graph, no event sourcing needed
3. **Database as Event Log** - Node logs, execution records provide audit trail
4. **Queue-Based Resume** - Simple FIFO queue for pause/resume

### Comparison

| Aspect                 | Temporal                                                   | Custom (SIM-style)                     |
| ---------------------- | ---------------------------------------------------------- | -------------------------------------- |
| **Complexity**         | High (event sourcing, replay semantics, determinism rules) | Medium (straightforward state machine) |
| **Durability**         | Built-in via event history                                 | Database snapshots + node logs         |
| **Debugging**          | Hard (need to understand replay)                           | Easy (inspect snapshot, logs)          |
| **Flexibility**        | Constrained by determinism                                 | Full control over execution model      |
| **Streaming**          | Activities can stream, workflows can't                     | Native streaming support               |
| **Pause/Resume**       | Signals + continue-as-new                                  | Simple snapshot serialize/deserialize  |
| **Infrastructure**     | Temporal server + workers                                  | Just API + database + Redis            |
| **Parallel Execution** | Activity fan-out                                           | Native concurrent node execution       |
| **Error Routing**      | Complex (workflow must handle)                             | Natural (just follow error edge)       |
| **Learning Curve**     | Steep                                                      | Moderate                               |

### Recommendation: Custom Execution Engine

**Reasons:**

1. **Simpler Architecture** - No Temporal server to manage, no replay semantics to reason about
2. **Better Streaming** - SSE directly from execution, not through activity indirection
3. **Natural Error Routing** - Errors as edges, not exceptions to catch
4. **Cleaner Pause/Resume** - Serialize state, store in DB, restore and continue
5. **Easier Development** - No determinism constraints, standard async/await
6. **Production Proven** - SIM runs this architecture at scale

**Trade-offs:**

- Must implement durability ourselves (but it's straightforward with snapshots)
- No automatic retry at infrastructure level (but we control retry logic)
- Must manage our own worker scaling (but Kubernetes handles this)

---

## Current State Analysis

### FlowMaestro Strengths

- Temporal provides durable execution with automatic retries and history
- Clean separation of workflows, activities, and events
- Redis pub/sub for real-time updates
- Hierarchical span tracking for observability
- Agent orchestrator with continue-as-new pattern

### Critical Gaps Identified

| Gap                     | FlowMaestro                     | SIM                                        | Impact                                      |
| ----------------------- | ------------------------------- | ------------------------------------------ | ------------------------------------------- |
| **DAG Construction**    | Runtime topological sort        | 4-stage construction pipeline              | Race conditions in complex workflows        |
| **Error Handling**      | Fail workflow on error          | Error-as-routing with ports                | Users can't build resilient workflows       |
| **Parallel Execution**  | Sequential node execution       | Concurrent independent nodes               | 2-10x slower for parallelizable workflows   |
| **Context Management**  | Unbounded growth                | Token-aware sliding window                 | Memory blowup on large workflows            |
| **Pause/Resume**        | Limited to UserInputWorkflow    | Full snapshot serialization                | Can't pause mid-workflow for human approval |
| **Variable Resolution** | Basic interpolation             | Lazy resolution with loop/parallel context | Limited expressiveness                      |
| **Streaming**           | Redis pub/sub (fire-and-forget) | SSE with stream tee pattern                | Lost events, inconsistent UX                |

---

## Design Patterns Reference

The following sections document the key patterns from SIM that inform our custom engine design. These are reference materials - the actual implementation plan is in the "Implementation Plan: Custom Execution Engine" section above.

---

## Pattern Details

### 1. DAG Construction Pipeline

**Current Problem:** `orchestrator-workflow.ts` builds the execution graph at runtime with manual topological sorting and two-phase branching to prevent race conditions.

**SIM Pattern:** Four-stage construction pipeline that pre-resolves complexity:

```
PathConstructor → LoopConstructor → NodeConstructor → EdgeConstructor
```

**Recommended Changes:**

**Files to modify:**

- `backend/src/temporal/workflows/orchestrator-workflow.ts`
- Create `backend/src/temporal/dag/` directory with:
    - `path-constructor.ts` - BFS reachability from trigger
    - `loop-constructor.ts` - Loop sentinels (START/END pairs)
    - `node-constructor.ts` - Expand parallels into branch nodes
    - `edge-constructor.ts` - Wire edges with handle types
    - `dag-builder.ts` - Orchestrate construction

**Implementation Steps:**

1. Create `DAGNode` interface with incoming/outgoing edges, type, config
2. Implement PathConstructor for reachability analysis
3. Implement LoopConstructor to insert sentinel nodes
4. Implement NodeConstructor to expand parallel nodes
5. Implement EdgeConstructor to wire conditional/router/loop handles
6. Refactor orchestrator to build DAG once at start, then execute
7. Store DAG in workflow state for resume capability

**Benefits:**

- Eliminates two-phase branching hack
- Enables parallel execution (nodes with satisfied dependencies)
- Cleaner loop/parallel handling
- Resume capability with DAG state

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

**SIM Pattern:** WorkflowEngine maintains `readyQueue` and executes all ready nodes concurrently.

**Recommended Changes:**

**Files to modify:**

- `backend/src/temporal/workflows/orchestrator-workflow.ts`
- Create `backend/src/temporal/execution/engine.ts`

**New Execution Pattern:**

```typescript
interface WorkflowEngine {
    readyQueue: Set<string>; // Nodes ready to execute
    executing: Map<string, Promise<void>>; // In-flight executions
    completed: Set<string>; // Finished nodes

    initialize(dag: DAG): void;
    processQueue(): Promise<void>;
    updateReadyQueue(): void;
    waitForCompletion(): Promise<void>;
}
```

**Implementation Steps:**

1. Create WorkflowEngine class with queue management
2. Initialize ready queue with nodes that have no dependencies (or all deps satisfied)
3. Dequeue ALL ready nodes and execute concurrently (using `Promise.all` with tracking)
4. As each completes, update context and check if dependents are now ready
5. Use Temporal's built-in concurrency controls for activity limits
6. Continue until queue empty and no executing

**Temporal Considerations:**

- Activities can run in parallel via multiple `executeNode` calls
- Use `workflow.allHandled()` to wait for all pending activities
- Track promises without blocking workflow determinism

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
    pruneUnusedOutputs(dag: DAG, currentNode: string): void;
}
```

**Implementation Steps:**

1. Create ContextManager class with Map-based storage
2. Track which nodes' outputs are referenced by downstream nodes (via DAG analysis)
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

- Complete DAG state
- Node outputs
- Workflow variables
- Loop/parallel iteration state
- Resume queue for multiple inputs

**Recommended Changes:**

**Files to modify:**

- `backend/src/temporal/workflows/orchestrator-workflow.ts`
- Create `backend/src/temporal/execution/snapshot.ts`
- Create `backend/src/temporal/execution/pause-manager.ts`
- `backend/src/storage/repositories/ExecutionRepository.ts`

**Snapshot Structure:**

```typescript
interface WorkflowSnapshot {
    executionId: string;
    workflowId: string;

    // DAG state
    dagState: SerializedDAG;
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
2. Add `pause` signal handler to orchestrator workflow
3. When pause signal received:
    - Complete current activity
    - Serialize full state to snapshot
    - Store in database
    - Return workflow with `status: paused`
4. Create resume endpoint that:
    - Loads snapshot
    - Starts new workflow with snapshot as input
    - Restores DAG, context, control flow state
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
<blockId.path>
{{ENV_VAR}}
```

**Recommended Changes:**

**Files to modify:**

- `backend/src/temporal/shared/utils.ts` - Enhance interpolation
- Create `backend/src/temporal/execution/variable-resolver.ts`

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
- Stream tee for streaming + billing
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
6. Implement stream tee for LLM streaming (one stream to client, one for token counting)

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

## Implementation Plan: Custom Execution Engine

### New Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     API Server (Fastify)                     │
│  - SSE streaming endpoints                                   │
│  - Execution triggers (manual, webhook, schedule)           │
│  - Resume endpoints                                          │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│              Execution Core (in-process or worker)           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ DAG Builder  │  │  Execution   │  │   Variable   │       │
│  │  (4 stages)  │→ │    Engine    │→ │   Resolver   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                │                    │              │
│         ▼                ▼                    ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Snapshot    │  │ NodeHandler  │  │ Orchestrators│       │
│  │  Manager     │  │   Registry   │  │ (Loop/Para)  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
└────────────────┬────────────────────────────────────────────┘
                 │
         ┌───────┴───────┐
         ▼               ▼
┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │    Redis     │
│  - Snapshots │  │  - Events    │
│  - Node logs │  │  - Pub/Sub   │
│  - Executions│  │  - Caching   │
└──────────────┘  └──────────────┘
```

---

### Phase 1: Core Execution Engine (Week 1-2)

**Goal:** Replace Temporal orchestrator with custom DAG-based engine.

#### 1.1 DAG Builder (`backend/src/execution/dag/`)

**Files to create:**

- `types.ts` - DAG node/edge types
- `path-constructor.ts` - BFS reachability from trigger
- `loop-constructor.ts` - Insert loop sentinel nodes (START/END)
- `node-constructor.ts` - Expand parallel nodes into branches
- `edge-constructor.ts` - Wire edges with handle types
- `builder.ts` - Orchestrate 4-stage construction

**Key Types:**

```typescript
interface DAGNode {
    id: string;
    type: string;
    config: JsonObject;
    incoming: Set<string>; // Edge IDs
    outgoing: Set<string>; // Edge IDs
}

interface DAGEdge {
    id: string;
    source: string;
    target: string;
    handleType: "source" | "error" | "condition" | "router" | "loop_continue" | "loop_exit";
    condition?: string; // For conditional edges
}

interface DAG {
    nodes: Map<string, DAGNode>;
    edges: Map<string, DAGEdge>;
    startNodes: string[]; // Nodes with no incoming edges
}
```

#### 1.2 Workflow Engine (`backend/src/execution/engine/`)

**Files to create:**

- `types.ts` - ExecutionContext, NodeState
- `engine.ts` - Queue-based parallel execution
- `context-manager.ts` - Node output management

**Execution Loop:**

```typescript
class WorkflowEngine {
    private readyQueue: Set<string> = new Set();
    private executing: Map<string, Promise<void>> = new Map();
    private completed: Set<string> = new Set();
    private context: ExecutionContext;

    async execute(dag: DAG, snapshot?: ExecutionSnapshot): Promise<ExecutionResult> {
        // Initialize from snapshot or start fresh
        this.initialize(dag, snapshot);

        // Main execution loop
        while (this.hasWork()) {
            // Execute all ready nodes in parallel
            await this.processReadyQueue();

            // Update ready queue based on completed nodes
            this.updateReadyQueue();

            // Check for pause signals
            if (this.shouldPause()) {
                return this.createPauseResult();
            }
        }

        return this.createCompleteResult();
    }

    private async processReadyQueue(): Promise<void> {
        const promises = [...this.readyQueue].map((nodeId) => this.executeNode(nodeId));
        this.readyQueue.clear();
        await Promise.allSettled(promises);
    }
}
```

#### 1.3 Node Handlers (`backend/src/execution/node-handlers/`)

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

### Phase 2: State Management & Durability (Week 2-3)

**Goal:** Implement snapshot-based persistence and pause/resume.

#### 2.1 Snapshot Manager (`backend/src/execution/snapshot/`)

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

    // DAG state (for resume)
    serializedDAG: SerializedDAG;
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

#### 2.2 Node Logging (`backend/src/execution/logging/`)

**Files to create:**

- `types.ts` - NodeLog structure
- `logger.ts` - Log creation and storage

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

#### 2.3 Resume System (`backend/src/execution/resume/`)

**Files to create:**

- `resume-manager.ts` - Handle resume requests
- `resume-queue.ts` - Queue for multiple pending resumes

**Resume Flow:**

1. Load snapshot from database
2. Reconstruct DAG from serialized state
3. Restore completed nodes and context
4. Process pending resume input
5. Continue execution from pending nodes

---

### Phase 3: Streaming & Events (Week 3-4)

**Goal:** Implement SSE-based real-time updates and LLM streaming.

#### 3.1 SSE Manager (`backend/src/execution/streaming/`)

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

#### 3.2 Stream Splitter Pattern (`backend/src/execution/streaming/`)

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

### Phase 4: Variable Resolution & Orchestrators (Week 4-5)

**Goal:** Implement advanced variable resolution and loop/parallel handling.

#### 4.1 Variable Resolver (`backend/src/execution/variables/`)

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

#### 4.2 Loop Orchestrator (`backend/src/execution/orchestrators/`)

**Files to create:**

- `loop-orchestrator.ts` - Handle loop iterations

**Loop Types:**

- `for` - Fixed count iterations
- `forEach` - Iterate over collection
- `while` - Condition-based
- `doWhile` - At least one iteration

#### 4.3 Parallel Orchestrator (`backend/src/execution/orchestrators/`)

**Files to create:**

- `parallel-orchestrator.ts` - Handle parallel branches

**Parallel Types:**

- Count-based: Execute N branches with index
- Collection-based: Execute branch per item

---

### Phase 5: Migration & Cleanup (Week 5-6)

**Goal:** Migrate from Temporal, update frontend, remove old code.

#### 5.1 Database Migrations

**New tables:**

- `execution_snapshots` - Serialized execution state
- `node_logs` - Per-node execution logs
- `resume_queue` - Pending resume requests

**Modified tables:**

- `executions` - Add snapshot_id, remove Temporal-specific fields

#### 5.2 Frontend Updates

**Files to modify:**

- `frontend/src/lib/execution-stream.ts` - SSE client
- `frontend/src/stores/execution/` - Update for new event types
- `frontend/src/components/canvas/` - Error port UI, execution path visualization

#### 5.3 Remove Temporal

**Delete:**

- `backend/src/temporal/` - All workflows, activities
- Temporal server from docker-compose
- Temporal client configuration

**Keep patterns from:**

- Span tracking → move to new logging
- Heartbeat → use for long-running handlers
- Error classes → keep and enhance

---

## Implementation Priority (Revised)

### Week 1-2: Core Engine

- [ ] DAG Builder (4-stage construction)
- [ ] Execution Engine (queue-based parallel)
- [ ] Handler Registry (signal-based)
- [ ] Basic handlers (HTTP, Transform)

### Week 2-3: State & Durability

- [ ] Snapshot Manager
- [ ] Node Logging
- [ ] Resume System
- [ ] Database migrations

### Week 3-4: Streaming & Events

- [ ] SSE Manager
- [ ] Stream Splitter for LLM
- [ ] API Routes
- [ ] Frontend SSE client

### Week 4-5: Advanced Features

- [ ] Variable Resolver with loop/parallel context
- [ ] Loop Orchestrator
- [ ] Parallel Orchestrator
- [ ] Error-as-routing

### Week 5-6: Migration

- [ ] Migrate existing workflows
- [ ] Frontend updates
- [ ] Remove Temporal
- [ ] Testing & documentation

---

## Files Summary (Updated for Custom Engine)

**New Directory Structure:**

```
backend/src/execution/           # NEW - replaces backend/src/temporal/
├── dag/                         # DAG construction pipeline
│   ├── types.ts
│   ├── path-constructor.ts
│   ├── loop-constructor.ts
│   ├── node-constructor.ts
│   ├── edge-constructor.ts
│   └── builder.ts
├── engine/                      # Core execution engine
│   ├── types.ts
│   ├── engine.ts
│   └── context-manager.ts
├── node-handlers/               # Node handlers (signal-based)
│   ├── types.ts
│   ├── registry.ts
│   ├── llm-node-handler.ts
│   ├── http-node-handler.ts
│   ├── transform-node-handler.ts
│   ├── logic-node-handler.ts
│   ├── integration-node-handler.ts
│   ├── control-flow-node-handler.ts
│   └── generic-node-handler.ts
├── snapshot/                    # State persistence
│   ├── types.ts
│   ├── snapshot-manager.ts
│   └── storage.ts
├── resume/                      # Pause/resume system
│   ├── resume-manager.ts
│   └── resume-queue.ts
├── streaming/                   # SSE and LLM streaming
│   ├── sse-manager.ts
│   ├── stream-splitter.ts
│   └── event-types.ts
├── variables/                   # Variable resolution
│   ├── types.ts
│   ├── resolver.ts
│   └── parser.ts
├── orchestrators/               # Loop/parallel handling
│   ├── loop-orchestrator.ts
│   └── parallel-orchestrator.ts
├── logging/                     # Node logging
│   ├── types.ts
│   └── logger.ts
└── index.ts                     # Main entry point
```

**API Routes:**

```
backend/src/api/routes/executions/
├── execute.ts                   # POST /workflows/:id/execute (SSE)
├── resume.ts                    # POST /executions/:id/resume
├── stream.ts                    # GET /executions/:id/stream
└── status.ts                    # GET /executions/:id
```

**Frontend:**

```
frontend/src/lib/
└── execution-stream.ts          # SSE client hook

frontend/src/stores/execution/
└── (update existing stores)     # New event types
```

**Database Migrations:**

```
backend/src/storage/migrations/
├── XXX_create_execution_snapshots.ts
├── XXX_create_node_logs.ts
├── XXX_create_resume_queue.ts
└── XXX_update_executions_table.ts
```

**Files to Delete (after migration):**

```
backend/src/temporal/            # Entire directory
infra/docker/temporal/           # Temporal server config
docker-compose.yml               # Remove Temporal service
```

**Files to Modify:**

- `shared/src/types/workflow.ts` - Add error ports, DAG types
- `frontend/src/components/canvas/` - Error port UI
- `backend/src/storage/repositories/ExecutionRepository.ts` - New fields

---

## Success Criteria

1. **Reliability**: No lost events, graceful error handling, complete audit trail
2. **Performance**: 2-10x faster execution via parallel node execution
3. **Flexibility**: Error-as-routing, pause/resume, loop/parallel primitives
4. **Streaming**: Native LLM streaming with token counting
5. **Maintainability**: New node types via handlers without core changes
6. **Observability**: Node logs, execution history, token tracking
7. **Simplicity**: No Temporal complexity, standard async/await patterns

---

## Risk Mitigation

| Risk                         | Mitigation                                                      |
| ---------------------------- | --------------------------------------------------------------- |
| Durability loss              | Database snapshots after each node; recovery from last snapshot |
| Long-running executions      | Snapshot-based persistence; no memory/process dependency        |
| Concurrent access            | Database transactions; optimistic locking on snapshots          |
| Worker failure mid-execution | Execution marked incomplete; resume from snapshot               |
| Event ordering               | Sequence numbers on events; client-side reordering              |
| Memory pressure              | Context manager with pruning; node output size limits           |

---

## Testing Strategy

1. **Unit Tests**: Each component in isolation
    - DAG builder stages
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
