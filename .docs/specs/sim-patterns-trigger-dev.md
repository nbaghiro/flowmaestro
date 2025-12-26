# SIM-Inspired Workflow Engine on Trigger.dev

## Executive Summary

This document combines **SIM Studio's production-grade patterns** with **Trigger.dev's durable execution platform** to build FlowMaestro's next-generation workflow engine. This is the recommended approach: we get SIM's superior architectural patterns running on Trigger.dev's simpler, TypeScript-native infrastructure.

**Key Decision: SIM Patterns + Trigger.dev Platform**

| Component                | Source            | Why                                                 |
| ------------------------ | ----------------- | --------------------------------------------------- |
| **Execution Platform**   | Trigger.dev       | Simpler infra, native streaming, checkpoint-restore |
| **4-Stage Construction** | SIM               | Pre-build execution plan, enable parallel batches   |
| **Error-as-Routing**     | SIM               | User-defined error recovery flows                   |
| **Parallel Execution**   | SIM + Trigger.dev | `batchTriggerAndWait()` for concurrent nodes        |
| **Context Management**   | SIM               | Bounded memory, output pruning                      |
| **Pause/Resume**         | SIM + Trigger.dev | `wait.forToken()` with full snapshots               |
| **Variable Resolution**  | SIM               | Priority chain with loop/parallel context           |
| **Event Delivery**       | Trigger.dev       | Built-in realtime API + streams                     |
| **Handler Registry**     | SIM               | Pluggable node handlers                             |

---

## Why This Combination?

### SIM Provides the Architecture

SIM Studio's patterns solve critical gaps in workflow execution:

1. **4-stage construction** → Pre-resolves complex graphs before execution
2. **Error-as-routing** → Users can build resilient workflows with error handling
3. **Parallel execution** → 2-10x faster for parallelizable workflows
4. **Context pruning** → Bounded memory for large workflows
5. **Handler registry** → Pluggable node types without core changes

### Trigger.dev Provides the Platform

Trigger.dev simplifies the runtime compared to Temporal:

1. **Checkpoint-restore** → No determinism constraints, efficient long waits
2. **Native streaming** → Built-in LLM streaming to frontend
3. **Waitpoints** → Simple pause/resume for human-in-the-loop
4. **Single supervisor** → Simpler infrastructure
5. **TypeScript-native** → Better DX, type safety everywhere

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     API Server (Fastify)                             │
│  - POST /workflows/:id/execute → triggers workflow task             │
│  - POST /executions/:id/resume → completes waitpoints               │
│  - Public access tokens for frontend realtime                       │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │ trigger()
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Workflow Executor Task                            │
│                                                                      │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐  │
│  │   Path     │ → │   Loop     │ → │   Node     │ → │   Edge     │  │
│  │ Constructor│   │ Constructor│   │ Constructor│   │ Constructor│  │
│  └────────────┘   └────────────┘   └────────────┘   └────────────┘  │
│                              │                                       │
│                              ▼                                       │
│                    ┌─────────────────┐                              │
│                    │ ExecutionPlan   │                              │
│                    │ (batched order) │                              │
│                    └────────┬────────┘                              │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Execution Queue                            │   │
│  │  for each batch:                                            │   │
│  │    batchTriggerAndWait(ready nodes) ──────────────────┐     │   │
│  │                                                        │     │   │
│  │    ┌───────────┐  ┌───────────┐  ┌───────────┐       │     │   │
│  │    │ Node A    │  │ Node B    │  │ Node C    │  ...  │     │   │
│  │    │ (subtask) │  │ (subtask) │  │ (subtask) │       │     │   │
│  │    └───────────┘  └───────────┘  └───────────┘       │     │   │
│  │                                                        │     │   │
│  │    Results → ContextManager → Error routing            │     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└────────────────┬────────────────────────────────────────────────────┘
                 │
         ┌───────┴───────┬───────────────┐
         ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Trigger.dev │  │  PostgreSQL  │  │    Redis     │
│  Supervisor  │  │  - Snapshots │  │  - Queues    │
│  - Runs      │  │  - Node logs │  │  - Cache     │
│  - Streams   │  │  - Executions│  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Pattern 1: 4-Stage Workflow Construction Pipeline

**Problem Solved:** Runtime topological sorting causes race conditions in complex workflows.

**SIM Solution:** Pre-build execution order through 4 construction stages.

### Implementation

```typescript
// backend/src/trigger/workflow-builder/types.ts
interface ExecutableNode {
    id: string;
    type: string;
    config: JsonObject;
    dependencies: string[]; // Node IDs this depends on
    dependents: string[]; // Node IDs that depend on this
    handleType?: "source" | "error" | "condition" | "router";
    loopContext?: LoopContext; // Set by LoopConstructor
    parallelContext?: ParallelContext; // Set by NodeConstructor
}

interface ExecutionPlan {
    nodes: Map<string, ExecutableNode>;
    startNodes: string[]; // Nodes with no dependencies
    executionOrder: string[][]; // Nodes grouped by execution level (batches)
    loopSentinels: Map<string, LoopSentinel>;
    parallelBranches: Map<string, ParallelBranch>;
}

interface LoopSentinel {
    loopId: string;
    startNodeId: string;
    endNodeId: string;
    bodyNodeIds: string[];
    config: LoopConfig;
}

interface ParallelBranch {
    parallelId: string;
    branchNodeIds: string[][]; // Array of branches, each branch is array of node IDs
    aggregatorNodeId: string;
}
```

### Stage 1: Path Constructor

BFS reachability from trigger nodes to determine which nodes are part of the execution.

```typescript
// backend/src/trigger/workflow-builder/path-constructor.ts
export function constructPaths(definition: WorkflowDefinition): Set<string> {
    const reachable = new Set<string>();
    const queue: string[] = [];

    // Find trigger nodes
    for (const node of definition.nodes) {
        if (node.type === "trigger" || node.type === "webhook" || node.type === "schedule") {
            queue.push(node.id);
            reachable.add(node.id);
        }
    }

    // BFS to find all reachable nodes
    while (queue.length > 0) {
        const nodeId = queue.shift()!;

        // Find outgoing edges
        const outEdges = definition.edges.filter((e) => e.source === nodeId);

        for (const edge of outEdges) {
            if (!reachable.has(edge.target)) {
                reachable.add(edge.target);
                queue.push(edge.target);
            }
        }
    }

    return reachable;
}
```

### Stage 2: Loop Constructor

Insert loop sentinel nodes (START/END pairs) and mark body nodes.

```typescript
// backend/src/trigger/workflow-builder/loop-constructor.ts
export function constructLoops(
    nodes: Map<string, ExecutableNode>,
    definition: WorkflowDefinition
): Map<string, LoopSentinel> {
    const loopSentinels = new Map<string, LoopSentinel>();

    for (const node of definition.nodes) {
        if (node.type === "loop") {
            const sentinel: LoopSentinel = {
                loopId: node.id,
                startNodeId: `${node.id}_START`,
                endNodeId: `${node.id}_END`,
                bodyNodeIds: findLoopBodyNodes(node.id, definition),
                config: node.config as LoopConfig
            };

            // Insert sentinel nodes
            nodes.set(sentinel.startNodeId, {
                id: sentinel.startNodeId,
                type: "loop_start",
                config: { loopId: node.id, loopConfig: sentinel.config },
                dependencies: nodes.get(node.id)?.dependencies || [],
                dependents: sentinel.bodyNodeIds.length > 0 ? [sentinel.bodyNodeIds[0]] : []
            });

            nodes.set(sentinel.endNodeId, {
                id: sentinel.endNodeId,
                type: "loop_end",
                config: { loopId: node.id },
                dependencies: [
                    sentinel.bodyNodeIds[sentinel.bodyNodeIds.length - 1] || sentinel.startNodeId
                ],
                dependents: nodes.get(node.id)?.dependents || []
            });

            // Mark body nodes with loop context
            for (const bodyNodeId of sentinel.bodyNodeIds) {
                const bodyNode = nodes.get(bodyNodeId);
                if (bodyNode) {
                    bodyNode.loopContext = {
                        loopId: node.id,
                        isBody: true
                    };
                }
            }

            loopSentinels.set(node.id, sentinel);
        }
    }

    return loopSentinels;
}
```

### Stage 3: Node Constructor

Expand parallel nodes into branch nodes.

```typescript
// backend/src/trigger/workflow-builder/node-constructor.ts
export function constructParallelNodes(
    nodes: Map<string, ExecutableNode>,
    definition: WorkflowDefinition
): Map<string, ParallelBranch> {
    const parallelBranches = new Map<string, ParallelBranch>();

    for (const node of definition.nodes) {
        if (node.type === "parallel") {
            const config = node.config as ParallelConfig;
            const branches: string[][] = [];

            // Create branch nodes based on config
            if (config.mode === "count") {
                for (let i = 0; i < config.count; i++) {
                    const branchNodes = createBranchNodes(node.id, i, nodes, definition);
                    branches.push(branchNodes);
                }
            } else if (config.mode === "collection") {
                // Collection mode - branches created at runtime based on input
                branches.push(createTemplateBranch(node.id, nodes, definition));
            }

            parallelBranches.set(node.id, {
                parallelId: node.id,
                branchNodeIds: branches,
                aggregatorNodeId: `${node.id}_AGGREGATE`
            });

            // Mark nodes with parallel context
            for (let branchIdx = 0; branchIdx < branches.length; branchIdx++) {
                for (const branchNodeId of branches[branchIdx]) {
                    const branchNode = nodes.get(branchNodeId);
                    if (branchNode) {
                        branchNode.parallelContext = {
                            parallelId: node.id,
                            branchIndex: branchIdx
                        };
                    }
                }
            }
        }
    }

    return parallelBranches;
}
```

### Stage 4: Edge Constructor

Wire edges with handle types for conditions, routers, and error ports.

```typescript
// backend/src/trigger/workflow-builder/edge-constructor.ts
export function constructEdges(
    nodes: Map<string, ExecutableNode>,
    definition: WorkflowDefinition
): void {
    for (const edge of definition.edges) {
        const sourceNode = nodes.get(edge.source);
        const targetNode = nodes.get(edge.target);

        if (!sourceNode || !targetNode) continue;

        // Determine handle type
        let handleType: HandleType = "source";

        if (edge.sourceHandle === "error") {
            handleType = "error";
        } else if (sourceNode.type === "condition") {
            handleType = edge.sourceHandle === "true" ? "condition_true" : "condition_false";
        } else if (sourceNode.type === "router") {
            handleType = "router";
        }

        // Update dependencies/dependents
        if (!targetNode.dependencies.includes(edge.source)) {
            targetNode.dependencies.push(edge.source);
        }
        if (!sourceNode.dependents.includes(edge.target)) {
            sourceNode.dependents.push(edge.target);
        }

        // Store handle type for routing
        targetNode.handleType = handleType;
    }
}
```

### Builder Orchestration

```typescript
// backend/src/trigger/workflow-builder/builder.ts
export function buildExecutionPlan(definition: WorkflowDefinition): ExecutionPlan {
    // Stage 1: Path construction - find reachable nodes
    const reachable = constructPaths(definition);

    // Initialize nodes map with reachable nodes only
    const nodes = new Map<string, ExecutableNode>();
    for (const node of definition.nodes) {
        if (reachable.has(node.id)) {
            nodes.set(node.id, {
                id: node.id,
                type: node.type,
                config: node.config,
                dependencies: [],
                dependents: []
            });
        }
    }

    // Stage 2: Loop construction - insert sentinels
    const loopSentinels = constructLoops(nodes, definition);

    // Stage 3: Node construction - expand parallels
    const parallelBranches = constructParallelNodes(nodes, definition);

    // Stage 4: Edge construction - wire everything
    constructEdges(nodes, definition);

    // Build execution order (topological sort into batches)
    const executionOrder = buildExecutionOrder(nodes);

    // Find start nodes
    const startNodes = Array.from(nodes.values())
        .filter((n) => n.dependencies.length === 0)
        .map((n) => n.id);

    return {
        nodes,
        startNodes,
        executionOrder,
        loopSentinels,
        parallelBranches
    };
}

function buildExecutionOrder(nodes: Map<string, ExecutableNode>): string[][] {
    const order: string[][] = [];
    const completed = new Set<string>();
    const remaining = new Set(nodes.keys());

    while (remaining.size > 0) {
        // Find nodes with all dependencies satisfied
        const ready: string[] = [];
        for (const nodeId of remaining) {
            const node = nodes.get(nodeId)!;
            const allDepsSatisfied = node.dependencies.every((d) => completed.has(d));
            if (allDepsSatisfied) {
                ready.push(nodeId);
            }
        }

        if (ready.length === 0 && remaining.size > 0) {
            throw new Error("Circular dependency detected in workflow");
        }

        // Add ready nodes as a batch (can execute in parallel)
        order.push(ready);

        // Mark as completed
        for (const nodeId of ready) {
            completed.add(nodeId);
            remaining.delete(nodeId);
        }
    }

    return order;
}
```

---

## Pattern 2: Error-as-Routing

**Problem Solved:** Node errors stop dependent branches. Users can't design error recovery.

**SIM Solution:** Nodes return structured output with success/error. Orchestrator routes to error ports.

### Types

```typescript
// shared/src/types/workflow.ts
interface NodeDefinition {
    id: string;
    type: string;
    config: JsonObject;
    position: { x: number; y: number };
    errorPort?: boolean; // Can this node have an error output?
}

interface EdgeDefinition {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string; // "source" | "error" | "true" | "false" | route name
    targetHandle?: string;
}

// backend/src/trigger/shared/types.ts
interface NodeOutput {
    nodeId: string;
    success: boolean;
    data?: JsonObject;
    error?: {
        message: string;
        code?: string;
        stack?: string;
        retryable?: boolean;
    };
    signals?: NodeSignals;
    tokenUsage?: TokenUsage;
}

interface NodeSignals {
    pause?: {
        reason: string;
        expectedInputSchema?: JsonSchema;
    };
    activateErrorPort?: boolean;
    selectedRoute?: string; // For router nodes
    isTerminal?: boolean; // End this branch
    skipDownstream?: string[]; // Skip these node IDs
}
```

### Error Routing in Orchestrator

```typescript
// backend/src/trigger/tasks/workflow-executor.ts
async function handleNodeResult(
    result: NodeOutput,
    node: ExecutableNode,
    definition: WorkflowDefinition,
    context: ContextManager,
    executionQueue: ExecutionQueue
): Promise<void> {
    if (result.success) {
        // Normal success - activate downstream via source handle
        context.setNodeOutput(result.nodeId, result.data);
        executionQueue.markCompleted(result.nodeId);
        return;
    }

    // Error occurred - check for error port
    const hasErrorPort = node.errorPort === true;
    const errorEdge = definition.edges.find(
        (e) => e.source === node.id && e.sourceHandle === "error"
    );

    if (hasErrorPort && errorEdge) {
        // Route to error branch instead of failing
        context.setNodeOutput(result.nodeId, {
            error: result.error,
            originalData: result.data
        });
        executionQueue.markCompleted(result.nodeId);
        executionQueue.activateErrorBranch(node.id, errorEdge.target);

        await metadata.append("errorRouted", {
            nodeId: node.id,
            error: result.error?.message,
            routedTo: errorEdge.target
        });
    } else {
        // No error port - propagate failure (mark branch as failed)
        executionQueue.markFailed(result.nodeId, result.error);

        await metadata.append("failedNodes", {
            nodeId: node.id,
            error: result.error
        });

        // Skip downstream nodes in this branch
        const downstream = getDownstreamNodes(node.id, definition);
        for (const downstreamId of downstream) {
            executionQueue.markSkipped(downstreamId, `Upstream node ${node.id} failed`);
        }
    }
}
```

### Node Handler Error Handling

```typescript
// backend/src/trigger/node-handlers/base-handler.ts
export abstract class BaseNodeHandler implements NodeHandler {
    abstract execute(input: HandlerInput): Promise<NodeOutput>;

    protected async safeExecute(
        input: HandlerInput,
        executor: () => Promise<JsonObject>
    ): Promise<NodeOutput> {
        const { config } = input;
        const startTime = Date.now();

        try {
            const data = await executor();
            return {
                nodeId: config.id,
                success: true,
                data
            };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));

            // Determine if error is retryable
            const retryable = this.isRetryable(err);

            return {
                nodeId: config.id,
                success: false,
                error: {
                    message: err.message,
                    code: (err as any).code,
                    stack: err.stack,
                    retryable
                },
                signals: {
                    activateErrorPort: true
                }
            };
        }
    }

    protected isRetryable(error: Error): boolean {
        // Network errors, rate limits are retryable
        const retryableCodes = ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "429", "503"];
        const code = (error as any).code || (error as any).status;
        return retryableCodes.includes(String(code));
    }
}
```

---

## Pattern 3: Parallel Node Execution

**Problem Solved:** Sequential execution of independent nodes is 2-10x slower.

**SIM Solution:** Execute all ready nodes concurrently.

**Trigger.dev Mapping:** Use `batchTriggerAndWait()` for parallel subtasks.

### Execution Queue

```typescript
// backend/src/trigger/shared/execution-queue.ts
export class ExecutionQueue {
    private nodes: Map<string, ExecutableNode>;
    private completed: Set<string> = new Set();
    private failed: Set<string> = new Set();
    private skipped: Set<string> = new Set();
    private executing: Set<string> = new Set();
    private errorBranches: Map<string, string> = new Map(); // nodeId -> error target

    constructor(plan: ExecutionPlan) {
        this.nodes = plan.nodes;
    }

    hasWork(): boolean {
        const pending = this.getPendingNodes();
        return pending.length > 0 || this.executing.size > 0;
    }

    getNextBatch(): string[] {
        const ready: string[] = [];

        for (const [nodeId, node] of this.nodes) {
            if (
                this.completed.has(nodeId) ||
                this.failed.has(nodeId) ||
                this.skipped.has(nodeId) ||
                this.executing.has(nodeId)
            ) {
                continue;
            }

            // Check if all dependencies are satisfied
            const depsSatisfied = node.dependencies.every((depId) => {
                // Dependency is satisfied if completed, or if error was routed
                return (
                    this.completed.has(depId) ||
                    (this.failed.has(depId) && this.errorBranches.has(depId))
                );
            });

            if (depsSatisfied) {
                ready.push(nodeId);
                this.executing.add(nodeId);
            }
        }

        return ready;
    }

    markCompleted(nodeId: string): void {
        this.executing.delete(nodeId);
        this.completed.add(nodeId);
    }

    markFailed(nodeId: string, error?: NodeError): void {
        this.executing.delete(nodeId);
        this.failed.add(nodeId);
    }

    markSkipped(nodeId: string, reason: string): void {
        this.skipped.add(nodeId);
    }

    activateErrorBranch(sourceId: string, targetId: string): void {
        this.errorBranches.set(sourceId, targetId);
    }

    getStatus(): ExecutionQueueStatus {
        return {
            completed: Array.from(this.completed),
            failed: Array.from(this.failed),
            skipped: Array.from(this.skipped),
            executing: Array.from(this.executing),
            pending: this.getPendingNodes()
        };
    }

    private getPendingNodes(): string[] {
        return Array.from(this.nodes.keys()).filter(
            (id) =>
                !this.completed.has(id) &&
                !this.failed.has(id) &&
                !this.skipped.has(id) &&
                !this.executing.has(id)
        );
    }
}
```

### Workflow Executor with Parallel Batches

```typescript
// backend/src/trigger/tasks/workflow-executor.ts
import { task, metadata, runs } from "@trigger.dev/sdk/v3";
import { buildExecutionPlan } from "../workflow-builder/builder";
import { ExecutionQueue } from "../shared/execution-queue";
import { ContextManager } from "../shared/context-manager";
import { executeNode } from "./node-executor";

export const executeWorkflow = task({
    id: "execute-workflow",
    retry: { maxAttempts: 1 }, // Workflow-level retry handled differently
    run: async (payload: WorkflowExecutionPayload) => {
        const { workflowId, executionId, definition, inputs } = payload;

        // Initialize metadata for frontend
        await metadata.set("executionId", executionId);
        await metadata.set("workflowId", workflowId);
        await metadata.set("status", "building");

        // Build execution plan using 4-stage pipeline
        const plan = buildExecutionPlan(definition);

        await metadata.set("status", "running");
        await metadata.set("totalNodes", plan.nodes.size);
        await metadata.set("executionBatches", plan.executionOrder.length);

        // Initialize execution state
        const queue = new ExecutionQueue(plan);
        const context = new ContextManager(inputs);

        // Execute batches
        let batchIndex = 0;
        while (queue.hasWork()) {
            const batch = queue.getNextBatch();

            if (batch.length === 0) {
                // Waiting for in-flight tasks
                await new Promise((resolve) => setTimeout(resolve, 100));
                continue;
            }

            await metadata.set("currentBatch", batchIndex);
            await metadata.set("batchNodes", batch);

            // Execute all nodes in batch concurrently
            const results = await executeNode.batchTriggerAndWait(
                batch.map((nodeId) => ({
                    payload: {
                        nodeId,
                        config: getNodeConfig(nodeId, plan, definition),
                        context: context.getSnapshot(),
                        executionId
                    }
                }))
            );

            // Process results
            for (const result of results) {
                if (result.ok) {
                    await handleNodeResult(
                        result.output,
                        plan.nodes.get(result.output.nodeId)!,
                        definition,
                        context,
                        queue
                    );
                } else {
                    // Task-level failure (not node error)
                    const nodeId = batch[results.indexOf(result)];
                    queue.markFailed(nodeId, { message: result.error.message });
                }
            }

            // Update completed nodes metadata
            await metadata.set("completedNodes", queue.getStatus().completed);

            // Prune unused outputs to save memory
            context.pruneUnusedOutputs(queue.getStatus().completed, batch);

            batchIndex++;
        }

        // Final status
        const status = queue.getStatus();
        const finalStatus = status.failed.length > 0 ? "partial" : "completed";

        await metadata.set("status", finalStatus);
        await metadata.set("finalStatus", status);

        return {
            success: status.failed.length === 0,
            outputs: context.getFinalOutputs(),
            completedNodes: status.completed,
            failedNodes: status.failed,
            skippedNodes: status.skipped
        };
    }
});
```

---

## Pattern 4: Context Memory Management

**Problem Solved:** Unbounded context growth causes memory blowup in large workflows.

**SIM Solution:** Structured node output storage with pruning.

### Context Manager

```typescript
// backend/src/trigger/shared/context-manager.ts
interface ContextConfig {
    maxNodeOutputSize: number; // Max bytes per node output
    retainedNodes: Set<string>; // Never evict these
    pruneAfterBatch: boolean; // Auto-prune after each batch
}

export class ContextManager {
    private nodeOutputs: Map<string, JsonObject> = new Map();
    private workflowVariables: Map<string, JsonValue> = new Map();
    private inputs: JsonObject;
    private config: ContextConfig;
    private outputReferences: Map<string, Set<string>> = new Map(); // nodeId -> nodes that reference it

    constructor(inputs: JsonObject, config?: Partial<ContextConfig>) {
        this.inputs = inputs;
        this.config = {
            maxNodeOutputSize: config?.maxNodeOutputSize || 1024 * 1024, // 1MB default
            retainedNodes: config?.retainedNodes || new Set(),
            pruneAfterBatch: config?.pruneAfterBatch ?? true
        };
    }

    setNodeOutput(nodeId: string, output: JsonObject): void {
        // Enforce size limit
        const serialized = JSON.stringify(output);
        if (serialized.length > this.config.maxNodeOutputSize) {
            // Truncate large outputs but preserve structure
            output = this.truncateOutput(output);
        }

        this.nodeOutputs.set(nodeId, output);
    }

    getNodeOutput(nodeId: string): JsonObject | undefined {
        return this.nodeOutputs.get(nodeId);
    }

    getVariable(path: string): JsonValue {
        // Support paths like "nodeId.data.field" or "var.myVar" or "inputs.key"
        const parts = path.split(".");

        if (parts[0] === "inputs") {
            return this.getNestedValue(this.inputs, parts.slice(1));
        }

        if (parts[0] === "var") {
            return this.workflowVariables.get(parts[1]);
        }

        // Assume it's a node reference
        const nodeOutput = this.nodeOutputs.get(parts[0]);
        if (nodeOutput) {
            return this.getNestedValue(nodeOutput, parts.slice(1));
        }

        return undefined;
    }

    setVariable(name: string, value: JsonValue): void {
        this.workflowVariables.set(name, value);
    }

    getSnapshot(): ContextSnapshot {
        return {
            nodeOutputs: Object.fromEntries(this.nodeOutputs),
            workflowVariables: Object.fromEntries(this.workflowVariables),
            inputs: this.inputs
        };
    }

    pruneUnusedOutputs(completedNodes: string[], currentBatch: string[]): void {
        // Find which nodes' outputs are still needed by pending nodes
        const neededOutputs = new Set<string>();

        for (const [refNodeId, referencingNodes] of this.outputReferences) {
            for (const referencingNode of referencingNodes) {
                if (!completedNodes.includes(referencingNode)) {
                    neededOutputs.add(refNodeId);
                }
            }
        }

        // Also retain explicitly marked nodes
        for (const retained of this.config.retainedNodes) {
            neededOutputs.add(retained);
        }

        // Prune outputs no longer needed
        for (const nodeId of completedNodes) {
            if (!neededOutputs.has(nodeId) && !currentBatch.includes(nodeId)) {
                this.nodeOutputs.delete(nodeId);
            }
        }
    }

    getFinalOutputs(): JsonObject {
        // Return outputs from terminal nodes (no dependents)
        const outputs: JsonObject = {};
        for (const [nodeId, output] of this.nodeOutputs) {
            outputs[nodeId] = output;
        }
        return outputs;
    }

    private truncateOutput(output: JsonObject): JsonObject {
        const truncated: JsonObject = {};
        const maxFieldSize = this.config.maxNodeOutputSize / 10;

        for (const [key, value] of Object.entries(output)) {
            if (typeof value === "string" && value.length > maxFieldSize) {
                truncated[key] = value.substring(0, maxFieldSize) + "... [truncated]";
            } else if (Array.isArray(value) && value.length > 100) {
                truncated[key] = value.slice(0, 100);
                (truncated as any)[`${key}_truncated`] = true;
                (truncated as any)[`${key}_originalLength`] = value.length;
            } else {
                truncated[key] = value;
            }
        }

        return truncated;
    }

    private getNestedValue(obj: any, path: string[]): JsonValue {
        let current = obj;
        for (const part of path) {
            if (current === null || current === undefined) return undefined;

            // Handle array access like "data[0]"
            const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
            if (arrayMatch) {
                current = current[arrayMatch[1]]?.[parseInt(arrayMatch[2])];
            } else {
                current = current[part];
            }
        }
        return current;
    }
}
```

---

## Pattern 5: Pause/Resume with Snapshots

**Problem Solved:** Limited mid-workflow pause for human approval.

**SIM Solution:** Full snapshot serialization with waitpoints.

**Trigger.dev Mapping:** `wait.forToken()` + database snapshots.

### Snapshot Types

```typescript
// backend/src/trigger/shared/snapshot/types.ts
interface WorkflowSnapshot {
    // Identifiers
    executionId: string;
    workflowId: string;
    userId: string;
    runId: string; // Trigger.dev run ID

    // Execution state
    completedNodes: string[];
    pendingNodes: string[];
    failedNodes: string[];
    skippedNodes: string[];

    // Context
    nodeOutputs: Record<string, JsonObject>;
    workflowVariables: Record<string, JsonValue>;
    inputs: JsonObject;

    // Control flow state
    loopStates: Record<string, LoopIterationState>;
    parallelStates: Record<string, ParallelBranchState>;

    // Pause info
    pauseContext: {
        nodeId: string;
        reason: string;
        pausedAt: Date;
        waitpointId: string;
        expectedInputSchema?: JsonSchema;
        timeoutAt?: Date;
    };

    // Metadata
    createdAt: Date;
    version: number;
}

interface LoopIterationState {
    loopId: string;
    currentIndex: number;
    totalIterations: number;
    currentItem?: JsonValue;
    completedIterations: number[];
}

interface ParallelBranchState {
    parallelId: string;
    branches: {
        branchIndex: number;
        status: "pending" | "running" | "completed" | "failed";
        output?: JsonObject;
    }[];
    aggregatedOutput?: JsonObject;
}
```

### Pause Node Handler

```typescript
// backend/src/trigger/node-handlers/pause-handler.ts
import { wait, metadata } from "@trigger.dev/sdk/v3";
import { saveSnapshot, loadSnapshot } from "../shared/snapshot/storage";

export class PauseHandler implements NodeHandler {
    canHandle(nodeType: string): boolean {
        return nodeType === "pause" || nodeType === "human_input" || nodeType === "approval";
    }

    async execute(input: HandlerInput): Promise<NodeOutput> {
        const { config, context, executionContext } = input;
        const { reason, timeout, expectedSchema, approvers } = config;

        // Create waitpoint ID
        const waitpointId = `pause-${config.id}-${Date.now()}`;

        // Save full snapshot before pausing
        const snapshot: WorkflowSnapshot = {
            executionId: executionContext.executionId,
            workflowId: executionContext.workflowId,
            userId: executionContext.userId,
            runId: executionContext.runId,
            completedNodes: context.completedNodes,
            pendingNodes: context.pendingNodes,
            failedNodes: context.failedNodes || [],
            skippedNodes: context.skippedNodes || [],
            nodeOutputs: context.nodeOutputs,
            workflowVariables: context.workflowVariables,
            inputs: context.inputs,
            loopStates: context.loopStates || {},
            parallelStates: context.parallelStates || {},
            pauseContext: {
                nodeId: config.id,
                reason,
                pausedAt: new Date(),
                waitpointId,
                expectedInputSchema: expectedSchema,
                timeoutAt: timeout ? new Date(Date.now() + parseDuration(timeout)) : undefined
            },
            createdAt: new Date(),
            version: 1
        };

        await saveSnapshot(snapshot);

        // Update metadata for frontend
        await metadata.set("status", "paused");
        await metadata.set("pausedAt", config.id);
        await metadata.set("pauseReason", reason);
        await metadata.set("waitpointId", waitpointId);

        // Wait for external input
        const userInput = await wait.forToken<UserInputResult>({
            id: waitpointId,
            timeout: timeout ? parseDuration(timeout) : { days: 30 }
        });

        // Validate input if schema provided
        if (expectedSchema) {
            const validation = validateAgainstSchema(userInput, expectedSchema);
            if (!validation.valid) {
                return {
                    nodeId: config.id,
                    success: false,
                    error: {
                        message: `Invalid input: ${validation.errors.join(", ")}`,
                        code: "VALIDATION_ERROR"
                    }
                };
            }
        }

        // Resume successful
        await metadata.set("status", "running");

        return {
            nodeId: config.id,
            success: true,
            data: {
                userInput,
                resumedAt: new Date().toISOString(),
                pauseDuration: Date.now() - snapshot.pauseContext.pausedAt.getTime()
            }
        };
    }
}
```

### Resume API Endpoint

```typescript
// backend/src/api/routes/executions/resume.ts
import { waitpoint } from "@trigger.dev/sdk/v3";
import { loadSnapshot } from "../../trigger/shared/snapshot/storage";

export async function resumeExecutionHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const { executionId } = request.params as { executionId: string };
    const { input } = request.body as { input: JsonObject };
    const userId = request.user.id;

    // Load snapshot to get waitpoint ID
    const snapshot = await loadSnapshot(executionId);

    if (!snapshot) {
        throw new NotFoundError("Execution not found or not paused");
    }

    if (snapshot.userId !== userId) {
        throw new UnauthorizedError("Not authorized to resume this execution");
    }

    if (!snapshot.pauseContext) {
        throw new ValidationError("Execution is not in paused state");
    }

    // Complete the waitpoint
    await waitpoint.complete(snapshot.pauseContext.waitpointId, input);

    // Update execution status
    await executionRepo.update(executionId, userId, { status: "running" });

    reply.send({
        success: true,
        data: {
            executionId,
            resumedAt: new Date().toISOString()
        }
    });
}
```

---

## Pattern 6: Advanced Variable Resolution

**Problem Solved:** Basic interpolation lacks loop/parallel context.

**SIM Solution:** Priority-chain resolver with special contexts.

### Variable Resolver

```typescript
// backend/src/trigger/shared/variable-resolver.ts
interface ResolutionContext {
    nodeOutputs: Map<string, JsonObject>;
    workflowVariables: Map<string, JsonValue>;
    inputs: JsonObject;
    environmentVariables: Map<string, string>;

    // Loop context (set when inside a loop)
    loop?: {
        index: number; // 0-based
        iteration: number; // 1-based
        item: JsonValue;
        total: number;
        isFirst: boolean;
        isLast: boolean;
    };

    // Parallel context (set when inside a parallel branch)
    parallel?: {
        index: number;
        branchId: string;
        currentItem: JsonValue;
        totalBranches: number;
    };
}

export class VariableResolver {
    private context: ResolutionContext;

    constructor(context: ResolutionContext) {
        this.context = context;
    }

    resolve(expression: string): JsonValue {
        // Handle template strings like "Hello {{name}}"
        if (expression.includes("{{") && expression.includes("}}")) {
            return this.resolveTemplate(expression);
        }

        // Handle direct variable reference
        return this.resolveVariable(expression);
    }

    private resolveTemplate(template: string): string {
        return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = this.resolveVariable(path.trim());
            return value !== undefined ? String(value) : match;
        });
    }

    private resolveVariable(path: string): JsonValue {
        const parts = path.split(".");

        // Priority chain (first match wins)

        // 1. Loop context
        if (parts[0] === "loop" && this.context.loop) {
            return this.resolveLoopVariable(parts.slice(1));
        }

        // 2. Parallel context
        if (parts[0] === "parallel" && this.context.parallel) {
            return this.resolveParallelVariable(parts.slice(1));
        }

        // 3. Workflow variables
        if (parts[0] === "var") {
            return this.context.workflowVariables.get(parts[1]);
        }

        // 4. Environment variables
        if (parts[0] === "env") {
            return this.context.environmentVariables.get(parts[1]);
        }

        // 5. Inputs
        if (parts[0] === "inputs") {
            return this.getNestedValue(this.context.inputs, parts.slice(1));
        }

        // 6. Node outputs (nodeId.path.to.value)
        const nodeOutput = this.context.nodeOutputs.get(parts[0]);
        if (nodeOutput) {
            return this.getNestedValue(nodeOutput, parts.slice(1));
        }

        return undefined;
    }

    private resolveLoopVariable(parts: string[]): JsonValue {
        const loop = this.context.loop!;
        const key = parts[0];

        switch (key) {
            case "index":
                return loop.index;
            case "iteration":
                return loop.iteration;
            case "item":
                return parts.length > 1
                    ? this.getNestedValue(loop.item, parts.slice(1))
                    : loop.item;
            case "total":
                return loop.total;
            case "isFirst":
                return loop.isFirst;
            case "isLast":
                return loop.isLast;
            default:
                return undefined;
        }
    }

    private resolveParallelVariable(parts: string[]): JsonValue {
        const parallel = this.context.parallel!;
        const key = parts[0];

        switch (key) {
            case "index":
                return parallel.index;
            case "branchId":
                return parallel.branchId;
            case "currentItem":
                return parts.length > 1
                    ? this.getNestedValue(parallel.currentItem, parts.slice(1))
                    : parallel.currentItem;
            case "totalBranches":
                return parallel.totalBranches;
            default:
                return undefined;
        }
    }

    private getNestedValue(obj: any, path: string[]): JsonValue {
        let current = obj;
        for (const part of path) {
            if (current === null || current === undefined) return undefined;

            // Handle array access like "items[0]" or "[0]"
            const arrayMatch = part.match(/^(\w*)\[(\d+)\]$/);
            if (arrayMatch) {
                const [, key, index] = arrayMatch;
                if (key) {
                    current = current[key]?.[parseInt(index)];
                } else {
                    current = current[parseInt(index)];
                }
            } else {
                current = current[part];
            }
        }
        return current;
    }

    // Resolve all variables in an object recursively
    resolveObject(obj: JsonObject): JsonObject {
        const resolved: JsonObject = {};

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === "string") {
                resolved[key] = this.resolve(value);
            } else if (Array.isArray(value)) {
                resolved[key] = value.map((item) =>
                    typeof item === "string"
                        ? this.resolve(item)
                        : typeof item === "object" && item !== null
                          ? this.resolveObject(item as JsonObject)
                          : item
                );
            } else if (typeof value === "object" && value !== null) {
                resolved[key] = this.resolveObject(value as JsonObject);
            } else {
                resolved[key] = value;
            }
        }

        return resolved;
    }
}
```

### Variable Syntax Reference

```
{{nodeId.path.to.value}}        - Node output access
{{nodeId.data[0].name}}         - Array access in node output
{{inputs.fieldName}}            - Workflow input
{{var.myVariable}}              - Workflow variable
{{env.API_KEY}}                 - Environment variable

{{loop.index}}                  - Current loop iteration (0-based)
{{loop.iteration}}              - Current loop iteration (1-based)
{{loop.item}}                   - Current loop item
{{loop.item.name}}              - Nested access in loop item
{{loop.total}}                  - Total iterations
{{loop.isFirst}}                - Boolean: is first iteration
{{loop.isLast}}                 - Boolean: is last iteration

{{parallel.index}}              - Parallel branch index (0-based)
{{parallel.branchId}}           - Unique branch identifier
{{parallel.currentItem}}        - Current item (collection mode)
{{parallel.totalBranches}}      - Total number of branches
```

---

## Pattern 7: Reliable Event Delivery with Realtime

**Problem Solved:** Redis pub/sub events are fire-and-forget.

**Trigger.dev Solution:** Built-in Realtime API replaces custom Redis implementation.

### Event Types

```typescript
// backend/src/trigger/shared/streaming/event-types.ts
type ExecutionEvent =
    | { type: "execution:started"; executionId: string; workflowId: string; totalNodes: number }
    | { type: "execution:completed"; executionId: string; outputs: JsonObject; duration: number }
    | { type: "execution:paused"; executionId: string; nodeId: string; reason: string }
    | { type: "execution:resumed"; executionId: string; nodeId: string }
    | { type: "execution:failed"; executionId: string; error: string; failedNode?: string }
    | { type: "batch:started"; executionId: string; batchIndex: number; nodeIds: string[] }
    | { type: "batch:completed"; executionId: string; batchIndex: number }
    | { type: "node:started"; executionId: string; nodeId: string; nodeType: string }
    | {
          type: "node:completed";
          executionId: string;
          nodeId: string;
          output: JsonObject;
          duration: number;
      }
    | {
          type: "node:failed";
          executionId: string;
          nodeId: string;
          error: string;
          errorRouted?: boolean;
      }
    | { type: "node:skipped"; executionId: string; nodeId: string; reason: string }
    | {
          type: "stream:chunk";
          executionId: string;
          nodeId: string;
          streamId: string;
          content: string;
      }
    | { type: "stream:done"; executionId: string; nodeId: string; streamId: string };
```

### LLM Streaming with Trigger.dev

```typescript
// backend/src/trigger/node-handlers/llm-handler.ts
import { streams, metadata } from "@trigger.dev/sdk/v3";
import OpenAI from "openai";

export class LLMHandler implements NodeHandler {
    private openai = new OpenAI();

    canHandle(nodeType: string): boolean {
        return ["llm", "openai", "anthropic", "gemini"].includes(nodeType);
    }

    async execute(input: HandlerInput): Promise<NodeOutput> {
        const { config, context, executionContext } = input;
        const resolver = new VariableResolver(context);

        // Resolve messages with variables
        const messages = resolver.resolveObject(config.messages);

        await metadata.set("nodeStatus", "streaming");

        // Create streaming completion
        const response = await this.openai.chat.completions.create({
            model: config.model || "gpt-4",
            messages: messages as any,
            stream: true,
            ...config.options
        });

        // Pipe stream to Trigger.dev Realtime
        // Frontend can subscribe to this stream directly
        const streamId = `llm-${config.id}-${Date.now()}`;
        const stream = await streams.pipe(streamId, response);

        await metadata.set("nodeStatus", "completed");

        return {
            nodeId: config.id,
            success: true,
            data: {
                text: stream.text,
                model: config.model,
                streamId
            },
            tokenUsage: {
                input: stream.usage?.prompt_tokens || 0,
                output: stream.usage?.completion_tokens || 0,
                model: config.model
            }
        };
    }
}
```

### Frontend Realtime Hook

```typescript
// frontend/src/hooks/useWorkflowExecution.ts
import { useRealtimeRunWithStreams } from "@trigger.dev/react-hooks";

interface UseWorkflowExecutionOptions {
    onNodeCompleted?: (nodeId: string, output: JsonObject) => void;
    onStreamChunk?: (nodeId: string, content: string) => void;
}

export function useWorkflowExecution(
    runId: string | null,
    publicToken: string | null,
    options?: UseWorkflowExecutionOptions
) {
    const { run, streams, error } = useRealtimeRunWithStreams(runId || "", {
        accessToken: publicToken || "",
        enabled: !!runId && !!publicToken
    });

    // Extract execution metadata
    const executionMetadata = run?.metadata as ExecutionMetadata | undefined;

    // Find LLM streams
    const llmStreams = useMemo(() => {
        const result: Record<string, string> = {};
        for (const [key, stream] of Object.entries(streams)) {
            if (key.startsWith("llm-")) {
                result[key] = stream?.text || "";
            }
        }
        return result;
    }, [streams]);

    // Notify on completion
    useEffect(() => {
        if (options?.onNodeCompleted && executionMetadata?.completedNodes) {
            // Track newly completed nodes
        }
    }, [executionMetadata?.completedNodes]);

    return {
        // Status
        status: executionMetadata?.status || "unknown",
        isRunning: run?.status === "EXECUTING",
        isPaused: executionMetadata?.status === "paused",
        isComplete: run?.status === "COMPLETED",
        isFailed: run?.status === "FAILED",

        // Progress
        totalNodes: executionMetadata?.totalNodes || 0,
        completedNodes: executionMetadata?.completedNodes || [],
        currentBatch: executionMetadata?.currentBatch,
        batchNodes: executionMetadata?.batchNodes || [],

        // Pause info
        pausedAt: executionMetadata?.pausedAt,
        pauseReason: executionMetadata?.pauseReason,
        waitpointId: executionMetadata?.waitpointId,

        // Streams
        llmStreams,

        // Output
        output: run?.output,

        // Error
        error: error || (run?.status === "FAILED" ? run.error : null)
    };
}
```

### Execution Stream Component

```typescript
// frontend/src/components/execution/ExecutionStream.tsx
import { useWorkflowExecution } from "../../hooks/useWorkflowExecution";

interface ExecutionStreamProps {
    runId: string;
    publicToken: string;
    onComplete?: (output: JsonObject) => void;
}

export function ExecutionStream({ runId, publicToken, onComplete }: ExecutionStreamProps) {
    const {
        status,
        isRunning,
        isPaused,
        isComplete,
        totalNodes,
        completedNodes,
        llmStreams,
        pauseReason,
        output
    } = useWorkflowExecution(runId, publicToken);

    useEffect(() => {
        if (isComplete && output && onComplete) {
            onComplete(output);
        }
    }, [isComplete, output]);

    return (
        <div className="execution-stream">
            <div className="status-bar">
                <span className={`status status-${status}`}>{status}</span>
                <span className="progress">
                    {completedNodes.length} / {totalNodes} nodes
                </span>
            </div>

            {isPaused && (
                <div className="pause-banner">
                    <p>Workflow paused: {pauseReason}</p>
                    <ResumeForm executionId={runId} />
                </div>
            )}

            <div className="node-list">
                {completedNodes.map((nodeId) => (
                    <div key={nodeId} className="node-item completed">
                        ✓ {nodeId}
                    </div>
                ))}
            </div>

            {Object.entries(llmStreams).map(([streamId, text]) => (
                <div key={streamId} className="llm-stream">
                    <h4>{streamId}</h4>
                    <p className="streaming-text">{text}</p>
                </div>
            ))}
        </div>
    );
}
```

---

## Pattern 8: Node Handler Registry

**Problem Solved:** Switch statement with 15+ cases for node execution.

**SIM Solution:** Pluggable handler registry with signal-based returns.

### Handler Interface

```typescript
// backend/src/trigger/node-handlers/types.ts
interface NodeHandler {
    canHandle(nodeType: string): boolean;
    execute(input: HandlerInput): Promise<NodeOutput>;
}

interface HandlerInput {
    config: NodeConfig;
    context: ResolutionContext;
    executionContext: ExecutionContext;
}

interface ExecutionContext {
    executionId: string;
    workflowId: string;
    userId: string;
    runId: string;
}

interface NodeConfig {
    id: string;
    type: string;
    [key: string]: JsonValue;
}
```

### Handler Registry

```typescript
// backend/src/trigger/node-handlers/registry.ts
import { LLMHandler } from "./llm-handler";
import { HTTPHandler } from "./http-handler";
import { TransformHandler } from "./transform-handler";
import { LogicHandler } from "./logic-handler";
import { IntegrationHandler } from "./integration-handler";
import { ControlFlowHandler } from "./control-flow-handler";
import { PauseHandler } from "./pause-handler";
import { GenericHandler } from "./generic-handler";

class NodeHandlerRegistry {
    private handlers: NodeHandler[] = [];
    private genericHandler = new GenericHandler();

    constructor() {
        // Register handlers in priority order
        this.register(new LLMHandler());
        this.register(new HTTPHandler());
        this.register(new TransformHandler());
        this.register(new LogicHandler());
        this.register(new IntegrationHandler());
        this.register(new ControlFlowHandler());
        this.register(new PauseHandler());
    }

    register(handler: NodeHandler): void {
        this.handlers.push(handler);
    }

    getHandler(nodeType: string): NodeHandler {
        for (const handler of this.handlers) {
            if (handler.canHandle(nodeType)) {
                return handler;
            }
        }
        return this.genericHandler;
    }
}

// Singleton instance
export const handlerRegistry = new NodeHandlerRegistry();

export function getHandler(nodeType: string): NodeHandler {
    return handlerRegistry.getHandler(nodeType);
}
```

### Handler Implementations

```typescript
// backend/src/trigger/node-handlers/http-handler.ts
export class HTTPHandler extends BaseNodeHandler {
    canHandle(nodeType: string): boolean {
        return ["http", "webhook", "api_call", "rest"].includes(nodeType);
    }

    async execute(input: HandlerInput): Promise<NodeOutput> {
        return this.safeExecute(input, async () => {
            const { config, context } = input;
            const resolver = new VariableResolver(context);

            const url = resolver.resolve(config.url) as string;
            const method = config.method || "GET";
            const headers = resolver.resolveObject(config.headers || {});
            const body = config.body ? resolver.resolveObject(config.body) : undefined;

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    ...headers
                },
                body: body ? JSON.stringify(body) : undefined
            });

            const responseData = await response.json().catch(() => response.text());

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return {
                status: response.status,
                headers: Object.fromEntries(response.headers),
                data: responseData
            };
        });
    }
}

// backend/src/trigger/node-handlers/transform-handler.ts
export class TransformHandler extends BaseNodeHandler {
    canHandle(nodeType: string): boolean {
        return ["transform", "jsonata", "javascript", "map", "filter", "reduce"].includes(nodeType);
    }

    async execute(input: HandlerInput): Promise<NodeOutput> {
        return this.safeExecute(input, async () => {
            const { config, context } = input;
            const resolver = new VariableResolver(context);

            switch (config.type) {
                case "jsonata": {
                    const jsonata = require("jsonata");
                    const expression = jsonata(config.expression);
                    const inputData = resolver.resolve(config.input);
                    return { result: await expression.evaluate(inputData) };
                }

                case "javascript": {
                    // Run in isolated context
                    const fn = new Function("data", "context", config.code);
                    const inputData = resolver.resolve(config.input);
                    return { result: fn(inputData, context) };
                }

                case "map": {
                    const array = resolver.resolve(config.input) as any[];
                    const mapped = array.map((item, index) => {
                        const itemResolver = new VariableResolver({
                            ...context,
                            loop: {
                                index,
                                iteration: index + 1,
                                item,
                                total: array.length,
                                isFirst: index === 0,
                                isLast: index === array.length - 1
                            }
                        });
                        return itemResolver.resolveObject(config.mapping);
                    });
                    return { result: mapped };
                }

                default:
                    throw new Error(`Unknown transform type: ${config.type}`);
            }
        });
    }
}

// backend/src/trigger/node-handlers/logic-handler.ts
export class LogicHandler extends BaseNodeHandler {
    canHandle(nodeType: string): boolean {
        return ["condition", "router", "switch", "branch"].includes(nodeType);
    }

    async execute(input: HandlerInput): Promise<NodeOutput> {
        return this.safeExecute(input, async () => {
            const { config, context } = input;
            const resolver = new VariableResolver(context);

            switch (config.type) {
                case "condition": {
                    const value = resolver.resolve(config.condition);
                    const result = Boolean(value);
                    return {
                        result,
                        signals: {
                            selectedRoute: result ? "true" : "false"
                        }
                    };
                }

                case "router": {
                    // Evaluate each route condition
                    for (const route of config.routes) {
                        const matches = this.evaluateCondition(
                            resolver.resolve(route.field),
                            route.operator,
                            resolver.resolve(route.value)
                        );
                        if (matches) {
                            return {
                                selectedRoute: route.name,
                                signals: { selectedRoute: route.name }
                            };
                        }
                    }
                    // Default route
                    return {
                        selectedRoute: config.defaultRoute || "default",
                        signals: { selectedRoute: config.defaultRoute || "default" }
                    };
                }

                default:
                    throw new Error(`Unknown logic type: ${config.type}`);
            }
        });
    }

    private evaluateCondition(value: any, operator: string, compareValue: any): boolean {
        switch (operator) {
            case "equals":
                return value === compareValue;
            case "notEquals":
                return value !== compareValue;
            case "contains":
                return String(value).includes(String(compareValue));
            case "greaterThan":
                return value > compareValue;
            case "lessThan":
                return value < compareValue;
            case "isEmpty":
                return !value || (Array.isArray(value) && value.length === 0);
            case "isNotEmpty":
                return !!value && (!Array.isArray(value) || value.length > 0);
            default:
                return false;
        }
    }
}
```

---

## Node Executor Task

The central task that uses the handler registry:

```typescript
// backend/src/trigger/tasks/node-executor.ts
import { task, metadata, streams } from "@trigger.dev/sdk/v3";
import { getHandler } from "../node-handlers/registry";
import { VariableResolver } from "../shared/variable-resolver";
import { createNodeLogger } from "../shared/logging/node-logger";

export const executeNode = task({
    id: "execute-node",
    retry: {
        maxAttempts: 3,
        factor: 2,
        minTimeoutInMs: 1000,
        maxTimeoutInMs: 30000
    },
    run: async (payload: NodeExecutionPayload) => {
        const { nodeId, config, context, executionId } = payload;
        const logger = createNodeLogger(executionId, nodeId);

        // Update metadata for realtime
        await metadata.set("currentNode", nodeId);
        await metadata.set("nodeType", config.type);
        await metadata.set("nodeStatus", "executing");

        const startTime = Date.now();

        // Get appropriate handler
        const handler = getHandler(config.type);

        logger.info({ handler: handler.constructor.name }, "Executing node");

        // Build resolution context
        const resolutionContext: ResolutionContext = {
            nodeOutputs: new Map(Object.entries(context.nodeOutputs || {})),
            workflowVariables: new Map(Object.entries(context.workflowVariables || {})),
            inputs: context.inputs,
            environmentVariables: new Map(Object.entries(process.env)),
            loop: context.loopContext,
            parallel: context.parallelContext
        };

        // Execute handler
        const result = await handler.execute({
            config,
            context: resolutionContext,
            executionContext: {
                executionId,
                workflowId: context.workflowId,
                userId: context.userId,
                runId: context.runId
            }
        });

        const duration = Date.now() - startTime;

        // Log node execution
        await logger.logNodeExecution({
            input: config,
            output: result.data,
            success: result.success,
            error: result.error?.message,
            duration,
            tokenUsage: result.tokenUsage
        });

        // Update metadata
        await metadata.set("nodeStatus", result.success ? "completed" : "failed");
        await metadata.set("nodeDuration", duration);

        return {
            ...result,
            duration
        };
    }
});
```

---

## Implementation Plan

### Phase 1: Infrastructure & Core Types (CRITICAL)

| Task                  | Files                                 | Effort |
| --------------------- | ------------------------------------- | ------ |
| Add Trigger.dev SDK   | `backend/package.json`                | S      |
| Trigger.dev config    | `backend/trigger.config.ts`           | S      |
| Docker Compose update | `docker-compose.yml`                  | M      |
| Core types            | `backend/src/trigger/shared/types.ts` | M      |
| Node output types     | `shared/src/types/workflow.ts`        | S      |

### Phase 2: Workflow Builder (CRITICAL)

| Task                 | Files                                                      | Effort |
| -------------------- | ---------------------------------------------------------- | ------ |
| ExecutableNode types | `backend/src/trigger/workflow-builder/types.ts`            | S      |
| Path Constructor     | `backend/src/trigger/workflow-builder/path-constructor.ts` | M      |
| Loop Constructor     | `backend/src/trigger/workflow-builder/loop-constructor.ts` | M      |
| Node Constructor     | `backend/src/trigger/workflow-builder/node-constructor.ts` | M      |
| Edge Constructor     | `backend/src/trigger/workflow-builder/edge-constructor.ts` | M      |
| Builder              | `backend/src/trigger/workflow-builder/builder.ts`          | M      |

### Phase 3: Execution Engine (CRITICAL)

| Task                   | Files                                             | Effort |
| ---------------------- | ------------------------------------------------- | ------ |
| Execution Queue        | `backend/src/trigger/shared/execution-queue.ts`   | M      |
| Context Manager        | `backend/src/trigger/shared/context-manager.ts`   | M      |
| Variable Resolver      | `backend/src/trigger/shared/variable-resolver.ts` | M      |
| Workflow Executor Task | `backend/src/trigger/tasks/workflow-executor.ts`  | L      |
| Node Executor Task     | `backend/src/trigger/tasks/node-executor.ts`      | M      |

### Phase 4: Node Handlers (HIGH)

| Task                | Files                                                      | Effort |
| ------------------- | ---------------------------------------------------------- | ------ |
| Handler Interface   | `backend/src/trigger/node-handlers/types.ts`               | S      |
| Handler Registry    | `backend/src/trigger/node-handlers/registry.ts`            | M      |
| Base Handler        | `backend/src/trigger/node-handlers/base-handler.ts`        | M      |
| LLM Handler         | `backend/src/trigger/node-handlers/llm-handler.ts`         | L      |
| HTTP Handler        | `backend/src/trigger/node-handlers/http-handler.ts`        | M      |
| Transform Handler   | `backend/src/trigger/node-handlers/transform-handler.ts`   | M      |
| Logic Handler       | `backend/src/trigger/node-handlers/logic-handler.ts`       | M      |
| Integration Handler | `backend/src/trigger/node-handlers/integration-handler.ts` | L      |
| Pause Handler       | `backend/src/trigger/node-handlers/pause-handler.ts`       | M      |
| Generic Handler     | `backend/src/trigger/node-handlers/generic-handler.ts`     | S      |

### Phase 5: Snapshots & Pause/Resume (HIGH)

| Task             | Files                                            | Effort |
| ---------------- | ------------------------------------------------ | ------ |
| Snapshot Types   | `backend/src/trigger/shared/snapshot/types.ts`   | S      |
| Snapshot Storage | `backend/src/trigger/shared/snapshot/storage.ts` | M      |
| DB Migration     | `backend/src/storage/migrations/`                | S      |
| Resume API       | `backend/src/api/routes/executions/resume.ts`    | M      |

### Phase 6: API & Frontend Integration (HIGH)

| Task             | Files                                                   | Effort |
| ---------------- | ------------------------------------------------------- | ------ |
| Execute API      | `backend/src/api/routes/workflows/execute.ts`           | M      |
| Frontend Hook    | `frontend/src/hooks/useWorkflowExecution.ts`            | M      |
| Execution Stream | `frontend/src/components/execution/ExecutionStream.tsx` | M      |
| Error Port UI    | `frontend/src/components/canvas/`                       | M      |

### Phase 7: Loop & Parallel Orchestrators (MEDIUM)

| Task                  | Files                                                        | Effort |
| --------------------- | ------------------------------------------------------------ | ------ |
| Loop Orchestrator     | `backend/src/trigger/orchestrators/loop-orchestrator.ts`     | L      |
| Parallel Orchestrator | `backend/src/trigger/orchestrators/parallel-orchestrator.ts` | L      |

### Phase 8: Migration & Cleanup (FINAL)

| Task                | Files                                   | Effort |
| ------------------- | --------------------------------------- | ------ |
| Migration script    | `backend/scripts/migrate-to-trigger.ts` | M      |
| Remove Temporal     | `backend/src/temporal/`                 | M      |
| Update docs         | `.docs/`                                | M      |
| Comprehensive tests | `backend/tests/`                        | L      |

---

## Priority Summary

| Priority    | Phase | What             | Why                               |
| ----------- | ----- | ---------------- | --------------------------------- |
| 🔴 CRITICAL | 1     | Infrastructure   | Foundation for everything         |
| 🔴 CRITICAL | 2     | Workflow Builder | 4-stage pipeline enables parallel |
| 🔴 CRITICAL | 3     | Execution Engine | Core task execution               |
| 🟠 HIGH     | 4     | Node Handlers    | Pluggable node types              |
| 🟠 HIGH     | 5     | Snapshots        | Pause/resume capability           |
| 🟠 HIGH     | 6     | API & Frontend   | User-facing features              |
| 🟡 MEDIUM   | 7     | Loop/Parallel    | Advanced control flow             |
| ⚪ FINAL    | 8     | Migration        | Remove Temporal                   |

---

## Files Summary

```
backend/src/trigger/
├── trigger.config.ts              # Trigger.dev configuration
├── tasks/
│   ├── workflow-executor.ts       # Main orchestration task
│   └── node-executor.ts           # Individual node execution
├── workflow-builder/              # 4-stage construction pipeline
│   ├── types.ts
│   ├── path-constructor.ts
│   ├── loop-constructor.ts
│   ├── node-constructor.ts
│   ├── edge-constructor.ts
│   └── builder.ts
├── node-handlers/                 # Pluggable node handlers
│   ├── types.ts
│   ├── registry.ts
│   ├── base-handler.ts
│   ├── llm-handler.ts
│   ├── http-handler.ts
│   ├── transform-handler.ts
│   ├── logic-handler.ts
│   ├── integration-handler.ts
│   ├── control-flow-handler.ts
│   ├── pause-handler.ts
│   └── generic-handler.ts
├── shared/
│   ├── types.ts
│   ├── execution-queue.ts
│   ├── context-manager.ts
│   ├── variable-resolver.ts
│   ├── snapshot/
│   │   ├── types.ts
│   │   └── storage.ts
│   ├── logging/
│   │   ├── types.ts
│   │   └── node-logger.ts
│   └── streaming/
│       └── event-types.ts
└── orchestrators/
    ├── loop-orchestrator.ts
    └── parallel-orchestrator.ts

frontend/src/
├── hooks/
│   └── useWorkflowExecution.ts    # Trigger.dev realtime hook
└── components/execution/
    └── ExecutionStream.tsx        # Realtime execution UI
```

---

## Success Criteria

1. **Performance**: 2-10x faster via parallel batch execution
2. **Reliability**: Checkpoint-restore durability + snapshot persistence
3. **Flexibility**: Error-as-routing, pause/resume, loop/parallel primitives
4. **Streaming**: Native LLM streaming via Trigger.dev Realtime
5. **Maintainability**: New node types via handler registry without core changes
6. **Developer Experience**: TypeScript-native, no determinism constraints
7. **Infrastructure**: Simpler deployment (single supervisor vs Temporal cluster)

---

## Comparison: All Three Approaches

| Aspect                | Enhanced Temporal | Trigger.dev Migration | SIM + Trigger.dev (This Doc) |
| --------------------- | ----------------- | --------------------- | ---------------------------- |
| **Platform**          | Temporal          | Trigger.dev           | Trigger.dev                  |
| **Architecture**      | SIM patterns      | Basic tasks           | SIM patterns                 |
| **Parallel Exec**     | Promise.all       | batchTriggerAndWait   | batchTriggerAndWait          |
| **Error Routing**     | ✅                | ❌                    | ✅                           |
| **4-Stage Builder**   | ✅                | ❌                    | ✅                           |
| **Context Pruning**   | ✅                | ❌                    | ✅                           |
| **Variable Resolver** | ✅                | Basic                 | ✅                           |
| **Streaming**         | Custom SSE        | Native Realtime       | Native Realtime              |
| **Infrastructure**    | Complex           | Simple                | Simple                       |
| **Determinism**       | Required          | Not required          | Not required                 |

**Recommendation**: This document (SIM + Trigger.dev) provides the best of both worlds - SIM's proven architectural patterns with Trigger.dev's simpler, more modern platform.
