/**
 * Context Service Unit Tests
 *
 * Tests for context management functions including:
 * - Context creation and initialization
 * - Node output storage and retrieval
 * - Variable management
 * - Context size limits and pruning
 * - Context immutability guarantees
 */

import {
    createEmptyContext,
    createContextWithOutputs,
    createLargeContext,
    deepCloneContext,
    contextsAreEqual
} from "../../../../../tests/fixtures/contexts";
import {
    createContext,
    storeNodeOutput,
    getNodeOutput,
    setVariable,
    getVariable,
    deleteVariable,
    getExecutionContext,
    buildFinalOutputs,
    mergeContext,
    DEFAULT_CONTEXT_CONFIG
} from "../context";
import type { ContextStorageConfig } from "../../types";

describe("Context Service", () => {
    describe("createContext", () => {
        it("should initialize with workflow inputs", () => {
            const inputs = { userId: "user123", data: { name: "test" } };
            const context = createContext(inputs);

            expect(context.inputs).toEqual(inputs);
            expect(context.nodeOutputs.size).toBe(0);
            expect(context.workflowVariables.size).toBe(0);
        });

        it("should set metadata with creation timestamp", () => {
            const before = Date.now();
            const context = createContext({});
            const after = Date.now();

            expect(context.metadata.createdAt).toBeGreaterThanOrEqual(before);
            expect(context.metadata.createdAt).toBeLessThanOrEqual(after);
            expect(context.metadata.nodeCount).toBe(0);
        });

        it("should handle empty inputs", () => {
            const context = createContext({});

            expect(context.inputs).toEqual({});
            expect(context.metadata.totalSizeBytes).toBeGreaterThan(0);
        });

        it("should calculate initial size from inputs", () => {
            const smallInputs = { a: 1 };
            const largeInputs = { data: "x".repeat(1000) };

            const smallContext = createContext(smallInputs);
            const largeContext = createContext(largeInputs);

            expect(largeContext.metadata.totalSizeBytes).toBeGreaterThan(
                smallContext.metadata.totalSizeBytes
            );
        });
    });

    describe("storeNodeOutput", () => {
        it("should not mutate original context snapshot", () => {
            const original = createEmptyContext({ input: "test" });
            const originalClone = deepCloneContext(original);

            const updated = storeNodeOutput(original, "node1", { result: "output" });

            // Original should be unchanged
            expect(contextsAreEqual(original, originalClone)).toBe(true);
            expect(original.nodeOutputs.size).toBe(0);

            // Updated should have the new output
            expect(updated.nodeOutputs.size).toBe(1);
            expect(updated.nodeOutputs.get("node1")).toEqual({ result: "output" });
        });

        it("should handle concurrent output storage from parallel nodes", () => {
            let context = createEmptyContext();

            // Simulate parallel node execution (sequential in test, but same pattern)
            const outputs = [
                { nodeId: "branch1", output: { value: 1 } },
                { nodeId: "branch2", output: { value: 2 } },
                { nodeId: "branch3", output: { value: 3 } }
            ];

            for (const { nodeId, output } of outputs) {
                context = storeNodeOutput(context, nodeId, output);
            }

            // All outputs should be present
            expect(context.nodeOutputs.size).toBe(3);
            expect(context.nodeOutputs.get("branch1")).toEqual({ value: 1 });
            expect(context.nodeOutputs.get("branch2")).toEqual({ value: 2 });
            expect(context.nodeOutputs.get("branch3")).toEqual({ value: 3 });
        });

        it("should enforce per-node output size limit (1MB)", () => {
            const context = createEmptyContext();
            const largeOutput = { data: "x".repeat(2 * 1024 * 1024) }; // 2MB+

            const updated = storeNodeOutput(context, "large-node", largeOutput);

            // Output should be truncated
            const stored = updated.nodeOutputs.get("large-node");
            expect(stored).toBeDefined();
            expect((stored as Record<string, unknown>).__truncated).toBe(true);
            expect((stored as Record<string, unknown>).__preview).toBeDefined();
        });

        it("should enforce total context size limit (50MB)", () => {
            // Start with a context near the limit
            const nearLimitContext = createLargeContext(45 * 1024 * 1024);

            // Add more outputs until pruning kicks in
            let context = nearLimitContext;
            for (let i = 0; i < 10; i++) {
                const output = { data: "x".repeat(512 * 1024) }; // 512KB each
                context = storeNodeOutput(context, `extra-node-${i}`, output);
            }

            // Context should have pruned old outputs
            // Total size should be below threshold (80% of 50MB = 40MB)
            expect(context.metadata.totalSizeBytes).toBeLessThan(50 * 1024 * 1024);
        });

        it("should prune oldest outputs when approaching limit", () => {
            const config: ContextStorageConfig = {
                maxOutputSizeBytes: 1024 * 1024,
                maxTotalSizeBytes: 10 * 1024, // 10KB for testing
                pruneThreshold: 0.8,
                retainLastN: 2
            };

            let context = createEmptyContext();

            // Add outputs that will exceed limit
            for (let i = 0; i < 5; i++) {
                const output = { data: "x".repeat(2048), index: i }; // ~4KB each
                context = storeNodeOutput(context, `node-${i}`, output, config);
            }

            // Should have pruned to retain only last N
            expect(context.nodeOutputs.size).toBeLessThanOrEqual(config.retainLastN + 1);
        });

        it("should retain minimum N recent outputs during pruning", () => {
            const config: ContextStorageConfig = {
                maxOutputSizeBytes: 1024 * 1024,
                maxTotalSizeBytes: 5 * 1024, // Very small for testing
                pruneThreshold: 0.5,
                retainLastN: 3
            };

            let context = createEmptyContext();

            for (let i = 0; i < 10; i++) {
                const output = { index: i, data: "x".repeat(256) };
                context = storeNodeOutput(context, `node-${i}`, output, config);
            }

            // Should retain at least the last N outputs
            expect(context.nodeOutputs.size).toBeGreaterThanOrEqual(config.retainLastN);

            // The most recent outputs should still be there
            expect(context.nodeOutputs.has("node-9")).toBe(true);
        });

        it("should handle empty/null/undefined outputs", () => {
            let context = createEmptyContext();

            context = storeNodeOutput(context, "empty", {});
            context = storeNodeOutput(context, "withNull", { value: null });
            context = storeNodeOutput(context, "withUndefined", {
                value: undefined as unknown as null
            });

            expect(context.nodeOutputs.get("empty")).toEqual({});
            expect(context.nodeOutputs.get("withNull")).toEqual({ value: null });
            expect(context.nodeOutputs.get("withUndefined")).toBeDefined();
        });

        it("should store complex object outputs (shallow copy - known limitation)", () => {
            // Note: Current implementation uses shallow cloning via Map constructor.
            // This means object mutations will affect stored values.
            // For Temporal determinism, outputs should be treated as immutable
            // by the workflow code.
            const context = createEmptyContext();
            const complexOutput = {
                nested: { deep: { value: "original" } },
                array: [1, 2, { inner: "test" }]
            };

            const updated = storeNodeOutput(context, "complex", complexOutput);

            // Verify output is stored
            const stored = updated.nodeOutputs.get("complex")!;
            expect(stored).toBeDefined();
            expect((stored.nested as Record<string, Record<string, string>>).deep.value).toBe(
                "original"
            );

            // Note: Current impl does NOT deep clone - mutations would affect stored.
            // This is acceptable because Temporal workflow code should not mutate outputs.
        });

        it("should increment node count on each store", () => {
            let context = createEmptyContext();
            expect(context.metadata.nodeCount).toBe(0);

            context = storeNodeOutput(context, "node1", { a: 1 });
            expect(context.metadata.nodeCount).toBe(1);

            context = storeNodeOutput(context, "node2", { b: 2 });
            expect(context.metadata.nodeCount).toBe(2);
        });

        it("should update total size correctly", () => {
            let context = createEmptyContext();
            const initialSize = context.metadata.totalSizeBytes;

            context = storeNodeOutput(context, "node1", { data: "x".repeat(100) });

            expect(context.metadata.totalSizeBytes).toBeGreaterThan(initialSize);
        });
    });

    describe("getNodeOutput", () => {
        it("should return output for existing node", () => {
            const context = createContextWithOutputs();

            expect(getNodeOutput(context, "node1")).toEqual({ result: "first output", value: 42 });
        });

        it("should return undefined for non-existent node", () => {
            const context = createContextWithOutputs();

            expect(getNodeOutput(context, "nonexistent")).toBeUndefined();
        });
    });

    describe("setVariable / getVariable / deleteVariable", () => {
        it("should store and retrieve variables", () => {
            let context = createEmptyContext();

            context = setVariable(context, "myVar", "myValue");
            expect(getVariable(context, "myVar")).toBe("myValue");
        });

        it("should handle different value types", () => {
            let context = createEmptyContext();

            context = setVariable(context, "string", "hello");
            context = setVariable(context, "number", 42);
            context = setVariable(context, "boolean", true);
            context = setVariable(context, "null", null);
            context = setVariable(context, "object", { key: "value" });
            context = setVariable(context, "array", [1, 2, 3]);

            expect(getVariable(context, "string")).toBe("hello");
            expect(getVariable(context, "number")).toBe(42);
            expect(getVariable(context, "boolean")).toBe(true);
            expect(getVariable(context, "null")).toBe(null);
            expect(getVariable(context, "object")).toEqual({ key: "value" });
            expect(getVariable(context, "array")).toEqual([1, 2, 3]);
        });

        it("should not mutate original context", () => {
            const original = createEmptyContext();
            const originalClone = deepCloneContext(original);

            const updated = setVariable(original, "newVar", "newValue");

            expect(contextsAreEqual(original, originalClone)).toBe(true);
            expect(original.workflowVariables.has("newVar")).toBe(false);
            expect(updated.workflowVariables.has("newVar")).toBe(true);
        });

        it("should delete variables", () => {
            let context = createEmptyContext();
            context = setVariable(context, "toDelete", "value");
            expect(getVariable(context, "toDelete")).toBe("value");

            context = deleteVariable(context, "toDelete");
            expect(getVariable(context, "toDelete")).toBeUndefined();
        });

        it("should handle deleting non-existent variable", () => {
            const context = createEmptyContext();

            // Should not throw
            const updated = deleteVariable(context, "nonexistent");
            expect(updated.workflowVariables.size).toBe(0);
        });
    });

    describe("getExecutionContext", () => {
        it("should merge nodeOutputs and workflowVariables", () => {
            const context = createContextWithOutputs();
            const execContext = getExecutionContext(context);

            // Should have inputs
            expect(execContext.userId).toBe("user123");

            // Should have variables
            expect(execContext.counter).toBe(5);
            expect(execContext.message).toBe("hello world");

            // Should have node outputs
            expect(execContext.node1).toBeDefined();
            expect(execContext.node2).toBeDefined();
        });

        it("should not allow variable name collisions to corrupt data", () => {
            let context = createEmptyContext({ inputKey: "input-value" });
            context = storeNodeOutput(context, "nodeA", {
                result: "node-value",
                inputKey: "node-override"
            });
            context = setVariable(context, "result", "variable-value");

            const execContext = getExecutionContext(context);

            // Variables should take precedence in the merge
            expect(execContext.result).toBe("variable-value");

            // Input values should be in context
            expect(execContext.inputKey).toBe("input-value");
        });

        it("should preserve input immutability", () => {
            const originalInputs = { key: "original" };
            const context = createContext(originalInputs);

            const execContext = getExecutionContext(context);
            execContext.key = "mutated";

            // Original inputs should be unchanged
            expect(context.inputs.key).toBe("original");
        });
    });

    describe("buildFinalOutputs", () => {
        it("should extract outputs from specified output nodes", () => {
            let context = createEmptyContext();
            context = storeNodeOutput(context, "output1", { result: "a", extra: 1 });
            context = storeNodeOutput(context, "output2", { result: "b", extra: 2 });
            context = storeNodeOutput(context, "notOutput", { result: "c" });

            const outputs = buildFinalOutputs(context, ["output1", "output2"]);

            expect(outputs.result).toBeDefined();
            expect(outputs.extra).toBeDefined();
        });

        it("should fall back to workflow variables if no output nodes", () => {
            let context = createEmptyContext();
            context = setVariable(context, "finalResult", "from-variable");
            context = setVariable(context, "status", "success");

            const outputs = buildFinalOutputs(context, []);

            expect(outputs.finalResult).toBe("from-variable");
            expect(outputs.status).toBe("success");
        });

        it("should handle missing output nodes gracefully", () => {
            const context = createEmptyContext();

            const outputs = buildFinalOutputs(context, ["nonexistent"]);

            expect(outputs).toEqual({});
        });
    });

    describe("mergeContext", () => {
        it("should merge outputs from another context", () => {
            let context1 = createEmptyContext();
            context1 = storeNodeOutput(context1, "node1", { a: 1 });

            let context2 = createEmptyContext();
            context2 = storeNodeOutput(context2, "node2", { b: 2 });
            context2 = setVariable(context2, "var1", "value1");

            const merged = mergeContext(context1, context2);

            expect(merged.nodeOutputs.get("node1")).toEqual({ a: 1 });
            expect(merged.nodeOutputs.get("node2")).toEqual({ b: 2 });
            expect(merged.workflowVariables.get("var1")).toBe("value1");
        });

        it("should not mutate source contexts", () => {
            const context1 = createContextWithOutputs();
            const context2 = createEmptyContext();
            const clone1 = deepCloneContext(context1);
            const clone2 = deepCloneContext(context2);

            mergeContext(context1, context2);

            expect(contextsAreEqual(context1, clone1)).toBe(true);
            expect(contextsAreEqual(context2, clone2)).toBe(true);
        });

        it("should handle conflicting keys (other wins)", () => {
            let context1 = createEmptyContext();
            context1 = storeNodeOutput(context1, "shared", { value: "from-1" });

            let context2 = createEmptyContext();
            context2 = storeNodeOutput(context2, "shared", { value: "from-2" });

            const merged = mergeContext(context1, context2);

            expect(merged.nodeOutputs.get("shared")).toEqual({ value: "from-2" });
        });
    });

    describe("context immutability", () => {
        it("should produce new context on every modification", () => {
            const original = createEmptyContext();

            const afterStore = storeNodeOutput(original, "n1", { x: 1 });
            const afterVariable = setVariable(afterStore, "v1", 42);
            const afterDelete = deleteVariable(afterVariable, "v1");

            // All should be different objects
            expect(original).not.toBe(afterStore);
            expect(afterStore).not.toBe(afterVariable);
            expect(afterVariable).not.toBe(afterDelete);
        });

        it("should not share internal Maps between contexts", () => {
            const original = createContextWithOutputs();
            const modified = storeNodeOutput(original, "newNode", { new: true });

            // Modifying the new context's Map should not affect original
            modified.nodeOutputs.set("mutated", { bad: true });

            expect(original.nodeOutputs.has("mutated")).toBe(false);
        });
    });

    describe("DEFAULT_CONTEXT_CONFIG", () => {
        it("should have sensible defaults", () => {
            expect(DEFAULT_CONTEXT_CONFIG.maxOutputSizeBytes).toBe(1024 * 1024); // 1MB
            expect(DEFAULT_CONTEXT_CONFIG.maxTotalSizeBytes).toBe(50 * 1024 * 1024); // 50MB
            expect(DEFAULT_CONTEXT_CONFIG.pruneThreshold).toBe(0.8);
            expect(DEFAULT_CONTEXT_CONFIG.retainLastN).toBe(10);
        });
    });
});
