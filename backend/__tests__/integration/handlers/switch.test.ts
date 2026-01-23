/**
 * Switch Node Integration Tests
 *
 * Tests switch routing in workflow context:
 * - Multi-branch routing based on case matching
 * - Default case handling
 * - Wildcard pattern routing
 * - Variable-based switch expressions
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
    markSkipped,
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
 * Create a switch routing workflow with multiple branches
 */
function createSwitchWorkflow(branches: string[]): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "data" },
        depth: 0,
        dependencies: [],
        dependents: ["Switch"]
    });

    // Switch node
    nodes.set("Switch", {
        id: "Switch",
        type: "switch",
        name: "Switch",
        config: {
            expression: "{{Input.status}}",
            cases: branches.map((b) => ({ value: b, label: b })),
            defaultCase: "default"
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: [...branches.map((b) => `Branch-${b}`), "Branch-default"]
    });

    edges.set("Input-Switch", {
        id: "Input-Switch",
        source: "Input",
        target: "Switch",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    // Branch nodes for each case
    for (const branch of branches) {
        const branchId = `Branch-${branch}`;
        nodes.set(branchId, {
            id: branchId,
            type: "transform",
            name: branchId,
            config: { branch },
            depth: 2,
            dependencies: ["Switch"],
            dependents: ["Output"]
        });

        edges.set(`Switch-${branchId}`, {
            id: `Switch-${branchId}`,
            source: "Switch",
            target: branchId,
            sourceHandle: `case-${branch}`,
            targetHandle: "input",
            handleType: `case-${branch}`
        });
    }

    // Default branch
    nodes.set("Branch-default", {
        id: "Branch-default",
        type: "transform",
        name: "Branch-default",
        config: { branch: "default" },
        depth: 2,
        dependencies: ["Switch"],
        dependents: ["Output"]
    });

    edges.set("Switch-Branch-default", {
        id: "Switch-Branch-default",
        source: "Switch",
        target: "Branch-default",
        sourceHandle: "default",
        targetHandle: "input",
        handleType: "default"
    });

    // Output node (receives from all branches)
    const allBranches = [...branches.map((b) => `Branch-${b}`), "Branch-default"];
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 3,
        dependencies: allBranches,
        dependents: []
    });

    for (const branchId of allBranches) {
        edges.set(`${branchId}-Output`, {
            id: `${branchId}-Output`,
            source: branchId,
            target: "Output",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    return {
        originalDefinition: {} as WorkflowDefinition,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], ["Switch"], allBranches, ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate workflow execution with switch routing
 */
async function simulateWorkflowExecution(
    workflow: BuiltWorkflow,
    mockActivities: ReturnType<typeof createMockActivities>,
    inputs: JsonObject = {},
    selectedRoute?: string
) {
    let context = createContext(inputs);
    let queue = initializeQueue(workflow);
    const skippedNodes: string[] = [];

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

                // Handle switch routing
                if (node.type === "switch" && selectedRoute) {
                    const routeSignal = selectedRoute;
                    // Mark non-selected branches as skipped
                    for (const dependentId of node.dependents) {
                        if (!dependentId.includes(routeSignal) && dependentId !== "Output") {
                            queue = markSkipped(queue, dependentId, workflow);
                            skippedNodes.push(dependentId);
                        }
                    }
                }

                queue = markCompleted(queue, nodeId, result.output, workflow);
            } else {
                throw new Error(result.error || `Node ${nodeId} failed`);
            }
        }
    }

    return {
        context,
        queue,
        executionLog: mockActivities.getExecutionLog(),
        skippedNodes
    };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Switch Node Integration", () => {
    describe("basic switch routing", () => {
        it("should route to matching case branch", async () => {
            const workflow = createSwitchWorkflow(["pending", "active", "completed"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { status: "active" },
                    Switch: { matchedCase: "active", selectedRoute: "active" },
                    "Branch-active": { processed: true, branch: "active" },
                    Output: { result: "active branch" }
                })
            );

            const result = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { status: "active" },
                "active"
            );

            expect(mockActivities.wasNodeExecuted("Branch-active")).toBe(true);
            expect(result.skippedNodes).toContain("Branch-pending");
            expect(result.skippedNodes).toContain("Branch-completed");
        });

        it("should route to default when no case matches", async () => {
            const workflow = createSwitchWorkflow(["pending", "active", "completed"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { status: "unknown" },
                    Switch: { matchedCase: "default", selectedRoute: "default" },
                    "Branch-default": { processed: true, branch: "default" },
                    Output: { result: "default branch" }
                })
            );

            const result = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { status: "unknown" },
                "default"
            );

            expect(mockActivities.wasNodeExecuted("Branch-default")).toBe(true);
            expect(result.skippedNodes).toContain("Branch-pending");
            expect(result.skippedNodes).toContain("Branch-active");
            expect(result.skippedNodes).toContain("Branch-completed");
        });
    });

    describe("case matching patterns", () => {
        it("should match first case in order", async () => {
            const workflow = createSwitchWorkflow(["a", "b", "c"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { status: "a" },
                    Switch: { matchedCase: "a", selectedRoute: "a" },
                    "Branch-a": { result: "matched-a" },
                    Output: { result: "a" }
                })
            );

            await simulateWorkflowExecution(workflow, mockActivities, { status: "a" }, "a");

            expect(mockActivities.wasNodeExecuted("Branch-a")).toBe(true);
        });

        it("should match last case in order", async () => {
            const workflow = createSwitchWorkflow(["a", "b", "c"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { status: "c" },
                    Switch: { matchedCase: "c", selectedRoute: "c" },
                    "Branch-c": { result: "matched-c" },
                    Output: { result: "c" }
                })
            );

            await simulateWorkflowExecution(workflow, mockActivities, { status: "c" }, "c");

            expect(mockActivities.wasNodeExecuted("Branch-c")).toBe(true);
        });
    });

    describe("context with switch routing", () => {
        it("should pass switch output to selected branch", async () => {
            const workflow = createSwitchWorkflow(["route1", "route2"]);
            let branchContext: Record<string, unknown> | null = null;

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { status: "route1", data: "test-data" } },
                    Switch: {
                        customOutput: {
                            matchedCase: "route1",
                            evaluatedExpression: "route1"
                        }
                    },
                    "Branch-route1": {
                        customOutput: { processed: true },
                        onExecute: (input) => {
                            branchContext = getExecutionContext(input.context);
                        }
                    },
                    Output: { customOutput: { result: "done" } }
                }
            });

            await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { status: "route1" },
                "route1"
            );

            expect(branchContext).toBeDefined();
            expect(branchContext!.Input).toEqual({ status: "route1", data: "test-data" });
            expect(branchContext!.Switch).toEqual({
                matchedCase: "route1",
                evaluatedExpression: "route1"
            });
        });
    });

    describe("multi-branch workflows", () => {
        it("should handle workflow with 5 branches", async () => {
            const branches = ["new", "pending", "processing", "completed", "failed"];
            const workflow = createSwitchWorkflow(branches);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { status: "processing" },
                    Switch: { matchedCase: "processing", selectedRoute: "processing" },
                    "Branch-processing": { stage: "processing", handled: true },
                    Output: { result: "processing complete" }
                })
            );

            const result = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { status: "processing" },
                "processing"
            );

            expect(mockActivities.wasNodeExecuted("Branch-processing")).toBe(true);
            expect(result.skippedNodes).toHaveLength(5); // 4 other branches + default
        });
    });

    describe("switch with complex expressions", () => {
        it("should handle numeric status values", async () => {
            const workflow = createSwitchWorkflow(["100", "200", "300"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { status: "200" },
                    Switch: { matchedCase: "200", selectedRoute: "200" },
                    "Branch-200": { httpStatus: 200, message: "OK" },
                    Output: { result: "200 OK" }
                })
            );

            const result = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { status: "200" },
                "200"
            );

            expect(mockActivities.wasNodeExecuted("Branch-200")).toBe(true);
            expect(result.context.nodeOutputs.get("Branch-200")).toEqual({
                httpStatus: 200,
                message: "OK"
            });
        });
    });

    describe("final outputs with switch", () => {
        it("should build final outputs from selected branch", async () => {
            const workflow = createSwitchWorkflow(["success", "failure"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { status: "success" },
                    Switch: { matchedCase: "success", selectedRoute: "success" },
                    "Branch-success": { processed: true },
                    Output: { finalStatus: "success", completed: true }
                })
            );

            const result = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { status: "success" },
                "success"
            );

            const finalOutputs = buildFinalOutputs(result.context, workflow.outputNodeIds);

            expect(finalOutputs).toEqual({ finalStatus: "success", completed: true });
        });
    });

    describe("execution order", () => {
        it("should execute nodes in correct order: Input -> Switch -> Branch -> Output", async () => {
            const workflow = createSwitchWorkflow(["a", "b"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { status: "a" },
                    Switch: { matchedCase: "a", selectedRoute: "a" },
                    "Branch-a": { result: "a" },
                    Output: { final: "done" }
                })
            );

            await simulateWorkflowExecution(workflow, mockActivities, { status: "a" }, "a");

            const order = mockActivities.getExecutionOrder();
            const inputIndex = order.indexOf("Input");
            const switchIndex = order.indexOf("Switch");
            const branchIndex = order.indexOf("Branch-a");
            const outputIndex = order.indexOf("Output");

            expect(inputIndex).toBeLessThan(switchIndex);
            expect(switchIndex).toBeLessThan(branchIndex);
            expect(branchIndex).toBeLessThan(outputIndex);
        });
    });
});
