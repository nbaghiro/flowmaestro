/**
 * Code Node Integration Tests
 *
 * Tests code execution in workflow context:
 * - Code node with upstream data processing
 * - Multi-step code pipelines
 * - Variable passing to/from code nodes
 * - Error handling in code execution
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
import {
    createMockActivities,
    withOutputs,
    failNode,
    mergeConfigs
} from "../../fixtures/activities";
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
 * Create a workflow with code node processing
 */
function createCodeWorkflow(codeNodeCount: number = 1): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();
    const executionLevels: string[][] = [];

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "data" },
        depth: 0,
        dependencies: [],
        dependents: codeNodeCount > 0 ? ["Code1"] : ["Output"]
    });
    executionLevels.push(["Input"]);

    // Code nodes
    for (let i = 1; i <= codeNodeCount; i++) {
        const nodeId = `Code${i}`;
        const prevNode = i === 1 ? "Input" : `Code${i - 1}`;
        const nextNode = i === codeNodeCount ? "Output" : `Code${i + 1}`;

        nodes.set(nodeId, {
            id: nodeId,
            type: "code",
            name: nodeId,
            config: {
                language: "javascript",
                code: `// Code node ${i}\nreturn data;`,
                timeout: 5000
            },
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
    const lastCode = codeNodeCount > 0 ? `Code${codeNodeCount}` : "Input";
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: codeNodeCount + 1,
        dependencies: [lastCode],
        dependents: []
    });

    const outputEdgeId = `${lastCode}-Output`;
    edges.set(outputEdgeId, {
        id: outputEdgeId,
        source: lastCode,
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
 * Create a workflow: Input -> Transform -> Code -> Output
 */
function createMixedWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "data" },
        depth: 0,
        dependencies: [],
        dependents: ["Transform"]
    });

    nodes.set("Transform", {
        id: "Transform",
        type: "transform",
        name: "Transform",
        config: { operation: "map" },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["Code"]
    });

    nodes.set("Code", {
        id: "Code",
        type: "code",
        name: "Code",
        config: {
            language: "javascript",
            code: "return data.map(x => x * 2);",
            inputVariables: ["data"]
        },
        depth: 2,
        dependencies: ["Transform"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 3,
        dependencies: ["Code"],
        dependents: []
    });

    edges.set("Input-Transform", {
        id: "Input-Transform",
        source: "Input",
        target: "Transform",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Transform-Code", {
        id: "Transform-Code",
        source: "Transform",
        target: "Code",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Code-Output", {
        id: "Code-Output",
        source: "Code",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    return {
        originalDefinition: {} as WorkflowDefinition,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], ["Transform"], ["Code"], ["Output"]],
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

describe("Code Node Integration", () => {
    describe("basic code execution", () => {
        it("should execute single code node in workflow", async () => {
            const workflow = createCodeWorkflow(1);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { numbers: [1, 2, 3, 4, 5] },
                    Code1: {
                        output: 15,
                        language: "javascript",
                        stdout: "",
                        logs: []
                    },
                    Output: { result: 15 }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(mockActivities.getExecutionOrder()).toEqual(["Input", "Code1", "Output"]);
            expect(result.context.nodeOutputs.get("Code1")).toEqual({
                output: 15,
                language: "javascript",
                stdout: "",
                logs: []
            });
        });

        it("should pass input data to code node", async () => {
            const workflow = createCodeWorkflow(1);
            let codeContext: Record<string, unknown> | null = null;

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { items: [10, 20, 30] } },
                    Code1: {
                        customOutput: { output: 60 },
                        onExecute: (input) => {
                            codeContext = getExecutionContext(input.context);
                        }
                    },
                    Output: { customOutput: { result: 60 } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            expect(codeContext).toBeDefined();
            expect(codeContext!.Input).toEqual({ items: [10, 20, 30] });
        });
    });

    describe("code node chain", () => {
        it("should execute multiple code nodes in sequence", async () => {
            const workflow = createCodeWorkflow(3);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { value: 5 },
                    Code1: { output: 10, step: 1 }, // x * 2
                    Code2: { output: 100, step: 2 }, // x ^ 2
                    Code3: { output: "100", step: 3 }, // toString
                    Output: { result: "100" }
                })
            );

            await simulateWorkflowExecution(workflow, mockActivities);

            expect(mockActivities.getExecutionOrder()).toEqual([
                "Input",
                "Code1",
                "Code2",
                "Code3",
                "Output"
            ]);
        });

        it("should pass outputs between code nodes", async () => {
            const workflow = createCodeWorkflow(2);
            const capturedContexts: Record<string, unknown>[] = [];

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { value: 5 } },
                    Code1: {
                        customOutput: { result: 10 },
                        onExecute: (input) => {
                            capturedContexts.push(getExecutionContext(input.context));
                        }
                    },
                    Code2: {
                        customOutput: { result: 100 },
                        onExecute: (input) => {
                            capturedContexts.push(getExecutionContext(input.context));
                        }
                    },
                    Output: { customOutput: { final: 100 } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            // Code1 sees Input
            expect(capturedContexts[0].Input).toEqual({ value: 5 });

            // Code2 sees Input and Code1
            expect(capturedContexts[1].Input).toEqual({ value: 5 });
            expect(capturedContexts[1].Code1).toEqual({ result: 10 });
        });
    });

    describe("mixed workflow (transform + code)", () => {
        it("should execute transform before code node", async () => {
            const workflow = createMixedWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { items: [1, 2, 3] },
                    Transform: { transformed: [2, 4, 6] },
                    Code: { output: [4, 8, 12] },
                    Output: { result: [4, 8, 12] }
                })
            );

            await simulateWorkflowExecution(workflow, mockActivities);

            expect(mockActivities.getExecutionOrder()).toEqual([
                "Input",
                "Transform",
                "Code",
                "Output"
            ]);
        });

        it("should provide transform output to code node", async () => {
            const workflow = createMixedWorkflow();
            let codeContext: Record<string, unknown> | null = null;

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { items: [1, 2, 3] } },
                    Transform: { customOutput: { doubled: [2, 4, 6] } },
                    Code: {
                        customOutput: { computed: 12 },
                        onExecute: (input) => {
                            codeContext = getExecutionContext(input.context);
                        }
                    },
                    Output: { customOutput: { result: 12 } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            expect(codeContext).toBeDefined();
            expect(codeContext!.Transform).toEqual({ doubled: [2, 4, 6] });
        });
    });

    describe("code node output types", () => {
        it("should handle numeric output", async () => {
            const workflow = createCodeWorkflow(1);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { x: 10, y: 20 },
                    Code1: { output: 30, type: "number" },
                    Output: { result: 30 }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(result.context.nodeOutputs.get("Code1")?.output).toBe(30);
        });

        it("should handle array output", async () => {
            const workflow = createCodeWorkflow(1);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { items: [1, 2, 3] },
                    Code1: { output: [2, 4, 6], type: "array" },
                    Output: { result: [2, 4, 6] }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(result.context.nodeOutputs.get("Code1")?.output).toEqual([2, 4, 6]);
        });

        it("should handle object output", async () => {
            const workflow = createCodeWorkflow(1);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { items: [1, 2, 3] },
                    Code1: {
                        output: { sum: 6, count: 3, average: 2 },
                        type: "object"
                    },
                    Output: { result: { sum: 6, count: 3, average: 2 } }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(result.context.nodeOutputs.get("Code1")?.output).toEqual({
                sum: 6,
                count: 3,
                average: 2
            });
        });

        it("should handle null output", async () => {
            const workflow = createCodeWorkflow(1);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { data: null },
                    Code1: { output: null },
                    Output: { result: null }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(result.context.nodeOutputs.get("Code1")?.output).toBeNull();
        });
    });

    describe("code node with logs", () => {
        it("should capture console logs", async () => {
            const workflow = createCodeWorkflow(1);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { value: 42 },
                    Code1: {
                        output: 42,
                        logs: ["Processing value: 42", "Done"],
                        stdout: "Processing value: 42\nDone\n"
                    },
                    Output: { result: 42 }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);

            expect(result.context.nodeOutputs.get("Code1")?.logs).toHaveLength(2);
        });
    });

    describe("error handling", () => {
        it("should fail workflow when code node fails", async () => {
            const workflow = createCodeWorkflow(1);
            const mockActivities = createMockActivities(
                mergeConfigs(
                    withOutputs({
                        Input: { value: 42 }
                    }),
                    failNode("Code1", "SyntaxError: Unexpected token")
                )
            );

            await expect(simulateWorkflowExecution(workflow, mockActivities)).rejects.toThrow(
                "SyntaxError: Unexpected token"
            );
        });

        it("should stop execution after code node failure", async () => {
            const workflow = createCodeWorkflow(2);
            const mockActivities = createMockActivities(
                mergeConfigs(
                    withOutputs({
                        Input: { value: 42 }
                    }),
                    failNode("Code1", "Runtime error")
                )
            );

            await expect(simulateWorkflowExecution(workflow, mockActivities)).rejects.toThrow();

            // Code2 and Output should not have been executed
            expect(mockActivities.wasNodeExecuted("Code2")).toBe(false);
            expect(mockActivities.wasNodeExecuted("Output")).toBe(false);
        });
    });

    describe("final outputs", () => {
        it("should build final outputs from code workflow", async () => {
            const workflow = createCodeWorkflow(1);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { items: [1, 2, 3] },
                    Code1: { computed: 6 },
                    Output: { finalSum: 6, success: true }
                })
            );

            const result = await simulateWorkflowExecution(workflow, mockActivities);
            const finalOutputs = buildFinalOutputs(result.context, workflow.outputNodeIds);

            expect(finalOutputs).toEqual({ finalSum: 6, success: true });
        });
    });
});
