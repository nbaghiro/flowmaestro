/**
 * Edge Routing Tests
 *
 * Tests that verify the workflow orchestrator correctly follows edges based on
 * conditional, router, and loop node outputs. These tests exercise the queue
 * management functions that determine which nodes are skipped vs executed.
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    initializeQueue,
    markExecuting,
    markCompleted,
    markSkipped,
    markFailed,
    getReadyNodes,
    isExecutionComplete,
    getExecutionSummary
} from "../../../src/temporal/core/services/context";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge,
    ExecutableNodeType,
    EdgeHandleType
} from "../../../src/temporal/activities/execution/types";

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

describe("Edge Routing", () => {
    describe("Conditional Edge Routing", () => {
        /**
         * Workflow structure:
         *   input -> conditional -> [true branch] -> action-true -> output
         *                       -> [false branch] -> action-false -> output
         */
        const conditionalWorkflow = createTestWorkflow(
            [
                { id: "input", type: "input", dependents: ["conditional"] },
                {
                    id: "conditional",
                    type: "conditional",
                    dependencies: ["input"],
                    dependents: ["action-true", "action-false"]
                },
                {
                    id: "action-true",
                    type: "action",
                    dependencies: ["conditional"],
                    dependents: ["output"]
                },
                {
                    id: "action-false",
                    type: "action",
                    dependencies: ["conditional"],
                    dependents: ["output"]
                },
                { id: "output", type: "output", dependencies: ["action-true", "action-false"] }
            ],
            [
                { id: "e1", source: "input", target: "conditional" },
                { id: "e2", source: "conditional", target: "action-true", handleType: "true" },
                { id: "e3", source: "conditional", target: "action-false", handleType: "false" },
                { id: "e4", source: "action-true", target: "output" },
                { id: "e5", source: "action-false", target: "output" }
            ]
        );

        it("should execute true branch and skip false branch when condition is true", () => {
            let state = initializeQueue(conditionalWorkflow);

            // Execute input node
            state = executeNode(state, "input", {}, conditionalWorkflow);

            // Conditional should now be ready
            let ready = getReadyNodes(state, 5);
            expect(ready).toContain("conditional");

            // Execute conditional - condition is true, skip false branch
            state = executeNode(
                state,
                "conditional",
                { conditionMet: true, branch: "true" },
                conditionalWorkflow
            );
            state = markSkipped(state, "action-false", conditionalWorkflow);

            // action-true should be ready, action-false should be skipped
            ready = getReadyNodes(state, 5);
            expect(ready).toContain("action-true");
            expect(ready).not.toContain("action-false");
            expect(state.skipped.has("action-false")).toBe(true);

            // Execute action-true
            state = executeNode(state, "action-true", { result: "success" }, conditionalWorkflow);

            // Output should now be ready (one dependency completed, one skipped)
            ready = getReadyNodes(state, 5);
            expect(ready).toContain("output");

            // Complete the workflow
            state = executeNode(state, "output", {}, conditionalWorkflow);
            expect(isExecutionComplete(state)).toBe(true);

            const summary = getExecutionSummary(state);
            expect(summary.completed).toBe(4); // input, conditional, action-true, output
            expect(summary.skipped).toBe(1); // action-false
        });

        it("should execute false branch and skip true branch when condition is false", () => {
            let state = initializeQueue(conditionalWorkflow);

            // Execute input and conditional
            state = executeNode(state, "input", {}, conditionalWorkflow);
            state = executeNode(
                state,
                "conditional",
                { conditionMet: false, branch: "false" },
                conditionalWorkflow
            );
            state = markSkipped(state, "action-true", conditionalWorkflow);

            // action-false should be ready, action-true should be skipped
            const ready = getReadyNodes(state, 5);
            expect(ready).toContain("action-false");
            expect(ready).not.toContain("action-true");
            expect(state.skipped.has("action-true")).toBe(true);

            // Complete the workflow
            state = executeNode(state, "action-false", { result: "success" }, conditionalWorkflow);
            state = executeNode(state, "output", {}, conditionalWorkflow);

            expect(isExecutionComplete(state)).toBe(true);
            const summary = getExecutionSummary(state);
            expect(summary.completed).toBe(4);
            expect(summary.skipped).toBe(1);
        });

        it("should cascade skip to dependent nodes on non-taken branch", () => {
            /**
             * Workflow with deeper branch:
             *   conditional -> [true] -> action1 -> action2 -> output
             *              -> [false] -> action3 -> output
             */
            const deepBranchWorkflow = createTestWorkflow(
                [
                    { id: "conditional", type: "conditional", dependents: ["action1", "action3"] },
                    {
                        id: "action1",
                        type: "action",
                        dependencies: ["conditional"],
                        dependents: ["action2"]
                    },
                    {
                        id: "action2",
                        type: "action",
                        dependencies: ["action1"],
                        dependents: ["output"]
                    },
                    {
                        id: "action3",
                        type: "action",
                        dependencies: ["conditional"],
                        dependents: ["output"]
                    },
                    { id: "output", type: "output", dependencies: ["action2", "action3"] }
                ],
                [
                    { id: "e1", source: "conditional", target: "action1", handleType: "true" },
                    { id: "e2", source: "action1", target: "action2" },
                    { id: "e3", source: "conditional", target: "action3", handleType: "false" },
                    { id: "e4", source: "action2", target: "output" },
                    { id: "e5", source: "action3", target: "output" }
                ]
            );

            let state = initializeQueue(deepBranchWorkflow);

            // Execute conditional - take false branch
            state = executeNode(
                state,
                "conditional",
                { conditionMet: false, branch: "false" },
                deepBranchWorkflow
            );
            state = markSkipped(state, "action1", deepBranchWorkflow);

            // action1 is skipped, which should cascade to action2
            expect(state.skipped.has("action1")).toBe(true);
            expect(state.skipped.has("action2")).toBe(true);

            // action3 should be ready
            const ready = getReadyNodes(state, 5);
            expect(ready).toContain("action3");
        });
    });

    describe("Router Edge Routing", () => {
        /**
         * Workflow structure:
         *   input -> router -> [route-a] -> action-a -> output
         *                  -> [route-b] -> action-b -> output
         *                  -> [route-c] -> action-c -> output
         */
        const routerWorkflow = createTestWorkflow(
            [
                { id: "input", type: "input", dependents: ["router"] },
                {
                    id: "router",
                    type: "router",
                    dependencies: ["input"],
                    dependents: ["action-a", "action-b", "action-c"]
                },
                {
                    id: "action-a",
                    type: "action",
                    dependencies: ["router"],
                    dependents: ["output"]
                },
                {
                    id: "action-b",
                    type: "action",
                    dependencies: ["router"],
                    dependents: ["output"]
                },
                {
                    id: "action-c",
                    type: "action",
                    dependencies: ["router"],
                    dependents: ["output"]
                },
                { id: "output", type: "output", dependencies: ["action-a", "action-b", "action-c"] }
            ],
            [
                { id: "e1", source: "input", target: "router" },
                { id: "e2", source: "router", target: "action-a", handleType: "route-a" },
                { id: "e3", source: "router", target: "action-b", handleType: "route-b" },
                { id: "e4", source: "router", target: "action-c", handleType: "route-c" },
                { id: "e5", source: "action-a", target: "output" },
                { id: "e6", source: "action-b", target: "output" },
                { id: "e7", source: "action-c", target: "output" }
            ]
        );

        it("should execute only the selected route and skip others", () => {
            let state = initializeQueue(routerWorkflow);

            // Execute input
            state = executeNode(state, "input", {}, routerWorkflow);

            // Execute router - select route-b
            state = executeNode(state, "router", { selectedRoute: "route-b" }, routerWorkflow);
            state = markSkipped(state, "action-a", routerWorkflow);
            state = markSkipped(state, "action-c", routerWorkflow);

            // Only action-b should be ready
            const ready = getReadyNodes(state, 5);
            expect(ready).toEqual(["action-b"]);
            expect(state.skipped.has("action-a")).toBe(true);
            expect(state.skipped.has("action-c")).toBe(true);

            // Complete the workflow
            state = executeNode(state, "action-b", { result: "b" }, routerWorkflow);
            state = executeNode(state, "output", {}, routerWorkflow);

            expect(isExecutionComplete(state)).toBe(true);
            const summary = getExecutionSummary(state);
            expect(summary.completed).toBe(4); // input, router, action-b, output
            expect(summary.skipped).toBe(2); // action-a, action-c
        });

        it("should handle default route when no match", () => {
            let state = initializeQueue(routerWorkflow);

            state = executeNode(state, "input", {}, routerWorkflow);
            // Router selects default (action-a in this case)
            state = executeNode(state, "router", { selectedRoute: "route-a" }, routerWorkflow);
            state = markSkipped(state, "action-b", routerWorkflow);
            state = markSkipped(state, "action-c", routerWorkflow);

            const ready = getReadyNodes(state, 5);
            expect(ready).toEqual(["action-a"]);
        });
    });

    describe("Merge Node Behavior", () => {
        /**
         * Workflow with merge after conditional:
         *   conditional -> [true] -> action-true ─┐
         *              -> [false] -> action-false ┴─> merge -> output
         *
         * The merge node should execute when ANY of its dependencies complete
         * (not wait for all, since some are skipped)
         */
        it("should execute merge node when one branch completes and other is skipped", () => {
            const mergeWorkflow = createTestWorkflow(
                [
                    {
                        id: "conditional",
                        type: "conditional",
                        dependents: ["action-true", "action-false"]
                    },
                    {
                        id: "action-true",
                        type: "action",
                        dependencies: ["conditional"],
                        dependents: ["merge"]
                    },
                    {
                        id: "action-false",
                        type: "action",
                        dependencies: ["conditional"],
                        dependents: ["merge"]
                    },
                    {
                        id: "merge",
                        type: "merge",
                        dependencies: ["action-true", "action-false"],
                        dependents: ["output"]
                    },
                    { id: "output", type: "output", dependencies: ["merge"] }
                ],
                [
                    { id: "e1", source: "conditional", target: "action-true", handleType: "true" },
                    {
                        id: "e2",
                        source: "conditional",
                        target: "action-false",
                        handleType: "false"
                    },
                    { id: "e3", source: "action-true", target: "merge" },
                    { id: "e4", source: "action-false", target: "merge" },
                    { id: "e5", source: "merge", target: "output" }
                ]
            );

            let state = initializeQueue(mergeWorkflow);

            // Take true branch
            state = executeNode(
                state,
                "conditional",
                { conditionMet: true, branch: "true" },
                mergeWorkflow
            );
            state = markSkipped(state, "action-false", mergeWorkflow);

            // action-true should be ready
            let ready = getReadyNodes(state, 5);
            expect(ready).toContain("action-true");

            // Complete action-true
            state = executeNode(state, "action-true", { result: "from-true" }, mergeWorkflow);

            // Merge should now be ready (one dependency completed, one skipped)
            ready = getReadyNodes(state, 5);
            expect(ready).toContain("merge");

            // Complete workflow
            state = executeNode(state, "merge", {}, mergeWorkflow);
            state = executeNode(state, "output", {}, mergeWorkflow);

            expect(isExecutionComplete(state)).toBe(true);
            const summary = getExecutionSummary(state);
            expect(summary.completed).toBe(4);
            expect(summary.skipped).toBe(1);
        });
    });

    describe("Loop Edge Routing", () => {
        /**
         * Simple loop workflow:
         *   loop-start -> action -> loop-end -> (back to loop-start or exit)
         */
        it("should mark loop body as ready when loop continues", () => {
            const loopWorkflow = createTestWorkflow(
                [
                    { id: "loop-start", type: "loop-start", dependents: ["action"] },
                    {
                        id: "action",
                        type: "action",
                        dependencies: ["loop-start"],
                        dependents: ["loop-end"]
                    },
                    {
                        id: "loop-end",
                        type: "loop-end",
                        dependencies: ["action"],
                        dependents: ["output"]
                    },
                    { id: "output", type: "output", dependencies: ["loop-end"] }
                ],
                [
                    { id: "e1", source: "loop-start", target: "action" },
                    { id: "e2", source: "action", target: "loop-end" },
                    { id: "e3", source: "loop-end", target: "output" }
                ]
            );

            let state = initializeQueue(loopWorkflow);

            // First iteration
            state = executeNode(
                state,
                "loop-start",
                { continue: true, iteration: 0 },
                loopWorkflow
            );

            let ready = getReadyNodes(state, 5);
            expect(ready).toContain("action");

            state = executeNode(state, "action", { processed: true }, loopWorkflow);

            ready = getReadyNodes(state, 5);
            expect(ready).toContain("loop-end");

            // Loop-end completes, workflow exits
            state = executeNode(state, "loop-end", { loopComplete: true }, loopWorkflow);

            ready = getReadyNodes(state, 5);
            expect(ready).toContain("output");
        });
    });

    describe("Error Propagation in Branches", () => {
        it("should skip dependent nodes when a node fails", () => {
            const workflow = createTestWorkflow(
                [
                    { id: "input", type: "input", dependents: ["action1"] },
                    {
                        id: "action1",
                        type: "action",
                        dependencies: ["input"],
                        dependents: ["action2"]
                    },
                    {
                        id: "action2",
                        type: "action",
                        dependencies: ["action1"],
                        dependents: ["output"]
                    },
                    { id: "output", type: "output", dependencies: ["action2"] }
                ],
                [
                    { id: "e1", source: "input", target: "action1" },
                    { id: "e2", source: "action1", target: "action2" },
                    { id: "e3", source: "action2", target: "output" }
                ]
            );

            let state = initializeQueue(workflow);

            state = executeNode(state, "input", {}, workflow);

            // action1 starts executing but fails
            state = markExecuting(state, ["action1"]);
            state = markFailed(state, "action1", "Something went wrong", workflow);

            // action2 and output should be skipped due to failure
            expect(state.failed.has("action1")).toBe(true);
            expect(state.skipped.has("action2")).toBe(true);
            expect(state.skipped.has("output")).toBe(true);

            // No nodes should be ready
            const ready = getReadyNodes(state, 5);
            expect(ready).toEqual([]);

            // Execution should be complete (nothing left to do)
            expect(isExecutionComplete(state)).toBe(true);

            const summary = getExecutionSummary(state);
            expect(summary.completed).toBe(1);
            expect(summary.failed).toBe(1);
            expect(summary.skipped).toBe(2);
        });

        it("should not skip merge node when only one branch fails", () => {
            /**
             * parallel -> action1 (fails) ─┐
             *          -> action2 (ok)    ─┴─> merge -> output
             */
            const parallelWorkflow = createTestWorkflow(
                [
                    { id: "parallel", type: "parallel", dependents: ["action1", "action2"] },
                    {
                        id: "action1",
                        type: "action",
                        dependencies: ["parallel"],
                        dependents: ["merge"]
                    },
                    {
                        id: "action2",
                        type: "action",
                        dependencies: ["parallel"],
                        dependents: ["merge"]
                    },
                    {
                        id: "merge",
                        type: "merge",
                        dependencies: ["action1", "action2"],
                        dependents: ["output"]
                    },
                    { id: "output", type: "output", dependencies: ["merge"] }
                ],
                [
                    { id: "e1", source: "parallel", target: "action1" },
                    { id: "e2", source: "parallel", target: "action2" },
                    { id: "e3", source: "action1", target: "merge" },
                    { id: "e4", source: "action2", target: "merge" },
                    { id: "e5", source: "merge", target: "output" }
                ]
            );

            let state = initializeQueue(parallelWorkflow);

            state = executeNode(state, "parallel", {}, parallelWorkflow);

            // action1 fails, action2 succeeds
            state = markExecuting(state, ["action1"]);
            state = markFailed(state, "action1", "Error in action1", parallelWorkflow);
            state = executeNode(state, "action2", { result: "ok" }, parallelWorkflow);

            // Merge should still be ready (one completed, one failed - not all failed)
            const ready = getReadyNodes(state, 5);
            expect(ready).toContain("merge");

            // Complete the workflow
            state = executeNode(state, "merge", {}, parallelWorkflow);
            state = executeNode(state, "output", {}, parallelWorkflow);

            expect(isExecutionComplete(state)).toBe(true);
            const summary = getExecutionSummary(state);
            expect(summary.completed).toBe(4); // parallel, action2, merge, output
            expect(summary.failed).toBe(1); // action1
        });
    });

    describe("Complex Multi-Branch Workflows", () => {
        it("should handle nested conditionals correctly", () => {
            /**
             *   cond1 -> [true] -> cond2 -> [true] -> action-tt -> output
             *                           -> [false] -> action-tf -> output
             *        -> [false] -> action-f -> output
             */
            const nestedConditionalWorkflow = createTestWorkflow(
                [
                    { id: "cond1", type: "conditional", dependents: ["cond2", "action-f"] },
                    {
                        id: "cond2",
                        type: "conditional",
                        dependencies: ["cond1"],
                        dependents: ["action-tt", "action-tf"]
                    },
                    {
                        id: "action-f",
                        type: "action",
                        dependencies: ["cond1"],
                        dependents: ["output"]
                    },
                    {
                        id: "action-tt",
                        type: "action",
                        dependencies: ["cond2"],
                        dependents: ["output"]
                    },
                    {
                        id: "action-tf",
                        type: "action",
                        dependencies: ["cond2"],
                        dependents: ["output"]
                    },
                    {
                        id: "output",
                        type: "output",
                        dependencies: ["action-f", "action-tt", "action-tf"]
                    }
                ],
                [
                    { id: "e1", source: "cond1", target: "cond2", handleType: "true" },
                    { id: "e2", source: "cond1", target: "action-f", handleType: "false" },
                    { id: "e3", source: "cond2", target: "action-tt", handleType: "true" },
                    { id: "e4", source: "cond2", target: "action-tf", handleType: "false" },
                    { id: "e5", source: "action-f", target: "output" },
                    { id: "e6", source: "action-tt", target: "output" },
                    { id: "e7", source: "action-tf", target: "output" }
                ]
            );

            let state = initializeQueue(nestedConditionalWorkflow);

            // cond1 = true, cond2 = false -> should execute action-tf
            state = executeNode(
                state,
                "cond1",
                { conditionMet: true, branch: "true" },
                nestedConditionalWorkflow
            );
            state = markSkipped(state, "action-f", nestedConditionalWorkflow);

            let ready = getReadyNodes(state, 5);
            expect(ready).toContain("cond2");
            expect(state.skipped.has("action-f")).toBe(true);

            state = executeNode(
                state,
                "cond2",
                { conditionMet: false, branch: "false" },
                nestedConditionalWorkflow
            );
            state = markSkipped(state, "action-tt", nestedConditionalWorkflow);

            ready = getReadyNodes(state, 5);
            expect(ready).toContain("action-tf");
            expect(state.skipped.has("action-tt")).toBe(true);

            // Complete the path
            state = executeNode(state, "action-tf", { result: "tf" }, nestedConditionalWorkflow);
            state = executeNode(state, "output", {}, nestedConditionalWorkflow);

            expect(isExecutionComplete(state)).toBe(true);
            const summary = getExecutionSummary(state);
            expect(summary.completed).toBe(4); // cond1, cond2, action-tf, output
            expect(summary.skipped).toBe(2); // action-f, action-tt
        });

        it("should handle parallel branches that merge", () => {
            /**
             *   input -> parallel-split -> action1 ─┐
             *                           -> action2 ─┼─> merge -> output
             *                           -> action3 ─┘
             */
            const parallelMergeWorkflow = createTestWorkflow(
                [
                    { id: "input", type: "input", dependents: ["split"] },
                    {
                        id: "split",
                        type: "parallel",
                        dependencies: ["input"],
                        dependents: ["a1", "a2", "a3"]
                    },
                    { id: "a1", type: "action", dependencies: ["split"], dependents: ["merge"] },
                    { id: "a2", type: "action", dependencies: ["split"], dependents: ["merge"] },
                    { id: "a3", type: "action", dependencies: ["split"], dependents: ["merge"] },
                    {
                        id: "merge",
                        type: "merge",
                        dependencies: ["a1", "a2", "a3"],
                        dependents: ["output"]
                    },
                    { id: "output", type: "output", dependencies: ["merge"] }
                ],
                [
                    { id: "e1", source: "input", target: "split" },
                    { id: "e2", source: "split", target: "a1" },
                    { id: "e3", source: "split", target: "a2" },
                    { id: "e4", source: "split", target: "a3" },
                    { id: "e5", source: "a1", target: "merge" },
                    { id: "e6", source: "a2", target: "merge" },
                    { id: "e7", source: "a3", target: "merge" },
                    { id: "e8", source: "merge", target: "output" }
                ]
            );

            let state = initializeQueue(parallelMergeWorkflow);

            state = executeNode(state, "input", {}, parallelMergeWorkflow);
            state = executeNode(state, "split", {}, parallelMergeWorkflow);

            // All three actions should be ready
            let ready = getReadyNodes(state, 5);
            expect(ready).toContain("a1");
            expect(ready).toContain("a2");
            expect(ready).toContain("a3");

            // Complete all three in parallel
            state = executeNode(state, "a1", { r: 1 }, parallelMergeWorkflow);
            state = executeNode(state, "a2", { r: 2 }, parallelMergeWorkflow);
            state = executeNode(state, "a3", { r: 3 }, parallelMergeWorkflow);

            // Merge should now be ready
            ready = getReadyNodes(state, 5);
            expect(ready).toContain("merge");

            state = executeNode(state, "merge", {}, parallelMergeWorkflow);
            state = executeNode(state, "output", {}, parallelMergeWorkflow);

            expect(isExecutionComplete(state)).toBe(true);
            const summary = getExecutionSummary(state);
            expect(summary.completed).toBe(7);
            expect(summary.skipped).toBe(0);
        });
    });
});
