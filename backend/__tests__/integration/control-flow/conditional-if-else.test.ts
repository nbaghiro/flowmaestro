/**
 * Conditional If-Else Integration Tests
 *
 * Tests for conditional branching workflow patterns:
 * - True/false branch execution
 * - All comparison operators
 * - Type coercion
 * - Null/undefined handling
 */

import type { WorkflowDefinition } from "@flowmaestro/shared";
import {
    createContext,
    storeNodeOutput,
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    markSkipped,
    isExecutionComplete
} from "../../../src/temporal/core/services/context";
import { createMockActivities, withOutputs } from "../../fixtures/activities";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge
} from "../../../src/temporal/activities/execution/types";
import type { ContextSnapshot, JsonObject } from "../../../src/temporal/core/types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a conditional workflow with customizable condition config
 */
function createTestConditionalWorkflow(conditionConfig: JsonObject): BuiltWorkflow {
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
                dependents: ["Condition"]
            }
        ],
        [
            "Condition",
            {
                id: "Condition",
                type: "conditional",
                name: "Condition",
                config: conditionConfig,
                depth: 1,
                dependencies: ["Input"],
                dependents: ["TrueBranch", "FalseBranch"]
            }
        ],
        [
            "TrueBranch",
            {
                id: "TrueBranch",
                type: "transform",
                name: "TrueBranch",
                config: { branch: "true" },
                depth: 2,
                dependencies: ["Condition"],
                dependents: ["Output"]
            }
        ],
        [
            "FalseBranch",
            {
                id: "FalseBranch",
                type: "transform",
                name: "FalseBranch",
                config: { branch: "false" },
                depth: 2,
                dependencies: ["Condition"],
                dependents: ["Output"]
            }
        ],
        [
            "Output",
            {
                id: "Output",
                type: "output",
                name: "Output",
                config: {},
                depth: 3,
                dependencies: ["TrueBranch", "FalseBranch"],
                dependents: []
            }
        ]
    ]);

    const edges = new Map<string, TypedEdge>([
        [
            "Input-Condition",
            {
                id: "Input-Condition",
                source: "Input",
                target: "Condition",
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            }
        ],
        [
            "Condition-TrueBranch",
            {
                id: "Condition-TrueBranch",
                source: "Condition",
                target: "TrueBranch",
                sourceHandle: "true",
                targetHandle: "input",
                handleType: "true"
            }
        ],
        [
            "Condition-FalseBranch",
            {
                id: "Condition-FalseBranch",
                source: "Condition",
                target: "FalseBranch",
                sourceHandle: "false",
                targetHandle: "input",
                handleType: "false"
            }
        ],
        [
            "TrueBranch-Output",
            {
                id: "TrueBranch-Output",
                source: "TrueBranch",
                target: "Output",
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            }
        ],
        [
            "FalseBranch-Output",
            {
                id: "FalseBranch-Output",
                source: "FalseBranch",
                target: "Output",
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
        executionLevels: [["Input"], ["Condition"], ["TrueBranch", "FalseBranch"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Evaluate a simple condition (simulates conditional node logic)
 */
function evaluateCondition(left: unknown, operator: string, right: unknown): boolean {
    switch (operator) {
        case "==":
            return left == right;
        case "===":
            return left === right;
        case "!=":
            return left != right;
        case "!==":
            return left !== right;
        case ">":
            return Number(left) > Number(right);
        case "<":
            return Number(left) < Number(right);
        case ">=":
            return Number(left) >= Number(right);
        case "<=":
            return Number(left) <= Number(right);
        case "contains":
            return String(left).includes(String(right));
        case "startsWith":
            return String(left).startsWith(String(right));
        case "endsWith":
            return String(left).endsWith(String(right));
        default:
            return false;
    }
}

/**
 * Simulate conditional workflow execution with branch selection
 */
async function simulateConditionalExecution(
    workflow: BuiltWorkflow,
    mockActivities: ReturnType<typeof createMockActivities>,
    inputs: JsonObject,
    conditionResult: boolean
) {
    let context = createContext(inputs);
    let queue = initializeQueue(workflow);
    const executedNodes: string[] = [];
    const skippedNodes: string[] = [];

    while (!isExecutionComplete(queue)) {
        const readyNodes = getReadyNodes(queue, workflow.maxConcurrentNodes);
        if (readyNodes.length === 0) break;

        queue = markExecuting(queue, readyNodes);

        for (const nodeId of readyNodes) {
            const node = workflow.nodes.get(nodeId);
            if (!node) continue;

            // Handle conditional node specially
            if (node.type === "conditional") {
                executedNodes.push(nodeId);
                const conditionOutput = { result: conditionResult, evaluated: true };
                context = storeNodeOutput(context, nodeId, conditionOutput);
                queue = markCompleted(queue, nodeId, conditionOutput, workflow);

                // Skip the inactive branch
                const branchToSkip = conditionResult ? "FalseBranch" : "TrueBranch";
                if (queue.pending.has(branchToSkip) || queue.ready.has(branchToSkip)) {
                    queue = markSkipped(queue, branchToSkip, workflow);
                    skippedNodes.push(branchToSkip);
                }
            } else {
                // Execute other nodes normally
                const result = await mockActivities.executeNode(node.type, node.config, context, {
                    nodeId,
                    executionId: "test",
                    workflowName: "test"
                });

                if (result.success) {
                    executedNodes.push(nodeId);
                    context = storeNodeOutput(context, nodeId, result.output);
                    queue = markCompleted(queue, nodeId, result.output, workflow);
                }
            }
        }
    }

    return { context, queue, executedNodes, skippedNodes };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Conditional If-Else", () => {
    describe("true branch execution", () => {
        it("should execute true branch when condition is true", async () => {
            const workflow = createTestConditionalWorkflow({
                leftValue: "{{Input.value}}",
                operator: ">",
                rightValue: 10
            });
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { value: 20 },
                    TrueBranch: { branch: "true", executed: true },
                    Output: { final: "from-true" }
                })
            );

            const result = await simulateConditionalExecution(
                workflow,
                mockActivities,
                { value: 20 },
                true
            );

            expect(result.executedNodes).toContain("TrueBranch");
            expect(result.skippedNodes).toContain("FalseBranch");
            expect(result.context.nodeOutputs.has("TrueBranch")).toBe(true);
            expect(result.context.nodeOutputs.has("FalseBranch")).toBe(false);
        });

        it("should make condition result available to true branch", async () => {
            const workflow = createTestConditionalWorkflow({});
            let trueBranchContext: ContextSnapshot | null = null;

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { value: 100 } },
                    TrueBranch: {
                        customOutput: { result: "true-path" },
                        onExecute: (input) => {
                            trueBranchContext = input.context;
                        }
                    },
                    Output: { customOutput: { done: true } }
                }
            });

            await simulateConditionalExecution(workflow, mockActivities, {}, true);

            expect(trueBranchContext).not.toBeNull();
            expect(trueBranchContext!.nodeOutputs.get("Condition")).toEqual({
                result: true,
                evaluated: true
            });
        });
    });

    describe("false branch execution", () => {
        it("should execute false branch when condition is false", async () => {
            const workflow = createTestConditionalWorkflow({
                leftValue: "{{Input.value}}",
                operator: ">",
                rightValue: 10
            });
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { value: 5 },
                    FalseBranch: { branch: "false", executed: true },
                    Output: { final: "from-false" }
                })
            );

            const result = await simulateConditionalExecution(
                workflow,
                mockActivities,
                { value: 5 },
                false
            );

            expect(result.executedNodes).toContain("FalseBranch");
            expect(result.skippedNodes).toContain("TrueBranch");
            expect(result.context.nodeOutputs.has("FalseBranch")).toBe(true);
            expect(result.context.nodeOutputs.has("TrueBranch")).toBe(false);
        });
    });

    describe("comparison operators", () => {
        const testCases = [
            { operator: "==", left: 10, right: 10, expected: true },
            { operator: "==", left: 10, right: "10", expected: true },
            { operator: "===", left: 10, right: 10, expected: true },
            { operator: "!=", left: 10, right: 5, expected: true },
            { operator: ">", left: 10, right: 5, expected: true },
            { operator: ">", left: 5, right: 10, expected: false },
            { operator: "<", left: 5, right: 10, expected: true },
            { operator: ">=", left: 10, right: 10, expected: true },
            { operator: "<=", left: 10, right: 10, expected: true },
            { operator: "contains", left: "hello world", right: "world", expected: true },
            { operator: "contains", left: "hello", right: "world", expected: false },
            { operator: "startsWith", left: "hello", right: "hel", expected: true },
            { operator: "endsWith", left: "hello", right: "llo", expected: true }
        ];

        testCases.forEach(({ operator, left, right, expected }) => {
            it(`should evaluate ${JSON.stringify(left)} ${operator} ${JSON.stringify(right)} as ${expected}`, () => {
                const result = evaluateCondition(left, operator, right);
                expect(result).toBe(expected);
            });
        });
    });

    describe("type coercion", () => {
        it("should handle string to number coercion", () => {
            expect(evaluateCondition("10", ">", 5)).toBe(true);
            expect(evaluateCondition(10, ">", "5")).toBe(true);
        });

        it("should handle boolean coercion", () => {
            expect(evaluateCondition(true, "==", 1)).toBe(true);
            expect(evaluateCondition(false, "==", 0)).toBe(true);
        });
    });

    describe("null/undefined handling", () => {
        it("should handle null values", () => {
            expect(evaluateCondition(null, "==", null)).toBe(true);
            expect(evaluateCondition(null, "==", undefined)).toBe(true);
            expect(evaluateCondition(null, "===", undefined)).toBe(false);
        });

        it("should handle undefined values", () => {
            expect(evaluateCondition(undefined, "==", undefined)).toBe(true);
            expect(evaluateCondition(undefined, "==", null)).toBe(true);
        });
    });

    describe("branch convergence", () => {
        it("should converge branches at output node", async () => {
            const workflow = createTestConditionalWorkflow({});
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { initial: true },
                    TrueBranch: { fromTrue: "value" },
                    Output: { final: "done" }
                })
            );

            const result = await simulateConditionalExecution(workflow, mockActivities, {}, true);

            // Output should be executed after the active branch
            expect(result.executedNodes).toContain("Output");
            expect(result.queue.completed.has("Output")).toBe(true);
        });

        it("should execute output even when one branch is skipped", async () => {
            const workflow = createTestConditionalWorkflow({});
            const mockActivities = createMockActivities({});

            const resultTrue = await simulateConditionalExecution(
                workflow,
                mockActivities,
                {},
                true
            );

            expect(resultTrue.queue.completed.has("Output")).toBe(true);
            expect(resultTrue.queue.skipped.has("FalseBranch")).toBe(true);

            // Reset and test false branch
            const resultFalse = await simulateConditionalExecution(
                workflow,
                createMockActivities({}),
                {},
                false
            );

            expect(resultFalse.queue.completed.has("Output")).toBe(true);
            expect(resultFalse.queue.skipped.has("TrueBranch")).toBe(true);
        });
    });
});
