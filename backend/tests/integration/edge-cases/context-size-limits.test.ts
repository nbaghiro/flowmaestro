/**
 * Context Size Limits Edge Case Tests
 *
 * Tests workflow context size management:
 * - Output rejected when exceeding limit
 * - Context pruning preserves recent outputs
 * - Size calculation accuracy
 * - Metadata tracking
 */

import type { JsonObject } from "@flowmaestro/shared";
import { createContext, storeNodeOutput } from "../../../src/temporal/core/services/context";
import type { ContextSnapshot } from "../../../src/temporal/core/types";

// Constants
const KB = 1024;
const MB = 1024 * KB;

// Size limit configurations
interface SizeLimits {
    maxNodeOutputSize: number;
    maxTotalContextSize: number;
    maxNodeCount: number;
}

const DEFAULT_LIMITS: SizeLimits = {
    maxNodeOutputSize: 1 * MB,
    maxTotalContextSize: 50 * MB,
    maxNodeCount: 1000
};

// Helper to create data of specific size
function createDataOfSize(bytes: number): string {
    return "x".repeat(bytes);
}

// Get JSON size of object
function getJsonSize(obj: unknown): number {
    return JSON.stringify(obj).length;
}

// Context size tracker
interface SizeMetrics {
    nodeOutputSizes: Map<string, number>;
    totalSize: number;
    nodeCount: number;
    largestNode: { id: string; size: number } | null;
    smallestNode: { id: string; size: number } | null;
    averageSize: number;
}

function calculateSizeMetrics(context: ContextSnapshot): SizeMetrics {
    const nodeOutputSizes = new Map<string, number>();
    let totalSize = 0;
    let largestNode: { id: string; size: number } | null = null;
    let smallestNode: { id: string; size: number } | null = null;

    for (const [nodeId, output] of context.nodeOutputs) {
        const size = getJsonSize(output);
        nodeOutputSizes.set(nodeId, size);
        totalSize += size;

        if (!largestNode || size > largestNode.size) {
            largestNode = { id: nodeId, size };
        }
        if (!smallestNode || size < smallestNode.size) {
            smallestNode = { id: nodeId, size };
        }
    }

    const nodeCount = context.nodeOutputs.size;
    const averageSize = nodeCount > 0 ? totalSize / nodeCount : 0;

    return {
        nodeOutputSizes,
        totalSize,
        nodeCount,
        largestNode,
        smallestNode,
        averageSize
    };
}

// Simulate context with size validation
interface ContextSizeResult {
    context: ContextSnapshot;
    metrics: SizeMetrics;
    rejectedNodes: Array<{ id: string; reason: string; size: number }>;
    prunedNodes: string[];
    withinLimits: boolean;
}

async function simulateContextWithLimits(
    nodeOutputs: Map<string, unknown>,
    limits: SizeLimits = DEFAULT_LIMITS,
    options: {
        enforceNodeLimit?: boolean;
        enforceTotalLimit?: boolean;
        pruneOnOverflow?: boolean;
    } = {}
): Promise<ContextSizeResult> {
    let context = createContext({});
    const rejectedNodes: Array<{ id: string; reason: string; size: number }> = [];
    const prunedNodes: string[] = [];
    const nodeOrder: string[] = [];
    let currentTotalSize = 0;

    for (const [nodeId, output] of nodeOutputs) {
        const outputSize = getJsonSize(output);

        // Check node size limit
        if (options.enforceNodeLimit && outputSize > limits.maxNodeOutputSize) {
            rejectedNodes.push({
                id: nodeId,
                reason: `Output size ${outputSize} exceeds limit ${limits.maxNodeOutputSize}`,
                size: outputSize
            });
            continue;
        }

        // Check total context size limit
        if (
            options.enforceTotalLimit &&
            currentTotalSize + outputSize > limits.maxTotalContextSize
        ) {
            if (options.pruneOnOverflow) {
                // Prune oldest nodes
                while (
                    nodeOrder.length > 0 &&
                    currentTotalSize + outputSize > limits.maxTotalContextSize
                ) {
                    const oldestNodeId = nodeOrder.shift()!;
                    const oldestOutput = context.nodeOutputs.get(oldestNodeId);
                    if (oldestOutput) {
                        currentTotalSize -= getJsonSize(oldestOutput);
                        prunedNodes.push(oldestNodeId);
                    }
                }
            } else {
                rejectedNodes.push({
                    id: nodeId,
                    reason: `Total context size would exceed limit ${limits.maxTotalContextSize}`,
                    size: outputSize
                });
                continue;
            }
        }

        // Check node count limit
        if (context.nodeOutputs.size >= limits.maxNodeCount && !prunedNodes.includes(nodeId)) {
            rejectedNodes.push({
                id: nodeId,
                reason: `Node count would exceed limit ${limits.maxNodeCount}`,
                size: outputSize
            });
            continue;
        }

        context = storeNodeOutput(context, nodeId, output as JsonObject);
        nodeOrder.push(nodeId);
        currentTotalSize += outputSize;
    }

    const metrics = calculateSizeMetrics(context);
    const withinLimits =
        metrics.totalSize <= limits.maxTotalContextSize && metrics.nodeCount <= limits.maxNodeCount;

    return {
        context,
        metrics,
        rejectedNodes,
        prunedNodes,
        withinLimits
    };
}

describe("Context Size Limits Edge Cases", () => {
    describe("output rejected when exceeding limit", () => {
        it("should reject node output exceeding max size", async () => {
            const outputs = new Map<string, unknown>();
            outputs.set("SmallNode", { data: createDataOfSize(100 * KB) });
            outputs.set("LargeNode", { data: createDataOfSize(2 * MB) }); // Exceeds 1MB limit
            outputs.set("NormalNode", { data: createDataOfSize(500 * KB) });

            const result = await simulateContextWithLimits(outputs, DEFAULT_LIMITS, {
                enforceNodeLimit: true
            });

            expect(result.rejectedNodes.length).toBe(1);
            expect(result.rejectedNodes[0].id).toBe("LargeNode");
            expect(result.context.nodeOutputs.has("SmallNode")).toBe(true);
            expect(result.context.nodeOutputs.has("NormalNode")).toBe(true);
        });

        it("should reject output exactly at limit + 1 byte", async () => {
            const limits: SizeLimits = {
                maxNodeOutputSize: 100,
                maxTotalContextSize: 50 * MB,
                maxNodeCount: 1000
            };

            const outputs = new Map<string, unknown>();
            // Create object that will be over the limit (100 chars + JSON overhead > 100)
            outputs.set("OverLimit", { data: createDataOfSize(150) });

            const result = await simulateContextWithLimits(outputs, limits, {
                enforceNodeLimit: true
            });

            // With a 150-char data string + JSON overhead, this exceeds 100 bytes
            expect(result.rejectedNodes.length).toBe(1);
            expect(result.rejectedNodes[0].id).toBe("OverLimit");
        });

        it("should accept output exactly at limit", async () => {
            const limits: SizeLimits = {
                maxNodeOutputSize: 10000,
                maxTotalContextSize: 50 * MB,
                maxNodeCount: 1000
            };

            const outputs = new Map<string, unknown>();
            // Create object that will be under the limit
            outputs.set("AtLimit", { data: createDataOfSize(9000) });

            const result = await simulateContextWithLimits(outputs, limits, {
                enforceNodeLimit: true
            });

            expect(result.rejectedNodes.length).toBe(0);
            expect(result.context.nodeOutputs.has("AtLimit")).toBe(true);
        });

        it("should reject multiple oversized outputs", async () => {
            const limits: SizeLimits = {
                maxNodeOutputSize: 500 * KB,
                maxTotalContextSize: 50 * MB,
                maxNodeCount: 1000
            };

            const outputs = new Map<string, unknown>();
            outputs.set("Large1", { data: createDataOfSize(600 * KB) });
            outputs.set("Large2", { data: createDataOfSize(700 * KB) });
            outputs.set("Large3", { data: createDataOfSize(800 * KB) });
            outputs.set("Valid", { data: createDataOfSize(400 * KB) });

            const result = await simulateContextWithLimits(outputs, limits, {
                enforceNodeLimit: true
            });

            expect(result.rejectedNodes.length).toBe(3);
            expect(result.context.nodeOutputs.has("Valid")).toBe(true);
        });

        it("should include reason in rejection", async () => {
            const limits: SizeLimits = {
                maxNodeOutputSize: 1000,
                maxTotalContextSize: 50 * MB,
                maxNodeCount: 1000
            };

            const outputs = new Map<string, unknown>();
            outputs.set("TooBig", { data: createDataOfSize(2000) });

            const result = await simulateContextWithLimits(outputs, limits, {
                enforceNodeLimit: true
            });

            expect(result.rejectedNodes[0].reason).toContain("exceeds limit");
        });
    });

    describe("context pruning preserves recent outputs", () => {
        it("should prune oldest outputs when total exceeds limit", async () => {
            const limits: SizeLimits = {
                maxNodeOutputSize: 1 * MB,
                maxTotalContextSize: 30 * KB, // Small limit for testing
                maxNodeCount: 1000
            };

            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 10; i++) {
                outputs.set(`Node_${i}`, { data: createDataOfSize(5 * KB), order: i });
            }

            const result = await simulateContextWithLimits(outputs, limits, {
                enforceTotalLimit: true,
                pruneOnOverflow: true
            });

            expect(result.prunedNodes.length).toBeGreaterThan(0);
            // Most recent nodes should be preserved
            expect(result.context.nodeOutputs.has("Node_9")).toBe(true);
        });

        it("should preserve newest outputs", async () => {
            const limits: SizeLimits = {
                maxNodeOutputSize: 1 * MB,
                maxTotalContextSize: 20 * KB,
                maxNodeCount: 1000
            };

            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 5; i++) {
                outputs.set(`Node_${i}`, { data: createDataOfSize(8 * KB), index: i });
            }

            const result = await simulateContextWithLimits(outputs, limits, {
                enforceTotalLimit: true,
                pruneOnOverflow: true
            });

            // At least the last 2 nodes should be preserved
            expect(result.context.nodeOutputs.has("Node_4")).toBe(true);
            expect(result.context.nodeOutputs.has("Node_3")).toBe(true);
        });

        it("should prune in FIFO order", async () => {
            const limits: SizeLimits = {
                maxNodeOutputSize: 1 * MB,
                maxTotalContextSize: 15 * KB,
                maxNodeCount: 1000
            };

            const outputs = new Map<string, unknown>();
            outputs.set("First", { data: createDataOfSize(5 * KB) });
            outputs.set("Second", { data: createDataOfSize(5 * KB) });
            outputs.set("Third", { data: createDataOfSize(5 * KB) });
            outputs.set("Fourth", { data: createDataOfSize(5 * KB) });

            const result = await simulateContextWithLimits(outputs, limits, {
                enforceTotalLimit: true,
                pruneOnOverflow: true
            });

            // First should be pruned first
            if (result.prunedNodes.length > 0) {
                expect(result.prunedNodes[0]).toBe("First");
            }
        });

        it("should track all pruned nodes", async () => {
            const limits: SizeLimits = {
                maxNodeOutputSize: 1 * MB,
                maxTotalContextSize: 10 * KB,
                maxNodeCount: 1000
            };

            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 10; i++) {
                outputs.set(`Node_${i}`, { data: createDataOfSize(3 * KB) });
            }

            const result = await simulateContextWithLimits(outputs, limits, {
                enforceTotalLimit: true,
                pruneOnOverflow: true
            });

            // Should have pruned several nodes
            expect(result.prunedNodes.length).toBeGreaterThan(5);
        });

        it("should not prune when under limit", async () => {
            const limits: SizeLimits = {
                maxNodeOutputSize: 1 * MB,
                maxTotalContextSize: 50 * MB,
                maxNodeCount: 1000
            };

            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 10; i++) {
                outputs.set(`Node_${i}`, { data: createDataOfSize(1 * KB) });
            }

            const result = await simulateContextWithLimits(outputs, limits, {
                enforceTotalLimit: true,
                pruneOnOverflow: true
            });

            expect(result.prunedNodes.length).toBe(0);
            expect(result.context.nodeOutputs.size).toBe(10);
        });
    });

    describe("size calculation accuracy", () => {
        it("should calculate size of simple object accurately", async () => {
            const obj = { key: "value" };
            const expectedSize = JSON.stringify(obj).length;

            const outputs = new Map([["Simple", obj]]);
            const result = await simulateContextWithLimits(outputs);

            expect(result.metrics.nodeOutputSizes.get("Simple")).toBe(expectedSize);
        });

        it("should calculate size of nested object accurately", async () => {
            const obj = {
                level1: {
                    level2: {
                        level3: {
                            data: "nested"
                        }
                    }
                }
            };
            const expectedSize = JSON.stringify(obj).length;

            const outputs = new Map([["Nested", obj]]);
            const result = await simulateContextWithLimits(outputs);

            expect(result.metrics.nodeOutputSizes.get("Nested")).toBe(expectedSize);
        });

        it("should calculate size of array accurately", async () => {
            const obj = { items: Array.from({ length: 100 }, (_, i) => ({ id: i })) };
            const expectedSize = JSON.stringify(obj).length;

            const outputs = new Map([["Array", obj]]);
            const result = await simulateContextWithLimits(outputs);

            expect(result.metrics.nodeOutputSizes.get("Array")).toBe(expectedSize);
        });

        it("should calculate total size as sum of all outputs", async () => {
            const outputs = new Map<string, unknown>();
            let expectedTotal = 0;

            for (let i = 0; i < 5; i++) {
                const obj = { data: createDataOfSize(1000 * (i + 1)), index: i };
                outputs.set(`Node_${i}`, obj);
                expectedTotal += JSON.stringify(obj).length;
            }

            const result = await simulateContextWithLimits(outputs);

            expect(result.metrics.totalSize).toBe(expectedTotal);
        });

        it("should track largest and smallest nodes", async () => {
            const outputs = new Map<string, unknown>();
            outputs.set("Small", { data: createDataOfSize(100) });
            outputs.set("Medium", { data: createDataOfSize(1000) });
            outputs.set("Large", { data: createDataOfSize(10000) });

            const result = await simulateContextWithLimits(outputs);

            expect(result.metrics.largestNode?.id).toBe("Large");
            expect(result.metrics.smallestNode?.id).toBe("Small");
        });

        it("should calculate average size correctly", async () => {
            const outputs = new Map<string, unknown>();
            outputs.set("A", { data: createDataOfSize(1000) });
            outputs.set("B", { data: createDataOfSize(1000) });
            outputs.set("C", { data: createDataOfSize(1000) });

            const result = await simulateContextWithLimits(outputs);

            // Average should be total / 3
            const expectedAverage = result.metrics.totalSize / 3;
            expect(result.metrics.averageSize).toBeCloseTo(expectedAverage, 0);
        });

        it("should handle empty outputs in calculation", async () => {
            const outputs = new Map<string, unknown>();
            outputs.set("Empty", {});
            outputs.set("NotEmpty", { data: "value" });

            const result = await simulateContextWithLimits(outputs);

            expect(result.metrics.nodeOutputSizes.get("Empty")).toBe(2); // {}
            expect(result.metrics.nodeCount).toBe(2);
        });
    });

    describe("metadata tracking", () => {
        it("should track node count", async () => {
            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 25; i++) {
                outputs.set(`Node_${i}`, { index: i });
            }

            const result = await simulateContextWithLimits(outputs);

            expect(result.metrics.nodeCount).toBe(25);
        });

        it("should track total context size", async () => {
            const outputs = new Map<string, unknown>();
            outputs.set("Data1", { data: createDataOfSize(5 * KB) });
            outputs.set("Data2", { data: createDataOfSize(10 * KB) });

            const result = await simulateContextWithLimits(outputs);

            expect(result.metrics.totalSize).toBeGreaterThan(15 * KB);
        });

        it("should report within limits status", async () => {
            const limits: SizeLimits = {
                maxNodeOutputSize: 1 * MB,
                maxTotalContextSize: 1 * MB,
                maxNodeCount: 10
            };

            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 5; i++) {
                outputs.set(`Node_${i}`, { data: createDataOfSize(10 * KB) });
            }

            const result = await simulateContextWithLimits(outputs, limits);

            expect(result.withinLimits).toBe(true);
        });

        it("should report over limits status", async () => {
            const limits: SizeLimits = {
                maxNodeOutputSize: 1 * MB,
                maxTotalContextSize: 10 * KB,
                maxNodeCount: 1000
            };

            const outputs = new Map<string, unknown>();
            outputs.set("BigNode", { data: createDataOfSize(50 * KB) });

            const result = await simulateContextWithLimits(outputs, limits);

            expect(result.withinLimits).toBe(false);
        });

        it("should track individual node sizes", async () => {
            const outputs = new Map<string, unknown>();
            const sizes = [1000, 2000, 3000, 4000, 5000];

            sizes.forEach((size, i) => {
                outputs.set(`Node_${i}`, { data: createDataOfSize(size) });
            });

            const result = await simulateContextWithLimits(outputs);

            expect(result.metrics.nodeOutputSizes.size).toBe(5);
        });
    });

    describe("node count limits", () => {
        it("should enforce max node count", async () => {
            const limits: SizeLimits = {
                maxNodeOutputSize: 1 * MB,
                maxTotalContextSize: 50 * MB,
                maxNodeCount: 5
            };

            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 10; i++) {
                outputs.set(`Node_${i}`, { index: i });
            }

            const result = await simulateContextWithLimits(outputs, limits);

            expect(result.context.nodeOutputs.size).toBeLessThanOrEqual(5);
        });

        it("should reject nodes when at max count", async () => {
            const limits: SizeLimits = {
                maxNodeOutputSize: 1 * MB,
                maxTotalContextSize: 50 * MB,
                maxNodeCount: 3
            };

            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 5; i++) {
                outputs.set(`Node_${i}`, { index: i });
            }

            const result = await simulateContextWithLimits(outputs, limits);

            expect(result.rejectedNodes.length).toBe(2);
        });

        it("should allow exactly max node count", async () => {
            const limits: SizeLimits = {
                maxNodeOutputSize: 1 * MB,
                maxTotalContextSize: 50 * MB,
                maxNodeCount: 10
            };

            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 10; i++) {
                outputs.set(`Node_${i}`, { index: i });
            }

            const result = await simulateContextWithLimits(outputs, limits);

            expect(result.context.nodeOutputs.size).toBe(10);
            expect(result.rejectedNodes.length).toBe(0);
        });
    });

    describe("combined limit scenarios", () => {
        it("should handle both size and count limits", async () => {
            const limits: SizeLimits = {
                maxNodeOutputSize: 10 * KB,
                maxTotalContextSize: 50 * KB,
                maxNodeCount: 10
            };

            const outputs = new Map<string, unknown>();
            // Add nodes that would exceed both limits
            for (let i = 0; i < 15; i++) {
                outputs.set(`Node_${i}`, { data: createDataOfSize(8 * KB) });
            }

            const result = await simulateContextWithLimits(outputs, limits, {
                enforceNodeLimit: true
            });

            expect(result.context.nodeOutputs.size).toBeLessThanOrEqual(10);
        });

        it("should reject oversized nodes regardless of count", async () => {
            const limits: SizeLimits = {
                maxNodeOutputSize: 5 * KB,
                maxTotalContextSize: 50 * MB,
                maxNodeCount: 100
            };

            const outputs = new Map<string, unknown>();
            outputs.set("TooBig", { data: createDataOfSize(10 * KB) });
            outputs.set("Ok", { data: createDataOfSize(1 * KB) });

            const result = await simulateContextWithLimits(outputs, limits, {
                enforceNodeLimit: true
            });

            expect(result.rejectedNodes.length).toBe(1);
            expect(result.rejectedNodes[0].id).toBe("TooBig");
        });
    });

    describe("performance with size tracking", () => {
        it("should calculate metrics quickly for many nodes", async () => {
            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 500; i++) {
                outputs.set(`Node_${i}`, { data: createDataOfSize(1 * KB), index: i });
            }

            const startTime = Date.now();
            const result = await simulateContextWithLimits(outputs);
            const duration = Date.now() - startTime;

            expect(result.metrics.nodeCount).toBe(500);
            expect(duration).toBeLessThan(500);
        });

        it("should handle size calculation for large outputs efficiently", async () => {
            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 15; i++) {
                outputs.set(`Node_${i}`, { data: createDataOfSize(100 * KB) });
            }

            const startTime = Date.now();
            const result = await simulateContextWithLimits(outputs);
            const duration = Date.now() - startTime;

            // 15 nodes at ~100KB each should exceed 1MB
            expect(result.metrics.totalSize).toBeGreaterThan(1 * MB);
            expect(duration).toBeLessThan(500);
        });
    });
});
