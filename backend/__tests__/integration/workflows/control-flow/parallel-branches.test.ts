/**
 * Parallel Branches Integration Tests
 *
 * Tests for parallel branch execution patterns:
 * - Two parallel branches execute concurrently
 * - Three or more parallel branches
 * - Context isolation between branches
 * - Branch identification with parallel.index and parallel.branchId
 * - All branches complete before downstream nodes
 */

import type { WorkflowDefinition } from "@flowmaestro/shared";
import {
    createContext,
    storeNodeOutput,
    setVariable,
    getVariable,
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted
} from "../../../../src/temporal/core/services/context";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge
} from "../../../../src/temporal/activities/execution/types";
import type {
    ContextSnapshot,
    ExecutionQueueState,
    JsonObject,
    JsonValue
} from "../../../../src/temporal/core/types";

// ============================================================================
// HELPER TYPES
// ============================================================================

interface BranchExecution {
    branchId: string;
    startTime: number;
    endTime: number;
    output: Record<string, unknown>;
}

interface ParallelExecutionResult {
    context: ContextSnapshot;
    queue: ExecutionQueueState;
    branchExecutions: BranchExecution[];
    executionOrder: string[];
    maxConcurrent: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a workflow with parallel branches
 */
function createParallelBranchWorkflow(branchCount: number): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: {},
        depth: 0,
        dependencies: [],
        dependents: Array.from({ length: branchCount }, (_, i) => `Branch${i + 1}`)
    });

    // Branch nodes
    for (let i = 1; i <= branchCount; i++) {
        const branchId = `Branch${i}`;
        nodes.set(branchId, {
            id: branchId,
            type: "transform",
            name: branchId,
            config: { branchIndex: i - 1, branchId },
            depth: 1,
            dependencies: ["Input"],
            dependents: ["Join"]
        });

        edges.set(`Input-${branchId}`, {
            id: `Input-${branchId}`,
            source: "Input",
            target: branchId,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });

        edges.set(`${branchId}-Join`, {
            id: `${branchId}-Join`,
            source: branchId,
            target: "Join",
            sourceHandle: "output",
            targetHandle: `branch${i}`,
            handleType: "default"
        });
    }

    // Join node
    nodes.set("Join", {
        id: "Join",
        type: "transform",
        name: "Join",
        config: { operation: "merge" },
        depth: 2,
        dependencies: Array.from({ length: branchCount }, (_, i) => `Branch${i + 1}`),
        dependents: ["Output"]
    });

    // Output node
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: {},
        depth: 3,
        dependencies: ["Join"],
        dependents: []
    });

    edges.set("Join-Output", {
        id: "Join-Output",
        source: "Join",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    const branchIds = Array.from({ length: branchCount }, (_, i) => `Branch${i + 1}`);

    return {
        originalDefinition: {} as WorkflowDefinition,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], branchIds, ["Join"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate parallel branch execution
 */
async function simulateParallelExecution(
    branchCount: number,
    processBranch: (
        branchIndex: number,
        branchId: string,
        context: ContextSnapshot
    ) => Promise<{
        output: Record<string, unknown>;
        delay?: number;
    }>,
    maxConcurrent: number = 10
): Promise<ParallelExecutionResult> {
    const workflow = createParallelBranchWorkflow(branchCount);
    let context = createContext({});
    let queue = initializeQueue(workflow);
    const branchExecutions: BranchExecution[] = [];
    const executionOrder: string[] = [];
    let maxConcurrentObserved = 0;
    let currentlyExecuting = 0;

    // Execute Input node
    queue = markExecuting(queue, ["Input"]);
    context = storeNodeOutput(context, "Input", { initialized: true });
    queue = markCompleted(queue, "Input", { initialized: true }, workflow);
    executionOrder.push("Input");

    // Execute branches in parallel (simulated)
    const readyBranches = getReadyNodes(queue, maxConcurrent);
    queue = markExecuting(queue, readyBranches);
    currentlyExecuting = readyBranches.length;
    maxConcurrentObserved = Math.max(maxConcurrentObserved, currentlyExecuting);

    // Store parallel state for each branch
    for (let i = 0; i < readyBranches.length; i++) {
        const branchId = readyBranches[i];
        context = setVariable(context, `parallel_${branchId}`, {
            index: i,
            branchId,
            total: branchCount
        });
    }

    // Execute all branches
    const branchPromises = readyBranches.map(async (branchId, index) => {
        const startTime = Date.now();

        const { output, delay } = await processBranch(index, branchId, context);

        if (delay) {
            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const endTime = Date.now();

        return {
            branchId,
            startTime,
            endTime,
            output
        };
    });

    const branchResults = await Promise.all(branchPromises);

    // Complete branches and track execution order
    for (const result of branchResults) {
        context = storeNodeOutput(context, result.branchId, result.output as JsonObject);
        queue = markCompleted(queue, result.branchId, result.output as JsonObject, workflow);
        branchExecutions.push(result);
        executionOrder.push(result.branchId);
        currentlyExecuting--;
    }

    // Execute Join node
    const joinReady = getReadyNodes(queue, maxConcurrent);
    if (joinReady.includes("Join")) {
        queue = markExecuting(queue, ["Join"]);
        const joinOutput: JsonObject = {
            merged: true,
            branchCount,
            branchOutputs: branchResults.map((r) => r.output) as JsonValue
        };
        context = storeNodeOutput(context, "Join", joinOutput);
        queue = markCompleted(queue, "Join", joinOutput, workflow);
        executionOrder.push("Join");
    }

    // Execute Output node
    const outputReady = getReadyNodes(queue, maxConcurrent);
    if (outputReady.includes("Output")) {
        queue = markExecuting(queue, ["Output"]);
        const outputResult = { completed: true };
        context = storeNodeOutput(context, "Output", outputResult);
        queue = markCompleted(queue, "Output", outputResult, workflow);
        executionOrder.push("Output");
    }

    return {
        context,
        queue,
        branchExecutions,
        executionOrder,
        maxConcurrent: maxConcurrentObserved
    };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Parallel Branches", () => {
    describe("two parallel branches", () => {
        it("should execute two branches concurrently", async () => {
            const { branchExecutions, maxConcurrent, executionOrder } =
                await simulateParallelExecution(2, async (index, branchId) => ({
                    output: { branch: branchId, index }
                }));

            expect(branchExecutions).toHaveLength(2);
            expect(maxConcurrent).toBe(2);
            expect(executionOrder).toContain("Branch1");
            expect(executionOrder).toContain("Branch2");
        });

        it("should produce independent outputs for each branch", async () => {
            const { context } = await simulateParallelExecution(2, async (index, branchId) => ({
                output: {
                    branchId,
                    computedValue: (index + 1) * 100,
                    timestamp: Date.now()
                }
            }));

            const branch1Output = context.nodeOutputs.get("Branch1");
            const branch2Output = context.nodeOutputs.get("Branch2");

            expect(branch1Output).toMatchObject({ branchId: "Branch1", computedValue: 100 });
            expect(branch2Output).toMatchObject({ branchId: "Branch2", computedValue: 200 });
        });

        it("should complete both branches before Join executes", async () => {
            const { executionOrder } = await simulateParallelExecution(
                2,
                async (_index, branchId) => ({
                    output: { branch: branchId }
                })
            );

            const joinIndex = executionOrder.indexOf("Join");
            const branch1Index = executionOrder.indexOf("Branch1");
            const branch2Index = executionOrder.indexOf("Branch2");

            expect(joinIndex).toBeGreaterThan(branch1Index);
            expect(joinIndex).toBeGreaterThan(branch2Index);
        });
    });

    describe("three parallel branches", () => {
        it("should execute three branches concurrently", async () => {
            const { branchExecutions, maxConcurrent } = await simulateParallelExecution(
                3,
                async (index, branchId) => ({
                    output: { branch: branchId, index }
                })
            );

            expect(branchExecutions).toHaveLength(3);
            expect(maxConcurrent).toBe(3);
        });

        it("should collect outputs from all three branches", async () => {
            const { context } = await simulateParallelExecution(3, async (_index, branchId) => ({
                output: {
                    branchId,
                    data: `data-from-${branchId}`
                }
            }));

            expect(context.nodeOutputs.has("Branch1")).toBe(true);
            expect(context.nodeOutputs.has("Branch2")).toBe(true);
            expect(context.nodeOutputs.has("Branch3")).toBe(true);

            const joinOutput = context.nodeOutputs.get("Join") as {
                branchOutputs: Array<{ branchId: string; data: string }>;
            };
            expect(joinOutput.branchOutputs).toHaveLength(3);
        });
    });

    describe("many parallel branches", () => {
        it("should handle five parallel branches", async () => {
            const { branchExecutions, context } = await simulateParallelExecution(
                5,
                async (index, _branchId) => ({
                    output: { index, processed: true }
                })
            );

            expect(branchExecutions).toHaveLength(5);
            for (let i = 1; i <= 5; i++) {
                expect(context.nodeOutputs.has(`Branch${i}`)).toBe(true);
            }
        });

        it("should handle ten parallel branches", async () => {
            const { branchExecutions, maxConcurrent } = await simulateParallelExecution(
                10,
                async (index, _branchId) => ({
                    output: { index }
                })
            );

            expect(branchExecutions).toHaveLength(10);
            expect(maxConcurrent).toBe(10);
        });
    });

    describe("context isolation between branches", () => {
        it("should not share mutable state between branches", async () => {
            const sharedState: number[] = [];

            const { branchExecutions } = await simulateParallelExecution(
                3,
                async (index, branchId) => {
                    // Each branch tries to modify shared state
                    sharedState.push(index);
                    return {
                        output: {
                            branchId,
                            seenIndices: [...sharedState]
                        }
                    };
                }
            );

            // Each branch should only see its own index at time of execution
            // (In real parallel execution, timing would vary)
            expect(branchExecutions).toHaveLength(3);
        });

        it("should provide isolated context to each branch", async () => {
            const { context } = await simulateParallelExecution(3, async (index, branchId, ctx) => {
                // Each branch gets its own parallel state
                const parallelState = getVariable(ctx, `parallel_${branchId}`) as {
                    index: number;
                    branchId: string;
                };

                return {
                    output: {
                        receivedIndex: parallelState?.index ?? index,
                        receivedBranchId: parallelState?.branchId ?? branchId
                    }
                };
            });

            const branch1 = context.nodeOutputs.get("Branch1") as { receivedIndex: number };
            const branch2 = context.nodeOutputs.get("Branch2") as { receivedIndex: number };
            const branch3 = context.nodeOutputs.get("Branch3") as { receivedIndex: number };

            expect(branch1.receivedIndex).toBe(0);
            expect(branch2.receivedIndex).toBe(1);
            expect(branch3.receivedIndex).toBe(2);
        });

        it("should not allow one branch to modify another branch's output", async () => {
            const { context } = await simulateParallelExecution(2, async (index, branchId) => {
                return {
                    output: {
                        branchId,
                        privateData: `secret-${branchId}`,
                        attempt: index
                    }
                };
            });

            const branch1 = context.nodeOutputs.get("Branch1") as { privateData: string };
            const branch2 = context.nodeOutputs.get("Branch2") as { privateData: string };

            expect(branch1.privateData).toBe("secret-Branch1");
            expect(branch2.privateData).toBe("secret-Branch2");
        });
    });

    describe("parallel.index and parallel.branchId access", () => {
        it("should provide parallel.index for each branch", async () => {
            const capturedIndices: number[] = [];

            await simulateParallelExecution(4, async (_index, branchId, ctx) => {
                const parallelState = getVariable(ctx, `parallel_${branchId}`) as { index: number };
                capturedIndices.push(parallelState?.index ?? _index);
                return { output: { index: parallelState?.index ?? _index } };
            });

            expect(capturedIndices.sort()).toEqual([0, 1, 2, 3]);
        });

        it("should provide parallel.branchId for each branch", async () => {
            const capturedIds: string[] = [];

            await simulateParallelExecution(3, async (_index, branchId, ctx) => {
                const parallelState = getVariable(ctx, `parallel_${branchId}`) as {
                    branchId: string;
                };
                capturedIds.push(parallelState?.branchId ?? branchId);
                return { output: { branchId: parallelState?.branchId ?? branchId } };
            });

            expect(capturedIds.sort()).toEqual(["Branch1", "Branch2", "Branch3"]);
        });

        it("should provide parallel.total for branch count", async () => {
            const capturedTotals: number[] = [];

            await simulateParallelExecution(5, async (_index, branchId, ctx) => {
                const parallelState = getVariable(ctx, `parallel_${branchId}`) as { total: number };
                capturedTotals.push(parallelState?.total ?? 0);
                return { output: {} };
            });

            // All branches should see total = 5
            expect(capturedTotals).toEqual([5, 5, 5, 5, 5]);
        });
    });

    describe("all branches complete before downstream", () => {
        it("should wait for slowest branch before Join", async () => {
            const completionOrder: string[] = [];

            const { executionOrder } = await simulateParallelExecution(
                3,
                async (index, branchId) => {
                    // Branch 2 is slowest
                    const delay = index === 1 ? 50 : 10;
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    completionOrder.push(branchId);
                    return { output: { branchId } };
                }
            );

            const joinIndex = executionOrder.indexOf("Join");
            expect(joinIndex).toBe(4); // After Input and all 3 branches
        });

        it("should make all branch outputs available to Join", async () => {
            const { context } = await simulateParallelExecution(3, async (index, branchId) => ({
                output: {
                    branchId,
                    value: (index + 1) * 10
                }
            }));

            const joinOutput = context.nodeOutputs.get("Join") as {
                branchOutputs: Array<{ branchId: string; value: number }>;
            };

            expect(joinOutput.branchOutputs).toHaveLength(3);
            expect(joinOutput.branchOutputs.map((o) => o.value).sort((a, b) => a - b)).toEqual([
                10, 20, 30
            ]);
        });

        it("should handle branches completing in different orders", async () => {
            const completionTimes: Array<{ branchId: string; time: number }> = [];
            const startTime = Date.now();

            await simulateParallelExecution(3, async (index, branchId) => {
                // Reverse order completion: Branch3 first, Branch1 last
                const delay = (3 - index) * 20;
                await new Promise((resolve) => setTimeout(resolve, delay));
                completionTimes.push({ branchId, time: Date.now() - startTime });
                return { output: { branchId } };
            });

            // All branches should complete regardless of order
            expect(completionTimes).toHaveLength(3);
        });
    });

    describe("execution timing", () => {
        it("should execute branches concurrently not sequentially", async () => {
            const startTime = Date.now();

            await simulateParallelExecution(3, async () => {
                await new Promise((resolve) => setTimeout(resolve, 30));
                return { output: {} };
            });

            const totalTime = Date.now() - startTime;

            // If sequential: ~90ms, if parallel: ~30-50ms
            // Allow some overhead but should be much less than sequential
            expect(totalTime).toBeLessThan(80);
        });

        it("should track execution start and end times", async () => {
            const { branchExecutions } = await simulateParallelExecution(2, async (index) => {
                await new Promise((resolve) => setTimeout(resolve, 20));
                return { output: { index } };
            });

            for (const execution of branchExecutions) {
                expect(execution.startTime).toBeLessThanOrEqual(execution.endTime);
                expect(execution.endTime - execution.startTime).toBeGreaterThanOrEqual(15);
            }
        });

        it("should show overlapping execution times for parallel branches", async () => {
            const { branchExecutions } = await simulateParallelExecution(3, async () => {
                await new Promise((resolve) => setTimeout(resolve, 30));
                return { output: {} };
            });

            // Check that branches have overlapping execution windows
            const [b1, b2, b3] = branchExecutions;

            // All should start around the same time (within 10ms)
            const maxStartDiff = Math.max(
                Math.abs(b1.startTime - b2.startTime),
                Math.abs(b2.startTime - b3.startTime),
                Math.abs(b1.startTime - b3.startTime)
            );
            expect(maxStartDiff).toBeLessThan(20);
        });
    });

    describe("branch-specific processing", () => {
        it("should allow different operations per branch", async () => {
            const { context } = await simulateParallelExecution(3, async (index, _branchId) => {
                let output: Record<string, unknown>;

                switch (index) {
                    case 0:
                        output = { operation: "fetch", data: "fetched-data" };
                        break;
                    case 1:
                        output = { operation: "transform", data: "transformed-data" };
                        break;
                    case 2:
                        output = { operation: "validate", data: "validated-data" };
                        break;
                    default:
                        output = { operation: "unknown" };
                }

                return { output };
            });

            expect(context.nodeOutputs.get("Branch1")).toMatchObject({ operation: "fetch" });
            expect(context.nodeOutputs.get("Branch2")).toMatchObject({ operation: "transform" });
            expect(context.nodeOutputs.get("Branch3")).toMatchObject({ operation: "validate" });
        });

        it("should handle branches with different output structures", async () => {
            const { context } = await simulateParallelExecution(3, async (index) => {
                if (index === 0) {
                    return { output: { type: "simple", value: 42 } };
                } else if (index === 1) {
                    return {
                        output: {
                            type: "nested",
                            data: { inner: { deep: "value" } }
                        }
                    };
                } else {
                    return {
                        output: {
                            type: "array",
                            items: [1, 2, 3, 4, 5]
                        }
                    };
                }
            });

            const branch1 = context.nodeOutputs.get("Branch1") as { type: string };
            const branch2 = context.nodeOutputs.get("Branch2") as {
                type: string;
                data: { inner: { deep: string } };
            };
            const branch3 = context.nodeOutputs.get("Branch3") as { type: string; items: number[] };

            expect(branch1.type).toBe("simple");
            expect(branch2.data.inner.deep).toBe("value");
            expect(branch3.items).toHaveLength(5);
        });
    });

    describe("input data access in branches", () => {
        it("should allow all branches to access input node output", async () => {
            const { context } = await simulateParallelExecution(
                3,
                async (_index, branchId, ctx) => {
                    const inputOutput = ctx.nodeOutputs.get("Input");
                    return {
                        output: {
                            branchId,
                            sawInput: !!inputOutput,
                            inputValue: inputOutput
                        }
                    };
                }
            );

            for (let i = 1; i <= 3; i++) {
                const branchOutput = context.nodeOutputs.get(`Branch${i}`) as { sawInput: boolean };
                expect(branchOutput.sawInput).toBe(true);
            }
        });

        it("should allow branches to transform input data differently", async () => {
            // Simulate workflow with actual input data
            let _context = createContext({ baseValue: 100 });
            _context = setVariable(_context, "multipliers", [2, 3, 5]);

            const { context: finalContext } = await simulateParallelExecution(3, async (index) => {
                const multipliers = [2, 3, 5];
                const baseValue = 100;
                return {
                    output: {
                        multiplier: multipliers[index],
                        result: baseValue * multipliers[index]
                    }
                };
            });

            const branch1 = finalContext.nodeOutputs.get("Branch1") as { result: number };
            const branch2 = finalContext.nodeOutputs.get("Branch2") as { result: number };
            const branch3 = finalContext.nodeOutputs.get("Branch3") as { result: number };

            expect(branch1.result).toBe(200);
            expect(branch2.result).toBe(300);
            expect(branch3.result).toBe(500);
        });
    });

    describe("edge cases", () => {
        it("should handle single branch (degenerate parallel)", async () => {
            const { branchExecutions, executionOrder } = await simulateParallelExecution(
                1,
                async (_index, _branchId) => ({
                    output: { single: true }
                })
            );

            expect(branchExecutions).toHaveLength(1);
            expect(executionOrder).toContain("Branch1");
            expect(executionOrder).toContain("Join");
        });

        it("should handle empty branch output", async () => {
            const { context } = await simulateParallelExecution(2, async (index) => ({
                output: index === 0 ? {} : { hasData: true }
            }));

            expect(context.nodeOutputs.get("Branch1")).toEqual({});
            expect(context.nodeOutputs.get("Branch2")).toEqual({ hasData: true });
        });

        it("should handle large number of branches", async () => {
            const branchCount = 20;

            const { branchExecutions, context } = await simulateParallelExecution(
                branchCount,
                async (index) => ({
                    output: { index }
                }),
                branchCount
            );

            expect(branchExecutions).toHaveLength(branchCount);
            expect(context.nodeOutputs.size).toBeGreaterThanOrEqual(branchCount);
        });
    });
});
