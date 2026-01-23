/**
 * Queue State Management Unit Tests
 *
 * Tests for execution queue state management including:
 * - Queue initialization from workflow
 * - Node state transitions (ready, executing, completed, failed, skipped)
 * - Dependency tracking and resolution
 * - Failure cascade behavior
 * - Deadlock detection
 */

import {
    createLinearWorkflow,
    createDiamondWorkflow,
    createConditionalWorkflow,
    createLoopWorkflow,
    createErrorCascadeWorkflow,
    createComplexWorkflow
} from "../../../../../__tests__/fixtures/workflows";
import {
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    markFailed,
    markSkipped,
    markRetry,
    isExecutionComplete,
    canContinue,
    getExecutionSummary,
    getExecutionProgress,
    getNodeState,
    getNodesByStatus,
    resetNodeForIteration,
    resetNodesForIteration
} from "../context";

describe("Queue State Management", () => {
    describe("initializeQueue", () => {
        it("should mark start nodes as ready", () => {
            const workflow = createLinearWorkflow();
            const queue = initializeQueue(workflow);

            expect(queue.ready.has("A")).toBe(true);
            expect(getNodeState(queue, "A")?.status).toBe("ready");
        });

        it("should mark nodes with dependencies as pending", () => {
            const workflow = createLinearWorkflow();
            const queue = initializeQueue(workflow);

            expect(queue.pending.has("B")).toBe(true);
            expect(queue.pending.has("C")).toBe(true);
            expect(getNodeState(queue, "B")?.status).toBe("pending");
            expect(getNodeState(queue, "C")?.status).toBe("pending");
        });

        it("should handle empty workflow", () => {
            const workflow = createLinearWorkflow();
            workflow.nodes.clear();

            const queue = initializeQueue(workflow);

            expect(queue.ready.size).toBe(0);
            expect(queue.pending.size).toBe(0);
            expect(queue.nodeStates.size).toBe(0);
        });

        it("should correctly identify multiple start nodes", () => {
            const workflow = createDiamondWorkflow();
            const queue = initializeQueue(workflow);

            // Only A has no dependencies
            expect(queue.ready.size).toBe(1);
            expect(queue.ready.has("A")).toBe(true);
        });

        it("should initialize retry count to 0", () => {
            const workflow = createLinearWorkflow();
            const queue = initializeQueue(workflow);

            for (const [, state] of queue.nodeStates) {
                expect(state.retryCount).toBe(0);
            }
        });

        it("should handle workflow with multiple entry points", () => {
            const workflow = createComplexWorkflow();
            const queue = initializeQueue(workflow);

            expect(queue.ready.has("Start")).toBe(true);
            expect(queue.pending.size).toBeGreaterThan(0);
        });
    });

    describe("getReadyNodes", () => {
        it("should return available nodes up to concurrency limit", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);

            // Execute A first
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", { result: "done" }, workflow);

            // Now B and C should be ready
            const ready = getReadyNodes(queue, 2);

            expect(ready.length).toBe(2);
            expect(ready).toContain("B");
            expect(ready).toContain("C");
        });

        it("should respect maxConcurrentNodes limit", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            // Limit to 1
            const ready = getReadyNodes(queue, 1);

            expect(ready.length).toBe(1);
        });

        it("should return empty when none ready", () => {
            const workflow = createLinearWorkflow();
            const queue = initializeQueue(workflow);

            // All are either ready or pending initially
            // Start executing A
            const executingQueue = markExecuting(queue, ["A"]);

            // B and C are still pending
            const ready = getReadyNodes(executingQueue, 10);

            expect(ready).not.toContain("B");
            expect(ready).not.toContain("C");
        });

        it("should not return already executing nodes", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            // Start executing B
            queue = markExecuting(queue, ["B"]);

            const ready = getReadyNodes(queue, 10);

            expect(ready).not.toContain("B");
            expect(ready).toContain("C");
        });

        it("should account for already executing nodes in concurrency", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            // Start executing B
            queue = markExecuting(queue, ["B"]);

            // With max 2 and 1 executing, should only return 1
            const ready = getReadyNodes(queue, 2);

            expect(ready.length).toBe(1);
        });
    });

    describe("markExecuting", () => {
        it("should move nodes from ready to executing", () => {
            const workflow = createLinearWorkflow();
            const queue = initializeQueue(workflow);

            const updated = markExecuting(queue, ["A"]);

            expect(updated.ready.has("A")).toBe(false);
            expect(updated.executing.has("A")).toBe(true);
        });

        it("should set startedAt timestamp", () => {
            const workflow = createLinearWorkflow();
            const queue = initializeQueue(workflow);
            const before = Date.now();

            const updated = markExecuting(queue, ["A"]);
            const after = Date.now();

            const nodeState = getNodeState(updated, "A");
            expect(nodeState?.startedAt).toBeGreaterThanOrEqual(before);
            expect(nodeState?.startedAt).toBeLessThanOrEqual(after);
        });

        it("should update node status to executing", () => {
            const workflow = createLinearWorkflow();
            const queue = initializeQueue(workflow);

            const updated = markExecuting(queue, ["A"]);

            expect(getNodeState(updated, "A")?.status).toBe("executing");
        });

        it("should handle multiple nodes", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            const updated = markExecuting(queue, ["B", "C"]);

            expect(updated.executing.has("B")).toBe(true);
            expect(updated.executing.has("C")).toBe(true);
            expect(updated.ready.size).toBe(0);
        });
    });

    describe("markCompleted", () => {
        it("should update dependent nodes to ready when all deps met", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);
            queue = markExecuting(queue, ["A"]);

            queue = markCompleted(queue, "A", { result: "done" }, workflow);

            expect(queue.completed.has("A")).toBe(true);
            expect(queue.ready.has("B")).toBe(true);
            expect(getNodeState(queue, "B")?.status).toBe("ready");
        });

        it("should not update dependents if other deps pending", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            // Execute and complete only B
            queue = markExecuting(queue, ["B"]);
            queue = markCompleted(queue, "B", {}, workflow);

            // D depends on both B and C, so should still be pending
            expect(queue.pending.has("D")).toBe(true);
            expect(getNodeState(queue, "D")?.status).toBe("pending");
        });

        it("should handle nodes with multiple dependents", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);
            queue = markExecuting(queue, ["A"]);

            queue = markCompleted(queue, "A", {}, workflow);

            // Both B and C should become ready
            expect(queue.ready.has("B")).toBe(true);
            expect(queue.ready.has("C")).toBe(true);
        });

        it("should store output in node state", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);
            queue = markExecuting(queue, ["A"]);

            const output = { result: "test output", value: 42 };
            queue = markCompleted(queue, "A", output, workflow);

            expect(getNodeState(queue, "A")?.output).toEqual(output);
        });

        it("should set completedAt timestamp", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);
            queue = markExecuting(queue, ["A"]);
            const before = Date.now();

            queue = markCompleted(queue, "A", {}, workflow);
            const after = Date.now();

            const nodeState = getNodeState(queue, "A");
            expect(nodeState?.completedAt).toBeGreaterThanOrEqual(before);
            expect(nodeState?.completedAt).toBeLessThanOrEqual(after);
        });
    });

    describe("markFailed", () => {
        it("should cascade skip to all downstream dependents", () => {
            const workflow = createErrorCascadeWorkflow();
            let queue = initializeQueue(workflow);

            // Execute A
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            // B fails
            queue = markExecuting(queue, ["B"]);
            queue = markFailed(queue, "B", "Node B failed", workflow);

            // C should be skipped (depends only on B)
            expect(queue.skipped.has("C")).toBe(true);
            expect(getNodeState(queue, "C")?.status).toBe("skipped");
        });

        it("should not affect parallel branches", () => {
            const workflow = createErrorCascadeWorkflow();
            let queue = initializeQueue(workflow);

            // Execute A
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            // B fails, D is parallel
            queue = markExecuting(queue, ["B", "D"]);
            queue = markFailed(queue, "B", "Failed", workflow);

            // D should still be executing
            expect(queue.executing.has("D")).toBe(true);
            expect(queue.skipped.has("D")).toBe(false);
        });

        it("should handle failure at workflow start", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);

            queue = markExecuting(queue, ["A"]);
            queue = markFailed(queue, "A", "Start node failed", workflow);

            // All dependents should be skipped
            expect(queue.skipped.has("B")).toBe(true);
            expect(queue.skipped.has("C")).toBe(true);
        });

        it("should store error message", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);
            queue = markExecuting(queue, ["A"]);

            queue = markFailed(queue, "A", "Detailed error message", workflow);

            expect(getNodeState(queue, "A")?.error).toBe("Detailed error message");
        });

        it("should move node from executing to failed", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);
            queue = markExecuting(queue, ["A"]);

            queue = markFailed(queue, "A", "error", workflow);

            expect(queue.executing.has("A")).toBe(false);
            expect(queue.failed.has("A")).toBe(true);
        });
    });

    describe("markSkipped", () => {
        it("should propagate skip to entire branch", () => {
            const workflow = createConditionalWorkflow();
            let queue = initializeQueue(workflow);

            // Execute through to conditional
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);
            queue = markExecuting(queue, ["Cond"]);
            queue = markCompleted(queue, "Cond", {}, workflow);

            // Skip the false branch (C)
            queue = markSkipped(queue, "C", workflow);

            expect(queue.skipped.has("C")).toBe(true);
        });

        it("should stop at branch merge points when other branch completes", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);

            // Complete A
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            // Complete B first
            queue = markExecuting(queue, ["B"]);
            queue = markCompleted(queue, "B", {}, workflow);

            // D is still pending because C hasn't been processed
            expect(queue.pending.has("D")).toBe(true);

            // Skip C (the other parallel branch)
            queue = markSkipped(queue, "C", workflow);

            // Note: markSkipped doesn't update dependents to ready status.
            // The orchestrator handles this by checking after each operation.
            // C should be skipped and D should not be cascaded (has completed dep)
            expect(queue.skipped.has("C")).toBe(true);
            expect(queue.skipped.has("D")).toBe(false);
        });

        it("should remove from pending and ready sets", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);

            // Skip B which is pending
            queue = markSkipped(queue, "B", workflow);

            expect(queue.pending.has("B")).toBe(false);
            expect(queue.ready.has("B")).toBe(false);
            expect(queue.skipped.has("B")).toBe(true);
        });
    });

    describe("markRetry", () => {
        it("should move node back to ready", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);
            queue = markExecuting(queue, ["A"]);
            queue = markFailed(queue, "A", "temp error", workflow);

            queue = markRetry(queue, "A");

            expect(queue.failed.has("A")).toBe(false);
            expect(queue.ready.has("A")).toBe(true);
        });

        it("should increment retry count", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);

            expect(getNodeState(queue, "A")?.retryCount).toBe(0);

            queue = markExecuting(queue, ["A"]);
            queue = markFailed(queue, "A", "error", workflow);
            queue = markRetry(queue, "A");

            expect(getNodeState(queue, "A")?.retryCount).toBe(1);

            queue = markExecuting(queue, ["A"]);
            queue = markFailed(queue, "A", "error again", workflow);
            queue = markRetry(queue, "A");

            expect(getNodeState(queue, "A")?.retryCount).toBe(2);
        });

        it("should clear error and timestamps", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);
            queue = markExecuting(queue, ["A"]);
            queue = markFailed(queue, "A", "error", workflow);

            expect(getNodeState(queue, "A")?.error).toBe("error");
            expect(getNodeState(queue, "A")?.startedAt).toBeDefined();
            expect(getNodeState(queue, "A")?.completedAt).toBeDefined();

            queue = markRetry(queue, "A");

            expect(getNodeState(queue, "A")?.error).toBeUndefined();
            expect(getNodeState(queue, "A")?.startedAt).toBeUndefined();
            expect(getNodeState(queue, "A")?.completedAt).toBeUndefined();
        });
    });

    describe("isExecutionComplete", () => {
        it("should return true when all nodes processed", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);

            // Execute all nodes
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);
            queue = markExecuting(queue, ["B"]);
            queue = markCompleted(queue, "B", {}, workflow);
            queue = markExecuting(queue, ["C"]);
            queue = markCompleted(queue, "C", {}, workflow);

            expect(isExecutionComplete(queue)).toBe(true);
        });

        it("should return false while nodes are pending", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);

            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            expect(isExecutionComplete(queue)).toBe(false);
        });

        it("should return false while nodes are executing", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);

            queue = markExecuting(queue, ["A"]);

            expect(isExecutionComplete(queue)).toBe(false);
        });

        it("should return true when all remaining nodes are skipped", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);

            queue = markExecuting(queue, ["A"]);
            queue = markFailed(queue, "A", "failed", workflow);

            // B and C should be skipped
            expect(isExecutionComplete(queue)).toBe(true);
        });
    });

    describe("canContinue", () => {
        it("should return true when nodes are ready", () => {
            const workflow = createLinearWorkflow();
            const queue = initializeQueue(workflow);

            expect(canContinue(queue)).toBe(true);
        });

        it("should return true when nodes are executing", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);
            queue = markExecuting(queue, ["A"]);

            expect(canContinue(queue)).toBe(true);
        });

        it("should return false when stuck (potential deadlock)", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);

            // Complete A but fail B
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);
            queue = markExecuting(queue, ["B"]);
            queue = markFailed(queue, "B", "error", workflow);

            // C is skipped, no more nodes to process
            expect(canContinue(queue)).toBe(false);
        });
    });

    describe("deadlock detection", () => {
        it("should detect when no nodes ready and none executing", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);

            // Complete A
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            // Fail both B and C
            queue = markExecuting(queue, ["B", "C"]);
            queue = markFailed(queue, "B", "error", workflow);
            queue = markFailed(queue, "C", "error", workflow);

            // D is skipped, execution can't continue
            expect(canContinue(queue)).toBe(false);
            expect(isExecutionComplete(queue)).toBe(true);
        });

        it("should not false-positive during legitimate waits", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);

            // A is executing
            queue = markExecuting(queue, ["A"]);

            // No ready nodes, but one executing - this is fine
            expect(canContinue(queue)).toBe(true);
        });
    });

    describe("getExecutionSummary", () => {
        it("should return correct counts", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);

            // Initial state
            let summary = getExecutionSummary(queue);
            expect(summary.ready).toBe(1);
            expect(summary.pending).toBe(3);
            expect(summary.total).toBe(4);

            // After some execution
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);
            queue = markExecuting(queue, ["B"]);
            queue = markFailed(queue, "B", "error", workflow);

            summary = getExecutionSummary(queue);
            expect(summary.completed).toBe(1);
            expect(summary.failed).toBe(1);
            expect(summary.ready).toBe(1); // C
            expect(summary.skipped).toBe(0); // D not yet skipped
        });
    });

    describe("getExecutionProgress", () => {
        it("should return correct percentage", () => {
            const workflow = createLinearWorkflow(); // 3 nodes
            let queue = initializeQueue(workflow);

            expect(getExecutionProgress(queue)).toBe(0);

            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            expect(getExecutionProgress(queue)).toBe(33); // 1/3

            queue = markExecuting(queue, ["B"]);
            queue = markCompleted(queue, "B", {}, workflow);

            expect(getExecutionProgress(queue)).toBe(67); // 2/3

            queue = markExecuting(queue, ["C"]);
            queue = markCompleted(queue, "C", {}, workflow);

            expect(getExecutionProgress(queue)).toBe(100);
        });

        it("should count failed and skipped as processed", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);

            queue = markExecuting(queue, ["A"]);
            queue = markFailed(queue, "A", "error", workflow);

            // A failed, B and C skipped = 100% processed
            expect(getExecutionProgress(queue)).toBe(100);
        });

        it("should return 100 for empty workflow", () => {
            const workflow = createLinearWorkflow();
            workflow.nodes.clear();
            const queue = initializeQueue(workflow);

            expect(getExecutionProgress(queue)).toBe(100);
        });
    });

    describe("getNodesByStatus", () => {
        it("should return nodes with specified status", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);

            // Execute some nodes
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);
            queue = markExecuting(queue, ["B"]);
            queue = markFailed(queue, "B", "error", workflow);

            expect(getNodesByStatus(queue, "completed")).toEqual(["A"]);
            expect(getNodesByStatus(queue, "failed")).toEqual(["B"]);
            expect(getNodesByStatus(queue, "ready")).toContain("C");
        });
    });

    describe("resetNodeForIteration", () => {
        it("should reset node for loop iteration", () => {
            const workflow = createLoopWorkflow();
            let queue = initializeQueue(workflow);

            // Complete Body node
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);
            queue = markExecuting(queue, ["LoopStart"]);
            queue = markCompleted(queue, "LoopStart", {}, workflow);
            queue = markExecuting(queue, ["Body"]);
            queue = markCompleted(queue, "Body", { iteration: 1 }, workflow);

            // Reset Body for next iteration
            queue = resetNodeForIteration(queue, "Body");

            expect(queue.completed.has("Body")).toBe(false);
            expect(queue.pending.has("Body")).toBe(true);
            expect(getNodeState(queue, "Body")?.status).toBe("pending");
            expect(getNodeState(queue, "Body")?.output).toBeUndefined();
        });
    });

    describe("resetNodesForIteration", () => {
        it("should reset multiple nodes", () => {
            const workflow = createLoopWorkflow();
            let queue = initializeQueue(workflow);

            // Execute through loop body
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);
            queue = markExecuting(queue, ["LoopStart"]);
            queue = markCompleted(queue, "LoopStart", {}, workflow);
            queue = markExecuting(queue, ["Body"]);
            queue = markCompleted(queue, "Body", {}, workflow);

            // Reset for next iteration
            queue = resetNodesForIteration(queue, ["LoopStart", "Body"]);

            expect(queue.pending.has("LoopStart")).toBe(true);
            expect(queue.pending.has("Body")).toBe(true);
        });
    });

    describe("state immutability", () => {
        it("should not mutate original state on any operation", () => {
            const workflow = createLinearWorkflow();
            const original = initializeQueue(workflow);
            const originalReadySize = original.ready.size;
            const originalPendingSize = original.pending.size;

            // Perform operations
            const executing = markExecuting(original, ["A"]);
            markCompleted(executing, "A", {}, workflow);

            // Original should be unchanged
            expect(original.ready.size).toBe(originalReadySize);
            expect(original.pending.size).toBe(originalPendingSize);
            expect(original.executing.size).toBe(0);
            expect(original.completed.size).toBe(0);
        });

        it("should not share Set/Map references between states", () => {
            const workflow = createLinearWorkflow();
            const original = initializeQueue(workflow);

            const modified = markExecuting(original, ["A"]);

            // Mutating modified should not affect original
            modified.ready.add("fake");

            expect(original.ready.has("fake")).toBe(false);
        });
    });
});
