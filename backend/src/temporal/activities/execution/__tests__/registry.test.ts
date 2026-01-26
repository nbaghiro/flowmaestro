/**
 * Handler Registry Tests
 *
 * Comprehensive tests for the node handler registry system.
 * Tests registration, lookup, caching, and execution.
 */

import {
    registerHandler,
    registerHandlerFactory,
    findHandler,
    getHandler,
    hasHandler,
    getAllHandlers,
    getHandlersByCategory,
    getSupportedNodeTypes,
    clearHandlers,
    unregisterHandler,
    executeWithRegistry,
    getRegistryStats
} from "../registry";
import type { NodeHandler, NodeHandlerInput, NodeHandlerOutput } from "../types";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockHandler(
    name: string,
    supportedTypes: string[],
    executeResult?: Partial<NodeHandlerOutput>
): NodeHandler {
    return {
        name,
        supportedNodeTypes: supportedTypes,
        canHandle: (nodeType: string) => supportedTypes.includes(nodeType),
        execute: jest.fn().mockResolvedValue({
            result: { handlerName: name },
            signals: {},
            ...executeResult
        })
    };
}

function createMockInput(nodeType: string): NodeHandlerInput {
    return {
        nodeType,
        nodeConfig: {},
        context: {
            nodeOutputs: new Map(),
            workflowVariables: new Map(),
            sharedMemory: {
                entries: new Map(),
                config: {
                    maxEntries: 100,
                    maxValueSizeBytes: 100000,
                    maxTotalSizeBytes: 1000000,
                    embeddingModel: "text-embedding-3-small",
                    embeddingDimensions: 1536,
                    enableSemanticSearch: false
                },
                metadata: { totalSizeBytes: 0, entryCount: 0, createdAt: Date.now() }
            },
            inputs: {},
            metadata: {
                totalSizeBytes: 0,
                nodeCount: 0,
                createdAt: Date.now()
            }
        },
        metadata: {
            executionId: "test-exec",
            nodeId: "test-node"
        }
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Handler Registry", () => {
    beforeEach(() => {
        clearHandlers();
    });

    describe("registerHandler", () => {
        it("should register a handler", () => {
            const handler = createMockHandler("TestHandler", ["test"]);
            registerHandler(handler, "logic");

            const found = findHandler("test");
            expect(found).toBe(handler);
        });

        it("should register multiple handlers", () => {
            const handler1 = createMockHandler("Handler1", ["type1"]);
            const handler2 = createMockHandler("Handler2", ["type2"]);

            registerHandler(handler1, "logic");
            registerHandler(handler2, "ai");

            expect(findHandler("type1")).toBe(handler1);
            expect(findHandler("type2")).toBe(handler2);
        });

        it("should sort handlers by priority", () => {
            const lowPriority = createMockHandler("LowPriority", ["shared"]);
            const highPriority = createMockHandler("HighPriority", ["shared"]);

            // Register low priority first
            registerHandler(lowPriority, "logic", 100);
            registerHandler(highPriority, "logic", 10);

            // High priority should be found first
            const found = findHandler("shared");
            expect(found).toBe(highPriority);
        });

        it("should use default priority of 100", () => {
            const handler1 = createMockHandler("Handler1", ["type"]);
            const handler2 = createMockHandler("Handler2", ["type"]);

            registerHandler(handler1, "logic"); // Default 100
            registerHandler(handler2, "logic", 50); // Lower = higher priority

            const found = findHandler("type");
            expect(found).toBe(handler2);
        });

        it("should clear cache when registering", () => {
            const handler1 = createMockHandler("Handler1", ["type"]);
            registerHandler(handler1, "logic", 100);

            // Populate cache
            findHandler("type");

            // Register higher priority handler
            const handler2 = createMockHandler("Handler2", ["type"]);
            registerHandler(handler2, "logic", 10);

            // Should find new handler (cache cleared)
            expect(findHandler("type")).toBe(handler2);
        });
    });

    describe("registerHandlerFactory", () => {
        it("should lazily create handler", () => {
            const factoryFn = jest.fn().mockReturnValue(createMockHandler("LazyHandler", ["lazy"]));

            registerHandlerFactory(factoryFn, "logic");

            // Factory not called yet
            expect(factoryFn).not.toHaveBeenCalled();

            // Now find the handler
            const found = findHandler("lazy");
            expect(found).toBeDefined();
            expect(factoryFn).toHaveBeenCalledTimes(1);
        });

        it("should only create handler once", () => {
            const factoryFn = jest.fn().mockReturnValue(createMockHandler("LazyHandler", ["lazy"]));

            registerHandlerFactory(factoryFn, "logic");

            // Multiple lookups
            findHandler("lazy");
            findHandler("lazy");
            findHandler("lazy");

            // Factory called only once
            expect(factoryFn).toHaveBeenCalledTimes(1);
        });

        it("should expose handler properties lazily", () => {
            const innerHandler = createMockHandler("Inner", ["type1", "type2"]);
            const factoryFn = jest.fn().mockReturnValue(innerHandler);

            registerHandlerFactory(factoryFn, "logic");
            const handlers = getAllHandlers();

            // Accessing name should trigger factory
            expect(factoryFn).not.toHaveBeenCalled();
            expect(handlers[0].handler.name).toBe("Inner");
            expect(factoryFn).toHaveBeenCalledTimes(1);
        });
    });

    describe("findHandler", () => {
        it("should find handler by node type", () => {
            const handler = createMockHandler("TestHandler", ["myType"]);
            registerHandler(handler, "logic");

            expect(findHandler("myType")).toBe(handler);
        });

        it("should return null for unknown node type", () => {
            const handler = createMockHandler("TestHandler", ["knownType"]);
            registerHandler(handler, "logic");

            expect(findHandler("unknownType")).toBeNull();
        });

        it("should use first matching handler (priority order)", () => {
            const genericHandler = createMockHandler("Generic", ["type"]);
            const specificHandler = createMockHandler("Specific", ["type"]);

            registerHandler(genericHandler, "generic", 999);
            registerHandler(specificHandler, "ai", 10);

            expect(findHandler("type")).toBe(specificHandler);
        });

        it("should cache handler lookups", () => {
            const handler = createMockHandler("TestHandler", ["cached"]);
            registerHandler(handler, "logic");

            // First lookup
            const result1 = findHandler("cached");
            // Second lookup (from cache)
            const result2 = findHandler("cached");

            expect(result1).toBe(result2);
            expect(result1).toBe(handler);
        });

        it("should cache null results for unknown types", () => {
            registerHandler(createMockHandler("Handler", ["known"]), "logic");

            // First lookup returns null
            expect(findHandler("unknown")).toBeNull();
            // Second lookup also returns null (from cache)
            expect(findHandler("unknown")).toBeNull();
        });
    });

    describe("getHandler", () => {
        it("should return handler for known type", () => {
            const handler = createMockHandler("TestHandler", ["knownType"]);
            registerHandler(handler, "logic");

            expect(getHandler("knownType")).toBe(handler);
        });

        it("should throw for unknown type", () => {
            registerHandler(createMockHandler("Handler", ["other"]), "logic");

            expect(() => getHandler("unknownType")).toThrow(
                "No handler registered for node type: unknownType"
            );
        });
    });

    describe("hasHandler", () => {
        it("should return true for registered type", () => {
            registerHandler(createMockHandler("Handler", ["myType"]), "logic");
            expect(hasHandler("myType")).toBe(true);
        });

        it("should return false for unregistered type", () => {
            registerHandler(createMockHandler("Handler", ["other"]), "logic");
            expect(hasHandler("unknown")).toBe(false);
        });
    });

    describe("getAllHandlers", () => {
        it("should return all registered handlers", () => {
            registerHandler(createMockHandler("H1", ["t1"]), "logic", 10);
            registerHandler(createMockHandler("H2", ["t2"]), "ai", 20);
            registerHandler(createMockHandler("H3", ["t3"]), "utils", 30);

            const handlers = getAllHandlers();
            expect(handlers).toHaveLength(3);
        });

        it("should return handlers in priority order", () => {
            registerHandler(createMockHandler("Low", ["t"]), "logic", 100);
            registerHandler(createMockHandler("High", ["t"]), "ai", 10);
            registerHandler(createMockHandler("Mid", ["t"]), "utils", 50);

            const handlers = getAllHandlers();
            expect(handlers[0].handler.name).toBe("High");
            expect(handlers[1].handler.name).toBe("Mid");
            expect(handlers[2].handler.name).toBe("Low");
        });

        it("should return copy of array (not the internal one)", () => {
            registerHandler(createMockHandler("H1", ["t1"]), "logic");
            const handlers1 = getAllHandlers();
            const handlers2 = getAllHandlers();
            expect(handlers1).not.toBe(handlers2);
        });
    });

    describe("getHandlersByCategory", () => {
        it("should return handlers for specific category", () => {
            registerHandler(createMockHandler("AI1", ["llm"]), "ai");
            registerHandler(createMockHandler("AI2", ["vision"]), "ai");
            registerHandler(createMockHandler("Logic1", ["conditional"]), "logic");

            const aiHandlers = getHandlersByCategory("ai");
            expect(aiHandlers).toHaveLength(2);
            expect(aiHandlers.map((h) => h.name).sort()).toEqual(["AI1", "AI2"]);
        });

        it("should return empty array for category with no handlers", () => {
            registerHandler(createMockHandler("Handler", ["type"]), "logic");
            expect(getHandlersByCategory("integrations")).toEqual([]);
        });
    });

    describe("getSupportedNodeTypes", () => {
        it("should return all supported types", () => {
            registerHandler(createMockHandler("H1", ["type1", "type2"]), "logic");
            registerHandler(createMockHandler("H2", ["type3"]), "ai");

            const types = getSupportedNodeTypes();
            expect(types).toEqual(new Set(["type1", "type2", "type3"]));
        });

        it("should deduplicate types from multiple handlers", () => {
            registerHandler(createMockHandler("H1", ["shared", "type1"]), "logic");
            registerHandler(createMockHandler("H2", ["shared", "type2"]), "ai");

            const types = getSupportedNodeTypes();
            expect(types.size).toBe(3);
            expect(types.has("shared")).toBe(true);
        });

        it("should return empty set when no handlers", () => {
            expect(getSupportedNodeTypes().size).toBe(0);
        });
    });

    describe("clearHandlers", () => {
        it("should remove all handlers", () => {
            registerHandler(createMockHandler("H1", ["t1"]), "logic");
            registerHandler(createMockHandler("H2", ["t2"]), "ai");

            clearHandlers();

            expect(getAllHandlers()).toHaveLength(0);
            expect(findHandler("t1")).toBeNull();
        });

        it("should clear cache", () => {
            registerHandler(createMockHandler("Handler", ["type"]), "logic");
            findHandler("type"); // Populate cache

            clearHandlers();
            registerHandler(createMockHandler("NewHandler", ["type"]), "ai");

            expect(findHandler("type")?.name).toBe("NewHandler");
        });
    });

    describe("unregisterHandler", () => {
        it("should remove specific handler", () => {
            registerHandler(createMockHandler("ToRemove", ["type1"]), "logic");
            registerHandler(createMockHandler("ToKeep", ["type2"]), "ai");

            const removed = unregisterHandler("ToRemove");

            expect(removed).toBe(true);
            expect(findHandler("type1")).toBeNull();
            expect(findHandler("type2")?.name).toBe("ToKeep");
        });

        it("should return false for non-existent handler", () => {
            registerHandler(createMockHandler("Handler", ["type"]), "logic");
            expect(unregisterHandler("NonExistent")).toBe(false);
        });

        it("should clear cache after removal", () => {
            registerHandler(createMockHandler("ToRemove", ["shared"]), "logic", 10);
            registerHandler(createMockHandler("Fallback", ["shared"]), "generic", 100);

            findHandler("shared"); // Cache ToRemove
            unregisterHandler("ToRemove");

            expect(findHandler("shared")?.name).toBe("Fallback");
        });
    });

    describe("executeWithRegistry", () => {
        it("should execute handler for node type", async () => {
            const handler = createMockHandler("TestHandler", ["executable"]);
            registerHandler(handler, "logic");

            const input = createMockInput("executable");
            const result = await executeWithRegistry(input);

            expect(handler.execute).toHaveBeenCalledWith(input);
            expect(result.result).toEqual({ handlerName: "TestHandler" });
        });

        it("should throw for unknown node type", async () => {
            registerHandler(createMockHandler("Handler", ["known"]), "logic");

            const input = createMockInput("unknown");

            await expect(executeWithRegistry(input)).rejects.toThrow(
                "No handler registered for node type: unknown"
            );
        });

        it("should pass signals through", async () => {
            const handler = createMockHandler("SignalHandler", ["signal"], {
                signals: { pause: true, selectedRoute: "branch1" }
            });
            registerHandler(handler, "logic");

            const input = createMockInput("signal");
            const result = await executeWithRegistry(input);

            expect(result.signals.pause).toBe(true);
            expect(result.signals.selectedRoute).toBe("branch1");
        });
    });

    describe("getRegistryStats", () => {
        it("should return correct handler count", () => {
            registerHandler(createMockHandler("H1", ["t1"]), "logic");
            registerHandler(createMockHandler("H2", ["t2"]), "ai");
            registerHandler(createMockHandler("H3", ["t3"]), "ai");

            const stats = getRegistryStats();
            expect(stats.handlerCount).toBe(3);
        });

        it("should return correct category counts", () => {
            registerHandler(createMockHandler("H1", ["t1"]), "logic");
            registerHandler(createMockHandler("H2", ["t2"]), "ai");
            registerHandler(createMockHandler("H3", ["t3"]), "ai");
            registerHandler(createMockHandler("H4", ["t4"]), "utils");

            const stats = getRegistryStats();
            expect(stats.categoryCounts.logic).toBe(1);
            expect(stats.categoryCounts.ai).toBe(2);
            expect(stats.categoryCounts.utils).toBe(1);
            expect(stats.categoryCounts.outputs).toBe(0);
        });

        it("should return correct supported type count", () => {
            registerHandler(createMockHandler("H1", ["t1", "t2"]), "logic");
            registerHandler(createMockHandler("H2", ["t3"]), "ai");

            const stats = getRegistryStats();
            expect(stats.supportedTypeCount).toBe(3);
        });

        it("should return cache size", () => {
            registerHandler(createMockHandler("Handler", ["type1", "type2"]), "logic");

            // Initially cache is empty
            expect(getRegistryStats().cacheSize).toBe(0);

            // Lookup populates cache
            findHandler("type1");
            findHandler("type2");
            findHandler("unknown");

            expect(getRegistryStats().cacheSize).toBe(3);
        });

        it("should return all zeros when empty", () => {
            const stats = getRegistryStats();
            expect(stats.handlerCount).toBe(0);
            expect(stats.supportedTypeCount).toBe(0);
            expect(stats.cacheSize).toBe(0);
            expect(Object.values(stats.categoryCounts).every((c) => c === 0)).toBe(true);
        });
    });

    describe("handler canHandle customization", () => {
        it("should support custom canHandle logic", () => {
            const handler: NodeHandler = {
                name: "PatternHandler",
                supportedNodeTypes: [],
                canHandle: (nodeType) => nodeType.startsWith("custom_"),
                execute: jest.fn().mockResolvedValue({ result: {}, signals: {} })
            };

            registerHandler(handler, "generic");

            expect(findHandler("custom_foo")).toBe(handler);
            expect(findHandler("custom_bar")).toBe(handler);
            expect(findHandler("other")).toBeNull();
        });
    });
});
