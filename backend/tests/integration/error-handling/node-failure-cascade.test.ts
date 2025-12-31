/**
 * Node Failure Cascade Integration Tests
 *
 * Tests for error propagation and cascade behavior:
 * - Single node failure stops workflow
 * - Failure cascades to dependent nodes (marked skipped)
 * - Independent branches continue after sibling failure
 * - Error details preserved in context
 * - Context snapshot at point of failure
 */

import type { WorkflowDefinition } from "@flowmaestro/shared";
import {
    createContext,
    storeNodeOutput,
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    markFailed,
    markSkipped,
    isExecutionComplete,
    getExecutionSummary
} from "../../../src/temporal/core/services/context";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge
} from "../../../src/temporal/activities/execution/types";
import type { ContextSnapshot, ExecutionQueueState } from "../../../src/temporal/core/types";

// ============================================================================
// HELPER TYPES
// ============================================================================

interface NodeError {
    nodeId: string;
    errorType: string;
    message: string;
    timestamp: number;
    stack?: string;
}

interface ExecutionResult {
    context: ContextSnapshot;
    queue: ExecutionQueueState;
    completedNodes: string[];
    failedNodes: string[];
    skippedNodes: string[];
    errors: NodeError[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a linear workflow: A -> B -> C -> D
 */
function createLinearWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>([
        [
            "A",
            {
                id: "A",
                type: "input",
                name: "A",
                config: {},
                depth: 0,
                dependencies: [],
                dependents: ["B"]
            }
        ],
        [
            "B",
            {
                id: "B",
                type: "transform",
                name: "B",
                config: {},
                depth: 1,
                dependencies: ["A"],
                dependents: ["C"]
            }
        ],
        [
            "C",
            {
                id: "C",
                type: "transform",
                name: "C",
                config: {},
                depth: 2,
                dependencies: ["B"],
                dependents: ["D"]
            }
        ],
        [
            "D",
            {
                id: "D",
                type: "output",
                name: "D",
                config: {},
                depth: 3,
                dependencies: ["C"],
                dependents: []
            }
        ]
    ]);

    const edges = new Map<string, TypedEdge>([
        [
            "A-B",
            {
                id: "A-B",
                source: "A",
                target: "B",
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            }
        ],
        [
            "B-C",
            {
                id: "B-C",
                source: "B",
                target: "C",
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            }
        ],
        [
            "C-D",
            {
                id: "C-D",
                source: "C",
                target: "D",
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            }
        ]
    ]);

    return {
        originalDefinition: {} as WorkflowDefinition,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["A"], ["B"], ["C"], ["D"]],
        triggerNodeId: "A",
        outputNodeIds: ["D"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a diamond workflow: A -> B,C -> D
 */
function createDiamondWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>([
        [
            "A",
            {
                id: "A",
                type: "input",
                name: "A",
                config: {},
                depth: 0,
                dependencies: [],
                dependents: ["B", "C"]
            }
        ],
        [
            "B",
            {
                id: "B",
                type: "transform",
                name: "B",
                config: {},
                depth: 1,
                dependencies: ["A"],
                dependents: ["D"]
            }
        ],
        [
            "C",
            {
                id: "C",
                type: "transform",
                name: "C",
                config: {},
                depth: 1,
                dependencies: ["A"],
                dependents: ["D"]
            }
        ],
        [
            "D",
            {
                id: "D",
                type: "output",
                name: "D",
                config: {},
                depth: 2,
                dependencies: ["B", "C"],
                dependents: []
            }
        ]
    ]);

    const edges = new Map<string, TypedEdge>([
        [
            "A-B",
            {
                id: "A-B",
                source: "A",
                target: "B",
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            }
        ],
        [
            "A-C",
            {
                id: "A-C",
                source: "A",
                target: "C",
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            }
        ],
        [
            "B-D",
            {
                id: "B-D",
                source: "B",
                target: "D",
                sourceHandle: "output",
                targetHandle: "b",
                handleType: "default"
            }
        ],
        [
            "C-D",
            {
                id: "C-D",
                source: "C",
                target: "D",
                sourceHandle: "output",
                targetHandle: "c",
                handleType: "default"
            }
        ]
    ]);

    return {
        originalDefinition: {} as WorkflowDefinition,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["A"], ["B", "C"], ["D"]],
        triggerNodeId: "A",
        outputNodeIds: ["D"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a parallel workflow with independent branches
 */
function createParallelIndependentWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>([
        [
            "Input",
            {
                id: "Input",
                type: "input",
                name: "Input",
                config: {},
                depth: 0,
                dependencies: [],
                dependents: ["Branch1", "Branch2"]
            }
        ],
        [
            "Branch1",
            {
                id: "Branch1",
                type: "transform",
                name: "Branch1",
                config: {},
                depth: 1,
                dependencies: ["Input"],
                dependents: ["Output1"]
            }
        ],
        [
            "Branch2",
            {
                id: "Branch2",
                type: "transform",
                name: "Branch2",
                config: {},
                depth: 1,
                dependencies: ["Input"],
                dependents: ["Output2"]
            }
        ],
        [
            "Output1",
            {
                id: "Output1",
                type: "output",
                name: "Output1",
                config: {},
                depth: 2,
                dependencies: ["Branch1"],
                dependents: []
            }
        ],
        [
            "Output2",
            {
                id: "Output2",
                type: "output",
                name: "Output2",
                config: {},
                depth: 2,
                dependencies: ["Branch2"],
                dependents: []
            }
        ]
    ]);

    const edges = new Map<string, TypedEdge>([
        [
            "Input-Branch1",
            {
                id: "Input-Branch1",
                source: "Input",
                target: "Branch1",
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            }
        ],
        [
            "Input-Branch2",
            {
                id: "Input-Branch2",
                source: "Input",
                target: "Branch2",
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            }
        ],
        [
            "Branch1-Output1",
            {
                id: "Branch1-Output1",
                source: "Branch1",
                target: "Output1",
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            }
        ],
        [
            "Branch2-Output2",
            {
                id: "Branch2-Output2",
                source: "Branch2",
                target: "Output2",
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            }
        ]
    ]);

    return {
        originalDefinition: {} as WorkflowDefinition,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], ["Branch1", "Branch2"], ["Output1", "Output2"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output1", "Output2"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate workflow execution with configurable failures
 */
async function simulateWorkflowWithFailures(
    workflow: BuiltWorkflow,
    failingNodes: Map<string, { errorType: string; message: string }>,
    skipCascade: boolean = true
): Promise<ExecutionResult> {
    let context = createContext({});
    let queue = initializeQueue(workflow);
    const completedNodes: string[] = [];
    const failedNodes: string[] = [];
    const skippedNodes: string[] = [];
    const errors: NodeError[] = [];

    while (!isExecutionComplete(queue)) {
        const readyNodes = getReadyNodes(queue, workflow.maxConcurrentNodes);
        if (readyNodes.length === 0) break;

        queue = markExecuting(queue, readyNodes);

        for (const nodeId of readyNodes) {
            const failureConfig = failingNodes.get(nodeId);

            if (failureConfig) {
                // Node fails
                const error: NodeError = {
                    nodeId,
                    errorType: failureConfig.errorType,
                    message: failureConfig.message,
                    timestamp: Date.now()
                };
                errors.push(error);

                context = storeNodeOutput(context, nodeId, {
                    error: true,
                    errorType: failureConfig.errorType,
                    message: failureConfig.message
                });

                queue = markFailed(queue, nodeId, new Error(failureConfig.message), workflow);
                failedNodes.push(nodeId);

                // Cascade skip to dependents if enabled
                if (skipCascade) {
                    const node = workflow.nodes.get(nodeId);
                    if (node) {
                        for (const dependentId of node.dependents) {
                            if (
                                !queue.completed.has(dependentId) &&
                                !queue.failed.has(dependentId)
                            ) {
                                queue = markSkipped(queue, dependentId, workflow);
                                skippedNodes.push(dependentId);
                            }
                        }
                    }
                }
            } else {
                // Node succeeds
                const output = { nodeId, success: true, timestamp: Date.now() };
                context = storeNodeOutput(context, nodeId, output);
                queue = markCompleted(queue, nodeId, output, workflow);
                completedNodes.push(nodeId);
            }
        }
    }

    return { context, queue, completedNodes, failedNodes, skippedNodes, errors };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Node Failure Cascade", () => {
    describe("single node failure stops workflow", () => {
        it("should stop execution when first node fails", async () => {
            const workflow = createLinearWorkflow();
            const failingNodes = new Map([
                ["A", { errorType: "ValidationError", message: "Invalid input" }]
            ]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            expect(result.failedNodes).toContain("A");
            expect(result.completedNodes).not.toContain("B");
            expect(result.completedNodes).not.toContain("C");
            expect(result.completedNodes).not.toContain("D");
        });

        it("should stop execution when middle node fails", async () => {
            const workflow = createLinearWorkflow();
            const failingNodes = new Map([
                ["B", { errorType: "ProcessingError", message: "Processing failed" }]
            ]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            expect(result.completedNodes).toContain("A");
            expect(result.failedNodes).toContain("B");
            expect(result.skippedNodes).toContain("C");
        });

        it("should mark workflow as incomplete after failure", async () => {
            const workflow = createLinearWorkflow();
            const failingNodes = new Map([
                ["C", { errorType: "RuntimeError", message: "Unexpected error" }]
            ]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);
            const summary = getExecutionSummary(result.queue);

            expect(summary.completed).toBeLessThan(workflow.nodes.size);
            expect(summary.failed).toBeGreaterThan(0);
        });
    });

    describe("failure cascades to dependent nodes", () => {
        it("should skip all downstream nodes after failure", async () => {
            const workflow = createLinearWorkflow();
            const failingNodes = new Map([["B", { errorType: "Error", message: "Failed" }]]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            expect(result.completedNodes).toEqual(["A"]);
            expect(result.failedNodes).toEqual(["B"]);
            expect(result.skippedNodes).toContain("C");
        });

        it("should cascade skip through multiple levels", async () => {
            // Create deeper workflow: A -> B -> C -> D -> E
            const nodes = new Map<string, ExecutableNode>([
                [
                    "A",
                    {
                        id: "A",
                        type: "input",
                        name: "A",
                        config: {},
                        depth: 0,
                        dependencies: [],
                        dependents: ["B"]
                    }
                ],
                [
                    "B",
                    {
                        id: "B",
                        type: "transform",
                        name: "B",
                        config: {},
                        depth: 1,
                        dependencies: ["A"],
                        dependents: ["C"]
                    }
                ],
                [
                    "C",
                    {
                        id: "C",
                        type: "transform",
                        name: "C",
                        config: {},
                        depth: 2,
                        dependencies: ["B"],
                        dependents: ["D"]
                    }
                ],
                [
                    "D",
                    {
                        id: "D",
                        type: "transform",
                        name: "D",
                        config: {},
                        depth: 3,
                        dependencies: ["C"],
                        dependents: ["E"]
                    }
                ],
                [
                    "E",
                    {
                        id: "E",
                        type: "output",
                        name: "E",
                        config: {},
                        depth: 4,
                        dependencies: ["D"],
                        dependents: []
                    }
                ]
            ]);

            const workflow: BuiltWorkflow = {
                originalDefinition: {} as WorkflowDefinition,
                buildTimestamp: Date.now(),
                nodes,
                edges: new Map(),
                executionLevels: [["A"], ["B"], ["C"], ["D"], ["E"]],
                triggerNodeId: "A",
                outputNodeIds: ["E"],
                loopContexts: new Map(),
                maxConcurrentNodes: 10
            };

            const failingNodes = new Map([["B", { errorType: "Error", message: "Failed at B" }]]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            expect(result.completedNodes).toEqual(["A"]);
            expect(result.failedNodes).toEqual(["B"]);
            // C should be skipped, and its dependents marked for skip in subsequent iterations
            expect(result.skippedNodes).toContain("C");
        });

        it("should mark dependents as skipped in queue state", async () => {
            const workflow = createLinearWorkflow();
            const failingNodes = new Map([["B", { errorType: "Error", message: "Failed" }]]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            expect(result.queue.skipped.has("C")).toBe(true);
        });
    });

    describe("independent branches continue after sibling failure", () => {
        it("should complete independent branch when sibling fails", async () => {
            const workflow = createParallelIndependentWorkflow();
            const failingNodes = new Map([
                ["Branch1", { errorType: "Error", message: "Branch1 failed" }]
            ]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            expect(result.completedNodes).toContain("Input");
            expect(result.failedNodes).toContain("Branch1");
            expect(result.skippedNodes).toContain("Output1");

            // Branch2 and Output2 should still complete
            expect(result.completedNodes).toContain("Branch2");
            expect(result.completedNodes).toContain("Output2");
        });

        it("should handle multiple independent failures", async () => {
            const workflow = createParallelIndependentWorkflow();
            const failingNodes = new Map([
                ["Branch1", { errorType: "Error", message: "Branch1 failed" }],
                ["Branch2", { errorType: "Error", message: "Branch2 failed" }]
            ]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            expect(result.completedNodes).toEqual(["Input"]);
            expect(result.failedNodes).toContain("Branch1");
            expect(result.failedNodes).toContain("Branch2");
            expect(result.skippedNodes).toContain("Output1");
            expect(result.skippedNodes).toContain("Output2");
        });

        it("should not affect unrelated branches", async () => {
            // Create workflow with 3 independent branches
            const nodes = new Map<string, ExecutableNode>([
                [
                    "Input",
                    {
                        id: "Input",
                        type: "input",
                        name: "Input",
                        config: {},
                        depth: 0,
                        dependencies: [],
                        dependents: ["B1", "B2", "B3"]
                    }
                ],
                [
                    "B1",
                    {
                        id: "B1",
                        type: "transform",
                        name: "B1",
                        config: {},
                        depth: 1,
                        dependencies: ["Input"],
                        dependents: ["O1"]
                    }
                ],
                [
                    "B2",
                    {
                        id: "B2",
                        type: "transform",
                        name: "B2",
                        config: {},
                        depth: 1,
                        dependencies: ["Input"],
                        dependents: ["O2"]
                    }
                ],
                [
                    "B3",
                    {
                        id: "B3",
                        type: "transform",
                        name: "B3",
                        config: {},
                        depth: 1,
                        dependencies: ["Input"],
                        dependents: ["O3"]
                    }
                ],
                [
                    "O1",
                    {
                        id: "O1",
                        type: "output",
                        name: "O1",
                        config: {},
                        depth: 2,
                        dependencies: ["B1"],
                        dependents: []
                    }
                ],
                [
                    "O2",
                    {
                        id: "O2",
                        type: "output",
                        name: "O2",
                        config: {},
                        depth: 2,
                        dependencies: ["B2"],
                        dependents: []
                    }
                ],
                [
                    "O3",
                    {
                        id: "O3",
                        type: "output",
                        name: "O3",
                        config: {},
                        depth: 2,
                        dependencies: ["B3"],
                        dependents: []
                    }
                ]
            ]);

            const workflow: BuiltWorkflow = {
                originalDefinition: {} as WorkflowDefinition,
                buildTimestamp: Date.now(),
                nodes,
                edges: new Map(),
                executionLevels: [["Input"], ["B1", "B2", "B3"], ["O1", "O2", "O3"]],
                triggerNodeId: "Input",
                outputNodeIds: ["O1", "O2", "O3"],
                loopContexts: new Map(),
                maxConcurrentNodes: 10
            };

            const failingNodes = new Map([["B2", { errorType: "Error", message: "B2 failed" }]]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            // B1 and B3 branches should complete
            expect(result.completedNodes).toContain("B1");
            expect(result.completedNodes).toContain("O1");
            expect(result.completedNodes).toContain("B3");
            expect(result.completedNodes).toContain("O3");

            // Only B2 branch should fail/skip
            expect(result.failedNodes).toEqual(["B2"]);
            expect(result.skippedNodes).toContain("O2");
        });
    });

    describe("diamond workflow failure handling", () => {
        it("should skip join node when one branch fails", async () => {
            const workflow = createDiamondWorkflow();
            const failingNodes = new Map([["B", { errorType: "Error", message: "B failed" }]]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            expect(result.completedNodes).toContain("A");
            expect(result.failedNodes).toContain("B");
            expect(result.completedNodes).toContain("C");
            // D depends on both B and C, so it gets skipped when B fails
            expect(result.skippedNodes).toContain("D");
        });

        it("should handle both branches failing", async () => {
            const workflow = createDiamondWorkflow();
            const failingNodes = new Map([
                ["B", { errorType: "Error", message: "B failed" }],
                ["C", { errorType: "Error", message: "C failed" }]
            ]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            expect(result.completedNodes).toEqual(["A"]);
            expect(result.failedNodes).toContain("B");
            expect(result.failedNodes).toContain("C");
            expect(result.skippedNodes).toContain("D");
        });
    });

    describe("error details preserved in context", () => {
        it("should store error output in context", async () => {
            const workflow = createLinearWorkflow();
            const failingNodes = new Map([
                ["B", { errorType: "ValidationError", message: "Invalid data format" }]
            ]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            const errorOutput = result.context.nodeOutputs.get("B");
            expect(errorOutput).toEqual({
                error: true,
                errorType: "ValidationError",
                message: "Invalid data format"
            });
        });

        it("should preserve error type and message", async () => {
            const workflow = createLinearWorkflow();
            const failingNodes = new Map([
                ["C", { errorType: "NetworkError", message: "Connection timeout" }]
            ]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toMatchObject({
                nodeId: "C",
                errorType: "NetworkError",
                message: "Connection timeout"
            });
        });

        it("should include timestamp in error details", async () => {
            const workflow = createLinearWorkflow();
            const beforeTime = Date.now();

            const failingNodes = new Map([["B", { errorType: "Error", message: "Test error" }]]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);
            const afterTime = Date.now();

            expect(result.errors[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
            expect(result.errors[0].timestamp).toBeLessThanOrEqual(afterTime);
        });

        it("should store multiple errors for multiple failures", async () => {
            const workflow = createParallelIndependentWorkflow();
            const failingNodes = new Map([
                ["Branch1", { errorType: "Error1", message: "First error" }],
                ["Branch2", { errorType: "Error2", message: "Second error" }]
            ]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            expect(result.errors).toHaveLength(2);
            expect(result.errors.map((e) => e.nodeId).sort()).toEqual(["Branch1", "Branch2"]);
        });
    });

    describe("context snapshot at point of failure", () => {
        it("should preserve completed node outputs before failure", async () => {
            const workflow = createLinearWorkflow();
            const failingNodes = new Map([["C", { errorType: "Error", message: "Failed at C" }]]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            // A and B completed before C failed
            expect(result.context.nodeOutputs.has("A")).toBe(true);
            expect(result.context.nodeOutputs.has("B")).toBe(true);
            expect(result.context.nodeOutputs.get("A")).toHaveProperty("success", true);
            expect(result.context.nodeOutputs.get("B")).toHaveProperty("success", true);
        });

        it("should not have outputs for skipped nodes", async () => {
            const workflow = createLinearWorkflow();
            const failingNodes = new Map([["B", { errorType: "Error", message: "Failed at B" }]]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            // C and D were skipped, should not have success outputs
            const cOutput = result.context.nodeOutputs.get("C");
            const dOutput = result.context.nodeOutputs.get("D");

            // Skipped nodes don't get outputs stored
            expect(cOutput).toBeUndefined();
            expect(dOutput).toBeUndefined();
        });

        it("should maintain context metadata after failure", async () => {
            const workflow = createLinearWorkflow();
            const failingNodes = new Map([["C", { errorType: "Error", message: "Failed" }]]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            expect(result.context.metadata).toBeDefined();
            expect(result.context.metadata.nodeCount).toBeGreaterThan(0);
        });
    });

    describe("execution summary after failure", () => {
        it("should report correct counts after single failure", async () => {
            const workflow = createLinearWorkflow();
            const failingNodes = new Map([["B", { errorType: "Error", message: "Failed" }]]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);
            const summary = getExecutionSummary(result.queue);

            expect(summary.completed).toBe(1); // A
            expect(summary.failed).toBe(1); // B
            expect(summary.skipped).toBeGreaterThanOrEqual(1); // C (and possibly D)
        });

        it("should report correct counts after multiple failures", async () => {
            const workflow = createParallelIndependentWorkflow();
            const failingNodes = new Map([
                ["Branch1", { errorType: "Error", message: "Failed 1" }],
                ["Branch2", { errorType: "Error", message: "Failed 2" }]
            ]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);
            const summary = getExecutionSummary(result.queue);

            expect(summary.completed).toBe(1); // Input
            expect(summary.failed).toBe(2); // Branch1, Branch2
            expect(summary.skipped).toBe(2); // Output1, Output2
        });
    });

    describe("error types", () => {
        it("should handle validation errors", async () => {
            const workflow = createLinearWorkflow();
            const failingNodes = new Map([
                ["A", { errorType: "ValidationError", message: "Required field missing" }]
            ]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            expect(result.errors[0].errorType).toBe("ValidationError");
        });

        it("should handle network errors", async () => {
            const workflow = createLinearWorkflow();
            const failingNodes = new Map([
                ["B", { errorType: "NetworkError", message: "ECONNREFUSED" }]
            ]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            expect(result.errors[0].errorType).toBe("NetworkError");
        });

        it("should handle timeout errors", async () => {
            const workflow = createLinearWorkflow();
            const failingNodes = new Map([
                ["B", { errorType: "TimeoutError", message: "Operation timed out after 30000ms" }]
            ]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            expect(result.errors[0].errorType).toBe("TimeoutError");
        });

        it("should handle rate limit errors", async () => {
            const workflow = createLinearWorkflow();
            const failingNodes = new Map([
                ["B", { errorType: "RateLimitError", message: "Too many requests" }]
            ]);

            const result = await simulateWorkflowWithFailures(workflow, failingNodes);

            expect(result.errors[0].errorType).toBe("RateLimitError");
        });
    });
});
