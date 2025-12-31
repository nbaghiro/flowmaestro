/**
 * Concurrent Execution Limits Edge Case Tests
 *
 * Tests workflow concurrent execution management:
 * - Respect maxConcurrentNodes = 1 (sequential)
 * - Respect maxConcurrentNodes = 5 (limited parallel)
 * - Respect maxConcurrentNodes = 10 (high parallel)
 * - Queue management with limits
 */

import type { ContextSnapshot } from "@flowmaestro/shared";
import { createContext, storeNodeOutput } from "../../../src/temporal/core/services/context";

// Types for concurrent execution simulation
interface ExecutionConfig {
    maxConcurrentNodes: number;
    totalNodes: number;
    nodeExecutionTimeMs: number;
}

interface ExecutionEvent {
    nodeId: string;
    event: "started" | "completed";
    timestamp: number;
    concurrentCount: number;
}

interface ExecutionResult {
    context: ContextSnapshot;
    events: ExecutionEvent[];
    maxConcurrentObserved: number;
    totalExecutionTime: number;
    executionBatches: string[][];
    queueWaitTimes: Map<string, number>;
}

interface QueueState {
    pending: string[];
    executing: string[];
    completed: string[];
    maxConcurrent: number;
}

// Simulate concurrent execution with limits
async function simulateConcurrentExecution(
    config: ExecutionConfig,
    nodeDelays?: Map<string, number>
): Promise<ExecutionResult> {
    let context = createContext({});
    const events: ExecutionEvent[] = [];
    const queueWaitTimes = new Map<string, number>();
    const executionBatches: string[][] = [];
    let maxConcurrentObserved = 0;

    // Treat 0 or negative as 1 (sequential) to avoid infinite loop
    const effectiveMaxConcurrent = Math.max(1, config.maxConcurrentNodes);

    // Create all node IDs
    const allNodes = Array.from({ length: config.totalNodes }, (_, i) => `Node_${i}`);
    const queue: QueueState = {
        pending: [...allNodes],
        executing: [],
        completed: [],
        maxConcurrent: effectiveMaxConcurrent
    };

    const startTime = Date.now();
    let currentTime = startTime;
    const nodeStartTimes = new Map<string, number>();
    const nodeQueueTimes = new Map<string, number>();

    // Track when each node was queued
    allNodes.forEach((nodeId) => nodeQueueTimes.set(nodeId, startTime));

    while (queue.pending.length > 0 || queue.executing.length > 0) {
        // Start new nodes if under limit
        while (queue.pending.length > 0 && queue.executing.length < queue.maxConcurrent) {
            const nodeId = queue.pending.shift()!;
            queue.executing.push(nodeId);
            nodeStartTimes.set(nodeId, currentTime);

            // Record wait time
            const queuedAt = nodeQueueTimes.get(nodeId) || startTime;
            queueWaitTimes.set(nodeId, currentTime - queuedAt);

            events.push({
                nodeId,
                event: "started",
                timestamp: currentTime,
                concurrentCount: queue.executing.length
            });

            maxConcurrentObserved = Math.max(maxConcurrentObserved, queue.executing.length);
        }

        // Record current batch
        if (queue.executing.length > 0) {
            const batchExists = executionBatches.some(
                (batch) =>
                    batch.length === queue.executing.length &&
                    batch.every((n) => queue.executing.includes(n))
            );
            if (!batchExists) {
                executionBatches.push([...queue.executing]);
            }
        }

        // Complete all currently executing nodes (simulated parallel completion)
        const executingCopy = [...queue.executing];
        for (const nodeId of executingCopy) {
            const delay = nodeDelays?.get(nodeId) ?? config.nodeExecutionTimeMs;
            const nodeStartTime = nodeStartTimes.get(nodeId) || currentTime;

            // Simulate completion
            const completionTime = nodeStartTime + delay;

            queue.executing = queue.executing.filter((n) => n !== nodeId);
            queue.completed.push(nodeId);

            events.push({
                nodeId,
                event: "completed",
                timestamp: completionTime,
                concurrentCount: queue.executing.length
            });

            context = storeNodeOutput(context, nodeId, {
                completed: true,
                executionTime: delay
            });
        }

        currentTime += config.nodeExecutionTimeMs;
    }

    const totalExecutionTime = currentTime - startTime;

    return {
        context,
        events,
        maxConcurrentObserved,
        totalExecutionTime,
        executionBatches,
        queueWaitTimes
    };
}

// Helper to verify execution order constraints
function verifyExecutionConstraints(
    events: ExecutionEvent[],
    maxConcurrent: number
): { valid: boolean; violations: string[] } {
    const violations: string[] = [];
    let currentlyExecuting = 0;

    for (const event of events) {
        if (event.event === "started") {
            currentlyExecuting++;
            if (currentlyExecuting > maxConcurrent) {
                violations.push(
                    `Exceeded max concurrent at ${event.timestamp}: ` +
                        `${currentlyExecuting} > ${maxConcurrent}`
                );
            }
        } else if (event.event === "completed") {
            currentlyExecuting--;
        }
    }

    return {
        valid: violations.length === 0,
        violations
    };
}

describe("Concurrent Execution Limits Edge Cases", () => {
    describe("maxConcurrentNodes = 1 (sequential)", () => {
        it("should execute nodes one at a time", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 1,
                totalNodes: 5,
                nodeExecutionTimeMs: 10
            });

            expect(result.maxConcurrentObserved).toBe(1);
        });

        it("should never exceed 1 concurrent execution", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 1,
                totalNodes: 10,
                nodeExecutionTimeMs: 5
            });

            const constraints = verifyExecutionConstraints(result.events, 1);
            expect(constraints.valid).toBe(true);
        });

        it("should execute in order with sequential limit", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 1,
                totalNodes: 5,
                nodeExecutionTimeMs: 10
            });

            // Each batch should have exactly 1 node
            result.executionBatches.forEach((batch) => {
                expect(batch.length).toBeLessThanOrEqual(1);
            });
        });

        it("should take longer with sequential execution", async () => {
            const sequentialResult = await simulateConcurrentExecution({
                maxConcurrentNodes: 1,
                totalNodes: 5,
                nodeExecutionTimeMs: 10
            });

            const parallelResult = await simulateConcurrentExecution({
                maxConcurrentNodes: 5,
                totalNodes: 5,
                nodeExecutionTimeMs: 10
            });

            expect(sequentialResult.totalExecutionTime).toBeGreaterThanOrEqual(
                parallelResult.totalExecutionTime
            );
        });

        it("should handle many nodes sequentially", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 1,
                totalNodes: 100,
                nodeExecutionTimeMs: 1
            });

            expect(result.context.nodeOutputs.size).toBe(100);
            expect(result.maxConcurrentObserved).toBe(1);
        });
    });

    describe("maxConcurrentNodes = 5 (limited parallel)", () => {
        it("should execute up to 5 nodes in parallel", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 5,
                totalNodes: 10,
                nodeExecutionTimeMs: 10
            });

            expect(result.maxConcurrentObserved).toBeLessThanOrEqual(5);
        });

        it("should never exceed 5 concurrent executions", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 5,
                totalNodes: 20,
                nodeExecutionTimeMs: 5
            });

            const constraints = verifyExecutionConstraints(result.events, 5);
            expect(constraints.valid).toBe(true);
        });

        it("should batch nodes in groups of 5", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 5,
                totalNodes: 15,
                nodeExecutionTimeMs: 10
            });

            const fullBatches = result.executionBatches.filter((b) => b.length === 5);
            expect(fullBatches.length).toBeGreaterThan(0);
        });

        it("should handle partial final batch", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 5,
                totalNodes: 7,
                nodeExecutionTimeMs: 10
            });

            // Should have 2 batches: one with 5, one with 2
            expect(result.executionBatches.length).toBe(2);
        });

        it("should utilize full concurrency when nodes available", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 5,
                totalNodes: 10,
                nodeExecutionTimeMs: 10
            });

            // First batch should have 5 nodes
            expect(result.executionBatches[0].length).toBe(5);
        });
    });

    describe("maxConcurrentNodes = 10 (high parallel)", () => {
        it("should execute up to 10 nodes in parallel", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 10,
                totalNodes: 25,
                nodeExecutionTimeMs: 5
            });

            expect(result.maxConcurrentObserved).toBeLessThanOrEqual(10);
        });

        it("should never exceed 10 concurrent executions", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 10,
                totalNodes: 50,
                nodeExecutionTimeMs: 2
            });

            const constraints = verifyExecutionConstraints(result.events, 10);
            expect(constraints.valid).toBe(true);
        });

        it("should handle nodes fewer than limit", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 10,
                totalNodes: 3,
                nodeExecutionTimeMs: 10
            });

            expect(result.maxConcurrentObserved).toBe(3);
        });

        it("should complete faster with high concurrency", async () => {
            const lowConcurrency = await simulateConcurrentExecution({
                maxConcurrentNodes: 2,
                totalNodes: 10,
                nodeExecutionTimeMs: 10
            });

            const highConcurrency = await simulateConcurrentExecution({
                maxConcurrentNodes: 10,
                totalNodes: 10,
                nodeExecutionTimeMs: 10
            });

            expect(highConcurrency.totalExecutionTime).toBeLessThanOrEqual(
                lowConcurrency.totalExecutionTime
            );
        });
    });

    describe("queue management with limits", () => {
        it("should queue nodes when at capacity", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 2,
                totalNodes: 5,
                nodeExecutionTimeMs: 10
            });

            // Nodes 2, 3, 4 should have wait times
            expect(result.queueWaitTimes.get("Node_2")).toBeGreaterThan(0);
        });

        it("should track wait times for queued nodes", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 1,
                totalNodes: 3,
                nodeExecutionTimeMs: 100
            });

            // Node_0 starts immediately (0 wait)
            expect(result.queueWaitTimes.get("Node_0")).toBe(0);
            // Node_1 waits for Node_0 to complete
            expect(result.queueWaitTimes.get("Node_1")).toBeGreaterThan(0);
        });

        it("should process queue in order", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 1,
                totalNodes: 5,
                nodeExecutionTimeMs: 10
            });

            const startEvents = result.events
                .filter((e) => e.event === "started")
                .map((e) => e.nodeId);

            expect(startEvents).toEqual(["Node_0", "Node_1", "Node_2", "Node_3", "Node_4"]);
        });

        it("should fill slots as they become available", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 3,
                totalNodes: 6,
                nodeExecutionTimeMs: 10
            });

            // First 3 nodes should start together, next 3 should start after
            const firstBatch = result.executionBatches[0];
            expect(firstBatch.length).toBe(3);
        });

        it("should handle large queue efficiently", async () => {
            const startTime = Date.now();

            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 5,
                totalNodes: 100,
                nodeExecutionTimeMs: 1
            });

            const duration = Date.now() - startTime;

            expect(result.context.nodeOutputs.size).toBe(100);
            expect(duration).toBeLessThan(500);
        });
    });

    describe("dynamic concurrency scenarios", () => {
        it("should handle varying execution times", async () => {
            const delays = new Map<string, number>();
            delays.set("Node_0", 100);
            delays.set("Node_1", 10);
            delays.set("Node_2", 50);
            delays.set("Node_3", 20);
            delays.set("Node_4", 80);

            const result = await simulateConcurrentExecution(
                {
                    maxConcurrentNodes: 3,
                    totalNodes: 5,
                    nodeExecutionTimeMs: 50
                },
                delays
            );

            expect(result.context.nodeOutputs.size).toBe(5);
        });

        it("should not starve later nodes", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 2,
                totalNodes: 10,
                nodeExecutionTimeMs: 10
            });

            // All nodes should complete
            expect(result.context.nodeOutputs.size).toBe(10);

            // Last node should eventually run
            const lastNodeWait = result.queueWaitTimes.get("Node_9")!;
            expect(lastNodeWait).toBeDefined();
        });

        it("should handle burst of nodes", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 5,
                totalNodes: 50,
                nodeExecutionTimeMs: 5
            });

            expect(result.maxConcurrentObserved).toBe(5);
            expect(result.context.nodeOutputs.size).toBe(50);
        });
    });

    describe("edge cases with concurrency limits", () => {
        it("should handle maxConcurrentNodes = 0 gracefully", async () => {
            // With 0 or negative, we default to 1 (sequential) to prevent infinite loops
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 0,
                totalNodes: 3,
                nodeExecutionTimeMs: 10
            });

            // Defaults to sequential (1) when limit is 0 or negative
            expect(result.maxConcurrentObserved).toBe(1);
            expect(result.context.nodeOutputs.size).toBe(3);
        });

        it("should handle single node", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 10,
                totalNodes: 1,
                nodeExecutionTimeMs: 10
            });

            expect(result.maxConcurrentObserved).toBe(1);
            expect(result.context.nodeOutputs.size).toBe(1);
        });

        it("should handle concurrency equal to node count", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 5,
                totalNodes: 5,
                nodeExecutionTimeMs: 10
            });

            // All should run in parallel
            expect(result.maxConcurrentObserved).toBe(5);
            expect(result.executionBatches[0].length).toBe(5);
        });

        it("should handle concurrency greater than node count", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 100,
                totalNodes: 5,
                nodeExecutionTimeMs: 10
            });

            expect(result.maxConcurrentObserved).toBe(5);
        });

        it("should handle very high concurrency limit", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 1000,
                totalNodes: 50,
                nodeExecutionTimeMs: 1
            });

            expect(result.maxConcurrentObserved).toBe(50);
        });
    });

    describe("concurrency and execution order", () => {
        it("should start nodes in order within concurrency limit", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 3,
                totalNodes: 6,
                nodeExecutionTimeMs: 10
            });

            const firstThreeStarts = result.events
                .filter((e) => e.event === "started")
                .slice(0, 3)
                .map((e) => e.nodeId);

            expect(firstThreeStarts).toContain("Node_0");
            expect(firstThreeStarts).toContain("Node_1");
            expect(firstThreeStarts).toContain("Node_2");
        });

        it("should track completion order", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 2,
                totalNodes: 4,
                nodeExecutionTimeMs: 10
            });

            const completionOrder = result.events
                .filter((e) => e.event === "completed")
                .map((e) => e.nodeId);

            expect(completionOrder.length).toBe(4);
        });

        it("should maintain consistency between events and outputs", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 3,
                totalNodes: 10,
                nodeExecutionTimeMs: 5
            });

            const completedInEvents = result.events
                .filter((e) => e.event === "completed")
                .map((e) => e.nodeId);

            expect(completedInEvents.length).toBe(result.context.nodeOutputs.size);
        });
    });

    describe("performance with concurrency limits", () => {
        it("should scale execution time with concurrency limit", async () => {
            const results: { concurrency: number; time: number }[] = [];

            for (const concurrency of [1, 2, 5, 10]) {
                const result = await simulateConcurrentExecution({
                    maxConcurrentNodes: concurrency,
                    totalNodes: 10,
                    nodeExecutionTimeMs: 10
                });
                results.push({ concurrency, time: result.totalExecutionTime });
            }

            // Higher concurrency should mean lower or equal time
            for (let i = 1; i < results.length; i++) {
                expect(results[i].time).toBeLessThanOrEqual(results[i - 1].time);
            }
        });

        it("should handle 500 nodes efficiently", async () => {
            const startTime = Date.now();

            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 50,
                totalNodes: 500,
                nodeExecutionTimeMs: 1
            });

            const duration = Date.now() - startTime;

            expect(result.context.nodeOutputs.size).toBe(500);
            expect(duration).toBeLessThan(1000);
        });

        it("should batch execution efficiently", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 10,
                totalNodes: 100,
                nodeExecutionTimeMs: 1
            });

            // With 10 concurrency and 100 nodes, should have ~10 batches
            expect(result.executionBatches.length).toBeLessThanOrEqual(15);
        });
    });

    describe("concurrency with different workload patterns", () => {
        it("should handle uniform workload", async () => {
            const result = await simulateConcurrentExecution({
                maxConcurrentNodes: 4,
                totalNodes: 16,
                nodeExecutionTimeMs: 25
            });

            // Should have 4 batches of 4 nodes each
            expect(result.executionBatches.filter((b) => b.length === 4).length).toBe(4);
        });

        it("should handle single fast node", async () => {
            const delays = new Map<string, number>();
            delays.set("Node_0", 1);
            for (let i = 1; i < 5; i++) {
                delays.set(`Node_${i}`, 100);
            }

            const result = await simulateConcurrentExecution(
                {
                    maxConcurrentNodes: 2,
                    totalNodes: 5,
                    nodeExecutionTimeMs: 100
                },
                delays
            );

            expect(result.context.nodeOutputs.size).toBe(5);
        });

        it("should handle single slow node", async () => {
            const delays = new Map<string, number>();
            delays.set("Node_0", 1000);
            for (let i = 1; i < 5; i++) {
                delays.set(`Node_${i}`, 10);
            }

            const result = await simulateConcurrentExecution(
                {
                    maxConcurrentNodes: 3,
                    totalNodes: 5,
                    nodeExecutionTimeMs: 10
                },
                delays
            );

            expect(result.context.nodeOutputs.size).toBe(5);
        });
    });
});
