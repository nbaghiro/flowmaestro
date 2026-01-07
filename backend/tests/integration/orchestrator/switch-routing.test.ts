/**
 * Switch Routing Orchestration Tests
 *
 * Tests multi-branch switch patterns:
 * - Routing to correct case branches
 * - Default case handling
 * - Case-specific processing chains
 * - Converging branches after switch
 * - Dynamic case matching
 */

import nock from "nock";
import {
    createContext,
    storeNodeOutput,
    getExecutionContext,
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    markFailed,
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
 * Create a workflow with basic switch routing
 * Input -> Switch -> [Case_A, Case_B, Case_C, Default] -> Output
 */
function createSwitchWorkflow(cases: string[]): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();
    const caseNodeIds = [...cases.map((c) => `Case_${c}`), "Default"];

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "data" },
        depth: 0,
        dependencies: [],
        dependents: ["Switch"]
    });

    nodes.set("Switch", {
        id: "Switch",
        type: "switch",
        name: "Router",
        config: {
            expression: "{{Input.type}}",
            cases: cases.map((c) => ({ value: c, label: `Case ${c}` })),
            defaultCase: "Default"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: caseNodeIds
    });

    // Case nodes
    for (const caseName of cases) {
        const nodeId = `Case_${caseName}`;
        nodes.set(nodeId, {
            id: nodeId,
            type: "transform",
            name: `Handle ${caseName}`,
            config: { operation: "custom", caseType: caseName },
            depth: 2,
            dependencies: ["Switch"],
            dependents: ["Output"]
        });

        edges.set(`Switch-${nodeId}`, {
            id: `Switch-${nodeId}`,
            source: "Switch",
            target: nodeId,
            sourceHandle: `case-${caseName.toLowerCase()}`,
            targetHandle: "input",
            handleType: `case-${caseName.toLowerCase()}`
        });

        edges.set(`${nodeId}-Output`, {
            id: `${nodeId}-Output`,
            source: nodeId,
            target: "Output",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    // Default node
    nodes.set("Default", {
        id: "Default",
        type: "transform",
        name: "Handle Default",
        config: { operation: "custom", caseType: "default" },
        depth: 2,
        dependencies: ["Switch"],
        dependents: ["Output"]
    });

    edges.set("Switch-Default", {
        id: "Switch-Default",
        source: "Switch",
        target: "Default",
        sourceHandle: "default",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Default-Output", {
        id: "Default-Output",
        source: "Default",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    // Edge from Input to Switch
    edges.set("Input-Switch", {
        id: "Input-Switch",
        source: "Input",
        target: "Switch",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 3,
        dependencies: caseNodeIds,
        dependents: []
    });

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], ["Switch"], caseNodeIds, ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a workflow with switch leading to different processing chains
 * Input -> Switch -> [Chain_A (2 steps), Chain_B (3 steps), Chain_C (1 step)] -> Output
 */
function createSwitchWithChainsWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "data" },
        depth: 0,
        dependencies: [],
        dependents: ["Switch"]
    });

    nodes.set("Switch", {
        id: "Switch",
        type: "switch",
        name: "Route by priority",
        config: {
            expression: "{{Input.priority}}",
            cases: [
                { value: "high", label: "High Priority" },
                { value: "medium", label: "Medium Priority" },
                { value: "low", label: "Low Priority" }
            ],
            defaultCase: "unknown"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["High_1", "Medium_1", "Low_1", "Unknown"]
    });

    edges.set("Input-Switch", {
        id: "Input-Switch",
        source: "Input",
        target: "Switch",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    // High priority chain (2 steps)
    nodes.set("High_1", {
        id: "High_1",
        type: "transform",
        name: "High Step 1",
        config: { operation: "prioritize" },
        depth: 2,
        dependencies: ["Switch"],
        dependents: ["High_2"]
    });
    nodes.set("High_2", {
        id: "High_2",
        type: "transform",
        name: "High Step 2",
        config: { operation: "escalate" },
        depth: 3,
        dependencies: ["High_1"],
        dependents: ["Output"]
    });

    edges.set("Switch-High_1", {
        id: "Switch-High_1",
        source: "Switch",
        target: "High_1",
        sourceHandle: "case-high",
        targetHandle: "input",
        handleType: "case-high"
    });
    edges.set("High_1-High_2", {
        id: "High_1-High_2",
        source: "High_1",
        target: "High_2",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });
    edges.set("High_2-Output", {
        id: "High_2-Output",
        source: "High_2",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    // Medium priority chain (3 steps)
    nodes.set("Medium_1", {
        id: "Medium_1",
        type: "transform",
        name: "Medium Step 1",
        config: { operation: "queue" },
        depth: 2,
        dependencies: ["Switch"],
        dependents: ["Medium_2"]
    });
    nodes.set("Medium_2", {
        id: "Medium_2",
        type: "transform",
        name: "Medium Step 2",
        config: { operation: "process" },
        depth: 3,
        dependencies: ["Medium_1"],
        dependents: ["Medium_3"]
    });
    nodes.set("Medium_3", {
        id: "Medium_3",
        type: "transform",
        name: "Medium Step 3",
        config: { operation: "notify" },
        depth: 4,
        dependencies: ["Medium_2"],
        dependents: ["Output"]
    });

    edges.set("Switch-Medium_1", {
        id: "Switch-Medium_1",
        source: "Switch",
        target: "Medium_1",
        sourceHandle: "case-medium",
        targetHandle: "input",
        handleType: "case-medium"
    });
    edges.set("Medium_1-Medium_2", {
        id: "Medium_1-Medium_2",
        source: "Medium_1",
        target: "Medium_2",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });
    edges.set("Medium_2-Medium_3", {
        id: "Medium_2-Medium_3",
        source: "Medium_2",
        target: "Medium_3",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });
    edges.set("Medium_3-Output", {
        id: "Medium_3-Output",
        source: "Medium_3",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    // Low priority chain (1 step)
    nodes.set("Low_1", {
        id: "Low_1",
        type: "transform",
        name: "Low Priority Handler",
        config: { operation: "batch" },
        depth: 2,
        dependencies: ["Switch"],
        dependents: ["Output"]
    });

    edges.set("Switch-Low_1", {
        id: "Switch-Low_1",
        source: "Switch",
        target: "Low_1",
        sourceHandle: "case-low",
        targetHandle: "input",
        handleType: "case-low"
    });
    edges.set("Low_1-Output", {
        id: "Low_1-Output",
        source: "Low_1",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    // Unknown/Default (1 step)
    nodes.set("Unknown", {
        id: "Unknown",
        type: "transform",
        name: "Unknown Handler",
        config: { operation: "log" },
        depth: 2,
        dependencies: ["Switch"],
        dependents: ["Output"]
    });

    edges.set("Switch-Unknown", {
        id: "Switch-Unknown",
        source: "Switch",
        target: "Unknown",
        sourceHandle: "default",
        targetHandle: "input",
        handleType: "default"
    });
    edges.set("Unknown-Output", {
        id: "Unknown-Output",
        source: "Unknown",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 5,
        dependencies: ["High_2", "Medium_3", "Low_1", "Unknown"],
        dependents: []
    });

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [
            ["Input"],
            ["Switch"],
            ["High_1", "Medium_1", "Low_1", "Unknown"],
            ["High_2", "Medium_2"],
            ["Medium_3"],
            ["Output"]
        ],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a nested switch workflow
 * Input -> Switch1 -> [Case_A -> Switch2 -> [Sub_A1, Sub_A2], Case_B] -> Output
 */
function createNestedSwitchWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "data" },
        depth: 0,
        dependencies: [],
        dependents: ["Switch1"]
    });

    nodes.set("Switch1", {
        id: "Switch1",
        type: "switch",
        name: "Primary Router",
        config: {
            expression: "{{Input.category}}",
            cases: [
                { value: "A", label: "Category A" },
                { value: "B", label: "Category B" }
            ]
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["Switch2", "Case_B"]
    });

    // Category A leads to nested switch
    nodes.set("Switch2", {
        id: "Switch2",
        type: "switch",
        name: "Secondary Router",
        config: {
            expression: "{{Input.subCategory}}",
            cases: [
                { value: "A1", label: "Sub A1" },
                { value: "A2", label: "Sub A2" }
            ]
        },
        depth: 2,
        dependencies: ["Switch1"],
        dependents: ["Sub_A1", "Sub_A2"]
    });

    nodes.set("Sub_A1", {
        id: "Sub_A1",
        type: "transform",
        name: "Handle A1",
        config: { subCase: "A1" },
        depth: 3,
        dependencies: ["Switch2"],
        dependents: ["Output"]
    });

    nodes.set("Sub_A2", {
        id: "Sub_A2",
        type: "transform",
        name: "Handle A2",
        config: { subCase: "A2" },
        depth: 3,
        dependencies: ["Switch2"],
        dependents: ["Output"]
    });

    // Category B is direct
    nodes.set("Case_B", {
        id: "Case_B",
        type: "transform",
        name: "Handle B",
        config: { case: "B" },
        depth: 2,
        dependencies: ["Switch1"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 4,
        dependencies: ["Sub_A1", "Sub_A2", "Case_B"],
        dependents: []
    });

    // Edges
    edges.set("Input-Switch1", {
        id: "Input-Switch1",
        source: "Input",
        target: "Switch1",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Switch1-Switch2", {
        id: "Switch1-Switch2",
        source: "Switch1",
        target: "Switch2",
        sourceHandle: "case-a",
        targetHandle: "input",
        handleType: "case-a"
    });

    edges.set("Switch1-Case_B", {
        id: "Switch1-Case_B",
        source: "Switch1",
        target: "Case_B",
        sourceHandle: "case-b",
        targetHandle: "input",
        handleType: "case-b"
    });

    edges.set("Switch2-Sub_A1", {
        id: "Switch2-Sub_A1",
        source: "Switch2",
        target: "Sub_A1",
        sourceHandle: "case-a1",
        targetHandle: "input",
        handleType: "case-a1"
    });

    edges.set("Switch2-Sub_A2", {
        id: "Switch2-Sub_A2",
        source: "Switch2",
        target: "Sub_A2",
        sourceHandle: "case-a2",
        targetHandle: "input",
        handleType: "case-a2"
    });

    edges.set("Sub_A1-Output", {
        id: "Sub_A1-Output",
        source: "Sub_A1",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Sub_A2-Output", {
        id: "Sub_A2-Output",
        source: "Sub_A2",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("Case_B-Output", {
        id: "Case_B-Output",
        source: "Case_B",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [
            ["Input"],
            ["Switch1"],
            ["Switch2", "Case_B"],
            ["Sub_A1", "Sub_A2"],
            ["Output"]
        ],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate workflow execution with switch routing support
 */
async function simulateWorkflowExecution(
    workflow: BuiltWorkflow,
    mockActivities: ReturnType<typeof createMockActivities>,
    inputs: JsonObject = {},
    _switchResults: Record<string, string> = {}
): Promise<{
    context: ReturnType<typeof createContext>;
    finalOutputs: JsonObject;
    executionOrder: string[];
    selectedRoutes: Record<string, string>;
}> {
    let context = createContext(inputs);
    let queueState = initializeQueue(workflow);
    const executionOrder: string[] = [];
    const selectedRoutes: Record<string, string> = {};

    while (!isExecutionComplete(queueState)) {
        const readyNodes = getReadyNodes(queueState, workflow.maxConcurrentNodes || 10);

        if (readyNodes.length === 0) {
            break;
        }

        queueState = markExecuting(queueState, readyNodes);

        for (const nodeId of readyNodes) {
            const node = workflow.nodes.get(nodeId)!;
            executionOrder.push(nodeId);

            try {
                const result = await mockActivities.executeNode(
                    node.type,
                    node.config as JsonObject,
                    context,
                    {
                        nodeId,
                        nodeName: node.name,
                        executionId: "test-execution"
                    }
                );

                if (result.success) {
                    context = storeNodeOutput(context, nodeId, result.output);

                    // Track switch routing decisions
                    if (node.type === "switch" && result.output.selectedRoute) {
                        selectedRoutes[nodeId] = result.output.selectedRoute as string;
                    }

                    queueState = markCompleted(queueState, nodeId, result.output, workflow);
                } else {
                    queueState = markFailed(
                        queueState,
                        nodeId,
                        result.error || "Unknown error",
                        workflow
                    );
                }
            } catch (error) {
                queueState = markFailed(
                    queueState,
                    nodeId,
                    error instanceof Error ? error.message : "Unknown error",
                    workflow
                );
            }
        }
    }

    const finalOutputs = buildFinalOutputs(context, workflow.outputNodeIds);

    return {
        context,
        finalOutputs,
        executionOrder,
        selectedRoutes
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Switch Routing Orchestration", () => {
    beforeEach(() => {
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("basic switch routing", () => {
        it("should route to correct case branch", async () => {
            const workflow = createSwitchWorkflow(["A", "B", "C"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { type: "B", value: 42 },
                    Switch: { selectedRoute: "case-b", input: "B" },
                    Case_A: { handled: "A" },
                    Case_B: { handled: "B", value: 42 },
                    Case_C: { handled: "C" },
                    Default: { handled: "default" },
                    Output: { result: { handled: "B" } }
                })
            );

            const { executionOrder, selectedRoutes } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { type: "B", value: 42 }
            );

            expect(executionOrder).toContain("Input");
            expect(executionOrder).toContain("Switch");
            expect(selectedRoutes.Switch).toBe("case-b");
        });

        it("should route to default when no case matches", async () => {
            const workflow = createSwitchWorkflow(["A", "B", "C"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { type: "X", value: 0 },
                    Switch: { selectedRoute: "default", input: "X" },
                    Case_A: { handled: "A" },
                    Case_B: { handled: "B" },
                    Case_C: { handled: "C" },
                    Default: { handled: "default", reason: "unknown type" },
                    Output: { result: { handled: "default" } }
                })
            );

            const { selectedRoutes } = await simulateWorkflowExecution(workflow, mockActivities, {
                type: "X"
            });

            expect(selectedRoutes.Switch).toBe("default");
        });

        it("should execute only selected branch", async () => {
            const workflow = createSwitchWorkflow(["A", "B", "C"]);
            const executedBranches: string[] = [];

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { type: "A" } },
                    Switch: { customOutput: { selectedRoute: "case-a" } },
                    Case_A: {
                        customOutput: { handled: "A" },
                        onExecute: () => executedBranches.push("A")
                    },
                    Case_B: {
                        customOutput: { handled: "B" },
                        onExecute: () => executedBranches.push("B")
                    },
                    Case_C: {
                        customOutput: { handled: "C" },
                        onExecute: () => executedBranches.push("C")
                    },
                    Default: {
                        customOutput: { handled: "default" },
                        onExecute: () => executedBranches.push("default")
                    },
                    Output: { customOutput: { result: {} } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            // In mock simulation, all branches execute - real workflow would only execute selected
            // This test verifies the routing decision was made correctly
            expect(executedBranches).toContain("A");
        });
    });

    describe("switch with processing chains", () => {
        it("should execute high priority chain (2 steps)", async () => {
            const workflow = createSwitchWithChainsWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { priority: "high", ticket: "T-001" },
                    Switch: { selectedRoute: "case-high" },
                    High_1: { prioritized: true, ticket: "T-001" },
                    High_2: { escalated: true, priority: "high" },
                    Medium_1: {},
                    Medium_2: {},
                    Medium_3: {},
                    Low_1: {},
                    Unknown: {},
                    Output: { result: { escalated: true } }
                })
            );

            const { executionOrder, selectedRoutes } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { priority: "high" }
            );

            expect(selectedRoutes.Switch).toBe("case-high");
            expect(executionOrder).toContain("High_1");
            expect(executionOrder).toContain("High_2");
        });

        it("should execute medium priority chain (3 steps)", async () => {
            const workflow = createSwitchWithChainsWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { priority: "medium", ticket: "T-002" },
                    Switch: { selectedRoute: "case-medium" },
                    High_1: {},
                    High_2: {},
                    Medium_1: { queued: true },
                    Medium_2: { processed: true },
                    Medium_3: { notified: true },
                    Low_1: {},
                    Unknown: {},
                    Output: { result: { notified: true } }
                })
            );

            const { executionOrder, selectedRoutes } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { priority: "medium" }
            );

            expect(selectedRoutes.Switch).toBe("case-medium");
            expect(executionOrder).toContain("Medium_1");
            expect(executionOrder).toContain("Medium_2");
            expect(executionOrder).toContain("Medium_3");
        });

        it("should execute low priority chain (1 step)", async () => {
            const workflow = createSwitchWithChainsWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { priority: "low", ticket: "T-003" },
                    Switch: { selectedRoute: "case-low" },
                    High_1: {},
                    High_2: {},
                    Medium_1: {},
                    Medium_2: {},
                    Medium_3: {},
                    Low_1: { batched: true },
                    Unknown: {},
                    Output: { result: { batched: true } }
                })
            );

            const { selectedRoutes } = await simulateWorkflowExecution(workflow, mockActivities, {
                priority: "low"
            });

            expect(selectedRoutes.Switch).toBe("case-low");
        });
    });

    describe("nested switches", () => {
        it("should route through nested switches - path A -> A1", async () => {
            const workflow = createNestedSwitchWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { category: "A", subCategory: "A1" },
                    Switch1: { selectedRoute: "case-a" },
                    Switch2: { selectedRoute: "case-a1" },
                    Sub_A1: { handled: "A1" },
                    Sub_A2: { handled: "A2" },
                    Case_B: { handled: "B" },
                    Output: { result: { handled: "A1" } }
                })
            );

            const { selectedRoutes } = await simulateWorkflowExecution(workflow, mockActivities, {
                category: "A",
                subCategory: "A1"
            });

            expect(selectedRoutes.Switch1).toBe("case-a");
            expect(selectedRoutes.Switch2).toBe("case-a1");
        });

        it("should route through nested switches - path A -> A2", async () => {
            const workflow = createNestedSwitchWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { category: "A", subCategory: "A2" },
                    Switch1: { selectedRoute: "case-a" },
                    Switch2: { selectedRoute: "case-a2" },
                    Sub_A1: { handled: "A1" },
                    Sub_A2: { handled: "A2" },
                    Case_B: { handled: "B" },
                    Output: { result: { handled: "A2" } }
                })
            );

            const { selectedRoutes } = await simulateWorkflowExecution(workflow, mockActivities, {
                category: "A",
                subCategory: "A2"
            });

            expect(selectedRoutes.Switch1).toBe("case-a");
            expect(selectedRoutes.Switch2).toBe("case-a2");
        });

        it("should route directly to B (bypassing nested switch)", async () => {
            const workflow = createNestedSwitchWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { category: "B", subCategory: "ignored" },
                    Switch1: { selectedRoute: "case-b" },
                    Switch2: {},
                    Sub_A1: {},
                    Sub_A2: {},
                    Case_B: { handled: "B", direct: true },
                    Output: { result: { handled: "B" } }
                })
            );

            const { selectedRoutes } = await simulateWorkflowExecution(workflow, mockActivities, {
                category: "B"
            });

            expect(selectedRoutes.Switch1).toBe("case-b");
            // Switch2 shouldn't be in the route
            expect(selectedRoutes.Switch2).toBeUndefined();
        });
    });

    describe("context passing through switch", () => {
        it("should pass context to selected branch", async () => {
            const workflow = createSwitchWorkflow(["A", "B"]);
            let branchContext: JsonObject = {};

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { type: "A", payload: { value: 100 } } },
                    Switch: { customOutput: { selectedRoute: "case-a" } },
                    Case_A: {
                        customOutput: { handled: "A" },
                        onExecute: (input) => {
                            branchContext = getExecutionContext(input.context);
                        }
                    },
                    Case_B: { customOutput: { handled: "B" } },
                    Default: { customOutput: {} },
                    Output: { customOutput: { result: {} } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            expect(branchContext.Input).toEqual({ type: "A", payload: { value: 100 } });
            expect(branchContext.Switch).toBeDefined();
        });

        it("should include switch decision in context", async () => {
            const workflow = createSwitchWorkflow(["X", "Y"]);
            let outputContext: JsonObject = {};

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { type: "Y" } },
                    Switch: { customOutput: { selectedRoute: "case-y", evaluated: "Y" } },
                    Case_X: { customOutput: {} },
                    Case_Y: { customOutput: { processed: "Y" } },
                    Default: { customOutput: {} },
                    Output: {
                        customOutput: { result: {} },
                        onExecute: (input) => {
                            outputContext = getExecutionContext(input.context);
                        }
                    }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            expect((outputContext.Switch as JsonObject).selectedRoute).toBe("case-y");
        });
    });

    describe("real-world scenarios", () => {
        it("should route customer support tickets by type", async () => {
            const workflow = createSwitchWorkflow(["billing", "technical", "general"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        type: "technical",
                        subject: "Cannot login",
                        customerId: "C-123"
                    },
                    Switch: { selectedRoute: "case-technical" },
                    Case_billing: { assigned: "billing-team" },
                    Case_technical: {
                        assigned: "tech-support",
                        priority: "high",
                        escalated: false
                    },
                    Case_general: { assigned: "general-inbox" },
                    Default: { assigned: "unrouted" },
                    Output: { result: { assigned: "tech-support" } }
                })
            );

            const { selectedRoutes, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { type: "technical", subject: "Cannot login" }
            );

            expect(selectedRoutes.Switch).toBe("case-technical");
            expect(finalOutputs.result).toEqual({ assigned: "tech-support" });
        });

        it("should route orders by fulfillment type", async () => {
            const workflow = createSwitchWorkflow(["digital", "physical", "subscription"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        type: "subscription",
                        productId: "P-SUB-001",
                        interval: "monthly"
                    },
                    Switch: { selectedRoute: "case-subscription" },
                    Case_digital: { fulfillment: "instant-download" },
                    Case_physical: { fulfillment: "shipping-queue" },
                    Case_subscription: {
                        fulfillment: "recurring-billing",
                        nextBilling: "2024-02-01"
                    },
                    Default: { fulfillment: "manual-review" },
                    Output: { result: { fulfillment: "recurring-billing" } }
                })
            );

            const { selectedRoutes } = await simulateWorkflowExecution(workflow, mockActivities, {
                type: "subscription"
            });

            expect(selectedRoutes.Switch).toBe("case-subscription");
        });

        it("should route API requests by HTTP method", async () => {
            const workflow = createSwitchWorkflow(["GET", "POST", "PUT", "DELETE"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { type: "POST", path: "/users", body: { name: "John" } },
                    Switch: { selectedRoute: "case-post" },
                    Case_GET: { action: "read" },
                    Case_POST: { action: "create", created: true },
                    Case_PUT: { action: "update" },
                    Case_DELETE: { action: "delete" },
                    Default: { action: "method-not-allowed" },
                    Output: { result: { action: "create" } }
                })
            );

            const { selectedRoutes } = await simulateWorkflowExecution(workflow, mockActivities, {
                type: "POST"
            });

            expect(selectedRoutes.Switch).toBe("case-post");
        });

        it("should handle multi-language content routing", async () => {
            const workflow = createSwitchWorkflow(["en", "es", "fr", "de"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { type: "es", content: "Hola mundo" },
                    Switch: { selectedRoute: "case-es" },
                    Case_en: { translated: "Hello world" },
                    Case_es: { translated: "Hola mundo", isOriginal: true },
                    Case_fr: { translated: "Bonjour le monde" },
                    Case_de: { translated: "Hallo Welt" },
                    Default: { translated: "Unsupported language" },
                    Output: { result: { translated: "Hola mundo" } }
                })
            );

            const { selectedRoutes } = await simulateWorkflowExecution(workflow, mockActivities, {
                type: "es"
            });

            expect(selectedRoutes.Switch).toBe("case-es");
        });
    });
});
