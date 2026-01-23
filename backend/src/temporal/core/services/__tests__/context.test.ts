/**
 * Context & Execution Queue Management Tests
 *
 * Tests for workflow context, shared memory, variable resolution,
 * and parallel node execution state management.
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    // Context Management
    DEFAULT_SHARED_MEMORY_CONFIG,
    createContext,
    storeNodeOutput,
    getNodeOutput,
    setVariable,
    getVariable,
    deleteVariable,
    // Shared Memory
    setSharedMemoryValue,
    getSharedMemoryValue,
    getSharedMemoryEntry,
    deleteSharedMemoryValue,
    appendSharedMemoryValue,
    getSharedMemoryKeys,
    searchSharedMemory,
    getSharedMemoryStats,
    serializeSharedMemoryState,
    deserializeSharedMemoryState,
    // Variable Resolution
    resolveVariable,
    interpolateString,
    isVariableReference,
    extractVariableNames,
    // Execution Context
    getExecutionContext,
    buildFinalOutputs,
    mergeContext,
    // Queue Management
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    markFailed,
    markSkipped,
    markRetry,
    isExecutionComplete,
    canContinue,
    getExecutionSummary,
    getExecutionProgress,
    getNodesByStatus,
    resetNodeForIteration
} from "../context";
import type { BuiltWorkflow, ExecutableNode } from "../../../activities/execution/types";
import type { ContextSnapshot, LoopIterationState, ParallelBranchState } from "../../types";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createTestContext(inputs: JsonObject = {}): ContextSnapshot {
    return createContext(inputs);
}

function createTestWorkflow(nodes: Array<{ id: string; deps: string[] }>): BuiltWorkflow {
    const nodeMap = new Map<string, ExecutableNode>();

    for (const { id, deps } of nodes) {
        // Find dependents for each node
        const dependents = nodes.filter((n) => n.deps.includes(id)).map((n) => n.id);

        nodeMap.set(id, {
            id,
            type: "llm",
            name: id,
            config: {},
            depth: deps.length,
            dependencies: deps,
            dependents
        });
    }

    return {
        nodes: nodeMap,
        edges: new Map(),
        executionLevels: [],
        triggerNodeId: nodes[0]?.id || "",
        outputNodeIds: [],
        loopContexts: new Map(),
        maxConcurrentNodes: 5,
        buildTimestamp: Date.now(),
        originalDefinition: {
            name: "test",
            nodes: {},
            edges: [],
            entryPoint: nodes[0]?.id || ""
        }
    };
}

// ============================================================================
// CONTEXT MANAGEMENT TESTS
// ============================================================================

describe("Context Management", () => {
    describe("createContext", () => {
        it("should create empty context with inputs", () => {
            const inputs = { message: "hello" };
            const context = createContext(inputs);

            expect(context.inputs).toEqual(inputs);
            expect(context.nodeOutputs.size).toBe(0);
            expect(context.workflowVariables.size).toBe(0);
            expect(context.metadata.nodeCount).toBe(0);
        });

        it("should initialize shared memory with defaults", () => {
            const context = createContext({});

            expect(context.sharedMemory.entries.size).toBe(0);
            expect(context.sharedMemory.config.maxEntries).toBe(
                DEFAULT_SHARED_MEMORY_CONFIG.maxEntries
            );
            expect(context.sharedMemory.config.enableSemanticSearch).toBe(true);
        });

        it("should accept custom shared memory config", () => {
            const context = createContext({}, {}, { maxEntries: 50, enableSemanticSearch: false });

            expect(context.sharedMemory.config.maxEntries).toBe(50);
            expect(context.sharedMemory.config.enableSemanticSearch).toBe(false);
        });

        it("should estimate initial size from inputs", () => {
            const inputs = { data: "test data" };
            const context = createContext(inputs);

            expect(context.metadata.totalSizeBytes).toBeGreaterThan(0);
        });
    });

    describe("storeNodeOutput", () => {
        it("should store node output", () => {
            let context = createTestContext();
            const output = { result: "success" };

            context = storeNodeOutput(context, "node1", output);

            expect(context.nodeOutputs.get("node1")).toEqual(output);
            expect(context.metadata.nodeCount).toBe(1);
        });

        it("should update total size", () => {
            let context = createTestContext();
            const initialSize = context.metadata.totalSizeBytes;

            context = storeNodeOutput(context, "node1", { data: "test" });

            expect(context.metadata.totalSizeBytes).toBeGreaterThan(initialSize);
        });

        it("should truncate output if too large", () => {
            let context = createTestContext();
            const largeOutput = { data: "x".repeat(2000000) }; // 2MB+

            context = storeNodeOutput(context, "node1", largeOutput);
            const stored = context.nodeOutputs.get("node1")!;

            expect(stored.__truncated).toBe(true);
            expect(stored.__originalSize).toBeDefined();
        });

        it("should not mutate original context", () => {
            const context = createTestContext();
            const newContext = storeNodeOutput(context, "node1", { result: "test" });

            expect(context.nodeOutputs.size).toBe(0);
            expect(newContext.nodeOutputs.size).toBe(1);
        });
    });

    describe("getNodeOutput", () => {
        it("should return stored output", () => {
            let context = createTestContext();
            const output = { result: "data" };
            context = storeNodeOutput(context, "node1", output);

            expect(getNodeOutput(context, "node1")).toEqual(output);
        });

        it("should return undefined for missing node", () => {
            const context = createTestContext();
            expect(getNodeOutput(context, "missing")).toBeUndefined();
        });
    });

    describe("variable management", () => {
        it("should set and get variable", () => {
            let context = createTestContext();
            context = setVariable(context, "count", 42);

            expect(getVariable(context, "count")).toBe(42);
        });

        it("should handle various value types", () => {
            let context = createTestContext();
            context = setVariable(context, "string", "hello");
            context = setVariable(context, "number", 123);
            context = setVariable(context, "boolean", true);
            context = setVariable(context, "object", { nested: "value" });
            context = setVariable(context, "array", [1, 2, 3]);
            context = setVariable(context, "null", null);

            expect(getVariable(context, "string")).toBe("hello");
            expect(getVariable(context, "number")).toBe(123);
            expect(getVariable(context, "boolean")).toBe(true);
            expect(getVariable(context, "object")).toEqual({ nested: "value" });
            expect(getVariable(context, "array")).toEqual([1, 2, 3]);
            expect(getVariable(context, "null")).toBeNull();
        });

        it("should delete variable", () => {
            let context = createTestContext();
            context = setVariable(context, "temp", "value");
            expect(getVariable(context, "temp")).toBe("value");

            context = deleteVariable(context, "temp");
            expect(getVariable(context, "temp")).toBeUndefined();
        });

        it("should not mutate original context", () => {
            const context = createTestContext();
            const newContext = setVariable(context, "key", "value");

            expect(context.workflowVariables.size).toBe(0);
            expect(newContext.workflowVariables.size).toBe(1);
        });
    });
});

// ============================================================================
// SHARED MEMORY TESTS
// ============================================================================

describe("Shared Memory", () => {
    describe("setSharedMemoryValue", () => {
        it("should set value in shared memory", () => {
            let context = createTestContext();
            context = setSharedMemoryValue(context, "key1", "value1", "node1");

            expect(getSharedMemoryValue(context, "key1")).toBe("value1");
        });

        it("should track entry metadata", () => {
            let context = createTestContext();
            context = setSharedMemoryValue(context, "key1", { data: "test" }, "node1");

            const entry = getSharedMemoryEntry(context, "key1");
            expect(entry?.metadata.nodeId).toBe("node1");
            expect(entry?.metadata.valueType).toBe("json");
            expect(entry?.metadata.sizeBytes).toBeGreaterThan(0);
            expect(entry?.metadata.createdAt).toBeDefined();
        });

        it("should store embedding if provided", () => {
            let context = createTestContext();
            const embedding = [0.1, 0.2, 0.3];
            context = setSharedMemoryValue(context, "key1", "value", "node1", embedding);

            const entry = getSharedMemoryEntry(context, "key1");
            expect(entry?.embedding).toEqual(embedding);
        });

        it("should update existing entry", () => {
            let context = createTestContext();
            context = setSharedMemoryValue(context, "key1", "original", "node1");
            const originalCreatedAt = getSharedMemoryEntry(context, "key1")?.metadata.createdAt;

            context = setSharedMemoryValue(context, "key1", "updated", "node2");
            const entry = getSharedMemoryEntry(context, "key1");

            expect(entry?.value).toBe("updated");
            expect(entry?.metadata.nodeId).toBe("node2");
            expect(entry?.metadata.createdAt).toBe(originalCreatedAt); // Preserved
        });

        it("should throw if value too large", () => {
            const context = createTestContext();
            const largeValue = "x".repeat(200000); // Exceeds 100KB limit

            expect(() => {
                setSharedMemoryValue(context, "key1", largeValue, "node1");
            }).toThrow(/value size.*exceeds limit/);
        });

        it("should detect value types correctly", () => {
            let context = createTestContext();
            context = setSharedMemoryValue(context, "str", "hello", "n");
            context = setSharedMemoryValue(context, "num", 42, "n");
            context = setSharedMemoryValue(context, "bool", true, "n");
            context = setSharedMemoryValue(context, "obj", { a: 1 }, "n");

            expect(getSharedMemoryEntry(context, "str")?.metadata.valueType).toBe("string");
            expect(getSharedMemoryEntry(context, "num")?.metadata.valueType).toBe("number");
            expect(getSharedMemoryEntry(context, "bool")?.metadata.valueType).toBe("boolean");
            expect(getSharedMemoryEntry(context, "obj")?.metadata.valueType).toBe("json");
        });
    });

    describe("deleteSharedMemoryValue", () => {
        it("should delete value", () => {
            let context = createTestContext();
            context = setSharedMemoryValue(context, "key1", "value1", "node1");
            context = deleteSharedMemoryValue(context, "key1");

            expect(getSharedMemoryValue(context, "key1")).toBeUndefined();
        });

        it("should update metadata counts", () => {
            let context = createTestContext();
            context = setSharedMemoryValue(context, "key1", "value1", "node1");

            const statsBefore = getSharedMemoryStats(context);
            expect(statsBefore.entryCount).toBe(1);

            context = deleteSharedMemoryValue(context, "key1");
            const statsAfter = getSharedMemoryStats(context);
            expect(statsAfter.entryCount).toBe(0);
        });

        it("should handle deleting non-existent key", () => {
            const context = createTestContext();
            // Should not throw - we just verify the function completes without error
            expect(() => deleteSharedMemoryValue(context, "nonexistent")).not.toThrow();
        });
    });

    describe("appendSharedMemoryValue", () => {
        it("should append to array", () => {
            let context = createTestContext();
            context = setSharedMemoryValue(context, "list", [1, 2], "n1");
            context = appendSharedMemoryValue(context, "list", 3, "n2");

            expect(getSharedMemoryValue(context, "list")).toEqual([1, 2, 3]);
        });

        it("should append to string", () => {
            let context = createTestContext();
            context = setSharedMemoryValue(context, "text", "Hello", "n1");
            context = appendSharedMemoryValue(context, "text", " World", "n2");

            expect(getSharedMemoryValue(context, "text")).toBe("Hello World");
        });

        it("should create new entry if key does not exist", () => {
            let context = createTestContext();
            context = appendSharedMemoryValue(context, "newKey", "value", "node1");

            expect(getSharedMemoryValue(context, "newKey")).toBe("value");
        });

        it("should throw for non-appendable types", () => {
            let context = createTestContext();
            context = setSharedMemoryValue(context, "num", 42, "n1");

            expect(() => {
                appendSharedMemoryValue(context, "num", 1, "n2");
            }).toThrow(/Cannot append/);
        });
    });

    describe("getSharedMemoryKeys", () => {
        it("should return all keys", () => {
            let context = createTestContext();
            context = setSharedMemoryValue(context, "a", 1, "n");
            context = setSharedMemoryValue(context, "b", 2, "n");
            context = setSharedMemoryValue(context, "c", 3, "n");

            const keys = getSharedMemoryKeys(context);
            expect(keys.sort()).toEqual(["a", "b", "c"]);
        });

        it("should return empty array for empty shared memory", () => {
            const context = createTestContext();
            expect(getSharedMemoryKeys(context)).toEqual([]);
        });
    });

    describe("searchSharedMemory", () => {
        it("should find similar entries by embedding", () => {
            let context = createTestContext();

            // Add entries with embeddings
            context = setSharedMemoryValue(context, "cat", "I have a cat", "n", [1, 0, 0]);
            context = setSharedMemoryValue(context, "dog", "I have a dog", "n", [0.9, 0.1, 0]);
            context = setSharedMemoryValue(context, "car", "I drive a car", "n", [0, 1, 0]);

            // Search with cat-like embedding
            const results = searchSharedMemory(context, [1, 0, 0], 2, 0.5);

            expect(results.length).toBe(2);
            expect(results[0].key).toBe("cat");
            expect(results[0].similarity).toBeCloseTo(1.0);
        });

        it("should respect similarity threshold", () => {
            let context = createTestContext();
            context = setSharedMemoryValue(context, "a", "a", "n", [1, 0, 0]);
            context = setSharedMemoryValue(context, "b", "b", "n", [0, 1, 0]);

            // Search with high threshold
            const results = searchSharedMemory(context, [1, 0, 0], 10, 0.99);

            expect(results.length).toBe(1);
            expect(results[0].key).toBe("a");
        });

        it("should skip entries without embeddings", () => {
            let context = createTestContext();
            context = setSharedMemoryValue(context, "with", "value", "n", [1, 0, 0]);
            context = setSharedMemoryValue(context, "without", "value", "n"); // No embedding

            const results = searchSharedMemory(context, [1, 0, 0], 10, 0);

            expect(results.length).toBe(1);
            expect(results[0].key).toBe("with");
        });
    });

    describe("serialization", () => {
        it("should serialize and deserialize shared memory state", () => {
            let context = createTestContext();
            context = setSharedMemoryValue(context, "key1", "value1", "node1", [0.1, 0.2]);
            context = setSharedMemoryValue(context, "key2", { nested: true }, "node2");

            const serialized = serializeSharedMemoryState(context.sharedMemory);
            const deserialized = deserializeSharedMemoryState(serialized);

            expect(deserialized.entries.get("key1")?.value).toBe("value1");
            expect(deserialized.entries.get("key1")?.embedding).toEqual([0.1, 0.2]);
            expect(deserialized.entries.get("key2")?.value).toEqual({ nested: true });
            expect(deserialized.config).toEqual(context.sharedMemory.config);
        });
    });
});

// ============================================================================
// VARIABLE RESOLUTION TESTS
// ============================================================================

describe("Variable Resolution", () => {
    describe("resolveVariable", () => {
        it("should resolve input variables", () => {
            const context = createContext({ message: "hello" });
            const result = resolveVariable(context, "{{message}}");

            expect(result?.value).toBe("hello");
            expect(result?.source).toBe("input");
        });

        it("should resolve nested input paths", () => {
            const context = createContext({ user: { profile: { name: "Alice" } } });
            const result = resolveVariable(context, "{{user.profile.name}}");

            expect(result?.value).toBe("Alice");
        });

        it("should resolve workflow variables", () => {
            let context = createContext({});
            context = setVariable(context, "count", 42);
            const result = resolveVariable(context, "{{count}}");

            expect(result?.value).toBe(42);
            expect(result?.source).toBe("workflowVariable");
        });

        it("should resolve node outputs", () => {
            let context = createContext({});
            context = storeNodeOutput(context, "llm1", { response: "Hello world" });
            const result = resolveVariable(context, "{{llm1.response}}");

            expect(result?.value).toBe("Hello world");
            expect(result?.source).toBe("nodeOutput");
        });

        it("should resolve shared memory values", () => {
            let context = createContext({});
            context = setSharedMemoryValue(context, "data", { key: "value" }, "node1");
            const result = resolveVariable(context, "{{shared.data.key}}");

            expect(result?.value).toBe("value");
            expect(result?.source).toBe("shared");
        });

        it("should resolve loop context", () => {
            const context = createContext({});
            const loopState: LoopIterationState = {
                index: 2,
                total: 5,
                item: "current item",
                results: []
            };

            expect(resolveVariable(context, "{{loop.index}}", loopState)?.value).toBe(2);
            expect(resolveVariable(context, "{{loop.iteration}}", loopState)?.value).toBe(3);
            expect(resolveVariable(context, "{{loop.item}}", loopState)?.value).toBe(
                "current item"
            );
            expect(resolveVariable(context, "{{loop.total}}", loopState)?.value).toBe(5);
        });

        it("should resolve parallel context", () => {
            const context = createContext({});
            const parallelState: ParallelBranchState = {
                index: 1,
                branchId: "branch-1",
                currentItem: { data: "test" }
            };

            expect(
                resolveVariable(context, "{{parallel.index}}", undefined, parallelState)?.value
            ).toBe(1);
            expect(
                resolveVariable(context, "{{parallel.branchId}}", undefined, parallelState)?.value
            ).toBe("branch-1");
            expect(
                resolveVariable(context, "{{parallel.currentItem}}", undefined, parallelState)
                    ?.value
            ).toEqual({ data: "test" });
        });

        it("should return null for missing variable", () => {
            const context = createContext({});
            const result = resolveVariable(context, "{{missing}}");
            expect(result).toBeNull();
        });
    });

    describe("interpolateString", () => {
        it("should interpolate multiple variables", () => {
            const context = createContext({ name: "Alice", age: 30 });
            const result = interpolateString(
                context,
                "Hello, {{name}}! You are {{age}} years old."
            );

            expect(result).toBe("Hello, Alice! You are 30 years old.");
        });

        it("should stringify objects", () => {
            let context = createContext({});
            context = setVariable(context, "data", { key: "value" });
            const result = interpolateString(context, "Data: {{data}}");

            expect(result).toBe('Data: {"key":"value"}');
        });

        it("should keep unresolved placeholders", () => {
            const context = createContext({ known: "value" });
            const result = interpolateString(context, "{{known}} and {{unknown}}");

            expect(result).toBe("value and {{unknown}}");
        });
    });

    describe("isVariableReference", () => {
        it("should return true for variable references", () => {
            expect(isVariableReference("{{variable}}")).toBe(true);
            expect(isVariableReference("Hello {{name}}!")).toBe(true);
            expect(isVariableReference("{{a}} and {{b}}")).toBe(true);
        });

        it("should return false for non-references", () => {
            expect(isVariableReference("plain text")).toBe(false);
            expect(isVariableReference("single { brace }")).toBe(false);
            expect(isVariableReference(123 as unknown as string)).toBe(false);
        });
    });

    describe("extractVariableNames", () => {
        it("should extract variable names from template", () => {
            const names = extractVariableNames("Hello {{name}}, your order {{orderId}} is ready");
            expect(names).toEqual(["name", "orderId"]);
        });

        it("should handle nested paths", () => {
            const names = extractVariableNames("{{user.profile.name}} - {{order.items[0].name}}");
            expect(names).toEqual(["user.profile.name", "order.items[0].name"]);
        });

        it("should return empty array for no variables", () => {
            expect(extractVariableNames("plain text")).toEqual([]);
        });
    });
});

// ============================================================================
// EXECUTION CONTEXT TESTS
// ============================================================================

describe("Execution Context", () => {
    describe("getExecutionContext", () => {
        it("should merge inputs, variables, and outputs", () => {
            let context = createContext({ input1: "value1" });
            context = setVariable(context, "var1", "value2");
            context = storeNodeOutput(context, "node1", { output1: "value3" });

            const execContext = getExecutionContext(context);

            expect(execContext.input1).toBe("value1");
            expect(execContext.var1).toBe("value2");
            expect(execContext.node1).toEqual({ output1: "value3" });
            expect(execContext.output1).toBe("value3"); // Flattened
        });
    });

    describe("buildFinalOutputs", () => {
        it("should collect outputs from output nodes", () => {
            let context = createContext({});
            context = storeNodeOutput(context, "output1", { result: "A" });
            context = storeNodeOutput(context, "output2", { result: "B" });
            context = storeNodeOutput(context, "other", { result: "C" });

            const outputs = buildFinalOutputs(context, ["output1", "output2"]);

            expect(outputs.result).toBe("B"); // Last one wins
        });

        it("should fall back to variables if no output nodes", () => {
            let context = createContext({});
            context = setVariable(context, "result", "from variables");

            const outputs = buildFinalOutputs(context, []);

            expect(outputs.result).toBe("from variables");
        });
    });

    describe("mergeContext", () => {
        it("should merge outputs and variables from another context", () => {
            let context1 = createContext({ input: "value" });
            context1 = setVariable(context1, "var1", "a");
            context1 = storeNodeOutput(context1, "node1", { out1: "x" });

            let context2 = createContext({});
            context2 = setVariable(context2, "var2", "b");
            context2 = storeNodeOutput(context2, "node2", { out2: "y" });

            const merged = mergeContext(context1, context2);

            expect(getVariable(merged, "var1")).toBe("a");
            expect(getVariable(merged, "var2")).toBe("b");
            expect(getNodeOutput(merged, "node1")).toEqual({ out1: "x" });
            expect(getNodeOutput(merged, "node2")).toEqual({ out2: "y" });
        });
    });
});

// ============================================================================
// EXECUTION QUEUE TESTS
// ============================================================================

describe("Execution Queue", () => {
    describe("initializeQueue", () => {
        it("should mark nodes without dependencies as ready", () => {
            const workflow = createTestWorkflow([
                { id: "start", deps: [] },
                { id: "middle", deps: ["start"] },
                { id: "end", deps: ["middle"] }
            ]);

            const state = initializeQueue(workflow);

            expect(state.ready.has("start")).toBe(true);
            expect(state.pending.has("middle")).toBe(true);
            expect(state.pending.has("end")).toBe(true);
        });

        it("should initialize all node states", () => {
            const workflow = createTestWorkflow([
                { id: "a", deps: [] },
                { id: "b", deps: ["a"] }
            ]);

            const state = initializeQueue(workflow);

            expect(state.nodeStates.get("a")?.status).toBe("ready");
            expect(state.nodeStates.get("b")?.status).toBe("pending");
        });
    });

    describe("getReadyNodes", () => {
        it("should return ready nodes up to max concurrent", () => {
            const workflow = createTestWorkflow([
                { id: "a", deps: [] },
                { id: "b", deps: [] },
                { id: "c", deps: [] }
            ]);

            const state = initializeQueue(workflow);
            const ready = getReadyNodes(state, 2);

            expect(ready.length).toBe(2);
        });

        it("should respect executing count", () => {
            const workflow = createTestWorkflow([
                { id: "a", deps: [] },
                { id: "b", deps: [] }
            ]);

            let state = initializeQueue(workflow);
            state = markExecuting(state, ["a"]);

            const ready = getReadyNodes(state, 2);
            expect(ready.length).toBe(1);
        });
    });

    describe("markExecuting", () => {
        it("should move nodes from ready to executing", () => {
            const workflow = createTestWorkflow([{ id: "a", deps: [] }]);
            let state = initializeQueue(workflow);

            state = markExecuting(state, ["a"]);

            expect(state.ready.has("a")).toBe(false);
            expect(state.executing.has("a")).toBe(true);
            expect(state.nodeStates.get("a")?.status).toBe("executing");
            expect(state.nodeStates.get("a")?.startedAt).toBeDefined();
        });
    });

    describe("markCompleted", () => {
        it("should move node from executing to completed", () => {
            const workflow = createTestWorkflow([{ id: "a", deps: [] }]);
            let state = initializeQueue(workflow);
            state = markExecuting(state, ["a"]);

            state = markCompleted(state, "a", { result: "done" }, workflow);

            expect(state.executing.has("a")).toBe(false);
            expect(state.completed.has("a")).toBe(true);
            expect(state.nodeStates.get("a")?.output).toEqual({ result: "done" });
        });

        it("should make dependents ready when all deps complete", () => {
            const workflow = createTestWorkflow([
                { id: "a", deps: [] },
                { id: "b", deps: ["a"] }
            ]);

            let state = initializeQueue(workflow);
            state = markExecuting(state, ["a"]);
            state = markCompleted(state, "a", {}, workflow);

            expect(state.ready.has("b")).toBe(true);
            expect(state.pending.has("b")).toBe(false);
        });
    });

    describe("markFailed", () => {
        it("should move node to failed state", () => {
            const workflow = createTestWorkflow([{ id: "a", deps: [] }]);
            let state = initializeQueue(workflow);
            state = markExecuting(state, ["a"]);

            state = markFailed(state, "a", "Error occurred", workflow);

            expect(state.failed.has("a")).toBe(true);
            expect(state.nodeStates.get("a")?.error).toBe("Error occurred");
        });

        it("should skip dependents when node fails", () => {
            const workflow = createTestWorkflow([
                { id: "a", deps: [] },
                { id: "b", deps: ["a"] }
            ]);

            let state = initializeQueue(workflow);
            state = markExecuting(state, ["a"]);
            state = markFailed(state, "a", "Error", workflow);

            expect(state.skipped.has("b")).toBe(true);
        });
    });

    describe("markSkipped", () => {
        it("should skip node and its dependents", () => {
            const workflow = createTestWorkflow([
                { id: "a", deps: [] },
                { id: "b", deps: ["a"] },
                { id: "c", deps: ["b"] }
            ]);

            let state = initializeQueue(workflow);
            state = markSkipped(state, "a", workflow);

            expect(state.skipped.has("a")).toBe(true);
            expect(state.skipped.has("b")).toBe(true);
            expect(state.skipped.has("c")).toBe(true);
        });
    });

    describe("markRetry", () => {
        it("should reset failed node to ready", () => {
            const workflow = createTestWorkflow([{ id: "a", deps: [] }]);
            let state = initializeQueue(workflow);
            state = markExecuting(state, ["a"]);
            state = markFailed(state, "a", "Error", workflow);

            state = markRetry(state, "a");

            expect(state.failed.has("a")).toBe(false);
            expect(state.ready.has("a")).toBe(true);
            expect(state.nodeStates.get("a")?.retryCount).toBe(1);
        });
    });

    describe("execution state queries", () => {
        it("should check if execution is complete", () => {
            const workflow = createTestWorkflow([{ id: "a", deps: [] }]);
            let state = initializeQueue(workflow);

            expect(isExecutionComplete(state)).toBe(false);

            state = markExecuting(state, ["a"]);
            expect(isExecutionComplete(state)).toBe(false);

            state = markCompleted(state, "a", {}, workflow);
            expect(isExecutionComplete(state)).toBe(true);
        });

        it("should check if can continue", () => {
            const workflow = createTestWorkflow([{ id: "a", deps: [] }]);
            let state = initializeQueue(workflow);

            expect(canContinue(state)).toBe(true);

            state = markExecuting(state, ["a"]);
            expect(canContinue(state)).toBe(true);

            state = markCompleted(state, "a", {}, workflow);
            expect(canContinue(state)).toBe(false);
        });

        it("should get execution summary", () => {
            const workflow = createTestWorkflow([
                { id: "a", deps: [] },
                { id: "b", deps: [] },
                { id: "c", deps: ["a"] }
            ]);

            let state = initializeQueue(workflow);
            state = markExecuting(state, ["a"]);
            state = markCompleted(state, "a", {}, workflow);

            const summary = getExecutionSummary(state);
            expect(summary.completed).toBe(1);
            expect(summary.ready).toBe(2); // b and c now ready
            expect(summary.total).toBe(3);
        });

        it("should calculate execution progress", () => {
            const workflow = createTestWorkflow([
                { id: "a", deps: [] },
                { id: "b", deps: [] }
            ]);

            let state = initializeQueue(workflow);
            expect(getExecutionProgress(state)).toBe(0);

            state = markExecuting(state, ["a"]);
            state = markCompleted(state, "a", {}, workflow);
            expect(getExecutionProgress(state)).toBe(50);

            state = markExecuting(state, ["b"]);
            state = markCompleted(state, "b", {}, workflow);
            expect(getExecutionProgress(state)).toBe(100);
        });

        it("should get nodes by status", () => {
            const workflow = createTestWorkflow([
                { id: "a", deps: [] },
                { id: "b", deps: [] },
                { id: "c", deps: ["a"] }
            ]);

            let state = initializeQueue(workflow);
            state = markExecuting(state, ["a"]);
            state = markCompleted(state, "a", {}, workflow);

            expect(getNodesByStatus(state, "completed")).toEqual(["a"]);
            expect(getNodesByStatus(state, "ready").sort()).toEqual(["b", "c"]);
        });
    });

    describe("resetNodeForIteration", () => {
        it("should reset completed node for next iteration", () => {
            const workflow = createTestWorkflow([{ id: "a", deps: [] }]);
            let state = initializeQueue(workflow);
            state = markExecuting(state, ["a"]);
            state = markCompleted(state, "a", { result: "old" }, workflow);

            state = resetNodeForIteration(state, "a");

            expect(state.completed.has("a")).toBe(false);
            expect(state.pending.has("a")).toBe(true);
            expect(state.nodeStates.get("a")?.output).toBeUndefined();
            expect(state.nodeStates.get("a")?.status).toBe("pending");
        });
    });
});
