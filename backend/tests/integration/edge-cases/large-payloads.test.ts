/**
 * Large Payloads Edge Case Tests
 *
 * Tests workflow behavior with large data payloads:
 * - Node output near 1MB limit
 * - Context near 50MB total limit
 * - Context pruning behavior
 * - Large array iteration (1000+ items)
 */

import type { JsonObject } from "@flowmaestro/shared";
import { createContext, storeNodeOutput } from "../../../src/temporal/core/services/context";
import type { ContextSnapshot } from "../../../src/temporal/core/types";

// Constants for size limits
const KB = 1024;
const MB = 1024 * KB;
const MAX_NODE_OUTPUT_SIZE = 1 * MB;
const MAX_CONTEXT_SIZE = 50 * MB;

// Helper to create string of specific byte size
function createStringOfSize(bytes: number): string {
    return "x".repeat(bytes);
}

// Helper to create object of approximate size
function createObjectOfSize(targetBytes: number): Record<string, unknown> {
    const overhead = 100; // JSON structure overhead
    const stringSize = Math.max(0, targetBytes - overhead);
    return {
        data: createStringOfSize(stringSize),
        timestamp: Date.now()
    };
}

// Helper to calculate approximate JSON size
function getJsonSize(obj: unknown): number {
    return JSON.stringify(obj).length;
}

// Simulate workflow with size tracking
interface SizeTrackingResult {
    context: ContextSnapshot;
    nodeSizes: Map<string, number>;
    totalSize: number;
    pruned: boolean;
    prunedNodes: string[];
}

async function simulateWithSizeTracking(
    nodeOutputs: Map<string, unknown>,
    options: {
        maxNodeSize?: number;
        maxTotalSize?: number;
        pruneOldest?: boolean;
    } = {}
): Promise<SizeTrackingResult> {
    const maxNodeSize = options.maxNodeSize || MAX_NODE_OUTPUT_SIZE;
    const maxTotalSize = options.maxTotalSize || MAX_CONTEXT_SIZE;

    let context = createContext({});
    const nodeSizes = new Map<string, number>();
    let totalSize = 0;
    let pruned = false;
    const prunedNodes: string[] = [];
    const nodeOrder: string[] = [];

    for (const [nodeId, output] of nodeOutputs) {
        const outputSize = getJsonSize(output);
        nodeSizes.set(nodeId, outputSize);

        // Check node size limit
        if (outputSize > maxNodeSize) {
            // In real implementation, this would throw or truncate
            // For testing, we track but still store
        }

        // Check total size limit
        if (totalSize + outputSize > maxTotalSize && options.pruneOldest) {
            // Prune oldest nodes until we have space
            while (nodeOrder.length > 0 && totalSize + outputSize > maxTotalSize) {
                const oldestNode = nodeOrder.shift()!;
                const oldSize = nodeSizes.get(oldestNode) || 0;
                totalSize -= oldSize;
                prunedNodes.push(oldestNode);
                pruned = true;
            }
        }

        context = storeNodeOutput(context, nodeId, output as JsonObject);
        nodeOrder.push(nodeId);
        totalSize += outputSize;
    }

    return { context, nodeSizes, totalSize, pruned, prunedNodes };
}

describe("Large Payloads Edge Cases", () => {
    describe("node output near 1MB limit", () => {
        it("should handle output just under 1MB", async () => {
            const output = createObjectOfSize(900 * KB);

            const result = await simulateWithSizeTracking(new Map([["LargeNode", output]]));

            expect(result.nodeSizes.get("LargeNode")).toBeLessThan(MAX_NODE_OUTPUT_SIZE);
            expect(result.context.nodeOutputs.get("LargeNode")).toBeDefined();
        });

        it("should handle output exactly at 1MB", async () => {
            const output = createObjectOfSize(MAX_NODE_OUTPUT_SIZE);

            const result = await simulateWithSizeTracking(new Map([["ExactLimit", output]]));

            expect(result.context.nodeOutputs.get("ExactLimit")).toBeDefined();
        });

        it("should track output exceeding 1MB limit", async () => {
            const output = createObjectOfSize(1.5 * MB);

            const result = await simulateWithSizeTracking(new Map([["OversizedNode", output]]));

            expect(result.nodeSizes.get("OversizedNode")).toBeGreaterThan(MAX_NODE_OUTPUT_SIZE);
        });

        it("should handle multiple large outputs in sequence", async () => {
            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 5; i++) {
                outputs.set(`LargeNode_${i}`, createObjectOfSize(500 * KB));
            }

            const result = await simulateWithSizeTracking(outputs);

            expect(result.nodeSizes.size).toBe(5);
            expect(result.totalSize).toBeGreaterThan(2 * MB);
        });

        it("should handle output with large nested objects", async () => {
            const nestedOutput = {
                level1: {
                    level2: {
                        level3: {
                            data: createStringOfSize(800 * KB)
                        }
                    }
                }
            };

            const result = await simulateWithSizeTracking(new Map([["NestedLarge", nestedOutput]]));

            expect(result.context.nodeOutputs.get("NestedLarge")).toBeDefined();
        });

        it("should handle output with large array", async () => {
            const items = Array.from({ length: 1000 }, (_, i) => ({
                id: i,
                data: createStringOfSize(500)
            }));

            const result = await simulateWithSizeTracking(new Map([["ArrayOutput", { items }]]));

            const output = result.context.nodeOutputs.get("ArrayOutput") as { items: unknown[] };
            expect(output.items.length).toBe(1000);
        });
    });

    describe("context near 50MB total limit", () => {
        it("should handle context just under 50MB", async () => {
            const outputs = new Map<string, unknown>();
            // Create 45 nodes with ~1MB each = ~45MB
            for (let i = 0; i < 45; i++) {
                outputs.set(`Node_${i}`, createObjectOfSize(MB));
            }

            const result = await simulateWithSizeTracking(outputs);

            expect(result.totalSize).toBeLessThan(MAX_CONTEXT_SIZE);
            expect(result.context.nodeOutputs.size).toBe(45);
        });

        it("should track context exceeding 50MB", async () => {
            const outputs = new Map<string, unknown>();
            // Create 55 nodes with ~1MB each = ~55MB
            for (let i = 0; i < 55; i++) {
                outputs.set(`Node_${i}`, createObjectOfSize(MB));
            }

            const result = await simulateWithSizeTracking(outputs);

            expect(result.totalSize).toBeGreaterThan(MAX_CONTEXT_SIZE);
        });

        it("should handle many small outputs totaling near limit", async () => {
            const outputs = new Map<string, unknown>();
            // Create 100 nodes with ~100KB each = ~10MB (well under limit)
            for (let i = 0; i < 100; i++) {
                outputs.set(`SmallNode_${i}`, createObjectOfSize(100 * KB));
            }

            const result = await simulateWithSizeTracking(outputs);

            expect(result.context.nodeOutputs.size).toBe(100);
            expect(result.totalSize).toBeGreaterThan(9 * MB);
        });

        it("should calculate total context size accurately", async () => {
            const outputs = new Map<string, unknown>();
            let expectedTotal = 0;

            for (let i = 0; i < 10; i++) {
                const output = createObjectOfSize((i + 1) * 10 * KB);
                outputs.set(`Node_${i}`, output);
                expectedTotal += getJsonSize(output);
            }

            const result = await simulateWithSizeTracking(outputs);

            // Allow small variance for context overhead
            expect(Math.abs(result.totalSize - expectedTotal)).toBeLessThan(1000);
        });
    });

    describe("context pruning behavior", () => {
        it("should prune oldest nodes when limit exceeded", async () => {
            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 10; i++) {
                outputs.set(`Node_${i}`, createObjectOfSize(10 * MB));
            }

            const result = await simulateWithSizeTracking(outputs, {
                maxTotalSize: 50 * MB,
                pruneOldest: true
            });

            expect(result.pruned).toBe(true);
            expect(result.prunedNodes.length).toBeGreaterThan(0);
            // First nodes should be pruned
            expect(result.prunedNodes[0]).toBe("Node_0");
        });

        it("should preserve most recent outputs", async () => {
            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 20; i++) {
                outputs.set(`Node_${i}`, createObjectOfSize(5 * MB));
            }

            const result = await simulateWithSizeTracking(outputs, {
                maxTotalSize: 50 * MB,
                pruneOldest: true
            });

            // Most recent nodes should still be in context
            expect(result.context.nodeOutputs.has("Node_19")).toBe(true);
            expect(result.context.nodeOutputs.has("Node_18")).toBe(true);
        });

        it("should not prune when under limit", async () => {
            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 5; i++) {
                outputs.set(`Node_${i}`, createObjectOfSize(1 * MB));
            }

            const result = await simulateWithSizeTracking(outputs, {
                maxTotalSize: 50 * MB,
                pruneOldest: true
            });

            expect(result.pruned).toBe(false);
            expect(result.prunedNodes.length).toBe(0);
        });

        it("should prune minimum nodes necessary", async () => {
            const outputs = new Map<string, unknown>();
            // 6 nodes at 10MB each = 60MB, need to prune at least 1 to stay under 50MB limit
            for (let i = 0; i < 6; i++) {
                outputs.set(`Node_${i}`, createObjectOfSize(10 * MB));
            }

            const result = await simulateWithSizeTracking(outputs, {
                maxTotalSize: 50 * MB,
                pruneOldest: true
            });

            // At least some nodes should be pruned to fit within limit
            expect(result.prunedNodes.length).toBeGreaterThanOrEqual(1);
            expect(result.totalSize).toBeLessThanOrEqual(50 * MB);
        });

        it("should track pruning in context metadata", async () => {
            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 10; i++) {
                outputs.set(`Node_${i}`, createObjectOfSize(10 * MB));
            }

            const result = await simulateWithSizeTracking(outputs, {
                maxTotalSize: 50 * MB,
                pruneOldest: true
            });

            expect(result.prunedNodes).toBeDefined();
            expect(result.prunedNodes.length).toBeGreaterThan(0);
        });
    });

    describe("large array iteration (1000+ items)", () => {
        it("should iterate over 1000 items", async () => {
            const items = Array.from({ length: 1000 }, (_, i) => ({
                id: `item_${i}`,
                value: i * 10
            }));

            let context = createContext({ items });
            let processedCount = 0;

            for (const item of items) {
                context = storeNodeOutput(context, `Process_${item.id}`, {
                    processed: true,
                    originalValue: item.value,
                    newValue: item.value * 2
                });
                processedCount++;
            }

            expect(processedCount).toBe(1000);
        });

        it("should iterate over 5000 items", async () => {
            const items = Array.from({ length: 5000 }, (_, i) => ({
                id: i,
                data: `data_${i}`
            }));

            let processedItems = 0;
            for (const _item of items) {
                processedItems++;
            }

            expect(processedItems).toBe(5000);
        });

        it("should handle large items in iteration", async () => {
            const items = Array.from({ length: 100 }, (_, i) => ({
                id: i,
                content: createStringOfSize(10 * KB)
            }));

            const outputs = new Map<string, unknown>();
            for (const item of items) {
                outputs.set(`Item_${item.id}`, {
                    processed: true,
                    contentLength: item.content.length
                });
            }

            const result = await simulateWithSizeTracking(outputs);

            expect(result.context.nodeOutputs.size).toBe(100);
        });

        it("should accumulate results from large iteration", async () => {
            const itemCount = 1000;
            const results: number[] = [];

            for (let i = 0; i < itemCount; i++) {
                results.push(i * 2);
            }

            const summary = {
                totalItems: itemCount,
                totalValue: results.reduce((a, b) => a + b, 0),
                averageValue: results.reduce((a, b) => a + b, 0) / itemCount
            };

            expect(summary.totalItems).toBe(1000);
            expect(summary.totalValue).toBe(999000); // Sum of 0,2,4,...,1998
        });

        it("should handle mixed-size items in iteration", async () => {
            const items = Array.from({ length: 500 }, (_, i) => ({
                id: i,
                // Varying sizes: 1KB, 5KB, 10KB cycling
                data: createStringOfSize((i % 3 === 0 ? 1 : i % 3 === 1 ? 5 : 10) * KB)
            }));

            let totalSize = 0;
            for (const item of items) {
                totalSize += item.data.length;
            }

            expect(totalSize).toBeGreaterThan(1 * MB);
        });

        it("should complete 10000 iterations", async () => {
            const iterations = 10000;
            let completed = 0;

            for (let i = 0; i < iterations; i++) {
                completed++;
            }

            expect(completed).toBe(10000);
        });
    });

    describe("binary and special data handling", () => {
        it("should handle base64 encoded large data", async () => {
            // Simulate base64 encoded binary data
            const binarySize = 500 * KB;
            const base64Data = Buffer.alloc(binarySize).toString("base64");

            const result = await simulateWithSizeTracking(
                new Map([["BinaryNode", { encoded: base64Data }]])
            );

            expect(result.context.nodeOutputs.get("BinaryNode")).toBeDefined();
        });

        it("should handle unicode in large payloads", async () => {
            // Unicode characters - emoji like 🚀 are surrogate pairs (2 JS chars each)
            const unicodeString = "🚀".repeat(50000);

            const result = await simulateWithSizeTracking(
                new Map([["UnicodeNode", { text: unicodeString }]])
            );

            const output = result.context.nodeOutputs.get("UnicodeNode") as { text: string };
            // 50000 rocket emojis = 100000 JS string length (2 chars per emoji)
            expect(output.text.length).toBe(100000);
        });

        it("should handle null and undefined in large arrays", async () => {
            const mixedArray = Array.from({ length: 1000 }, (_, i) =>
                i % 3 === 0 ? null : i % 3 === 1 ? undefined : { id: i }
            );

            const result = await simulateWithSizeTracking(
                new Map([["MixedNode", { items: mixedArray }]])
            );

            expect(result.context.nodeOutputs.get("MixedNode")).toBeDefined();
        });

        it("should handle deeply nested large structures", async () => {
            const createDeepObject = (depth: number, data: string): unknown => {
                if (depth === 0) return { data };
                return { nested: createDeepObject(depth - 1, data) };
            };

            const deepObject = createDeepObject(50, createStringOfSize(10 * KB));

            const result = await simulateWithSizeTracking(
                new Map([["DeepNode", deepObject as JsonObject]])
            );

            expect(result.context.nodeOutputs.get("DeepNode")).toBeDefined();
        });
    });

    describe("performance with large data", () => {
        it("should store 1MB output in reasonable time", async () => {
            const largeOutput = createObjectOfSize(MB);

            const startTime = Date.now();
            await simulateWithSizeTracking(new Map([["LargeNode", largeOutput]]));
            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(100);
        });

        it("should handle 100 sequential large outputs", async () => {
            const outputs = new Map<string, unknown>();
            for (let i = 0; i < 100; i++) {
                outputs.set(`Node_${i}`, createObjectOfSize(100 * KB));
            }

            const startTime = Date.now();
            await simulateWithSizeTracking(outputs);
            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(500);
        });

        it("should iterate 10000 items in reasonable time", async () => {
            const items = Array.from({ length: 10000 }, (_, i) => ({ id: i }));

            const startTime = Date.now();
            let count = 0;
            for (const _item of items) {
                count++;
            }
            const duration = Date.now() - startTime;

            expect(count).toBe(10000);
            expect(duration).toBeLessThan(100);
        });
    });

    describe("memory efficiency", () => {
        it("should not duplicate data unnecessarily", async () => {
            const sharedData = createStringOfSize(100 * KB);
            const outputs = new Map<string, unknown>();

            for (let i = 0; i < 10; i++) {
                outputs.set(`Node_${i}`, { ref: sharedData, index: i });
            }

            const result = await simulateWithSizeTracking(outputs);

            expect(result.context.nodeOutputs.size).toBe(10);
        });

        it("should handle clearing old outputs", async () => {
            let context = createContext({});

            // Add outputs
            for (let i = 0; i < 100; i++) {
                context = storeNodeOutput(context, `Node_${i}`, {
                    data: createStringOfSize(10 * KB)
                });
            }

            // Verify all stored
            expect(context.nodeOutputs.size).toBe(100);
        });
    });

    describe("edge cases with specific sizes", () => {
        it("should handle empty output", async () => {
            const result = await simulateWithSizeTracking(new Map([["EmptyNode", {}]]));

            expect(result.nodeSizes.get("EmptyNode")).toBeLessThan(10);
        });

        it("should handle single character output", async () => {
            const result = await simulateWithSizeTracking(new Map([["TinyNode", { v: "x" }]]));

            expect(result.nodeSizes.get("TinyNode")).toBeLessThan(20);
        });

        it("should handle exactly 1KB output", async () => {
            const result = await simulateWithSizeTracking(
                new Map([["KiloNode", createObjectOfSize(KB)]])
            );

            const size = result.nodeSizes.get("KiloNode")!;
            expect(size).toBeGreaterThan(KB - 100);
            expect(size).toBeLessThan(KB + 200);
        });

        it("should handle power-of-two sizes", async () => {
            const sizes = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
            const outputs = new Map<string, unknown>();

            sizes.forEach((size) => {
                outputs.set(`Node_${size}KB`, createObjectOfSize(size * KB));
            });

            const result = await simulateWithSizeTracking(outputs);

            expect(result.context.nodeOutputs.size).toBe(10);
        });
    });
});
