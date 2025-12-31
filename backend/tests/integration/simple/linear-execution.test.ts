/**
 * Linear Execution Integration Tests
 *
 * Tests for simple linear workflow execution patterns:
 * - Single node execution
 * - Multi-node chains
 * - Variable passing between nodes
 * - Context accumulation
 */

import type { WorkflowDefinition } from "@flowmaestro/shared";
import {
    createContext,
    storeNodeOutput,
    getExecutionContext,
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    isExecutionComplete,
    getExecutionSummary,
    buildFinalOutputs
} from "../../../src/temporal/core/services/context";
import { createMockActivities, withOutputs } from "../../fixtures/activities";
import { createLinearWorkflow } from "../../fixtures/workflows";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge
} from "../../../src/temporal/activities/execution/types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a simple chain workflow: A -> B -> C -> ... -> Output
 */
function createChainWorkflow(nodeCount: number): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();
    const executionLevels: string[][] = [];

    const nodeIds = Array.from({ length: nodeCount }, (_, i) =>
        i === 0 ? "Input" : i === nodeCount - 1 ? "Output" : `Node${i}`
    );

    for (let i = 0; i < nodeCount; i++) {
        const nodeId = nodeIds[i];
        const isFirst = i === 0;
        const isLast = i === nodeCount - 1;

        nodes.set(nodeId, {
            id: nodeId,
            type: isFirst ? "input" : isLast ? "output" : "transform",
            name: nodeId,
            config: { step: i },
            depth: i,
            dependencies: isFirst ? [] : [nodeIds[i - 1]],
            dependents: isLast ? [] : [nodeIds[i + 1]]
        });

        if (i > 0) {
            const edgeId = `${nodeIds[i - 1]}-${nodeId}`;
            edges.set(edgeId, {
                id: edgeId,
                source: nodeIds[i - 1],
                target: nodeId,
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            });
        }

        executionLevels.push([nodeId]);
    }

    return {
        originalDefinition: {} as WorkflowDefinition,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels,
        triggerNodeId: nodeIds[0],
        outputNodeIds: [nodeIds[nodeCount - 1]],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate full workflow execution
 */
async function simulateWorkflowExecution(
    workflow: BuiltWorkflow,
    mockActivities: ReturnType<typeof createMockActivities>,
    inputs: Record<string, unknown> = {}
) {
    let context = createContext(inputs);
    let queue = initializeQueue(workflow);

    while (!isExecutionComplete(queue)) {
        const readyNodes = getReadyNodes(queue, workflow.maxConcurrentNodes);

        if (readyNodes.length === 0) {
            throw new Error("Deadlock detected: no ready nodes but execution not complete");
        }

        // Mark nodes as executing
        queue = markExecuting(queue, readyNodes);

        // Execute each ready node
        for (const nodeId of readyNodes) {
            const node = workflow.nodes.get(nodeId);
            if (!node) continue;

            // Simulate activity execution
            const result = await mockActivities.executeNode(node.type, node.config, context, {
                nodeId,
                executionId: "test-exec",
                workflowName: "test"
            });

            if (result.success) {
                context = storeNodeOutput(context, nodeId, result.output);
                queue = markCompleted(queue, nodeId, result.output, workflow);
            } else {
                throw new Error(result.error || `Node ${nodeId} failed`);
            }
        }
    }

    return {
        context,
        queue,
        executionLog: mockActivities.getExecutionLog()
    };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Linear Execution", () => {
    describe("single node execution", () => {
        it("should execute a single input->output workflow", async () => {
            const workflow = createChainWorkflow(2); // Input -> Output
            const mockActivities = createMockActivities({});

            const result = await simulateWorkflowExecution(workflow, mockActivities, {
                value: "test-input"
            });

            expect(isExecutionComplete(result.queue)).toBe(true);
            expect(result.queue.completed.size).toBe(2);
            expect(mockActivities.getExecutionOrder()).toEqual(["Input", "Output"]);
        });

        it("should pass inputs to the first node", async () => {
            const workflow = createChainWorkflow(2);
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: {
                        customOutput: { received: true, inputValue: "test-data" }
                    }
                }
            });

            const result = await simulateWorkflowExecution(workflow, mockActivities, {
                data: "test-data"
            });

            expect(result.context.nodeOutputs.get("Input")).toEqual({
                received: true,
                inputValue: "test-data"
            });
        });
    });

    describe("three-node chain", () => {
        it("should execute nodes in order: A -> B -> C", async () => {
            const workflow = createLinearWorkflow(); // A -> B -> C
            const mockActivities = createMockActivities({});

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(result.queue.completed.size).toBe(3);
            expect(mockActivities.getExecutionOrder()).toEqual(["A", "B", "C"]);
        });

        it("should accumulate outputs in context", async () => {
            const workflow = createLinearWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    A: { step: 1, value: "A-output" },
                    B: { step: 2, value: "B-output" },
                    C: { step: 3, value: "C-output" }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(result.context.nodeOutputs.size).toBe(3);
            expect(result.context.nodeOutputs.get("A")).toEqual({ step: 1, value: "A-output" });
            expect(result.context.nodeOutputs.get("B")).toEqual({ step: 2, value: "B-output" });
            expect(result.context.nodeOutputs.get("C")).toEqual({ step: 3, value: "C-output" });
        });

        it("should make all outputs available in execution context", async () => {
            const workflow = createLinearWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    A: { result: "A" },
                    B: { result: "B" },
                    C: { result: "C" }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);
            const execContext = getExecutionContext(result.context);

            expect(execContext.A).toEqual({ result: "A" });
            expect(execContext.B).toEqual({ result: "B" });
            expect(execContext.C).toEqual({ result: "C" });
        });
    });

    describe("five-node chain", () => {
        it("should execute five nodes in sequence", async () => {
            const workflow = createChainWorkflow(5);
            const mockActivities = createMockActivities({});

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(result.queue.completed.size).toBe(5);
            expect(mockActivities.getExecutionOrder()).toEqual([
                "Input",
                "Node1",
                "Node2",
                "Node3",
                "Output"
            ]);
        });

        it("should preserve order even with varying execution times", async () => {
            const workflow = createChainWorkflow(5);
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Node1: { delay: 50 },
                    Node2: { delay: 10 },
                    Node3: { delay: 30 }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            // Order should be preserved despite delays
            expect(mockActivities.getExecutionOrder()).toEqual([
                "Input",
                "Node1",
                "Node2",
                "Node3",
                "Output"
            ]);
        });
    });

    describe("variable interpolation", () => {
        it("should make previous node outputs available", async () => {
            const workflow = createChainWorkflow(3);
            let capturedContext: Record<string, unknown> | null = null;

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { message: "Hello" } },
                    Node1: {
                        customOutput: { transformed: "Processed" },
                        onExecute: (input) => {
                            // Capture the context when Node1 executes
                            capturedContext = getExecutionContext(input.context);
                        }
                    }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            // Node1 should have seen Input's output
            expect(capturedContext).toBeDefined();
            expect((capturedContext as Record<string, unknown>).Input).toEqual({
                message: "Hello"
            });
        });

        it("should accumulate all previous outputs", async () => {
            const workflow = createChainWorkflow(4);
            let capturedContextAtNode2: Record<string, unknown> | null = null;

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { step: 0 } },
                    Node1: { customOutput: { step: 1 } },
                    Node2: {
                        customOutput: { step: 2 },
                        onExecute: (input) => {
                            capturedContextAtNode2 = getExecutionContext(input.context);
                        }
                    }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            // Node2 should see both Input and Node1 outputs
            expect(capturedContextAtNode2).toBeDefined();
            expect((capturedContextAtNode2 as Record<string, unknown>).Input).toEqual({ step: 0 });
            expect((capturedContextAtNode2 as Record<string, unknown>).Node1).toEqual({ step: 1 });
        });
    });

    describe("context accumulation", () => {
        it("should track node count in metadata", async () => {
            const workflow = createChainWorkflow(5);
            const mockActivities = createMockActivities({});

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(result.context.metadata.nodeCount).toBe(5);
        });

        it("should track total size in metadata", async () => {
            const workflow = createChainWorkflow(3);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { data: "small" },
                    Node1: { data: "medium-length-data" },
                    Output: { data: "even-more-data-here" }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(result.context.metadata.totalSizeBytes).toBeGreaterThan(0);
        });

        it("should maintain inputs separately from outputs", async () => {
            const workflow = createChainWorkflow(2);
            const mockActivities = createMockActivities({});

            const result = await simulateWorkflowExecution(workflow, mockActivities, {
                originalInput: "preserved"
            });

            // Inputs should be preserved
            expect(result.context.inputs).toEqual({ originalInput: "preserved" });

            // Outputs should be separate
            expect(result.context.nodeOutputs.has("Input")).toBe(true);
        });
    });

    describe("final outputs", () => {
        it("should build final outputs from output nodes", async () => {
            const workflow = createLinearWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    A: { ignored: true },
                    B: { also: "ignored" },
                    C: { finalResult: "success", value: 42 }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);
            const finalOutputs = buildFinalOutputs(result.context, workflow.outputNodeIds);

            // buildFinalOutputs merges output node outputs into a flat object
            expect(finalOutputs).toEqual({ finalResult: "success", value: 42 });
        });

        it("should include all output nodes in final outputs", async () => {
            // Create workflow with multiple output nodes
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
                        type: "output",
                        name: "B",
                        config: {},
                        depth: 1,
                        dependencies: ["A"],
                        dependents: []
                    }
                ],
                [
                    "C",
                    {
                        id: "C",
                        type: "output",
                        name: "C",
                        config: {},
                        depth: 1,
                        dependencies: ["A"],
                        dependents: []
                    }
                ]
            ]);

            const workflow: BuiltWorkflow = {
                originalDefinition: {} as WorkflowDefinition,
                buildTimestamp: Date.now(),
                nodes,
                edges: new Map(),
                executionLevels: [["A"], ["B", "C"]],
                triggerNodeId: "A",
                outputNodeIds: ["B", "C"],
                loopContexts: new Map(),
                maxConcurrentNodes: 10
            };

            const mockActivities = createMockActivities(
                withOutputs({
                    A: { input: true },
                    B: { output1: "B-result" },
                    C: { output2: "C-result" }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);
            const finalOutputs = buildFinalOutputs(result.context, workflow.outputNodeIds);

            // buildFinalOutputs merges outputs from all output nodes into a flat object
            expect(finalOutputs).toEqual({
                output1: "B-result",
                output2: "C-result"
            });
        });
    });

    describe("execution summary", () => {
        it("should provide accurate execution summary", async () => {
            const workflow = createChainWorkflow(5);
            const mockActivities = createMockActivities({});

            const result = await simulateWorkflowExecution(workflow, mockActivities);
            const summary = getExecutionSummary(result.queue);

            expect(summary.total).toBe(5);
            expect(summary.completed).toBe(5);
            expect(summary.failed).toBe(0);
            expect(summary.skipped).toBe(0);
            expect(summary.pending).toBe(0);
            expect(summary.ready).toBe(0);
            expect(summary.executing).toBe(0);
        });
    });
});
