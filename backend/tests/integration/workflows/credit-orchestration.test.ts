/**
 * Credit Orchestration Integration Tests
 *
 * Tests the credit lifecycle integration with workflow and agent orchestrators:
 * - Credit check and reservation at start
 * - Per-node/per-call credit tracking
 * - Credit finalization on success/failure
 * - skipCreditCheck behavior
 * - Insufficient credits handling
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    createContext,
    storeNodeOutput,
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    markFailed,
    isExecutionComplete,
    buildFinalOutputs
} from "../../../src/temporal/core/services/context";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge
} from "../../../src/temporal/activities/execution/types";

// ============================================================================
// MOCK CREDIT STATE
// ============================================================================

interface MockCreditState {
    balance: number;
    reserved: number;
    transactions: Array<{
        type: "reserve" | "release" | "finalize";
        amount: number;
        actualAmount?: number;
        operationType?: string;
        operationId?: string;
    }>;
}

function createMockCreditState(initialBalance: number): MockCreditState {
    return {
        balance: initialBalance,
        reserved: 0,
        transactions: []
    };
}

// ============================================================================
// MOCK CREDIT ACTIVITIES
// ============================================================================

interface MockCreditActivities {
    shouldAllowExecution: jest.Mock;
    reserveCredits: jest.Mock;
    releaseCredits: jest.Mock;
    finalizeCredits: jest.Mock;
    calculateLLMCredits: jest.Mock;
    calculateNodeCredits: jest.Mock;
    estimateWorkflowCredits: jest.Mock;
    getCreditState: () => MockCreditState;
}

function createMockCreditActivities(initialBalance: number): MockCreditActivities {
    const state = createMockCreditState(initialBalance);

    return {
        shouldAllowExecution: jest.fn(
            async ({ estimatedCredits }: { estimatedCredits: number }) => {
                const available = state.balance - state.reserved;
                // Allow if sufficient or shortfall < 10%
                if (available >= estimatedCredits) return true;
                const shortfallPercent = ((estimatedCredits - available) / estimatedCredits) * 100;
                return shortfallPercent < 10;
            }
        ),

        reserveCredits: jest.fn(async ({ estimatedCredits }: { estimatedCredits: number }) => {
            const available = state.balance - state.reserved;
            // Allow reservation if sufficient or shortfall < 10% (grace period)
            let canReserve = available >= estimatedCredits;
            if (!canReserve && estimatedCredits > 0) {
                const shortfallPercent = ((estimatedCredits - available) / estimatedCredits) * 100;
                canReserve = shortfallPercent < 10;
            }
            if (!canReserve) return false;
            state.reserved += estimatedCredits;
            state.transactions.push({ type: "reserve", amount: estimatedCredits });
            return true;
        }),

        releaseCredits: jest.fn(async ({ amount }: { amount: number }) => {
            state.reserved -= amount;
            state.transactions.push({ type: "release", amount });
        }),

        finalizeCredits: jest.fn(
            async ({
                reservedAmount,
                actualAmount,
                operationType,
                operationId
            }: {
                reservedAmount: number;
                actualAmount: number;
                operationType: string;
                operationId: string;
            }) => {
                // Release reservation
                state.reserved -= reservedAmount;
                // Deduct actual amount
                state.balance -= actualAmount;
                state.transactions.push({
                    type: "finalize",
                    amount: reservedAmount,
                    actualAmount,
                    operationType,
                    operationId
                });
            }
        ),

        calculateLLMCredits: jest.fn(
            async ({
                inputTokens,
                outputTokens
            }: {
                model: string;
                inputTokens: number;
                outputTokens: number;
            }) => {
                // Simple mock: 1 credit per 100 tokens
                return Math.ceil((inputTokens + outputTokens) / 100);
            }
        ),

        calculateNodeCredits: jest.fn(async ({ nodeType }: { nodeType: string }) => {
            const costs: Record<string, number> = {
                input: 0,
                output: 0,
                http: 2,
                transform: 1,
                llm: 10 // fallback for LLM without token usage
            };
            return costs[nodeType] ?? 1;
        }),

        estimateWorkflowCredits: jest.fn(
            async ({ workflowDefinition }: { workflowDefinition: { nodes: unknown[] } }) => {
                const nodeCount = Array.isArray(workflowDefinition.nodes)
                    ? workflowDefinition.nodes.length
                    : Object.keys(workflowDefinition.nodes).length;
                return {
                    totalCredits: nodeCount * 10,
                    breakdown: [],
                    confidence: "estimate"
                };
            }
        ),

        getCreditState: () => state
    };
}

// ============================================================================
// WORKFLOW SIMULATION WITH CREDITS
// ============================================================================

interface WorkflowExecutionResult {
    success: boolean;
    outputs: JsonObject;
    error?: string;
    creditsUsed: number;
    nodeCredits: Map<string, number>;
}

interface SimulationOptions {
    workspaceId?: string;
    skipCreditCheck?: boolean;
    nodeOutputs?: Record<string, JsonObject>;
    failingNodes?: string[];
    nodeTokenUsage?: Record<
        string,
        { promptTokens: number; completionTokens: number; model: string }
    >;
}

async function simulateWorkflowWithCredits(
    workflow: BuiltWorkflow,
    inputs: JsonObject,
    creditActivities: MockCreditActivities,
    options: SimulationOptions = {}
): Promise<WorkflowExecutionResult> {
    const {
        workspaceId,
        skipCreditCheck = false,
        nodeOutputs = {},
        failingNodes = [],
        nodeTokenUsage = {}
    } = options;

    let reservedCredits = 0;
    let accumulatedCredits = 0;
    const nodeCredits = new Map<string, number>();

    // PHASE 0: Credit check and reservation
    if (!skipCreditCheck && workspaceId) {
        const estimate = await creditActivities.estimateWorkflowCredits({
            workflowDefinition: { nodes: Array.from(workflow.nodes.values()) }
        });
        const estimatedCredits = Math.ceil(estimate.totalCredits * 1.2);

        const allowed = await creditActivities.shouldAllowExecution({
            workspaceId,
            estimatedCredits
        });

        if (!allowed) {
            return {
                success: false,
                outputs: {},
                error: "Insufficient credits",
                creditsUsed: 0,
                nodeCredits
            };
        }

        const reserved = await creditActivities.reserveCredits({
            workspaceId,
            estimatedCredits
        });

        if (!reserved) {
            return {
                success: false,
                outputs: {},
                error: "Failed to reserve credits",
                creditsUsed: 0,
                nodeCredits
            };
        }

        reservedCredits = estimatedCredits;
    }

    // PHASE 1-4: Execute workflow
    let context = createContext(inputs);
    let queue = initializeQueue(workflow);
    let hasError = false;
    let errorMessage: string | undefined;

    try {
        while (!isExecutionComplete(queue)) {
            const readyNodes = getReadyNodes(queue, workflow.maxConcurrentNodes);
            if (readyNodes.length === 0 && !isExecutionComplete(queue)) {
                throw new Error("Workflow stuck - no ready nodes but not complete");
            }

            queue = markExecuting(queue, readyNodes);

            for (const nodeId of readyNodes) {
                const node = workflow.nodes.get(nodeId)!;

                // Check if node should fail
                if (failingNodes.includes(nodeId)) {
                    queue = markFailed(queue, nodeId, `Node ${nodeId} failed`, workflow);
                    hasError = true;
                    errorMessage = `Node ${nodeId} failed`;
                    continue;
                }

                // Execute node
                const output = nodeOutputs[nodeId] || { result: `executed-${nodeId}` };
                context = storeNodeOutput(context, nodeId, output);
                queue = markCompleted(queue, nodeId, output, workflow);

                // Track credits
                if (!skipCreditCheck && workspaceId) {
                    let nodeCredit = 0;

                    if (nodeTokenUsage[nodeId]) {
                        const usage = nodeTokenUsage[nodeId];
                        nodeCredit = await creditActivities.calculateLLMCredits({
                            model: usage.model,
                            inputTokens: usage.promptTokens,
                            outputTokens: usage.completionTokens
                        });
                    } else {
                        nodeCredit = await creditActivities.calculateNodeCredits({
                            nodeType: node.type
                        });
                    }

                    nodeCredits.set(nodeId, nodeCredit);
                    accumulatedCredits += nodeCredit;
                }
            }

            if (hasError) break;
        }
    } catch (error) {
        hasError = true;
        errorMessage = error instanceof Error ? error.message : String(error);
    }

    // PHASE 5: Finalize credits
    if (!skipCreditCheck && workspaceId && reservedCredits > 0) {
        await creditActivities.finalizeCredits({
            workspaceId,
            userId: "test-user",
            reservedAmount: reservedCredits,
            actualAmount: accumulatedCredits,
            operationType: "workflow_execution",
            operationId: "test-execution"
        });
    }

    const outputs = hasError ? {} : buildFinalOutputs(context, workflow.outputNodeIds);

    return {
        success: !hasError,
        outputs,
        error: errorMessage,
        creditsUsed: accumulatedCredits,
        nodeCredits
    };
}

// ============================================================================
// TEST WORKFLOW FACTORIES
// ============================================================================

function createLinearWorkflow(nodeCount: number): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Input node (trigger)
    nodes.set("Trigger", {
        id: "Trigger",
        type: "input",
        name: "Trigger",
        config: {},
        depth: 0,
        dependencies: [],
        dependents: nodeCount > 0 ? ["Node1"] : ["Output"]
    });

    // Middle nodes
    for (let i = 1; i <= nodeCount; i++) {
        const prevNode = i === 1 ? "Trigger" : `Node${i - 1}`;
        const nextNode = i === nodeCount ? "Output" : `Node${i + 1}`;

        nodes.set(`Node${i}`, {
            id: `Node${i}`,
            type: i % 2 === 0 ? "http" : "transform",
            name: `Node${i}`,
            config: {},
            depth: i,
            dependencies: [prevNode],
            dependents: [nextNode]
        });

        edges.set(`${prevNode}-Node${i}`, {
            id: `${prevNode}-Node${i}`,
            source: prevNode,
            target: `Node${i}`,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    // Output
    const lastNode = nodeCount > 0 ? `Node${nodeCount}` : "Trigger";
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: {},
        depth: nodeCount + 1,
        dependencies: [lastNode],
        dependents: []
    });

    edges.set(`${lastNode}-Output`, {
        id: `${lastNode}-Output`,
        source: lastNode,
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
        executionLevels: [],
        triggerNodeId: "Trigger",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

function createLLMWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Trigger", {
        id: "Trigger",
        type: "input",
        name: "Trigger",
        config: {},
        depth: 0,
        dependencies: [],
        dependents: ["LLM"]
    });

    nodes.set("LLM", {
        id: "LLM",
        type: "llm",
        name: "LLM",
        config: { model: "gpt-4o", prompt: "Test prompt" },
        depth: 1,
        dependencies: ["Trigger"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: {},
        depth: 2,
        dependencies: ["LLM"],
        dependents: []
    });

    edges.set("Trigger-LLM", {
        id: "Trigger-LLM",
        source: "Trigger",
        target: "LLM",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    edges.set("LLM-Output", {
        id: "LLM-Output",
        source: "LLM",
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
        executionLevels: [],
        triggerNodeId: "Trigger",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Credit Orchestration", () => {
    describe("Credit Check and Reservation", () => {
        it("should check and reserve credits before execution", async () => {
            const creditActivities = createMockCreditActivities(1000);
            const workflow = createLinearWorkflow(3);

            const result = await simulateWorkflowWithCredits(workflow, {}, creditActivities, {
                workspaceId: "ws-123"
            });

            expect(result.success).toBe(true);
            expect(creditActivities.shouldAllowExecution).toHaveBeenCalled();
            expect(creditActivities.reserveCredits).toHaveBeenCalled();
            expect(creditActivities.finalizeCredits).toHaveBeenCalled();
        });

        it("should reject execution when insufficient credits", async () => {
            const creditActivities = createMockCreditActivities(10); // Very low balance
            const workflow = createLinearWorkflow(3);

            const result = await simulateWorkflowWithCredits(workflow, {}, creditActivities, {
                workspaceId: "ws-123"
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain("Insufficient credits");
            expect(creditActivities.reserveCredits).not.toHaveBeenCalled();
            expect(creditActivities.finalizeCredits).not.toHaveBeenCalled();
        });

        it("should allow execution with small overdraft (grace period)", async () => {
            const creditActivities = createMockCreditActivities(55); // ~91% of estimated
            const workflow = createLinearWorkflow(3);

            // Workflow estimates ~60 credits (5 nodes * 10 + 20% buffer)
            const result = await simulateWorkflowWithCredits(workflow, {}, creditActivities, {
                workspaceId: "ws-123"
            });

            expect(result.success).toBe(true);
        });

        it("should skip credit check when skipCreditCheck is true", async () => {
            const creditActivities = createMockCreditActivities(0); // Zero balance
            const workflow = createLinearWorkflow(3);

            const result = await simulateWorkflowWithCredits(workflow, {}, creditActivities, {
                workspaceId: "ws-123",
                skipCreditCheck: true
            });

            expect(result.success).toBe(true);
            expect(creditActivities.shouldAllowExecution).not.toHaveBeenCalled();
            expect(creditActivities.reserveCredits).not.toHaveBeenCalled();
            expect(creditActivities.finalizeCredits).not.toHaveBeenCalled();
        });

        it("should skip credit check when workspaceId is not provided", async () => {
            const creditActivities = createMockCreditActivities(0);
            const workflow = createLinearWorkflow(3);

            const result = await simulateWorkflowWithCredits(workflow, {}, creditActivities, {
                // No workspaceId
            });

            expect(result.success).toBe(true);
            expect(creditActivities.shouldAllowExecution).not.toHaveBeenCalled();
        });
    });

    describe("Per-Node Credit Tracking", () => {
        it("should track credits per node by type", async () => {
            const creditActivities = createMockCreditActivities(1000);
            const workflow = createLinearWorkflow(4);

            const result = await simulateWorkflowWithCredits(workflow, {}, creditActivities, {
                workspaceId: "ws-123"
            });

            expect(result.success).toBe(true);
            expect(result.nodeCredits.size).toBeGreaterThan(0);

            // Check calculateNodeCredits was called for each node
            expect(creditActivities.calculateNodeCredits).toHaveBeenCalled();
        });

        it("should calculate LLM credits from token usage", async () => {
            const creditActivities = createMockCreditActivities(1000);
            const workflow = createLLMWorkflow();

            const result = await simulateWorkflowWithCredits(workflow, {}, creditActivities, {
                workspaceId: "ws-123",
                nodeTokenUsage: {
                    LLM: {
                        model: "gpt-4o",
                        promptTokens: 500,
                        completionTokens: 200
                    }
                }
            });

            expect(result.success).toBe(true);
            expect(creditActivities.calculateLLMCredits).toHaveBeenCalledWith({
                model: "gpt-4o",
                inputTokens: 500,
                outputTokens: 200
            });

            // Should have credits for LLM node
            expect(result.nodeCredits.has("LLM")).toBe(true);
            expect(result.nodeCredits.get("LLM")).toBeGreaterThan(0);
        });

        it("should accumulate credits across all nodes", async () => {
            const creditActivities = createMockCreditActivities(1000);
            const workflow = createLinearWorkflow(5);

            const result = await simulateWorkflowWithCredits(workflow, {}, creditActivities, {
                workspaceId: "ws-123"
            });

            expect(result.success).toBe(true);
            expect(result.creditsUsed).toBeGreaterThan(0);

            // Total should equal sum of node credits
            let sum = 0;
            result.nodeCredits.forEach((credits) => {
                sum += credits;
            });
            expect(result.creditsUsed).toBe(sum);
        });
    });

    describe("Credit Finalization", () => {
        it("should finalize with actual credits on success", async () => {
            const creditActivities = createMockCreditActivities(1000);
            const workflow = createLinearWorkflow(3);

            await simulateWorkflowWithCredits(workflow, {}, creditActivities, {
                workspaceId: "ws-123"
            });

            const finalizeCall = creditActivities.finalizeCredits.mock.calls[0][0];
            expect(finalizeCall.operationType).toBe("workflow_execution");
            expect(finalizeCall.actualAmount).toBeGreaterThanOrEqual(0);
            expect(finalizeCall.reservedAmount).toBeGreaterThan(0);
        });

        it("should finalize with partial credits on failure", async () => {
            const creditActivities = createMockCreditActivities(1000);
            const workflow = createLinearWorkflow(5);

            const result = await simulateWorkflowWithCredits(workflow, {}, creditActivities, {
                workspaceId: "ws-123",
                failingNodes: ["Node3"] // Fail midway
            });

            expect(result.success).toBe(false);
            expect(creditActivities.finalizeCredits).toHaveBeenCalled();

            // Should have partial credits (nodes 1-2 completed)
            const finalizeCall = creditActivities.finalizeCredits.mock.calls[0][0];
            expect(finalizeCall.actualAmount).toBeGreaterThan(0);
            expect(finalizeCall.actualAmount).toBeLessThan(finalizeCall.reservedAmount);
        });

        it("should update credit balance correctly after finalization", async () => {
            const creditActivities = createMockCreditActivities(1000);
            const workflow = createLinearWorkflow(3);

            await simulateWorkflowWithCredits(workflow, {}, creditActivities, {
                workspaceId: "ws-123"
            });

            const state = creditActivities.getCreditState();

            // Balance should be reduced by actual usage
            expect(state.balance).toBeLessThan(1000);

            // Reserved should be back to 0
            expect(state.reserved).toBe(0);

            // Should have reserve and finalize transactions
            const reserveTx = state.transactions.find((t) => t.type === "reserve");
            const finalizeTx = state.transactions.find((t) => t.type === "finalize");
            expect(reserveTx).toBeDefined();
            expect(finalizeTx).toBeDefined();
        });
    });

    describe("Credit Transaction Audit Trail", () => {
        it("should record all credit transactions", async () => {
            const creditActivities = createMockCreditActivities(1000);
            const workflow = createLinearWorkflow(3);

            await simulateWorkflowWithCredits(workflow, {}, creditActivities, {
                workspaceId: "ws-123"
            });

            const state = creditActivities.getCreditState();

            // Should have exactly: 1 reserve + 1 finalize
            expect(state.transactions).toHaveLength(2);
            expect(state.transactions[0].type).toBe("reserve");
            expect(state.transactions[1].type).toBe("finalize");
        });

        it("should include operation details in finalization", async () => {
            const creditActivities = createMockCreditActivities(1000);
            const workflow = createLinearWorkflow(3);

            await simulateWorkflowWithCredits(workflow, {}, creditActivities, {
                workspaceId: "ws-123"
            });

            const finalizeCall = creditActivities.finalizeCredits.mock.calls[0][0];
            expect(finalizeCall.operationType).toBe("workflow_execution");
            expect(finalizeCall.operationId).toBe("test-execution");
            expect(finalizeCall.workspaceId).toBe("ws-123");
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty workflow (no nodes)", async () => {
            const creditActivities = createMockCreditActivities(1000);
            const workflow = createLinearWorkflow(0);

            const result = await simulateWorkflowWithCredits(workflow, {}, creditActivities, {
                workspaceId: "ws-123"
            });

            expect(result.success).toBe(true);
            expect(result.creditsUsed).toBe(0);
        });

        it("should handle workflow with only free nodes", async () => {
            const creditActivities = createMockCreditActivities(1000);

            // Override to return 0 for all nodes
            creditActivities.calculateNodeCredits.mockResolvedValue(0);

            const workflow = createLinearWorkflow(3);
            const result = await simulateWorkflowWithCredits(workflow, {}, creditActivities, {
                workspaceId: "ws-123"
            });

            expect(result.success).toBe(true);
            expect(result.creditsUsed).toBe(0);

            // Should still finalize (with 0 actual)
            const finalizeCall = creditActivities.finalizeCredits.mock.calls[0][0];
            expect(finalizeCall.actualAmount).toBe(0);
        });

        it("should handle first node failure (no credits used)", async () => {
            const creditActivities = createMockCreditActivities(1000);
            const workflow = createLinearWorkflow(5);

            const result = await simulateWorkflowWithCredits(workflow, {}, creditActivities, {
                workspaceId: "ws-123",
                failingNodes: ["Trigger"] // Fail at start
            });

            expect(result.success).toBe(false);

            // Should finalize with 0 actual credits
            const finalizeCall = creditActivities.finalizeCredits.mock.calls[0][0];
            expect(finalizeCall.actualAmount).toBe(0);
        });
    });
});
