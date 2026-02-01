/**
 * Error Propagation Tests
 *
 * Tests that verify errors are properly captured, stored, and propagated
 * through the workflow execution. Covers error messages, retry behavior,
 * and inline function error handling.
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    initializeQueue,
    markExecuting,
    markCompleted,
    markSkipped,
    markFailed,
    markRetry,
    getReadyNodes,
    isExecutionComplete,
    getExecutionSummary
} from "../../../../src/temporal/core/services/context";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge,
    ExecutableNodeType,
    EdgeHandleType
} from "../../../../src/temporal/activities/execution/types";

/**
 * Helper to create a minimal BuiltWorkflow for testing
 */
function createTestWorkflow(
    nodes: Array<{ id: string; type: string; dependencies?: string[]; dependents?: string[] }>,
    edges: Array<{ id: string; source: string; target: string; handleType?: string }>
): BuiltWorkflow {
    const nodeMap = new Map<string, ExecutableNode>();
    const edgeMap = new Map<string, TypedEdge>();

    for (const node of nodes) {
        nodeMap.set(node.id, {
            id: node.id,
            type: node.type as ExecutableNodeType,
            name: node.id,
            config: {},
            depth: 0,
            dependencies: node.dependencies || [],
            dependents: node.dependents || []
        });
    }

    for (const edge of edges) {
        edgeMap.set(edge.id, {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            handleType: (edge.handleType || "default") as EdgeHandleType
        });
    }

    // Find trigger node (first node without dependencies)
    const triggerNodeId =
        nodes.find((n) => !n.dependencies || n.dependencies.length === 0)?.id || nodes[0]?.id;

    return {
        nodes: nodeMap,
        edges: edgeMap,
        originalDefinition: { nodes: {}, edges: [], entryPoint: triggerNodeId, name: "test" },
        buildTimestamp: Date.now(),
        executionLevels: [nodes.map((n) => n.id)],
        triggerNodeId,
        outputNodeIds: [],
        loopContexts: new Map(),
        maxConcurrentNodes: 5
    };
}

/**
 * Helper to execute a node (markExecuting + markCompleted)
 */
function executeNode(
    state: ReturnType<typeof initializeQueue>,
    nodeId: string,
    output: JsonObject,
    workflow: BuiltWorkflow
): ReturnType<typeof initializeQueue> {
    state = markExecuting(state, [nodeId]);
    state = markCompleted(state, nodeId, output, workflow);
    return state;
}

describe("Error Propagation", () => {
    describe("Error Message Storage", () => {
        const simpleWorkflow = createTestWorkflow(
            [
                { id: "input", type: "input", dependents: ["action"] },
                { id: "action", type: "action", dependencies: ["input"], dependents: ["output"] },
                { id: "output", type: "output", dependencies: ["action"] }
            ],
            [
                { id: "e1", source: "input", target: "action" },
                { id: "e2", source: "action", target: "output" }
            ]
        );

        it("should store error message in node state when node fails", () => {
            let state = initializeQueue(simpleWorkflow);

            state = executeNode(state, "input", {}, simpleWorkflow);
            state = markExecuting(state, ["action"]);
            state = markFailed(state, "action", "Connection timeout after 30s", simpleWorkflow);

            const nodeState = state.nodeStates.get("action");
            expect(nodeState).toBeDefined();
            expect(nodeState?.status).toBe("failed");
            expect(nodeState?.error).toBe("Connection timeout after 30s");
        });

        it("should preserve error message with special characters", () => {
            let state = initializeQueue(simpleWorkflow);

            state = executeNode(state, "input", {}, simpleWorkflow);
            state = markExecuting(state, ["action"]);

            const errorMessage = 'Error: Cannot read property "data" of undefined\n  at line 42';
            state = markFailed(state, "action", errorMessage, simpleWorkflow);

            const nodeState = state.nodeStates.get("action");
            expect(nodeState?.error).toBe(errorMessage);
        });

        it("should handle empty error message", () => {
            let state = initializeQueue(simpleWorkflow);

            state = executeNode(state, "input", {}, simpleWorkflow);
            state = markExecuting(state, ["action"]);
            state = markFailed(state, "action", "", simpleWorkflow);

            const nodeState = state.nodeStates.get("action");
            expect(nodeState?.status).toBe("failed");
            expect(nodeState?.error).toBe("");
        });

        it("should set completedAt timestamp on failure", () => {
            let state = initializeQueue(simpleWorkflow);

            state = executeNode(state, "input", {}, simpleWorkflow);
            state = markExecuting(state, ["action"]);

            const beforeFail = Date.now();
            state = markFailed(state, "action", "Error", simpleWorkflow);
            const afterFail = Date.now();

            const nodeState = state.nodeStates.get("action");
            expect(nodeState?.completedAt).toBeDefined();
            expect(nodeState?.completedAt).toBeGreaterThanOrEqual(beforeFail);
            expect(nodeState?.completedAt).toBeLessThanOrEqual(afterFail);
        });
    });

    describe("Error Propagation to Dependents", () => {
        it("should skip all downstream nodes when upstream fails", () => {
            const chainWorkflow = createTestWorkflow(
                [
                    { id: "a", type: "action", dependents: ["b"] },
                    { id: "b", type: "action", dependencies: ["a"], dependents: ["c"] },
                    { id: "c", type: "action", dependencies: ["b"], dependents: ["d"] },
                    { id: "d", type: "action", dependencies: ["c"], dependents: ["e"] },
                    { id: "e", type: "output", dependencies: ["d"] }
                ],
                [
                    { id: "e1", source: "a", target: "b" },
                    { id: "e2", source: "b", target: "c" },
                    { id: "e3", source: "c", target: "d" },
                    { id: "e4", source: "d", target: "e" }
                ]
            );

            let state = initializeQueue(chainWorkflow);

            // First node fails
            state = markExecuting(state, ["a"]);
            state = markFailed(state, "a", "Initial failure", chainWorkflow);

            // All downstream nodes should be skipped
            expect(state.failed.has("a")).toBe(true);
            expect(state.skipped.has("b")).toBe(true);
            expect(state.skipped.has("c")).toBe(true);
            expect(state.skipped.has("d")).toBe(true);
            expect(state.skipped.has("e")).toBe(true);

            expect(isExecutionComplete(state)).toBe(true);

            const summary = getExecutionSummary(state);
            expect(summary.failed).toBe(1);
            expect(summary.skipped).toBe(4);
        });

        it("should not skip nodes with multiple dependencies if one succeeds", () => {
            /**
             *   a (fails) ──┐
             *               ├──> merge -> output
             *   b (ok)    ──┘
             */
            const diamondWorkflow = createTestWorkflow(
                [
                    { id: "start", type: "input", dependents: ["a", "b"] },
                    { id: "a", type: "action", dependencies: ["start"], dependents: ["merge"] },
                    { id: "b", type: "action", dependencies: ["start"], dependents: ["merge"] },
                    {
                        id: "merge",
                        type: "merge",
                        dependencies: ["a", "b"],
                        dependents: ["output"]
                    },
                    { id: "output", type: "output", dependencies: ["merge"] }
                ],
                [
                    { id: "e1", source: "start", target: "a" },
                    { id: "e2", source: "start", target: "b" },
                    { id: "e3", source: "a", target: "merge" },
                    { id: "e4", source: "b", target: "merge" },
                    { id: "e5", source: "merge", target: "output" }
                ]
            );

            let state = initializeQueue(diamondWorkflow);

            state = executeNode(state, "start", {}, diamondWorkflow);

            // a fails, b succeeds
            state = markExecuting(state, ["a"]);
            state = markFailed(state, "a", "Node a failed", diamondWorkflow);
            state = executeNode(state, "b", { result: "ok" }, diamondWorkflow);

            // Merge should be ready (not skipped) because b succeeded
            const ready = getReadyNodes(state, 5);
            expect(ready).toContain("merge");
            expect(state.skipped.has("merge")).toBe(false);
        });

        it("should skip merge node when ALL dependencies fail", () => {
            const diamondWorkflow = createTestWorkflow(
                [
                    { id: "start", type: "input", dependents: ["a", "b"] },
                    { id: "a", type: "action", dependencies: ["start"], dependents: ["merge"] },
                    { id: "b", type: "action", dependencies: ["start"], dependents: ["merge"] },
                    {
                        id: "merge",
                        type: "merge",
                        dependencies: ["a", "b"],
                        dependents: ["output"]
                    },
                    { id: "output", type: "output", dependencies: ["merge"] }
                ],
                [
                    { id: "e1", source: "start", target: "a" },
                    { id: "e2", source: "start", target: "b" },
                    { id: "e3", source: "a", target: "merge" },
                    { id: "e4", source: "b", target: "merge" },
                    { id: "e5", source: "merge", target: "output" }
                ]
            );

            let state = initializeQueue(diamondWorkflow);

            state = executeNode(state, "start", {}, diamondWorkflow);

            // Both a and b fail
            state = markExecuting(state, ["a", "b"]);
            state = markFailed(state, "a", "Node a failed", diamondWorkflow);
            state = markFailed(state, "b", "Node b failed", diamondWorkflow);

            // Merge should be skipped because all dependencies failed
            expect(state.skipped.has("merge")).toBe(true);
            expect(state.skipped.has("output")).toBe(true);

            expect(isExecutionComplete(state)).toBe(true);
        });
    });

    describe("Retry Behavior", () => {
        const simpleWorkflow = createTestWorkflow(
            [
                { id: "input", type: "input", dependents: ["action"] },
                { id: "action", type: "action", dependencies: ["input"], dependents: ["output"] },
                { id: "output", type: "output", dependencies: ["action"] }
            ],
            [
                { id: "e1", source: "input", target: "action" },
                { id: "e2", source: "action", target: "output" }
            ]
        );

        it("should increment retry count when marking for retry", () => {
            let state = initializeQueue(simpleWorkflow);

            state = executeNode(state, "input", {}, simpleWorkflow);

            // First attempt fails
            state = markExecuting(state, ["action"]);
            state = markFailed(state, "action", "Temporary failure", simpleWorkflow);

            let nodeState = state.nodeStates.get("action");
            expect(nodeState?.retryCount).toBe(0); // Not incremented by markFailed

            // Mark for retry
            state = markRetry(state, "action");

            nodeState = state.nodeStates.get("action");
            expect(nodeState?.retryCount).toBe(1);
            expect(nodeState?.status).toBe("ready");
            expect(nodeState?.error).toBeUndefined();
        });

        it("should clear error and timestamps on retry", () => {
            let state = initializeQueue(simpleWorkflow);

            state = executeNode(state, "input", {}, simpleWorkflow);
            state = markExecuting(state, ["action"]);
            state = markFailed(state, "action", "Error message", simpleWorkflow);

            let nodeState = state.nodeStates.get("action");
            expect(nodeState?.error).toBe("Error message");
            expect(nodeState?.completedAt).toBeDefined();

            state = markRetry(state, "action");

            nodeState = state.nodeStates.get("action");
            expect(nodeState?.error).toBeUndefined();
            expect(nodeState?.startedAt).toBeUndefined();
            expect(nodeState?.completedAt).toBeUndefined();
        });

        it("should move node from failed to ready on retry", () => {
            let state = initializeQueue(simpleWorkflow);

            state = executeNode(state, "input", {}, simpleWorkflow);
            state = markExecuting(state, ["action"]);
            state = markFailed(state, "action", "Error", simpleWorkflow);

            expect(state.failed.has("action")).toBe(true);
            expect(state.ready.has("action")).toBe(false);

            state = markRetry(state, "action");

            expect(state.failed.has("action")).toBe(false);
            expect(state.ready.has("action")).toBe(true);
        });

        it("should track multiple retry attempts", () => {
            let state = initializeQueue(simpleWorkflow);

            state = executeNode(state, "input", {}, simpleWorkflow);

            // Attempt 1
            state = markExecuting(state, ["action"]);
            state = markFailed(state, "action", "Attempt 1 failed", simpleWorkflow);
            state = markRetry(state, "action");

            // Attempt 2
            state = markExecuting(state, ["action"]);
            state = markFailed(state, "action", "Attempt 2 failed", simpleWorkflow);
            state = markRetry(state, "action");

            // Attempt 3
            state = markExecuting(state, ["action"]);
            state = markFailed(state, "action", "Attempt 3 failed", simpleWorkflow);
            state = markRetry(state, "action");

            const nodeState = state.nodeStates.get("action");
            expect(nodeState?.retryCount).toBe(3);
        });

        it("should allow successful completion after retries", () => {
            // Use a workflow where we can test retry without cascade
            // In this scenario, we test retry on the last node (no dependents to skip)
            const retryWorkflow = createTestWorkflow(
                [
                    { id: "input", type: "input", dependents: ["output"] },
                    { id: "output", type: "output", dependencies: ["input"] }
                ],
                [{ id: "e1", source: "input", target: "output" }]
            );

            let state = initializeQueue(retryWorkflow);

            state = executeNode(state, "input", {}, retryWorkflow);

            // First attempt on output fails
            state = markExecuting(state, ["output"]);
            state = markFailed(state, "output", "First attempt failed", retryWorkflow);

            let nodeState = state.nodeStates.get("output");
            expect(nodeState?.status).toBe("failed");
            expect(nodeState?.retryCount).toBe(0);

            // Mark for retry
            state = markRetry(state, "output");

            nodeState = state.nodeStates.get("output");
            expect(nodeState?.status).toBe("ready");
            expect(nodeState?.retryCount).toBe(1);

            // Output should be ready again
            const ready = getReadyNodes(state, 5);
            expect(ready).toContain("output");

            // Second attempt succeeds
            state = executeNode(state, "output", { result: "success" }, retryWorkflow);

            nodeState = state.nodeStates.get("output");
            expect(nodeState?.status).toBe("completed");
            expect(nodeState?.retryCount).toBe(1);
            expect(nodeState?.output).toEqual({ result: "success" });

            expect(isExecutionComplete(state)).toBe(true);
        });

        it("should note that retry does not undo cascade to dependents", () => {
            // This test documents the current behavior: once dependents are
            // skipped due to failure, retrying the failed node does not
            // automatically "unskip" them. This is by design.
            let state = initializeQueue(simpleWorkflow);

            state = executeNode(state, "input", {}, simpleWorkflow);

            // Action fails - output gets skipped as cascade
            state = markExecuting(state, ["action"]);
            state = markFailed(state, "action", "Failed", simpleWorkflow);

            expect(state.skipped.has("output")).toBe(true);

            // Retry action
            state = markRetry(state, "action");

            // Output is STILL skipped - retry doesn't undo cascade
            expect(state.skipped.has("output")).toBe(true);

            // Action can still complete, but output remains skipped
            state = executeNode(state, "action", { result: "ok" }, simpleWorkflow);

            expect(state.completed.has("action")).toBe(true);
            expect(state.skipped.has("output")).toBe(true);
        });
    });

    describe("Multiple Failure Scenarios", () => {
        it("should handle multiple parallel failures", () => {
            /**
             *   start -> a (fails)
             *         -> b (fails)
             *         -> c (ok)
             *         -> merge -> output
             */
            const parallelWorkflow = createTestWorkflow(
                [
                    { id: "start", type: "input", dependents: ["a", "b", "c"] },
                    { id: "a", type: "action", dependencies: ["start"], dependents: ["merge"] },
                    { id: "b", type: "action", dependencies: ["start"], dependents: ["merge"] },
                    { id: "c", type: "action", dependencies: ["start"], dependents: ["merge"] },
                    {
                        id: "merge",
                        type: "merge",
                        dependencies: ["a", "b", "c"],
                        dependents: ["output"]
                    },
                    { id: "output", type: "output", dependencies: ["merge"] }
                ],
                [
                    { id: "e1", source: "start", target: "a" },
                    { id: "e2", source: "start", target: "b" },
                    { id: "e3", source: "start", target: "c" },
                    { id: "e4", source: "a", target: "merge" },
                    { id: "e5", source: "b", target: "merge" },
                    { id: "e6", source: "c", target: "merge" },
                    { id: "e7", source: "merge", target: "output" }
                ]
            );

            let state = initializeQueue(parallelWorkflow);

            state = executeNode(state, "start", {}, parallelWorkflow);

            // a and b fail, c succeeds
            state = markExecuting(state, ["a", "b", "c"]);
            state = markFailed(state, "a", "Error in a", parallelWorkflow);
            state = markFailed(state, "b", "Error in b", parallelWorkflow);
            state = markCompleted(state, "c", { result: "c" }, parallelWorkflow);

            // Merge should be ready because c succeeded
            const ready = getReadyNodes(state, 5);
            expect(ready).toContain("merge");

            const summary = getExecutionSummary(state);
            expect(summary.failed).toBe(2);
            expect(summary.completed).toBe(2); // start and c
        });

        it("should preserve all error messages from multiple failures", () => {
            const parallelWorkflow = createTestWorkflow(
                [
                    { id: "start", type: "input", dependents: ["a", "b"] },
                    { id: "a", type: "action", dependencies: ["start"], dependents: ["merge"] },
                    { id: "b", type: "action", dependencies: ["start"], dependents: ["merge"] },
                    { id: "merge", type: "merge", dependencies: ["a", "b"] }
                ],
                [
                    { id: "e1", source: "start", target: "a" },
                    { id: "e2", source: "start", target: "b" },
                    { id: "e3", source: "a", target: "merge" },
                    { id: "e4", source: "b", target: "merge" }
                ]
            );

            let state = initializeQueue(parallelWorkflow);

            state = executeNode(state, "start", {}, parallelWorkflow);
            state = markExecuting(state, ["a", "b"]);
            state = markFailed(state, "a", "Error: a failed with timeout", parallelWorkflow);
            state = markFailed(
                state,
                "b",
                "Error: b failed with connection refused",
                parallelWorkflow
            );

            const nodeStateA = state.nodeStates.get("a");
            const nodeStateB = state.nodeStates.get("b");

            expect(nodeStateA?.error).toBe("Error: a failed with timeout");
            expect(nodeStateB?.error).toBe("Error: b failed with connection refused");
        });
    });

    describe("Failure at Different Workflow Stages", () => {
        it("should handle failure at entry point", () => {
            const workflow = createTestWorkflow(
                [
                    { id: "input", type: "input", dependents: ["action"] },
                    { id: "action", type: "action", dependencies: ["input"] }
                ],
                [{ id: "e1", source: "input", target: "action" }]
            );

            let state = initializeQueue(workflow);

            // Entry point fails
            state = markExecuting(state, ["input"]);
            state = markFailed(state, "input", "Input validation failed", workflow);

            expect(state.failed.has("input")).toBe(true);
            expect(state.skipped.has("action")).toBe(true);
            expect(isExecutionComplete(state)).toBe(true);
        });

        it("should handle failure at final node", () => {
            const workflow = createTestWorkflow(
                [
                    { id: "input", type: "input", dependents: ["action"] },
                    {
                        id: "action",
                        type: "action",
                        dependencies: ["input"],
                        dependents: ["output"]
                    },
                    { id: "output", type: "output", dependencies: ["action"] }
                ],
                [
                    { id: "e1", source: "input", target: "action" },
                    { id: "e2", source: "action", target: "output" }
                ]
            );

            let state = initializeQueue(workflow);

            state = executeNode(state, "input", {}, workflow);
            state = executeNode(state, "action", { data: "processed" }, workflow);

            // Output node fails
            state = markExecuting(state, ["output"]);
            state = markFailed(state, "output", "Failed to write output", workflow);

            expect(state.completed.has("input")).toBe(true);
            expect(state.completed.has("action")).toBe(true);
            expect(state.failed.has("output")).toBe(true);
            expect(isExecutionComplete(state)).toBe(true);

            const summary = getExecutionSummary(state);
            expect(summary.completed).toBe(2);
            expect(summary.failed).toBe(1);
        });

        it("should handle failure in middle of workflow", () => {
            const workflow = createTestWorkflow(
                [
                    { id: "a", type: "action", dependents: ["b"] },
                    { id: "b", type: "action", dependencies: ["a"], dependents: ["c"] },
                    { id: "c", type: "action", dependencies: ["b"], dependents: ["d"] },
                    { id: "d", type: "output", dependencies: ["c"] }
                ],
                [
                    { id: "e1", source: "a", target: "b" },
                    { id: "e2", source: "b", target: "c" },
                    { id: "e3", source: "c", target: "d" }
                ]
            );

            let state = initializeQueue(workflow);

            state = executeNode(state, "a", {}, workflow);

            // b fails
            state = markExecuting(state, ["b"]);
            state = markFailed(state, "b", "Processing error", workflow);

            expect(state.completed.has("a")).toBe(true);
            expect(state.failed.has("b")).toBe(true);
            expect(state.skipped.has("c")).toBe(true);
            expect(state.skipped.has("d")).toBe(true);
        });
    });

    describe("Conditional Branch Failures", () => {
        it("should handle failure in taken branch", () => {
            const conditionalWorkflow = createTestWorkflow(
                [
                    {
                        id: "cond",
                        type: "conditional",
                        dependents: ["true-action", "false-action"]
                    },
                    {
                        id: "true-action",
                        type: "action",
                        dependencies: ["cond"],
                        dependents: ["output"]
                    },
                    {
                        id: "false-action",
                        type: "action",
                        dependencies: ["cond"],
                        dependents: ["output"]
                    },
                    { id: "output", type: "output", dependencies: ["true-action", "false-action"] }
                ],
                [
                    { id: "e1", source: "cond", target: "true-action", handleType: "true" },
                    { id: "e2", source: "cond", target: "false-action", handleType: "false" },
                    { id: "e3", source: "true-action", target: "output" },
                    { id: "e4", source: "false-action", target: "output" }
                ]
            );

            let state = initializeQueue(conditionalWorkflow);

            // Take true branch
            state = executeNode(state, "cond", { branch: "true" }, conditionalWorkflow);
            state = markSkipped(state, "false-action", conditionalWorkflow);

            // True branch fails
            state = markExecuting(state, ["true-action"]);
            state = markFailed(state, "true-action", "True branch failed", conditionalWorkflow);

            expect(state.failed.has("true-action")).toBe(true);
            expect(state.skipped.has("false-action")).toBe(true);
            expect(state.skipped.has("output")).toBe(true);

            const summary = getExecutionSummary(state);
            expect(summary.completed).toBe(1); // cond
            expect(summary.failed).toBe(1); // true-action
            expect(summary.skipped).toBe(2); // false-action, output
        });
    });

    describe("Execution State Consistency", () => {
        it("should not allow node to be in multiple states", () => {
            const workflow = createTestWorkflow(
                [
                    { id: "a", type: "action", dependents: ["b"] },
                    { id: "b", type: "action", dependencies: ["a"] }
                ],
                [{ id: "e1", source: "a", target: "b" }]
            );

            let state = initializeQueue(workflow);

            // Execute and fail
            state = markExecuting(state, ["a"]);
            expect(state.ready.has("a")).toBe(false);
            expect(state.executing.has("a")).toBe(true);

            state = markFailed(state, "a", "Error", workflow);
            expect(state.executing.has("a")).toBe(false);
            expect(state.failed.has("a")).toBe(true);
            expect(state.completed.has("a")).toBe(false);
            expect(state.skipped.has("a")).toBe(false);
        });

        it("should maintain correct counts after multiple operations", () => {
            const workflow = createTestWorkflow(
                [
                    { id: "a", type: "action", dependents: ["b", "c"] },
                    { id: "b", type: "action", dependencies: ["a"], dependents: ["d"] },
                    { id: "c", type: "action", dependencies: ["a"], dependents: ["d"] },
                    { id: "d", type: "output", dependencies: ["b", "c"] }
                ],
                [
                    { id: "e1", source: "a", target: "b" },
                    { id: "e2", source: "a", target: "c" },
                    { id: "e3", source: "b", target: "d" },
                    { id: "e4", source: "c", target: "d" }
                ]
            );

            let state = initializeQueue(workflow);

            state = executeNode(state, "a", {}, workflow);
            state = markExecuting(state, ["b"]);
            state = markFailed(state, "b", "B failed", workflow);
            state = executeNode(state, "c", {}, workflow);
            state = executeNode(state, "d", {}, workflow);

            const summary = getExecutionSummary(state);
            expect(summary.completed).toBe(3); // a, c, d
            expect(summary.failed).toBe(1); // b
            expect(summary.skipped).toBe(0);
            expect(summary.pending).toBe(0);
            expect(summary.ready).toBe(0);
            expect(summary.executing).toBe(0);

            // Verify totals add up
            const total =
                summary.completed +
                summary.failed +
                summary.skipped +
                summary.pending +
                summary.ready +
                summary.executing;
            expect(total).toBe(4);
        });
    });
});
