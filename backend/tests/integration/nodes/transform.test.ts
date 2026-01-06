/**
 * Transform Node Integration Tests
 *
 * Tests transform operations in workflow context:
 * - Sequential transform chains (map -> filter -> reduce)
 * - Data transformation pipelines
 * - Variable interpolation with transforms
 * - Complex nested data transformations
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
    buildFinalOutputs
} from "../../../src/temporal/core/services/context";
import { createMockActivities, withOutputs } from "../../fixtures/activities";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge
} from "../../../src/temporal/activities/execution/types";
import type { JsonObject } from "../../../src/temporal/core/types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a transform chain workflow: Input -> Transform1 -> Transform2 -> ... -> Output
 */
function createTransformChainWorkflow(transformCount: number): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();
    const executionLevels: string[][] = [];

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "items" },
        depth: 0,
        dependencies: [],
        dependents: transformCount > 0 ? ["Transform1"] : ["Output"]
    });
    executionLevels.push(["Input"]);

    // Transform nodes
    for (let i = 1; i <= transformCount; i++) {
        const nodeId = `Transform${i}`;
        const prevNode = i === 1 ? "Input" : `Transform${i - 1}`;
        const nextNode = i === transformCount ? "Output" : `Transform${i + 1}`;

        nodes.set(nodeId, {
            id: nodeId,
            type: "transform",
            name: nodeId,
            config: { step: i },
            depth: i,
            dependencies: [prevNode],
            dependents: [nextNode]
        });

        const edgeId = `${prevNode}-${nodeId}`;
        edges.set(edgeId, {
            id: edgeId,
            source: prevNode,
            target: nodeId,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });

        executionLevels.push([nodeId]);
    }

    // Output node
    const lastTransform = transformCount > 0 ? `Transform${transformCount}` : "Input";
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: transformCount + 1,
        dependencies: [lastTransform],
        dependents: []
    });

    const outputEdgeId = `${lastTransform}-Output`;
    edges.set(outputEdgeId, {
        id: outputEdgeId,
        source: lastTransform,
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });
    executionLevels.push(["Output"]);

    return {
        originalDefinition: {} as WorkflowDefinition,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels,
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
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
    inputs: JsonObject = {}
) {
    let context = createContext(inputs);
    let queue = initializeQueue(workflow);

    while (!isExecutionComplete(queue)) {
        const readyNodes = getReadyNodes(queue, workflow.maxConcurrentNodes);

        if (readyNodes.length === 0) {
            throw new Error("Deadlock detected: no ready nodes but execution not complete");
        }

        queue = markExecuting(queue, readyNodes);

        for (const nodeId of readyNodes) {
            const node = workflow.nodes.get(nodeId);
            if (!node) continue;

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

describe("Transform Node Integration", () => {
    describe("map-filter-reduce chain", () => {
        it("should execute transform chain: map -> filter -> reduce", async () => {
            const workflow = createTransformChainWorkflow(3);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { items: [1, 2, 3, 4, 5] },
                    Transform1: { mapped: [2, 4, 6, 8, 10] }, // map: x * 2
                    Transform2: { filtered: [6, 8, 10] }, // filter: x > 5
                    Transform3: { reduced: 24 }, // reduce: sum
                    Output: { result: 24 }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities, {});

            expect(mockActivities.getExecutionOrder()).toEqual([
                "Input",
                "Transform1",
                "Transform2",
                "Transform3",
                "Output"
            ]);
            expect(result.context.nodeOutputs.get("Transform3")).toEqual({ reduced: 24 });
        });

        it("should pass transformed data between nodes", async () => {
            const workflow = createTransformChainWorkflow(2);
            let transform2Context: Record<string, unknown> | null = null;

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { items: [1, 2, 3] } },
                    Transform1: { customOutput: { doubled: [2, 4, 6] } },
                    Transform2: {
                        customOutput: { sum: 12 },
                        onExecute: (input) => {
                            transform2Context = getExecutionContext(input.context);
                        }
                    },
                    Output: { customOutput: { result: 12 } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            expect(transform2Context).toBeDefined();
            expect(transform2Context!.Transform1).toEqual({ doubled: [2, 4, 6] });
        });
    });

    describe("object transformation", () => {
        it("should transform nested objects", async () => {
            const workflow = createTransformChainWorkflow(2);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        users: [
                            { id: 1, name: "Alice", age: 25 },
                            { id: 2, name: "Bob", age: 30 }
                        ]
                    },
                    Transform1: {
                        extracted: ["Alice", "Bob"] // extract names
                    },
                    Transform2: {
                        joined: "Alice, Bob" // join names
                    },
                    Output: { result: "Alice, Bob" }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(result.context.nodeOutputs.get("Transform2")).toEqual({
                joined: "Alice, Bob"
            });
        });

        it("should handle deeply nested data extraction", async () => {
            const workflow = createTransformChainWorkflow(1);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        response: {
                            data: {
                                items: [{ nested: { value: 100 } }, { nested: { value: 200 } }]
                            }
                        }
                    },
                    Transform1: {
                        extracted: [100, 200]
                    },
                    Output: { result: [100, 200] }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(result.context.nodeOutputs.get("Transform1")).toEqual({
                extracted: [100, 200]
            });
        });
    });

    describe("multi-operation transforms", () => {
        it("should chain five transform operations", async () => {
            const workflow = createTransformChainWorkflow(5);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { data: [10, 20, 30, 40, 50] },
                    Transform1: { step1: [20, 40, 60, 80, 100] }, // double
                    Transform2: { step2: [60, 80, 100] }, // filter > 50
                    Transform3: { step3: 240 }, // sum
                    Transform4: { step4: 80 }, // average
                    Transform5: { step5: { average: 80, count: 3 } }, // wrap in object
                    Output: { result: { average: 80, count: 3 } }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(mockActivities.getExecutionOrder()).toHaveLength(7);
            expect(result.context.nodeOutputs.get("Transform5")).toEqual({
                step5: { average: 80, count: 3 }
            });
        });

        it("should handle empty array through transform chain", async () => {
            const workflow = createTransformChainWorkflow(3);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { items: [] },
                    Transform1: { mapped: [] },
                    Transform2: { filtered: [] },
                    Transform3: { reduced: null },
                    Output: { result: null }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(result.context.nodeOutputs.get("Transform3")).toEqual({
                reduced: null
            });
        });
    });

    describe("context accumulation with transforms", () => {
        it("should accumulate all transform outputs in context", async () => {
            const workflow = createTransformChainWorkflow(3);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { items: [1, 2, 3] },
                    Transform1: { step1Result: "a" },
                    Transform2: { step2Result: "b" },
                    Transform3: { step3Result: "c" },
                    Output: { final: "done" }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(result.context.nodeOutputs.size).toBe(5);
            expect(result.context.nodeOutputs.get("Transform1")).toEqual({ step1Result: "a" });
            expect(result.context.nodeOutputs.get("Transform2")).toEqual({ step2Result: "b" });
            expect(result.context.nodeOutputs.get("Transform3")).toEqual({ step3Result: "c" });
        });

        it("should provide flattened context to each transform", async () => {
            const workflow = createTransformChainWorkflow(3);
            const capturedContexts: Record<string, unknown>[] = [];

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { original: [1, 2, 3] } },
                    Transform1: {
                        customOutput: { t1: "done" },
                        onExecute: (input) => {
                            capturedContexts.push(getExecutionContext(input.context));
                        }
                    },
                    Transform2: {
                        customOutput: { t2: "done" },
                        onExecute: (input) => {
                            capturedContexts.push(getExecutionContext(input.context));
                        }
                    },
                    Transform3: {
                        customOutput: { t3: "done" },
                        onExecute: (input) => {
                            capturedContexts.push(getExecutionContext(input.context));
                        }
                    },
                    Output: { customOutput: { result: "complete" } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            // Transform1 sees Input
            expect(capturedContexts[0].Input).toEqual({ original: [1, 2, 3] });

            // Transform2 sees Input and Transform1
            expect(capturedContexts[1].Input).toEqual({ original: [1, 2, 3] });
            expect(capturedContexts[1].Transform1).toEqual({ t1: "done" });

            // Transform3 sees Input, Transform1, and Transform2
            expect(capturedContexts[2].Input).toEqual({ original: [1, 2, 3] });
            expect(capturedContexts[2].Transform1).toEqual({ t1: "done" });
            expect(capturedContexts[2].Transform2).toEqual({ t2: "done" });
        });
    });

    describe("JSON parsing transform", () => {
        it("should parse JSON string from previous node", async () => {
            const workflow = createTransformChainWorkflow(2);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { jsonString: '{"name":"test","value":42}' },
                    Transform1: { parsed: { name: "test", value: 42 } },
                    Transform2: { extracted: 42 },
                    Output: { result: 42 }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(result.context.nodeOutputs.get("Transform1")).toEqual({
                parsed: { name: "test", value: 42 }
            });
        });
    });

    describe("final outputs", () => {
        it("should build final outputs from transform chain", async () => {
            const workflow = createTransformChainWorkflow(2);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { items: [1, 2, 3] },
                    Transform1: { doubled: [2, 4, 6] },
                    Transform2: { sum: 12 },
                    Output: { finalSum: 12, success: true }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);
            const finalOutputs = buildFinalOutputs(result.context, workflow.outputNodeIds);

            expect(finalOutputs).toEqual({ finalSum: 12, success: true });
        });
    });
});
