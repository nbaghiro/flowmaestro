/**
 * Snapshot Management Tests
 *
 * Tests for workflow snapshot creation, validation, serialization, and restoration.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import {
    createSnapshot,
    validateSnapshot,
    serializeSnapshot,
    deserializeSnapshot,
    restoreQueueState,
    restoreContextSnapshot,
    restoreLoopStates,
    getSnapshotTypeDescription,
    SNAPSHOT_SCHEMA_VERSION,
    type WorkflowSnapshot,
    type SnapshotNodeState,
    type WorkflowSnapshotRecord
} from "../snapshot";
import type {
    ExecutionQueueState,
    LoopIterationState,
    ParallelBranchState,
    ContextSnapshot,
    NodeExecutionState
} from "../../types";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createTestQueueState(
    states: Array<{ id: string; status: SnapshotNodeState["status"]; output?: JsonObject }>
): ExecutionQueueState {
    const pending = new Set<string>();
    const ready = new Set<string>();
    const executing = new Set<string>();
    const completed = new Set<string>();
    const failed = new Set<string>();
    const skipped = new Set<string>();
    const nodeStates = new Map<string, NodeExecutionState>();

    for (const { id, status, output } of states) {
        nodeStates.set(id, {
            nodeId: id,
            status,
            retryCount: 0,
            output: output as JsonObject | undefined,
            startedAt: status !== "pending" ? Date.now() - 1000 : undefined,
            completedAt: status === "completed" || status === "failed" ? Date.now() : undefined
        });

        switch (status) {
            case "completed":
                completed.add(id);
                break;
            case "pending":
                pending.add(id);
                break;
            case "ready":
                ready.add(id);
                break;
            case "executing":
                executing.add(id);
                break;
            case "failed":
                failed.add(id);
                break;
            case "skipped":
                skipped.add(id);
                break;
        }
    }

    return { pending, ready, executing, completed, failed, skipped, nodeStates };
}

function createTestContext(
    nodeOutputs: Record<string, JsonObject> = {},
    workflowVars: Record<string, JsonValue> = {}
): ContextSnapshot {
    const outputs = new Map<string, JsonObject>();
    for (const [k, v] of Object.entries(nodeOutputs)) {
        outputs.set(k, v);
    }

    const vars = new Map<string, JsonValue>();
    for (const [k, v] of Object.entries(workflowVars)) {
        vars.set(k, v);
    }

    return {
        nodeOutputs: outputs,
        workflowVariables: vars,
        sharedMemory: {
            entries: new Map(),
            config: {
                maxEntries: 100,
                maxValueSizeBytes: 100000,
                maxTotalSizeBytes: 1000000,
                embeddingModel: "text-embedding-3-small",
                embeddingDimensions: 1536,
                enableSemanticSearch: false
            },
            metadata: { totalSizeBytes: 0, entryCount: 0, createdAt: Date.now() }
        },
        inputs: { input1: "value1" },
        metadata: { totalSizeBytes: 0, nodeCount: outputs.size, createdAt: Date.now() }
    };
}

function createTestLoopStates(): Map<string, LoopIterationState> {
    const states = new Map<string, LoopIterationState>();
    states.set("loop-1", {
        index: 2,
        total: 5,
        item: "current-item",
        results: ["result-0", "result-1"]
    });
    return states;
}

function createTestParallelStates(): Map<string, ParallelBranchState> {
    const states = new Map<string, ParallelBranchState>();
    states.set("parallel-1-branch-0", {
        branchId: "parallel-1-branch-0",
        index: 0,
        currentItem: "item-0"
    });
    return states;
}

// ============================================================================
// TESTS
// ============================================================================

describe("Snapshot Management", () => {
    describe("createSnapshot", () => {
        it("should create snapshot with basic properties", () => {
            const queueState = createTestQueueState([
                { id: "node-1", status: "completed", output: { result: "done" } },
                { id: "node-2", status: "pending" }
            ]);
            const context = createTestContext({ "node-1": { result: "done" } });
            const loopStates = new Map<string, LoopIterationState>();
            const parallelStates = new Map<string, ParallelBranchState>();

            const snapshot = createSnapshot(
                "exec-123",
                "workflow-456",
                "user-789",
                queueState,
                context,
                loopStates,
                parallelStates,
                { type: "checkpoint" }
            );

            expect(snapshot.id).toBeDefined();
            expect(snapshot.executionId).toBe("exec-123");
            expect(snapshot.workflowId).toBe("workflow-456");
            expect(snapshot.userId).toBe("user-789");
            expect(snapshot.snapshotType).toBe("checkpoint");
            expect(snapshot.schemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION);
        });

        it("should categorize nodes by status", () => {
            const queueState = createTestQueueState([
                { id: "node-1", status: "completed" },
                { id: "node-2", status: "pending" },
                { id: "node-3", status: "ready" },
                { id: "node-4", status: "executing" },
                { id: "node-5", status: "failed" },
                { id: "node-6", status: "skipped" }
            ]);
            const context = createTestContext();

            const snapshot = createSnapshot(
                "exec-123",
                "workflow-456",
                "user-789",
                queueState,
                context,
                new Map(),
                new Map(),
                { type: "checkpoint" }
            );

            expect(snapshot.completedNodes).toHaveLength(1);
            expect(snapshot.pendingNodes).toHaveLength(2); // pending + ready
            expect(snapshot.executingNodes).toHaveLength(1);
            expect(snapshot.failedNodes).toHaveLength(1);
            expect(snapshot.skippedNodes).toHaveLength(1);
        });

        it("should capture node outputs", () => {
            const queueState = createTestQueueState([
                { id: "node-1", status: "completed", output: { result: "value1" } }
            ]);
            const context = createTestContext({ "node-1": { result: "value1" } });

            const snapshot = createSnapshot(
                "exec-123",
                "workflow-456",
                "user-789",
                queueState,
                context,
                new Map(),
                new Map(),
                { type: "checkpoint" }
            );

            expect(snapshot.nodeOutputs["node-1"]).toEqual({ result: "value1" });
        });

        it("should capture workflow variables", () => {
            const context = createTestContext({}, { counter: 42, name: "test" });

            const snapshot = createSnapshot(
                "exec-123",
                "workflow-456",
                "user-789",
                createTestQueueState([]),
                context,
                new Map(),
                new Map(),
                { type: "checkpoint" }
            );

            expect(snapshot.workflowVariables).toEqual({ counter: 42, name: "test" });
        });

        it("should capture loop states", () => {
            const loopStates = createTestLoopStates();

            const snapshot = createSnapshot(
                "exec-123",
                "workflow-456",
                "user-789",
                createTestQueueState([]),
                createTestContext(),
                loopStates,
                new Map(),
                { type: "checkpoint" }
            );

            expect(snapshot.loopStates).toHaveLength(1);
            expect(snapshot.loopStates[0].loopNodeId).toBe("loop-1");
            expect(snapshot.loopStates[0].currentIndex).toBe(2);
            expect(snapshot.loopStates[0].totalItems).toBe(5);
            expect(snapshot.loopStates[0].accumulatedResults).toEqual(["result-0", "result-1"]);
        });

        it("should capture parallel states", () => {
            const parallelStates = createTestParallelStates();

            const snapshot = createSnapshot(
                "exec-123",
                "workflow-456",
                "user-789",
                createTestQueueState([]),
                createTestContext(),
                new Map(),
                parallelStates,
                { type: "checkpoint" }
            );

            expect(snapshot.parallelStates).toHaveLength(1);
            expect(snapshot.parallelStates[0].branchId).toBe("parallel-1-branch-0");
        });

        it("should include pause context for pause snapshots", () => {
            const pauseContext = {
                reason: "Human review required",
                pausedAtNodeId: "node-review",
                pausedAt: Date.now(),
                resumeTrigger: "manual" as const
            };

            const snapshot = createSnapshot(
                "exec-123",
                "workflow-456",
                "user-789",
                createTestQueueState([]),
                createTestContext(),
                new Map(),
                new Map(),
                { type: "pause", pauseContext }
            );

            expect(snapshot.snapshotType).toBe("pause");
            expect(snapshot.pauseContext).toEqual(pauseContext);
        });

        it("should calculate progress correctly", () => {
            const queueState = createTestQueueState([
                { id: "node-1", status: "completed" },
                { id: "node-2", status: "completed" },
                { id: "node-3", status: "failed" },
                { id: "node-4", status: "pending" }
            ]);

            const snapshot = createSnapshot(
                "exec-123",
                "workflow-456",
                "user-789",
                queueState,
                createTestContext(),
                new Map(),
                new Map(),
                { type: "checkpoint" }
            );

            // 3 processed (2 completed + 1 failed) out of 4 total = 75%
            expect(snapshot.progress).toBe(75);
        });

        it("should handle 0% progress", () => {
            const queueState = createTestQueueState([
                { id: "node-1", status: "pending" },
                { id: "node-2", status: "pending" }
            ]);

            const snapshot = createSnapshot(
                "exec-123",
                "workflow-456",
                "user-789",
                queueState,
                createTestContext(),
                new Map(),
                new Map(),
                { type: "checkpoint" }
            );

            expect(snapshot.progress).toBe(0);
        });

        it("should handle 100% progress", () => {
            const queueState = createTestQueueState([
                { id: "node-1", status: "completed" },
                { id: "node-2", status: "completed" }
            ]);

            const snapshot = createSnapshot(
                "exec-123",
                "workflow-456",
                "user-789",
                queueState,
                createTestContext(),
                new Map(),
                new Map(),
                { type: "checkpoint" }
            );

            expect(snapshot.progress).toBe(100);
        });

        it("should estimate snapshot size", () => {
            const context = createTestContext({ node: { data: "x".repeat(1000) } });

            const snapshot = createSnapshot(
                "exec-123",
                "workflow-456",
                "user-789",
                createTestQueueState([]),
                context,
                new Map(),
                new Map(),
                { type: "checkpoint" }
            );

            expect(snapshot.totalSizeBytes).toBeGreaterThan(2000); // 2 bytes per char
        });
    });

    describe("validateSnapshot", () => {
        function createValidSnapshot(): WorkflowSnapshot {
            return {
                id: "snap-123",
                executionId: "exec-123",
                workflowId: "workflow-456",
                userId: "user-789",
                snapshotType: "checkpoint",
                schemaVersion: SNAPSHOT_SCHEMA_VERSION,
                completedNodes: [],
                pendingNodes: [],
                executingNodes: [],
                failedNodes: [],
                skippedNodes: [],
                nodeOutputs: {},
                workflowVariables: {},
                inputs: {},
                loopStates: [],
                parallelStates: [],
                createdAt: Date.now(),
                progress: 0,
                totalSizeBytes: 0
            };
        }

        it("should validate a correct snapshot", () => {
            const snapshot = createValidSnapshot();
            const result = validateSnapshot(snapshot);
            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
        });

        it("should detect missing snapshot ID", () => {
            const snapshot = createValidSnapshot();
            snapshot.id = "";
            const result = validateSnapshot(snapshot);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Missing snapshot ID");
        });

        it("should detect missing execution ID", () => {
            const snapshot = createValidSnapshot();
            snapshot.executionId = "";
            const result = validateSnapshot(snapshot);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Missing execution ID");
        });

        it("should detect missing workflow ID", () => {
            const snapshot = createValidSnapshot();
            snapshot.workflowId = "";
            const result = validateSnapshot(snapshot);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Missing workflow ID");
        });

        it("should detect missing user ID", () => {
            const snapshot = createValidSnapshot();
            snapshot.userId = "";
            const result = validateSnapshot(snapshot);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Missing user ID");
        });

        it("should error on newer schema version", () => {
            const snapshot = createValidSnapshot();
            snapshot.schemaVersion = SNAPSHOT_SCHEMA_VERSION + 1;
            const result = validateSnapshot(snapshot);
            expect(result.valid).toBe(false);
            expect(result.errors?.[0]).toContain("newer than supported");
        });

        it("should warn on older schema version", () => {
            const snapshot = createValidSnapshot();
            snapshot.schemaVersion = 0;
            const result = validateSnapshot(snapshot);
            expect(result.valid).toBe(true); // Still valid, just a warning
            expect(result.warnings?.[0]).toContain("older than current");
        });

        it("should warn if pause snapshot missing pause context", () => {
            const snapshot = createValidSnapshot();
            snapshot.snapshotType = "pause";
            const result = validateSnapshot(snapshot);
            expect(result.valid).toBe(true);
            expect(result.warnings).toContain("Pause snapshot missing pauseContext");
        });

        it("should validate arrays are arrays", () => {
            const snapshot = createValidSnapshot();
            (snapshot as unknown as { completedNodes: string }).completedNodes = "not an array";
            const result = validateSnapshot(snapshot);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("completedNodes must be an array");
        });
    });

    describe("serializeSnapshot / deserializeSnapshot", () => {
        it("should serialize snapshot to database record format", () => {
            const snapshot: WorkflowSnapshot = {
                id: "snap-123",
                executionId: "exec-456",
                workflowId: "workflow-789",
                userId: "user-000",
                snapshotType: "checkpoint",
                schemaVersion: 1,
                completedNodes: [{ nodeId: "n1", status: "completed", retryCount: 0 }],
                pendingNodes: [],
                executingNodes: [],
                failedNodes: [],
                skippedNodes: [],
                nodeOutputs: { n1: { result: "done" } },
                workflowVariables: { counter: 5 },
                inputs: { input: "value" },
                loopStates: [],
                parallelStates: [],
                createdAt: 1700000000000,
                progress: 50,
                totalSizeBytes: 1024
            };

            const record = serializeSnapshot(snapshot);

            expect(record.id).toBe("snap-123");
            expect(record.execution_id).toBe("exec-456");
            expect(record.workflow_id).toBe("workflow-789");
            expect(record.user_id).toBe("user-000");
            expect(record.snapshot_type).toBe("checkpoint");
            expect(record.schema_version).toBe(1);
            expect(JSON.parse(record.completed_nodes)).toEqual([
                { nodeId: "n1", status: "completed", retryCount: 0 }
            ]);
            expect(JSON.parse(record.node_outputs)).toEqual({ n1: { result: "done" } });
            expect(JSON.parse(record.workflow_variables)).toEqual({ counter: 5 });
            expect(record.progress).toBe(50);
            expect(record.total_size_bytes).toBe(1024);
            expect(record.created_at).toEqual(new Date(1700000000000));
        });

        it("should deserialize database record to snapshot", () => {
            const record: WorkflowSnapshotRecord = {
                id: "snap-123",
                execution_id: "exec-456",
                workflow_id: "workflow-789",
                user_id: "user-000",
                snapshot_type: "pause",
                schema_version: 1,
                completed_nodes: "[]",
                pending_nodes: "[]",
                executing_nodes: "[]",
                failed_nodes: "[]",
                skipped_nodes: "[]",
                node_outputs: '{"n1":{"x":1}}',
                workflow_variables: '{"v1":"value"}',
                inputs: '{"in":"put"}',
                loop_states: "[]",
                parallel_states: "[]",
                pause_context: '{"reason":"test","pausedAtNodeId":"n1","pausedAt":1700000000000}',
                progress: 25,
                total_size_bytes: 512,
                created_at: new Date(1700000000000)
            };

            const snapshot = deserializeSnapshot(record);

            expect(snapshot.id).toBe("snap-123");
            expect(snapshot.executionId).toBe("exec-456");
            expect(snapshot.snapshotType).toBe("pause");
            expect(snapshot.nodeOutputs).toEqual({ n1: { x: 1 } });
            expect(snapshot.workflowVariables).toEqual({ v1: "value" });
            expect(snapshot.inputs).toEqual({ in: "put" });
            expect(snapshot.pauseContext?.reason).toBe("test");
            expect(snapshot.progress).toBe(25);
            expect(snapshot.createdAt).toBe(1700000000000);
        });

        it("should handle null pause context", () => {
            const record: WorkflowSnapshotRecord = {
                id: "snap-123",
                execution_id: "exec-456",
                workflow_id: "workflow-789",
                user_id: "user-000",
                snapshot_type: "checkpoint",
                schema_version: 1,
                completed_nodes: "[]",
                pending_nodes: "[]",
                executing_nodes: "[]",
                failed_nodes: "[]",
                skipped_nodes: "[]",
                node_outputs: "{}",
                workflow_variables: "{}",
                inputs: "{}",
                loop_states: "[]",
                parallel_states: "[]",
                pause_context: null,
                progress: 0,
                total_size_bytes: 0,
                created_at: new Date()
            };

            const snapshot = deserializeSnapshot(record);
            expect(snapshot.pauseContext).toBeUndefined();
        });

        it("should round-trip serialize/deserialize", () => {
            const original: WorkflowSnapshot = {
                id: "snap-123",
                executionId: "exec-456",
                workflowId: "workflow-789",
                userId: "user-000",
                snapshotType: "failure",
                schemaVersion: 1,
                completedNodes: [{ nodeId: "n1", status: "completed", retryCount: 2 }],
                pendingNodes: [{ nodeId: "n2", status: "pending", retryCount: 0 }],
                executingNodes: [],
                failedNodes: [{ nodeId: "n3", status: "failed", retryCount: 3, error: "timeout" }],
                skippedNodes: [],
                nodeOutputs: { n1: { data: [1, 2, 3] } },
                workflowVariables: { nested: { obj: true } },
                inputs: { key: "value" },
                loopStates: [
                    {
                        loopNodeId: "loop-1",
                        currentIndex: 5,
                        totalItems: 10,
                        currentItem: "item",
                        accumulatedResults: ["r1", "r2"],
                        isComplete: false
                    }
                ],
                parallelStates: [],
                createdAt: Date.now(),
                progress: 33,
                totalSizeBytes: 2048
            };

            const record = serializeSnapshot(original);
            const restored = deserializeSnapshot(record);

            expect(restored.id).toBe(original.id);
            expect(restored.executionId).toBe(original.executionId);
            expect(restored.snapshotType).toBe(original.snapshotType);
            expect(restored.completedNodes).toEqual(original.completedNodes);
            expect(restored.failedNodes).toEqual(original.failedNodes);
            expect(restored.nodeOutputs).toEqual(original.nodeOutputs);
            expect(restored.workflowVariables).toEqual(original.workflowVariables);
            expect(restored.loopStates).toEqual(original.loopStates);
        });
    });

    describe("restoreQueueState", () => {
        it("should restore queue state from snapshot", () => {
            const snapshot: WorkflowSnapshot = {
                id: "snap-123",
                executionId: "exec-456",
                workflowId: "workflow-789",
                userId: "user-000",
                snapshotType: "checkpoint",
                schemaVersion: 1,
                completedNodes: [
                    { nodeId: "n1", status: "completed", retryCount: 0, output: { x: 1 } }
                ],
                pendingNodes: [{ nodeId: "n2", status: "pending", retryCount: 0 }],
                executingNodes: [{ nodeId: "n3", status: "executing", retryCount: 1 }],
                failedNodes: [{ nodeId: "n4", status: "failed", retryCount: 3, error: "err" }],
                skippedNodes: [{ nodeId: "n5", status: "skipped", retryCount: 0 }],
                nodeOutputs: {},
                workflowVariables: {},
                inputs: {},
                loopStates: [],
                parallelStates: [],
                createdAt: Date.now(),
                progress: 40,
                totalSizeBytes: 0
            };

            const queueState = restoreQueueState(snapshot);

            expect(queueState.completed.has("n1")).toBe(true);
            expect(queueState.pending.has("n2")).toBe(true);
            expect(queueState.ready.has("n3")).toBe(true); // executing -> ready on restore
            expect(queueState.failed.has("n4")).toBe(true);
            expect(queueState.skipped.has("n5")).toBe(true);
        });

        it("should restore node states with all properties", () => {
            const snapshot: WorkflowSnapshot = {
                id: "snap-123",
                executionId: "exec-456",
                workflowId: "workflow-789",
                userId: "user-000",
                snapshotType: "checkpoint",
                schemaVersion: 1,
                completedNodes: [
                    {
                        nodeId: "n1",
                        status: "completed",
                        retryCount: 2,
                        output: { result: "done" },
                        startedAt: 1000,
                        completedAt: 2000
                    }
                ],
                pendingNodes: [],
                executingNodes: [],
                failedNodes: [],
                skippedNodes: [],
                nodeOutputs: {},
                workflowVariables: {},
                inputs: {},
                loopStates: [],
                parallelStates: [],
                createdAt: Date.now(),
                progress: 100,
                totalSizeBytes: 0
            };

            const queueState = restoreQueueState(snapshot);
            const nodeState = queueState.nodeStates.get("n1");

            expect(nodeState).toBeDefined();
            expect(nodeState?.status).toBe("completed");
            expect(nodeState?.retryCount).toBe(2);
            expect(nodeState?.output).toEqual({ result: "done" });
            expect(nodeState?.startedAt).toBe(1000);
            expect(nodeState?.completedAt).toBe(2000);
        });

        it("should handle ready nodes in pendingNodes array", () => {
            const snapshot: WorkflowSnapshot = {
                id: "snap-123",
                executionId: "exec-456",
                workflowId: "workflow-789",
                userId: "user-000",
                snapshotType: "checkpoint",
                schemaVersion: 1,
                completedNodes: [],
                pendingNodes: [
                    { nodeId: "n1", status: "pending", retryCount: 0 },
                    { nodeId: "n2", status: "ready", retryCount: 0 }
                ],
                executingNodes: [],
                failedNodes: [],
                skippedNodes: [],
                nodeOutputs: {},
                workflowVariables: {},
                inputs: {},
                loopStates: [],
                parallelStates: [],
                createdAt: Date.now(),
                progress: 0,
                totalSizeBytes: 0
            };

            const queueState = restoreQueueState(snapshot);

            expect(queueState.pending.has("n1")).toBe(true);
            expect(queueState.ready.has("n2")).toBe(true);
        });
    });

    describe("restoreContextSnapshot", () => {
        it("should restore context from snapshot", () => {
            const snapshot: WorkflowSnapshot = {
                id: "snap-123",
                executionId: "exec-456",
                workflowId: "workflow-789",
                userId: "user-000",
                snapshotType: "checkpoint",
                schemaVersion: 1,
                completedNodes: [],
                pendingNodes: [],
                executingNodes: [],
                failedNodes: [],
                skippedNodes: [],
                nodeOutputs: {
                    n1: { result: "value1" },
                    n2: { result: "value2" }
                },
                workflowVariables: {
                    counter: 42,
                    name: "test"
                },
                inputs: { input1: "in1" },
                loopStates: [],
                parallelStates: [],
                createdAt: 1700000000000,
                progress: 50,
                totalSizeBytes: 1024
            };

            const context = restoreContextSnapshot(snapshot);

            expect(context.nodeOutputs.get("n1")).toEqual({ result: "value1" });
            expect(context.nodeOutputs.get("n2")).toEqual({ result: "value2" });
            expect(context.workflowVariables.get("counter")).toBe(42);
            expect(context.workflowVariables.get("name")).toBe("test");
            expect(context.inputs).toEqual({ input1: "in1" });
            expect(context.metadata.totalSizeBytes).toBe(1024);
            expect(context.metadata.nodeCount).toBe(2);
            expect(context.metadata.createdAt).toBe(1700000000000);
        });

        it("should create empty shared memory", () => {
            const snapshot: WorkflowSnapshot = {
                id: "snap-123",
                executionId: "exec-456",
                workflowId: "workflow-789",
                userId: "user-000",
                snapshotType: "checkpoint",
                schemaVersion: 1,
                completedNodes: [],
                pendingNodes: [],
                executingNodes: [],
                failedNodes: [],
                skippedNodes: [],
                nodeOutputs: {},
                workflowVariables: {},
                inputs: {},
                loopStates: [],
                parallelStates: [],
                createdAt: Date.now(),
                progress: 0,
                totalSizeBytes: 0
            };

            const context = restoreContextSnapshot(snapshot);

            expect(context.sharedMemory).toBeDefined();
            expect(context.sharedMemory.entries.size).toBe(0);
        });
    });

    describe("restoreLoopStates", () => {
        it("should restore loop states from snapshot", () => {
            const snapshot: WorkflowSnapshot = {
                id: "snap-123",
                executionId: "exec-456",
                workflowId: "workflow-789",
                userId: "user-000",
                snapshotType: "checkpoint",
                schemaVersion: 1,
                completedNodes: [],
                pendingNodes: [],
                executingNodes: [],
                failedNodes: [],
                skippedNodes: [],
                nodeOutputs: {},
                workflowVariables: {},
                inputs: {},
                loopStates: [
                    {
                        loopNodeId: "loop-1",
                        currentIndex: 3,
                        totalItems: 10,
                        currentItem: "item-3",
                        accumulatedResults: ["r0", "r1", "r2"],
                        isComplete: false
                    },
                    {
                        loopNodeId: "loop-2",
                        currentIndex: 5,
                        totalItems: 5,
                        currentItem: null,
                        accumulatedResults: ["a", "b", "c", "d", "e"],
                        isComplete: true
                    }
                ],
                parallelStates: [],
                createdAt: Date.now(),
                progress: 50,
                totalSizeBytes: 0
            };

            const loopStates = restoreLoopStates(snapshot);

            expect(loopStates.size).toBe(2);

            const loop1 = loopStates.get("loop-1");
            expect(loop1?.index).toBe(3);
            expect(loop1?.total).toBe(10);
            expect(loop1?.item).toBe("item-3");
            expect(loop1?.results).toEqual(["r0", "r1", "r2"]);

            const loop2 = loopStates.get("loop-2");
            expect(loop2?.index).toBe(5);
            expect(loop2?.total).toBe(5);
            expect(loop2?.results).toHaveLength(5);
        });

        it("should return empty map for no loop states", () => {
            const snapshot: WorkflowSnapshot = {
                id: "snap-123",
                executionId: "exec-456",
                workflowId: "workflow-789",
                userId: "user-000",
                snapshotType: "checkpoint",
                schemaVersion: 1,
                completedNodes: [],
                pendingNodes: [],
                executingNodes: [],
                failedNodes: [],
                skippedNodes: [],
                nodeOutputs: {},
                workflowVariables: {},
                inputs: {},
                loopStates: [],
                parallelStates: [],
                createdAt: Date.now(),
                progress: 0,
                totalSizeBytes: 0
            };

            const loopStates = restoreLoopStates(snapshot);
            expect(loopStates.size).toBe(0);
        });
    });

    describe("getSnapshotTypeDescription", () => {
        it("should return description for checkpoint", () => {
            expect(getSnapshotTypeDescription("checkpoint")).toBe("Automatic checkpoint");
        });

        it("should return description for pause", () => {
            expect(getSnapshotTypeDescription("pause")).toBe("User-initiated pause");
        });

        it("should return description for failure", () => {
            expect(getSnapshotTypeDescription("failure")).toBe("Failure recovery point");
        });

        it("should return description for final", () => {
            expect(getSnapshotTypeDescription("final")).toBe("Final execution state");
        });

        it("should return unknown for invalid type", () => {
            expect(getSnapshotTypeDescription("invalid" as never)).toBe("Unknown snapshot type");
        });
    });
});
