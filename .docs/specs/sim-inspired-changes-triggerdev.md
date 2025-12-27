# Workflow Execution Engine Improvement Plan (Trigger.dev)

## Executive Summary

After analyzing FlowMaestro's Temporal-based execution system and SIM Studio's production-grade implementation, this plan outlines improvements to the workflow execution engine. We will **migrate to Trigger.dev** as our execution backbone while adopting key patterns from SIM to address current gaps.

**Key Decision: Migrate to Trigger.dev, Adopt SIM Patterns**

Trigger.dev provides TypeScript-native durable execution with simpler infrastructure, native streaming, and checkpoint-restore. We'll build SIM's superior patterns on top of Trigger.dev:

- **4-stage construction pipeline** → Pre-process workflow before execution
- **Error-as-routing** → Tasks return structured results; orchestrator routes errors
- **Parallel execution** → Use Trigger.dev's `batchTriggerAndWait()` for parallel subtasks
- **Pause/Resume** → Trigger.dev waitpoints + snapshot serialization
- **Handler registry** → Refactor executors into pluggable handlers

---

## Why Use Trigger.dev

### Trigger.dev Advantages Over Temporal

1. **Simpler Infrastructure** - Single supervisor process vs Temporal Server + workers
2. **No Determinism Constraints** - Checkpoint-restore vs event sourcing replay
3. **Native Streaming** - Built-in Realtime API for LLM streaming to frontend
4. **TypeScript-First** - Tasks are just TypeScript functions, better DX
5. **Efficient Long Waits** - Checkpointed waits don't consume compute resources
6. **Self-Hosting** - Docker or Kubernetes with official Helm chart

### What SIM Does Differently (That We'll Adopt)

| Pattern                | Current FlowMaestro      | SIM Approach     | Our Adaptation                                                     |
| ---------------------- | ------------------------ | ---------------- | ------------------------------------------------------------------ |
| **Construction**       | Runtime topological sort | 4-stage pipeline | Pre-build node execution order before running                      |
| **Error Handling**     | Fail workflow            | Error-as-routing | Tasks return `{ success, data, error }`; orchestrator routes       |
| **Parallel Execution** | Sequential               | Ready queue      | Use Trigger.dev's `batchTriggerAndWait()` for parallel subtasks    |
| **Context**            | Unbounded growth         | Pruning + limits | ContextManager with output limits                                  |
| **Pause/Resume**       | Limited signals          | Full snapshots   | Enhance waitpoints with serialized state                           |
| **Events**             | Redis pub/sub            | SSE              | Use Trigger.dev's native Realtime API + `streams.pipe()`           |
| **Handlers**           | Switch statement         | Handler registry | Refactor into pluggable handlers                                   |

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

The following sections document the key patterns from SIM that we'll adapt for our Trigger.dev engine. These are reference materials - the actual implementation plan is in the "Implementation Plan: Trigger.dev Engine" section below.

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

- `backend/src/trigger/tasks/workflow-executor.ts`
- Create `backend/src/trigger/workflow-builder/` directory with:
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
6. Refactor workflow executor task to build execution order once at start, then execute
7. Store execution state in task metadata for resume capability

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
- `backend/src/trigger/tasks/workflow-executor.ts` - Handle error routing
- `backend/src/trigger/node-handlers/index.ts` - Return error outputs instead of throwing
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
2. Modify `executeNode` task to catch errors and return structured output
3. In workflow executor, check if error occurred:
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

- `backend/src/trigger/tasks/workflow-executor.ts`
- `backend/src/trigger/shared/execution-queue.ts` (new)

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
3. Execute ALL ready nodes concurrently using Trigger.dev's `batchTriggerAndWait()`
4. As each completes, update context and check if dependents are now ready
5. Use Trigger.dev's built-in concurrency controls for task limits
6. Continue until queue empty and no executing

**Trigger.dev Integration:**

- Use `batchTriggerAndWait()` to fan out multiple `executeNode` subtask calls
- Trigger.dev handles task retries and timeouts automatically
- Results are checkpointed - parent doesn't consume resources while waiting

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

- `backend/src/trigger/tasks/workflow-executor.ts`
- `backend/src/trigger/tasks/agent-executor.ts`
- `backend/src/trigger/shared/context-manager.ts` (new)

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
- Faster serialization for task payloads
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

- `backend/src/trigger/tasks/workflow-executor.ts`
- Create `backend/src/trigger/shared/snapshot.ts`
- Create `backend/src/trigger/shared/pause-manager.ts`
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
        waitpointId: string;
        expectedInputSchema?: JsonSchema;
    };
}
```

**Implementation Steps:**

1. Create WorkflowSnapshot class with serialization
2. Use `wait.forToken()` for pause points in workflow executor
3. When pause is triggered:
    - Serialize full state to snapshot
    - Store in database
    - Return waitpoint ID to client
4. Create resume endpoint that:
    - Loads snapshot
    - Completes waitpoint with `waitpoint.complete(id, data)`
    - Restores context, control flow state
    - Continues from pending nodes
5. Add pause node type for explicit pause points

**Trigger.dev Integration:**

```typescript
// In workflow executor task
const userInput = await wait.forToken<UserInputResult>({
    id: `pause-${nodeId}-${Date.now()}`,
    timeout: { days: 7 }
});
```

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

- `backend/src/trigger/shared/utils.ts` - Enhance interpolation
- Create `backend/src/trigger/shared/variable-resolver.ts`

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

**Trigger.dev Solution:** Built-in Realtime API replaces custom SSE implementation.

**Recommended Changes:**

**Files to modify:**

- `backend/src/trigger/node-handlers/llm-handler.ts` - Use `streams.pipe()`
- `backend/src/api/routes/workflows/execute.ts` - Return public access token
- `frontend/src/hooks/useWorkflowExecution.ts` (new)

**Trigger.dev Realtime Implementation:**

```typescript
// In LLM handler
import { streams, metadata } from "@trigger.dev/sdk/v3";

const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: resolvedMessages,
    stream: true
});

// Pipe stream directly to frontend via Trigger.dev Realtime
const stream = await streams.pipe(`llm-${nodeId}`, response);
```

**Frontend Hook:**

```typescript
import { useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";

function useWorkflowExecution(runId: string, publicToken: string) {
    const { run, streams, error } = useRealtimeRunWithStreams(runId, {
        accessToken: publicToken
    });

    return {
        status: run?.metadata?.status,
        completedNodes: run?.metadata?.completedNodes || [],
        llmStreams: Object.entries(streams).filter(([key]) => key.startsWith("llm-")),
        error
    };
}
```

**Implementation Steps:**

1. Use Trigger.dev's `streams.pipe()` for LLM responses
2. Update task metadata for execution progress
3. Generate public access tokens for frontend
4. Create React hook using `@trigger.dev/react-hooks`
5. Remove Redis pub/sub event code
6. Implement stream splitter for token counting via `stream.tee()`

**Benefits:**

- Guaranteed delivery (built-in reconnection)
- No custom infrastructure needed
- Native LLM streaming support
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

- Refactor `backend/src/trigger/executors/` structure
- Create `backend/src/trigger/node-handlers/` directory
- Create `backend/src/trigger/node-handlers/registry.ts`

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
4. Refactor `executeNode` task to use registry
5. Add signal interpretation in workflow executor
6. Extract node-type-specific logic from switch to handlers

**Benefits:**

- Adding new node types doesn't touch core routing
- Cleaner separation of concerns
- Easier testing (mock handlers)
- Signals decouple handlers from orchestration

---

## Implementation Plan: Trigger.dev Engine

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     API Server (Fastify)                    │
│  - Trigger tasks via SDK                                    │
│  - Execution triggers (manual, webhook, schedule)           │
│  - Resume endpoints (complete waitpoints)                   │
│  - Public access tokens for frontend Realtime               │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                   Trigger.dev Tasks                         │
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
│  Trigger.dev │  │  PostgreSQL  │  │    Redis     │
│  Supervisor  │  │  - Snapshots │  │  - Queues    │
│  - Runs      │  │  - Node logs │  │  - Caching   │
│  - Streams   │  │  - Executions│  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

### Phase 1: Workflow Builder & Execution Queue

**Goal:** Add 4-stage workflow construction and parallel execution to Trigger.dev tasks.

#### 1.1 Workflow Builder (`backend/src/trigger/workflow-builder/`)

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

#### 1.2 Execution Queue (`backend/src/trigger/shared/`)

**Files to create:**

- `execution-queue.ts` - Queue-based parallel execution within Trigger.dev
- `context-manager.ts` - Node output management with pruning

**Integration with Trigger.dev:**

```typescript
// In workflow-executor.ts
import { task, metadata } from "@trigger.dev/sdk/v3";
import { executeNode } from "./node-executor";

export const executeWorkflow = task({
    id: "execute-workflow",
    retry: { maxAttempts: 1 },
    run: async (payload: WorkflowExecutionPayload) => {
        // Build execution plan once at start
        const plan = buildExecutionPlan(payload.definition);

        // Initialize queue and context
        const queue = new ExecutionQueue(plan);
        const context = new ContextManager(payload.inputs);

        // Execute in batches (parallel within each batch)
        while (queue.hasWork()) {
            const batch = queue.getNextBatch();

            // Fan out subtasks in parallel using Trigger.dev
            const results = await executeNode.batchTriggerAndWait(
                batch.map((nodeId) => ({
                    payload: { nodeId, config: getNodeConfig(nodeId), context: context.getSnapshot() }
                }))
            );

            // Update context and queue
            for (const result of results) {
                if (result.ok) {
                    context.setNodeOutput(result.output.nodeId, result.output.data);
                    queue.markCompleted(result.output.nodeId);
                }
            }

            await metadata.set("completedNodes", queue.getStatus().completed);
        }

        return context.getFinalOutputs();
    }
});
```

#### 1.3 Node Handlers (`backend/src/trigger/node-handlers/`)

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
        streamId: string;
        tokenUsage?: { input: number; output: number };
    };
}
```

---

### Phase 2: State Management & Enhanced Logging

**Goal:** Add snapshot persistence and structured node logging (Trigger.dev provides base durability).

#### 2.1 Snapshot Manager (`backend/src/trigger/shared/snapshot/`)

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
    runId: string; // Trigger.dev run ID
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
        waitpointId: string;
        expectedInput?: JsonSchema;
        pausedAt: Date;
    };
}
```

#### 2.2 Node Logging (`backend/src/trigger/shared/logging/`)

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

#### 2.3 Pause/Resume with Trigger.dev Waitpoints

**Files to modify:**

- `backend/src/trigger/tasks/workflow-executor.ts` - Add waitpoint handling
- `backend/src/api/routes/executions/resume.ts` - Resume endpoint

**Trigger.dev Waitpoint Integration:**

```typescript
// In workflow-executor.ts
import { wait, metadata } from "@trigger.dev/sdk/v3";

// When a pause node is encountered
const waitpointId = `pause-${nodeId}-${Date.now()}`;
await metadata.set("status", "paused");
await metadata.set("waitpointId", waitpointId);

const userInput = await wait.forToken<UserInputResult>({
    id: waitpointId,
    timeout: { days: 7 }
});

await metadata.set("status", "running");
```

```typescript
// Resume API endpoint
import { waitpoint } from "@trigger.dev/sdk/v3";

export async function resumeExecutionHandler(request, reply) {
    const { waitpointId, input } = request.body;
    await waitpoint.complete(waitpointId, input);
    reply.send({ success: true });
}
```

---

### Phase 3: Streaming & Events

**Goal:** Implement Trigger.dev Realtime for real-time updates and LLM streaming.

#### 3.1 Realtime Integration (`backend/src/trigger/node-handlers/`)

**Files to modify:**

- `llm-node-handler.ts` - Use `streams.pipe()` for LLM streaming

**LLM Handler with Streaming:**

```typescript
import { streams, metadata } from "@trigger.dev/sdk/v3";
import OpenAI from "openai";

export class LLMHandler implements NodeHandler {
    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const { config, context } = input;
        const openai = new OpenAI();

        await metadata.set("nodeStatus", "streaming");

        const response = await openai.chat.completions.create({
            model: config.model || "gpt-4",
            messages: resolveMessages(config.messages, context),
            stream: true
        });

        // Pipe stream directly to frontend via Trigger.dev Realtime
        const streamId = `llm-${config.nodeId}`;
        const stream = await streams.pipe(streamId, response);

        await metadata.set("nodeStatus", "completed");

        return {
            success: true,
            data: { text: stream.text },
            streaming: {
                streamId,
                tokenUsage: {
                    input: stream.usage?.prompt_tokens || 0,
                    output: stream.usage?.completion_tokens || 0
                }
            }
        };
    }
}
```

#### 3.2 Frontend Hook (`frontend/src/hooks/`)

**Files to create:**

- `useWorkflowExecution.ts` - React hook for Trigger.dev Realtime

**Implementation:**

```typescript
import { useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";

export function useWorkflowExecution(runId: string, publicToken: string) {
    const { run, streams, error } = useRealtimeRunWithStreams(runId, {
        accessToken: publicToken
    });

    return {
        status: run?.metadata?.status,
        completedNodes: run?.metadata?.completedNodes || [],
        currentNode: run?.metadata?.currentNode,
        llmStreams: Object.entries(streams)
            .filter(([key]) => key.startsWith("llm-"))
            .map(([key, stream]) => ({ nodeId: key, text: stream?.text || "" })),
        isPaused: run?.metadata?.status === "paused",
        waitpointId: run?.metadata?.waitpointId,
        error,
        isComplete: run?.status === "COMPLETED",
        output: run?.output
    };
}
```

#### 3.3 API Routes (`backend/src/api/routes/executions/`)

**Files to create/modify:**

- `execute.ts` - POST /workflows/:id/execute (returns run ID + public token)
- `resume.ts` - POST /executions/:id/resume (completes waitpoint)
- `status.ts` - GET /executions/:id (returns current status)

---

### Phase 4: Variable Resolution & Orchestrators

**Goal:** Implement advanced variable resolution and loop/parallel handling.

#### 4.1 Variable Resolver (`backend/src/trigger/shared/variables/`)

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

#### 4.2 Loop Orchestrator (`backend/src/trigger/orchestrators/`)

**Files to create:**

- `loop-orchestrator.ts` - Handle loop iterations

**Loop Types:**

- `for` - Fixed count iterations
- `forEach` - Iterate over collection
- `while` - Condition-based
- `doWhile` - At least one iteration

#### 4.3 Parallel Orchestrator (`backend/src/trigger/orchestrators/`)

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

- `executions` - Add run_id (Trigger.dev), snapshot_id for pause/resume

#### 5.2 Frontend Updates

**Files to modify:**

- `frontend/src/hooks/useWorkflowExecution.ts` - Trigger.dev Realtime hook
- `frontend/src/stores/execution/` - Update for new event types
- `frontend/src/components/canvas/` - Error port UI, execution path visualization

#### 5.3 Migration from Temporal

**Files to remove:**

- `backend/src/temporal/` - Remove entire Temporal directory after migration

**Files to refactor:**

- `backend/src/api/routes/workflows/execute.ts` - Use Trigger.dev SDK
- `shared/src/types/workflow.ts` - Add error ports, handle types

---

## Prioritized Implementation Phases

### 🔴 Phase 1: Workflow Builder & Parallel Execution (CRITICAL - Foundation)

**Priority: HIGHEST** | **Blocking: Performance improvements**

Adds 4-stage construction and parallel execution to Trigger.dev tasks.

| Task                        | Files                                                      | Effort |
| --------------------------- | ---------------------------------------------------------- | ------ |
| ExecutableNode Types        | `backend/src/trigger/workflow-builder/types.ts`            | S      |
| Path Constructor            | `backend/src/trigger/workflow-builder/path-constructor.ts` | M      |
| Loop Constructor            | `backend/src/trigger/workflow-builder/loop-constructor.ts` | M      |
| Node Constructor            | `backend/src/trigger/workflow-builder/node-constructor.ts` | M      |
| Edge Constructor            | `backend/src/trigger/workflow-builder/edge-constructor.ts` | M      |
| Workflow Builder            | `backend/src/trigger/workflow-builder/builder.ts`          | M      |
| Execution Queue             | `backend/src/trigger/shared/execution-queue.ts`            | M      |
| Context Manager             | `backend/src/trigger/shared/context-manager.ts`            | M      |
| Integrate with executor     | `backend/src/trigger/tasks/workflow-executor.ts`           | L      |

**Exit Criteria:** Workflow executor uses WorkflowBuilder; nodes execute in parallel batches via `batchTriggerAndWait()`.

---

### 🔴 Phase 2: Node Handler Registry (CRITICAL - Maintainability)

**Priority: HIGHEST** | **Blocking: Clean node execution**

Refactors executors into pluggable handler pattern.

| Task                       | Files                                                           | Effort |
| -------------------------- | --------------------------------------------------------------- | ------ |
| NodeHandler Interface      | `backend/src/trigger/node-handlers/types.ts`                    | S      |
| Handler Registry           | `backend/src/trigger/node-handlers/registry.ts`                 | M      |
| LLM Node Handler           | `backend/src/trigger/node-handlers/llm-node-handler.ts`         | L      |
| HTTP Node Handler          | `backend/src/trigger/node-handlers/http-node-handler.ts`        | M      |
| Transform Node Handler     | `backend/src/trigger/node-handlers/transform-node-handler.ts`   | M      |
| Logic Node Handler         | `backend/src/trigger/node-handlers/logic-node-handler.ts`       | M      |
| Integration Node Handler   | `backend/src/trigger/node-handlers/integration-node-handler.ts` | L      |
| Refactor executeNode task  | `backend/src/trigger/tasks/node-executor.ts`                    | M      |

**Exit Criteria:** executeNode uses handler registry; adding new node types doesn't modify core code.

---

### 🟠 Phase 3: Snapshot & Node Logging (HIGH - Observability)

**Priority: HIGH** | **Enables: Pause/resume, debugging**

Adds structured logging and snapshot persistence.

| Task                             | Files                                                     | Effort |
| -------------------------------- | --------------------------------------------------------- | ------ |
| Snapshot Types                   | `backend/src/trigger/shared/snapshot/types.ts`            | S      |
| Snapshot Manager                 | `backend/src/trigger/shared/snapshot/snapshot-manager.ts` | M      |
| Snapshot Storage                 | `backend/src/trigger/shared/snapshot/storage.ts`          | M      |
| Node Log Types                   | `backend/src/trigger/shared/logging/types.ts`             | S      |
| Node Logger                      | `backend/src/trigger/shared/logging/node-logger.ts`       | M      |
| DB Migration: workflow_snapshots | `backend/src/storage/migrations/`                         | S      |
| DB Migration: node_logs          | `backend/src/storage/migrations/`                         | S      |

**Exit Criteria:** Each node execution logged with timing/tokens; snapshots saved for pause/resume.

---

### 🟠 Phase 4: Realtime Streaming (HIGH - UX Critical)

**Priority: HIGH** | **Blocking: Real-time frontend**

Reliable event delivery and LLM streaming via Trigger.dev Realtime.

| Task                    | Files                                             | Effort |
| ----------------------- | ------------------------------------------------- | ------ |
| LLM Handler Streaming   | `backend/src/trigger/node-handlers/llm-handler.ts`| M      |
| Public Token Generation | `backend/src/api/routes/workflows/execute.ts`     | S      |
| Frontend Realtime Hook  | `frontend/src/hooks/useWorkflowExecution.ts`      | M      |
| Update Execution Stores | `frontend/src/stores/execution/`                  | M      |
| Remove Redis pub/sub    | `backend/src/trigger/`                            | S      |

**Exit Criteria:** Frontend receives Realtime events; LLM streaming works with token counting.

---

### 🟡 Phase 5: Error-as-Routing (MEDIUM - Resilience)

**Priority: MEDIUM** | **Enables: User-built error recovery**

Allows workflows to route errors instead of failing.

| Task                             | Files                                            | Effort |
| -------------------------------- | ------------------------------------------------ | ------ |
| Add errorPort to NodeDefinition  | `shared/src/types/workflow.ts`                   | S      |
| Add handleType to EdgeDefinition | `shared/src/types/workflow.ts`                   | S      |
| Error routing in executor        | `backend/src/trigger/tasks/workflow-executor.ts` | M      |
| Error handle UI component        | `frontend/src/components/canvas/`                | M      |
| Error edge connection logic      | `frontend/src/components/canvas/`                | M      |

**Exit Criteria:** Nodes can have error ports; errors route to connected nodes.

---

### 🟡 Phase 6: Pause/Resume with Waitpoints (MEDIUM - Human-in-the-Loop)

**Priority: MEDIUM** | **Enables: Approval workflows**

Enhanced pause/resume using Trigger.dev waitpoints + snapshots.

| Task                       | Files                                            | Effort |
| -------------------------- | ------------------------------------------------ | ------ |
| Waitpoint Integration      | `backend/src/trigger/tasks/workflow-executor.ts` | M      |
| Resume API Route           | `backend/src/api/routes/executions/resume.ts`    | M      |
| DB Migration: resume_queue | `backend/src/storage/migrations/`                | S      |
| Pause Node UI              | `frontend/src/components/canvas/`                | M      |

**Exit Criteria:** Workflows can pause; users provide input via waitpoint; execution resumes.

---

### 🟢 Phase 7: Variable Resolver (LOWER - Expressiveness)

**Priority: LOWER** | **Enhances: Loop/parallel syntax**

Priority-chain variable resolution with loop/parallel context.

| Task                         | Files                                              | Effort |
| ---------------------------- | -------------------------------------------------- | ------ |
| Variable Types               | `backend/src/trigger/shared/variables/types.ts`    | S      |
| Expression Parser            | `backend/src/trigger/shared/variables/parser.ts`   | M      |
| Variable Resolver            | `backend/src/trigger/shared/variables/resolver.ts` | M      |
| Integrate with orchestrators | `backend/src/trigger/orchestrators/`               | M      |

**Exit Criteria:** Support for `{{loop.index}}`, `{{parallel.currentItem}}` syntax.

---

### 🟢 Phase 8: Loop & Parallel Enhancements (LOWER - Control Flow)

**Priority: LOWER** | **Enhances: Complex patterns**

Improved loop and parallel orchestration.

| Task                           | Files                                                        | Effort |
| ------------------------------ | ------------------------------------------------------------ | ------ |
| Enhanced Loop Orchestrator     | `backend/src/trigger/orchestrators/loop-orchestrator.ts`     | L      |
| Enhanced Parallel Orchestrator | `backend/src/trigger/orchestrators/parallel-orchestrator.ts` | L      |

**Exit Criteria:** Support for `for`, `forEach`, `while` loops; parallel with aggregation.

---

### ⚪ Phase 9: Migration & Testing (FINAL)

**Priority: LOWEST** | **Timing: After core features stable**

Remove Temporal, comprehensive testing, documentation.

| Task                         | Files                             | Effort |
| ---------------------------- | --------------------------------- | ------ |
| Remove Temporal code         | `backend/src/temporal/`           | M      |
| Execution path visualization | `frontend/src/components/canvas/` | M      |
| Comprehensive tests          | `backend/tests/`                  | L      |
| Update documentation         | `.docs/`                          | M      |

**Exit Criteria:** Temporal removed; all features tested; documentation updated.

---

## Quick Reference: Priority Summary

| Priority    | Phase | What               | Why                              |
| ----------- | ----- | ------------------ | -------------------------------- |
| 🔴 CRITICAL | 1     | Workflow Builder   | Parallel execution, 2-10x faster |
| 🔴 CRITICAL | 2     | Handler Registry   | Maintainability, pluggable nodes |
| 🟠 HIGH     | 3     | Snapshot & Logging | Observability, debugging         |
| 🟠 HIGH     | 4     | Realtime Streaming | Real-time UX                     |
| 🟡 MEDIUM   | 5     | Error-as-Routing   | Resilience                       |
| 🟡 MEDIUM   | 6     | Pause/Resume       | Human-in-the-loop                |
| 🟢 LOWER    | 7     | Variable Resolver  | Expressiveness                   |
| 🟢 LOWER    | 8     | Loop/Parallel      | Advanced control flow            |
| ⚪ FINAL    | 9     | Migration & Test   | Quality assurance                |

---

## Effort Key

- **S** = Small (< 1 day)
- **M** = Medium (1-3 days)
- **L** = Large (3-5 days)

---

## Files Summary (Trigger.dev Engine)

**New Directories in `backend/src/trigger/`:**

```
backend/src/trigger/
├── trigger.config.ts               # Trigger.dev configuration
├── tasks/
│   ├── workflow-executor.ts        # Main orchestration task
│   ├── node-executor.ts            # Individual node execution
│   └── agent-executor.ts           # Agent orchestration
├── workflow-builder/               # 4-stage construction pipeline
│   ├── types.ts
│   ├── path-constructor.ts
│   ├── loop-constructor.ts
│   ├── node-constructor.ts
│   ├── edge-constructor.ts
│   └── builder.ts
├── node-handlers/                  # Pluggable node handlers
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
│   ├── execution-queue.ts          # Parallel execution queue
│   ├── context-manager.ts          # Node output management
│   ├── snapshot/                   # State persistence
│   │   ├── types.ts
│   │   ├── snapshot-manager.ts
│   │   └── storage.ts
│   ├── logging/                    # Node logging
│   │   ├── types.ts
│   │   └── node-logger.ts
│   └── variables/                  # Variable resolution
│       ├── types.ts
│       ├── resolver.ts
│       └── parser.ts
└── orchestrators/                  # Enhanced loop/parallel
    ├── loop-orchestrator.ts
    └── parallel-orchestrator.ts
```

**New API Routes:**

```
backend/src/api/routes/executions/
├── resume.ts                       # POST /executions/:id/resume
└── status.ts                       # GET /executions/:id
```

**Frontend Updates:**

```
frontend/src/hooks/
└── useWorkflowExecution.ts         # Trigger.dev Realtime hook

frontend/src/stores/execution/
└── (update existing stores)        # New event types

frontend/src/components/canvas/
└── (add error port UI)             # Error handle components
```

**Database Migrations:**

```
backend/src/storage/migrations/
├── XXX_create_workflow_snapshots.ts
├── XXX_create_node_logs.ts
└── XXX_create_resume_queue.ts
```

**Files to Modify:**

- `backend/src/api/routes/workflows/execute.ts` - Use Trigger.dev SDK, return public token
- `shared/src/types/workflow.ts` - Add error ports, handle types
- `frontend/src/components/canvas/` - Error port UI
- `backend/src/storage/repositories/ExecutionRepository.ts` - Add run_id, snapshot fields

**Files to Remove (after migration):**

- `backend/src/temporal/` - Entire Temporal directory

---

## Self-Hosting & Infrastructure

### Docker Deployment

```yaml
# docker-compose.yml additions
services:
  trigger-webapp:
    image: ghcr.io/triggerdotdev/trigger.dev:v4
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/trigger
      - REDIS_URL=redis://redis:6379
      - TRIGGER_SECRET=${TRIGGER_SECRET}
    ports:
      - "3040:3000"

  trigger-supervisor:
    image: ghcr.io/triggerdotdev/supervisor:v4
    environment:
      - TRIGGER_WORKER_TOKEN=${TRIGGER_WORKER_TOKEN}
      - TRIGGER_API_URL=http://trigger-webapp:3000
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

### Kubernetes Deployment

```bash
helm repo add triggerdotdev https://charts.trigger.dev
helm install trigger triggerdotdev/trigger \
  --namespace flowmaestro \
  --set postgres.enabled=false \
  --set externalPostgres.host=flowmaestro-postgres \
  --set redis.enabled=false \
  --set externalRedis.host=flowmaestro-redis
```

### Worker Scaling

- Workers connect via `TRIGGER_WORKER_TOKEN`
- Scale horizontally by adding supervisor instances
- Each supervisor: 4+ vCPU, 8+ GB RAM recommended

---

## Success Criteria

1. **Performance**: 2-10x faster execution via parallel node execution with `batchTriggerAndWait()`
2. **Reliability**: Checkpoint-restore durability + enhanced snapshots for pause/resume
3. **Flexibility**: Error-as-routing, pause/resume, loop/parallel primitives
4. **Streaming**: Native Trigger.dev Realtime for LLM streaming
5. **Maintainability**: New node types via handlers without core changes
6. **Observability**: Structured node logs with timing and token tracking
7. **Infrastructure**: Simpler deployment (single supervisor vs Temporal cluster)

---

## Risk Mitigation

| Risk                         | Mitigation                                                      |
| ---------------------------- | --------------------------------------------------------------- |
| Breaking existing workflows  | Run Temporal and Trigger.dev in parallel during migration       |
| No checkpoints (self-hosted) | Design tasks for idempotency; waitpoints still work             |
| Newer ecosystem              | Active development; strong community; enterprise support avail  |
| Learning curve               | TypeScript-native; simpler than Temporal's determinism rules    |
| Handler migration            | Gradual migration; generic handler as fallback                  |

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

---

## Comparison: Temporal vs Trigger.dev

| Aspect                   | Temporal Version                    | Trigger.dev Version                |
| ------------------------ | ----------------------------------- | ---------------------------------- |
| **Directory**            | `backend/src/temporal/`             | `backend/src/trigger/`             |
| **Orchestration**        | Workflow + Activities               | Tasks + Subtasks                   |
| **Parallel Execution**   | `Promise.all()` with activities     | `batchTriggerAndWait()`            |
| **Pause/Resume**         | Signals + snapshot                  | Waitpoints + snapshot              |
| **Streaming**            | Custom SSE + Redis                  | Native Realtime API                |
| **Determinism**          | Required                            | Not required                       |
| **Infrastructure**       | Temporal Server + workers           | Single supervisor                  |
| **Long Waits**           | Continue-as-new                     | Checkpointed (no resources)        |
| **Frontend Integration** | Custom WebSocket/SSE                | `@trigger.dev/react-hooks`         |
