/**
 * Parallel with Join Integration Tests
 *
 * Tests for parallel branch execution with join/merge patterns:
 * - Join waits for all branches
 * - Output merging from multiple branches
 * - Access individual branch outputs after join
 * - Aggregation node after join
 * - Different merge strategies
 */

import type { WorkflowDefinition } from "@flowmaestro/shared";
import {
    createContext,
    storeNodeOutput,
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
import type { ContextSnapshot, JsonObject, JsonValue } from "../../../../src/temporal/core/types";

// ============================================================================
// HELPER TYPES
// ============================================================================

type MergeStrategy = "object" | "array" | "first" | "last" | "custom";

interface JoinConfig {
    strategy: MergeStrategy;
    branchKeys?: string[];
    customMerge?: (outputs: Array<Record<string, unknown>>) => Record<string, unknown>;
}

interface JoinExecutionResult {
    context: ContextSnapshot;
    joinOutput: Record<string, unknown>;
    branchOutputs: Array<Record<string, unknown>>;
    aggregatedOutput?: Record<string, unknown>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a parallel workflow with configurable join behavior
 */
function createParallelJoinWorkflow(
    branchCount: number,
    hasAggregation: boolean = false
): BuiltWorkflow {
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
            config: { branchIndex: i - 1 },
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
    const joinDependents = hasAggregation ? ["Aggregate"] : ["Output"];
    nodes.set("Join", {
        id: "Join",
        type: "transform",
        name: "Join",
        config: { branchCount },
        depth: 2,
        dependencies: Array.from({ length: branchCount }, (_, i) => `Branch${i + 1}`),
        dependents: joinDependents
    });

    if (hasAggregation) {
        // Aggregation node
        nodes.set("Aggregate", {
            id: "Aggregate",
            type: "transform",
            name: "Aggregate",
            config: { operation: "aggregate" },
            depth: 3,
            dependencies: ["Join"],
            dependents: ["Output"]
        });

        edges.set("Join-Aggregate", {
            id: "Join-Aggregate",
            source: "Join",
            target: "Aggregate",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });

        edges.set("Aggregate-Output", {
            id: "Aggregate-Output",
            source: "Aggregate",
            target: "Output",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });

        nodes.set("Output", {
            id: "Output",
            type: "output",
            name: "Output",
            config: {},
            depth: 4,
            dependencies: ["Aggregate"],
            dependents: []
        });
    } else {
        edges.set("Join-Output", {
            id: "Join-Output",
            source: "Join",
            target: "Output",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });

        nodes.set("Output", {
            id: "Output",
            type: "output",
            name: "Output",
            config: {},
            depth: 3,
            dependencies: ["Join"],
            dependents: []
        });
    }

    const branchIds = Array.from({ length: branchCount }, (_, i) => `Branch${i + 1}`);
    const levels = hasAggregation
        ? [["Input"], branchIds, ["Join"], ["Aggregate"], ["Output"]]
        : [["Input"], branchIds, ["Join"], ["Output"]];

    return {
        originalDefinition: {} as WorkflowDefinition,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: levels,
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate parallel execution with join
 */
async function simulateParallelWithJoin(
    branchCount: number,
    processBranch: (branchIndex: number, branchId: string) => Record<string, unknown>,
    joinConfig: JoinConfig,
    aggregator?: (
        joinOutput: Record<string, unknown>,
        context: ContextSnapshot
    ) => Record<string, unknown>
): Promise<JoinExecutionResult> {
    const hasAggregation = !!aggregator;
    const workflow = createParallelJoinWorkflow(branchCount, hasAggregation);
    let context = createContext({});
    let queue = initializeQueue(workflow);

    // Execute Input
    queue = markExecuting(queue, ["Input"]);
    context = storeNodeOutput(context, "Input", { started: true });
    queue = markCompleted(queue, "Input", { started: true }, workflow);

    // Execute branches
    const branchOutputs: Array<Record<string, unknown>> = [];
    const branchIds = Array.from({ length: branchCount }, (_, i) => `Branch${i + 1}`);

    queue = markExecuting(queue, branchIds);

    for (let i = 0; i < branchCount; i++) {
        const branchId = branchIds[i];
        const output = processBranch(i, branchId) as JsonObject;
        branchOutputs.push(output);
        context = storeNodeOutput(context, branchId, output);
        queue = markCompleted(queue, branchId, output, workflow);
    }

    // Execute Join with merge strategy
    queue = markExecuting(queue, ["Join"]);

    let joinOutput: JsonObject;
    switch (joinConfig.strategy) {
        case "object":
            // Merge into keyed object
            joinOutput = {};
            for (let i = 0; i < branchCount; i++) {
                const key = joinConfig.branchKeys?.[i] || `branch${i + 1}`;
                (joinOutput as JsonObject)[key] = branchOutputs[i] as JsonValue;
            }
            break;

        case "array":
            // Collect into array
            joinOutput = { results: branchOutputs as JsonValue };
            break;

        case "first":
            // Take first branch output
            joinOutput = { result: branchOutputs[0] as JsonValue };
            break;

        case "last":
            // Take last branch output
            joinOutput = { result: branchOutputs[branchCount - 1] as JsonValue };
            break;

        case "custom":
            // Use custom merge function
            joinOutput = (joinConfig.customMerge?.(branchOutputs) || {}) as JsonObject;
            break;

        default:
            joinOutput = { branches: branchOutputs as JsonValue };
    }

    context = storeNodeOutput(context, "Join", joinOutput);
    queue = markCompleted(queue, "Join", joinOutput, workflow);

    // Execute Aggregation if present
    let aggregatedOutput: JsonObject | undefined;
    if (aggregator) {
        queue = markExecuting(queue, ["Aggregate"]);
        aggregatedOutput = aggregator(joinOutput, context) as JsonObject;
        context = storeNodeOutput(context, "Aggregate", aggregatedOutput);
        queue = markCompleted(queue, "Aggregate", aggregatedOutput, workflow);
    }

    // Execute Output
    queue = markExecuting(queue, ["Output"]);
    const finalOutput = { completed: true };
    context = storeNodeOutput(context, "Output", finalOutput);
    queue = markCompleted(queue, "Output", finalOutput, workflow);

    return {
        context,
        joinOutput,
        branchOutputs,
        aggregatedOutput
    };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Parallel with Join", () => {
    describe("join waits for all branches", () => {
        it("should wait for all two branches before join", async () => {
            const executionOrder: string[] = [];

            const workflow = createParallelJoinWorkflow(2);
            let context = createContext({});
            let queue = initializeQueue(workflow);

            // Input
            queue = markExecuting(queue, ["Input"]);
            executionOrder.push("Input");
            context = storeNodeOutput(context, "Input", {});
            queue = markCompleted(queue, "Input", {}, workflow);

            // Check what's ready after input
            const readyAfterInput = getReadyNodes(queue, 10);
            expect(readyAfterInput.sort()).toEqual(["Branch1", "Branch2"]);

            // Complete only Branch1
            queue = markExecuting(queue, ["Branch1"]);
            executionOrder.push("Branch1");
            context = storeNodeOutput(context, "Branch1", { b1: true });
            queue = markCompleted(queue, "Branch1", { b1: true }, workflow);

            // Join should NOT be ready yet
            const readyAfterBranch1 = getReadyNodes(queue, 10);
            expect(readyAfterBranch1).not.toContain("Join");
            expect(readyAfterBranch1).toContain("Branch2");

            // Complete Branch2
            queue = markExecuting(queue, ["Branch2"]);
            executionOrder.push("Branch2");
            storeNodeOutput(context, "Branch2", { b2: true });
            queue = markCompleted(queue, "Branch2", { b2: true }, workflow);

            // Now Join should be ready
            const readyAfterBranch2 = getReadyNodes(queue, 10);
            expect(readyAfterBranch2).toContain("Join");
        });

        it("should wait for all three branches", async () => {
            const workflow = createParallelJoinWorkflow(3);
            let context = createContext({});
            let queue = initializeQueue(workflow);

            // Execute Input
            queue = markExecuting(queue, ["Input"]);
            context = storeNodeOutput(context, "Input", {});
            queue = markCompleted(queue, "Input", {}, workflow);

            // Complete branches one by one
            for (let i = 1; i <= 3; i++) {
                const branchId = `Branch${i}`;
                queue = markExecuting(queue, [branchId]);
                context = storeNodeOutput(context, branchId, { branch: i });
                queue = markCompleted(queue, branchId, { branch: i }, workflow);

                const ready = getReadyNodes(queue, 10);
                if (i < 3) {
                    expect(ready).not.toContain("Join");
                } else {
                    expect(ready).toContain("Join");
                }
            }
        });
    });

    describe("output merging strategies", () => {
        it("should merge outputs into keyed object", async () => {
            const { joinOutput } = await simulateParallelWithJoin(
                3,
                (index, _branchId) => ({ value: (index + 1) * 10 }),
                { strategy: "object", branchKeys: ["first", "second", "third"] }
            );

            expect(joinOutput).toEqual({
                first: { value: 10 },
                second: { value: 20 },
                third: { value: 30 }
            });
        });

        it("should merge outputs into array", async () => {
            const { joinOutput } = await simulateParallelWithJoin(3, (index) => ({ item: index }), {
                strategy: "array"
            });

            expect(joinOutput).toEqual({
                results: [{ item: 0 }, { item: 1 }, { item: 2 }]
            });
        });

        it("should take first branch output", async () => {
            const { joinOutput } = await simulateParallelWithJoin(
                3,
                (index) => ({ value: `branch-${index}` }),
                { strategy: "first" }
            );

            expect(joinOutput).toEqual({
                result: { value: "branch-0" }
            });
        });

        it("should take last branch output", async () => {
            const { joinOutput } = await simulateParallelWithJoin(
                3,
                (index) => ({ value: `branch-${index}` }),
                { strategy: "last" }
            );

            expect(joinOutput).toEqual({
                result: { value: "branch-2" }
            });
        });

        it("should use custom merge function", async () => {
            const { joinOutput } = await simulateParallelWithJoin(
                3,
                (index) => ({ score: (index + 1) * 10 }),
                {
                    strategy: "custom",
                    customMerge: (outputs) => {
                        const scores = outputs.map((o) => o.score as number);
                        return {
                            min: Math.min(...scores),
                            max: Math.max(...scores),
                            sum: scores.reduce((a, b) => a + b, 0),
                            average: scores.reduce((a, b) => a + b, 0) / scores.length
                        };
                    }
                }
            );

            expect(joinOutput).toEqual({
                min: 10,
                max: 30,
                sum: 60,
                average: 20
            });
        });
    });

    describe("access individual branch outputs after join", () => {
        it("should access all branch outputs from context", async () => {
            const { context } = await simulateParallelWithJoin(
                3,
                (_index, branchId) => ({
                    branchId,
                    data: `data-from-${branchId}`
                }),
                { strategy: "array" }
            );

            const branch1 = context.nodeOutputs.get("Branch1");
            const branch2 = context.nodeOutputs.get("Branch2");
            const branch3 = context.nodeOutputs.get("Branch3");

            expect(branch1).toEqual({ branchId: "Branch1", data: "data-from-Branch1" });
            expect(branch2).toEqual({ branchId: "Branch2", data: "data-from-Branch2" });
            expect(branch3).toEqual({ branchId: "Branch3", data: "data-from-Branch3" });
        });

        it("should access specific branch output by ID in join output", async () => {
            const { joinOutput } = await simulateParallelWithJoin(
                2,
                (index, branchId) => ({
                    id: branchId,
                    result: index * 100
                }),
                { strategy: "object", branchKeys: ["branchA", "branchB"] }
            );

            const branchA = (joinOutput as { branchA: { result: number } }).branchA;
            const branchB = (joinOutput as { branchB: { result: number } }).branchB;

            expect(branchA.result).toBe(0);
            expect(branchB.result).toBe(100);
        });

        it("should preserve branch output types after join", async () => {
            const { joinOutput } = await simulateParallelWithJoin(
                3,
                (index) => {
                    if (index === 0) return { type: "number", value: 42 };
                    if (index === 1) return { type: "string", value: "hello" };
                    return { type: "array", value: [1, 2, 3] };
                },
                { strategy: "array" }
            );

            const results = (joinOutput as { results: Array<{ type: string; value: unknown }> })
                .results;

            expect(results[0].type).toBe("number");
            expect(results[0].value).toBe(42);
            expect(results[1].type).toBe("string");
            expect(results[1].value).toBe("hello");
            expect(results[2].type).toBe("array");
            expect(results[2].value).toEqual([1, 2, 3]);
        });
    });

    describe("aggregation node after join", () => {
        it("should aggregate numeric values from branches", async () => {
            const { aggregatedOutput } = await simulateParallelWithJoin(
                4,
                (index) => ({ value: (index + 1) * 10 }),
                { strategy: "array" },
                (joinOutput) => {
                    const results = (joinOutput as { results: Array<{ value: number }> }).results;
                    const values = results.map((r) => r.value);
                    return {
                        sum: values.reduce((a, b) => a + b, 0),
                        count: values.length,
                        average: values.reduce((a, b) => a + b, 0) / values.length
                    };
                }
            );

            expect(aggregatedOutput).toEqual({
                sum: 100, // 10 + 20 + 30 + 40
                count: 4,
                average: 25
            });
        });

        it("should filter and count successful branches", async () => {
            const { aggregatedOutput } = await simulateParallelWithJoin(
                5,
                (index) => ({
                    success: index % 2 === 0,
                    data: `result-${index}`
                }),
                { strategy: "array" },
                (joinOutput) => {
                    const results = (
                        joinOutput as { results: Array<{ success: boolean; data: string }> }
                    ).results;
                    const successful = results.filter((r) => r.success);
                    const failed = results.filter((r) => !r.success);
                    return {
                        successCount: successful.length,
                        failureCount: failed.length,
                        successData: successful.map((r) => r.data)
                    };
                }
            );

            expect(aggregatedOutput).toEqual({
                successCount: 3, // indices 0, 2, 4
                failureCount: 2, // indices 1, 3
                successData: ["result-0", "result-2", "result-4"]
            });
        });

        it("should combine text outputs from branches", async () => {
            const { aggregatedOutput } = await simulateParallelWithJoin(
                3,
                (index) => ({
                    section: ["Introduction", "Body", "Conclusion"][index],
                    content: `Content for section ${index + 1}`
                }),
                { strategy: "array" },
                (joinOutput) => {
                    const results = (
                        joinOutput as { results: Array<{ section: string; content: string }> }
                    ).results;
                    return {
                        document: results.map((r) => `## ${r.section}\n${r.content}`).join("\n\n"),
                        sectionCount: results.length
                    };
                }
            );

            expect(aggregatedOutput?.sectionCount).toBe(3);
            expect(aggregatedOutput?.document).toContain("## Introduction");
            expect(aggregatedOutput?.document).toContain("## Body");
            expect(aggregatedOutput?.document).toContain("## Conclusion");
        });

        it("should find best result across branches", async () => {
            const { aggregatedOutput } = await simulateParallelWithJoin(
                4,
                (index) => ({
                    branchId: `Branch${index + 1}`,
                    score: [75, 92, 88, 65][index],
                    timestamp: Date.now() + index * 100
                }),
                { strategy: "array" },
                (joinOutput) => {
                    const results = (
                        joinOutput as { results: Array<{ branchId: string; score: number }> }
                    ).results;
                    const best = results.reduce((a, b) => (a.score > b.score ? a : b));
                    return {
                        bestBranch: best.branchId,
                        bestScore: best.score,
                        allScores: results.map((r) => r.score)
                    };
                }
            );

            expect(aggregatedOutput).toEqual({
                bestBranch: "Branch2",
                bestScore: 92,
                allScores: [75, 92, 88, 65]
            });
        });
    });

    describe("partial output handling", () => {
        it("should handle branches with different output shapes", async () => {
            const { joinOutput } = await simulateParallelWithJoin(
                3,
                (index) => {
                    switch (index) {
                        case 0:
                            return { hasMetadata: true, meta: { version: 1 } };
                        case 1:
                            return { hasData: true, items: [1, 2, 3] };
                        case 2:
                            return { hasStatus: true, status: "complete" };
                        default:
                            return {};
                    }
                },
                { strategy: "object", branchKeys: ["metadata", "data", "status"] }
            );

            expect(joinOutput).toHaveProperty("metadata.hasMetadata", true);
            expect(joinOutput).toHaveProperty("data.items");
            expect(joinOutput).toHaveProperty("status.status", "complete");
        });

        it("should handle empty branch outputs", async () => {
            const { joinOutput } = await simulateParallelWithJoin(
                3,
                (index) => {
                    if (index === 1) return {};
                    return { value: index };
                },
                { strategy: "array" }
            );

            const results = (joinOutput as { results: Array<Record<string, unknown>> }).results;
            expect(results[0]).toEqual({ value: 0 });
            expect(results[1]).toEqual({});
            expect(results[2]).toEqual({ value: 2 });
        });

        it("should handle null values in branch outputs", async () => {
            const { joinOutput } = await simulateParallelWithJoin(
                2,
                (index) => ({
                    value: index === 0 ? null : 42,
                    label: index === 0 ? "null-value" : "has-value"
                }),
                { strategy: "array" }
            );

            const results = (joinOutput as { results: Array<{ value: number | null }> }).results;
            expect(results[0].value).toBeNull();
            expect(results[1].value).toBe(42);
        });
    });

    describe("complex merge scenarios", () => {
        it("should deep merge nested objects", async () => {
            const { joinOutput } = await simulateParallelWithJoin(
                2,
                (index) => {
                    if (index === 0) {
                        return {
                            user: { name: "Alice", age: 30 },
                            settings: { theme: "dark" }
                        };
                    }
                    return {
                        user: { email: "alice@test.com" },
                        settings: { language: "en" }
                    };
                },
                {
                    strategy: "custom",
                    customMerge: (outputs) => {
                        // Deep merge all outputs
                        const merged: Record<string, unknown> = {};
                        for (const output of outputs) {
                            for (const [key, value] of Object.entries(output)) {
                                if (
                                    typeof value === "object" &&
                                    value !== null &&
                                    !Array.isArray(value)
                                ) {
                                    merged[key] = {
                                        ...((merged[key] as Record<string, unknown>) || {}),
                                        ...(value as Record<string, unknown>)
                                    };
                                } else {
                                    merged[key] = value;
                                }
                            }
                        }
                        return merged;
                    }
                }
            );

            expect(joinOutput).toEqual({
                user: { name: "Alice", age: 30, email: "alice@test.com" },
                settings: { theme: "dark", language: "en" }
            });
        });

        it("should concatenate arrays from branches", async () => {
            const { joinOutput } = await simulateParallelWithJoin(
                3,
                (index) => ({
                    items: Array.from({ length: 3 }, (_, i) => `${index}-${i}`)
                }),
                {
                    strategy: "custom",
                    customMerge: (outputs) => {
                        const allItems = outputs.flatMap((o) => o.items as string[]);
                        return { allItems, totalCount: allItems.length };
                    }
                }
            );

            expect(joinOutput).toEqual({
                allItems: ["0-0", "0-1", "0-2", "1-0", "1-1", "1-2", "2-0", "2-1", "2-2"],
                totalCount: 9
            });
        });

        it("should handle voting/consensus merge", async () => {
            const { joinOutput } = await simulateParallelWithJoin(
                5,
                (index) => ({
                    vote: index < 3 ? "approve" : "reject",
                    confidence: 0.7 + Math.random() * 0.3
                }),
                {
                    strategy: "custom",
                    customMerge: (outputs) => {
                        const votes = outputs.map((o) => o.vote as string);
                        const approvals = votes.filter((v) => v === "approve").length;
                        const rejections = votes.filter((v) => v === "reject").length;
                        return {
                            decision: approvals > rejections ? "approved" : "rejected",
                            approvalCount: approvals,
                            rejectionCount: rejections,
                            unanimous: approvals === votes.length || rejections === votes.length
                        };
                    }
                }
            );

            expect(joinOutput).toMatchObject({
                decision: "approved",
                approvalCount: 3,
                rejectionCount: 2,
                unanimous: false
            });
        });
    });

    describe("error handling in join", () => {
        it("should handle branches with error flags", async () => {
            const { joinOutput } = await simulateParallelWithJoin(
                3,
                (index) => {
                    if (index === 1) {
                        return { error: true, message: "Branch failed", data: null };
                    }
                    return { error: false, data: `result-${index}` };
                },
                {
                    strategy: "custom",
                    customMerge: (outputs) => {
                        const errors = outputs.filter((o) => o.error);
                        const successes = outputs.filter((o) => !o.error);
                        return {
                            hasErrors: errors.length > 0,
                            errorCount: errors.length,
                            successCount: successes.length,
                            results: successes.map((o) => o.data)
                        };
                    }
                }
            );

            expect(joinOutput).toEqual({
                hasErrors: true,
                errorCount: 1,
                successCount: 2,
                results: ["result-0", "result-2"]
            });
        });

        it("should handle all branches failing", async () => {
            const { joinOutput } = await simulateParallelWithJoin(
                2,
                () => ({
                    error: true,
                    message: "Operation failed"
                }),
                {
                    strategy: "custom",
                    customMerge: (outputs) => {
                        const allFailed = outputs.every((o) => o.error);
                        return {
                            allFailed,
                            errors: outputs.map((o) => o.message)
                        };
                    }
                }
            );

            expect(joinOutput).toEqual({
                allFailed: true,
                errors: ["Operation failed", "Operation failed"]
            });
        });
    });

    describe("join with varying branch counts", () => {
        it("should handle join with single branch", async () => {
            const { joinOutput, branchOutputs } = await simulateParallelWithJoin(
                1,
                () => ({ single: true, data: "only-branch" }),
                { strategy: "array" }
            );

            expect(branchOutputs).toHaveLength(1);
            expect((joinOutput as { results: unknown[] }).results).toHaveLength(1);
        });

        it("should handle join with many branches", async () => {
            const branchCount = 10;

            const { joinOutput, branchOutputs } = await simulateParallelWithJoin(
                branchCount,
                (index) => ({ index, computed: index * index }),
                { strategy: "array" }
            );

            expect(branchOutputs).toHaveLength(branchCount);
            const results = (joinOutput as { results: Array<{ index: number }> }).results;
            expect(results).toHaveLength(branchCount);
            expect(results[9]).toEqual({ index: 9, computed: 81 });
        });
    });

    describe("downstream node access to join output", () => {
        it("should make join output available to downstream nodes", async () => {
            const { aggregatedOutput } = await simulateParallelWithJoin(
                2,
                (index) => ({ value: index * 10 }),
                { strategy: "array" },
                (joinOut, ctx) => {
                    // Verify join output is in context
                    const storedJoin = ctx.nodeOutputs.get("Join");
                    expect(storedJoin).toEqual(joinOut);

                    return {
                        processedJoin: true,
                        inputResults: (joinOut as { results: unknown[] }).results
                    };
                }
            );

            expect(aggregatedOutput?.processedJoin).toBe(true);
        });

        it("should chain multiple operations after join", async () => {
            // Simulate: Branches -> Join -> Transform1 -> Transform2 -> Output
            const { context } = await simulateParallelWithJoin(
                2,
                (index) => ({ raw: index }),
                { strategy: "array" },
                (joinOut) => {
                    const results = (joinOut as { results: Array<{ raw: number }> }).results;
                    const step1 = results.map((r) => ({ doubled: r.raw * 2 }));
                    const step2 = step1.map((r) => ({ final: r.doubled + 100 }));
                    return {
                        transformed: step2,
                        stages: 2
                    };
                }
            );

            const aggregateOutput = context.nodeOutputs.get("Aggregate") as {
                transformed: Array<{ final: number }>;
            };

            expect(aggregateOutput.transformed).toEqual([
                { final: 100 }, // 0 * 2 + 100
                { final: 102 } // 1 * 2 + 100
            ]);
        });
    });
});
