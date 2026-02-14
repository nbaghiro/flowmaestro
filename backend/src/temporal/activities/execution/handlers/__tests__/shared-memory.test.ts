/**
 * Shared Memory Node Handler Unit Tests
 *
 * Tests shared memory operations:
 * - store: Save a value with a key, optionally indexed for semantic search
 * - search: Find relevant values by meaning/query
 *
 * Values can also be accessed directly via {{shared.keyName}} interpolation.
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    createHandlerInput,
    createTestContext,
    CommonConfigs,
    mustacheRef
} from "../../../../../../__tests__/helpers/handler-test-utils";
import { SharedMemoryNodeHandler, createSharedMemoryNodeHandler } from "../logic/shared-memory";

describe("SharedMemoryNodeHandler", () => {
    let handler: SharedMemoryNodeHandler;

    beforeEach(() => {
        handler = createSharedMemoryNodeHandler();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("SharedMemoryNodeHandler");
        });

        it("supports shared-memory node type", () => {
            expect(handler.supportedNodeTypes).toContain("shared-memory");
        });

        it("can handle shared-memory type", () => {
            expect(handler.canHandle("shared-memory")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("transform")).toBe(false);
            expect(handler.canHandle("code")).toBe(false);
            expect(handler.canHandle("variable")).toBe(false);
        });
    });

    describe("store operation", () => {
        it("stores a string value", async () => {
            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: CommonConfigs.sharedMemory.store("myKey", "hello world")
            });

            const output = await handler.execute(input);

            expect(output.result.stored).toBe(true);
            expect(output.result.key).toBe("myKey");
            expect(output.result._sharedMemoryUpdates).toBeDefined();

            // Check the value was stored in _sharedMemoryUpdates
            const updates = output.result._sharedMemoryUpdates as JsonObject;
            const entries = updates.entries as Array<{ key: string; value: string }>;
            const entry = entries.find((e) => e.key === "myKey");
            expect(entry?.value).toBe("hello world");
        });

        it("stores a numeric value as string", async () => {
            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: CommonConfigs.sharedMemory.store("count", "42")
            });

            const output = await handler.execute(input);

            expect(output.result.stored).toBe(true);
            expect(output.result.key).toBe("count");
        });

        it("stores value with interpolated content", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    data: { name: "John", score: 95 }
                }
            });

            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "store",
                    key: "userName",
                    value: mustacheRef("data", "name"),
                    enableSemanticSearch: false
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.stored).toBe(true);
            expect(output.result.key).toBe("userName");

            // Check interpolated value was stored
            const updates = output.result._sharedMemoryUpdates as JsonObject;
            const entries = updates.entries as Array<{ key: string; value: string }>;
            const entry = entries.find((e) => e.key === "userName");
            expect(entry?.value).toBe("John");
        });

        it("stores value from workflow input", async () => {
            const context = createTestContext({
                inputs: { inputValue: "from input" }
            });

            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "store",
                    key: "storedInput",
                    value: mustacheRef("inputValue"),
                    enableSemanticSearch: false
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.stored).toBe(true);
            expect(output.result.key).toBe("storedInput");

            // Check interpolated value was stored
            const updates = output.result._sharedMemoryUpdates as JsonObject;
            const entries = updates.entries as Array<{ key: string; value: string }>;
            const entry = entries.find((e) => e.key === "storedInput");
            expect(entry?.value).toBe("from input");
        });

        it("stores with semantic search disabled", async () => {
            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: CommonConfigs.sharedMemory.store("noSearchKey", "short", false)
            });

            const output = await handler.execute(input);

            expect(output.result.stored).toBe(true);
            expect(output.result.searchable).toBe(false);
        });

        it("throws error when key is missing", async () => {
            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "store",
                    value: "test"
                    // key is missing
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/key/i);
        });
    });

    describe("search operation", () => {
        // Note: Search requires an embedding generator which is injected by the orchestrator.
        // Without it, search throws an error.

        it("throws error when embedding generator not available", async () => {
            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: CommonConfigs.sharedMemory.search("animal stories")
            });

            await expect(handler.execute(input)).rejects.toThrow(/embedding/i);
        });

        it("throws error when searchQuery is missing", async () => {
            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "search"
                    // searchQuery is missing
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/searchQuery/i);
        });

        it("searches with embedding generator", async () => {
            // Create handler with mock embedding generator
            const handlerWithEmbeddings = createSharedMemoryNodeHandler();
            handlerWithEmbeddings.setEmbeddingGenerator(async () => [0.1, 0.2, 0.3]);

            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: CommonConfigs.sharedMemory.search("test query")
            });

            const output = await handlerWithEmbeddings.execute(input);

            expect(output.result.query).toBe("test query");
            expect(output.result.results).toBeDefined();
            expect(output.result.resultCount).toBeDefined();
        });
    });

    describe("metrics", () => {
        it("records execution duration for store", async () => {
            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: CommonConfigs.sharedMemory.store("testKey", "value")
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("records execution duration for search (with embedding)", async () => {
            const handlerWithEmbeddings = createSharedMemoryNodeHandler();
            handlerWithEmbeddings.setEmbeddingGenerator(async () => [0.1, 0.2, 0.3]);

            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: CommonConfigs.sharedMemory.search("test query")
            });

            const output = await handlerWithEmbeddings.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe("edge cases", () => {
        it("handles empty string value", async () => {
            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: CommonConfigs.sharedMemory.store("emptyKey", "")
            });

            const output = await handler.execute(input);

            expect(output.result.stored).toBe(true);

            const updates = output.result._sharedMemoryUpdates as JsonObject;
            const entries = updates.entries as Array<{ key: string; value: string }>;
            const entry = entries.find((e) => e.key === "emptyKey");
            expect(entry?.value).toBe("");
        });

        it("handles very long key name", async () => {
            const longKey = "a".repeat(100);
            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "store",
                    key: longKey,
                    value: "test value"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.stored).toBe(true);
            expect(output.result.key).toBe(longKey);
        });

        it("handles special characters in key name", async () => {
            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "store",
                    key: "my_key_123",
                    value: "test value"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.stored).toBe(true);
            expect(output.result.key).toBe("my_key_123");
        });

        it("handles JSON string value", async () => {
            const jsonValue = '{"name": "test", "count": 42}';
            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "store",
                    key: "jsonKey",
                    value: jsonValue
                }
            });

            const output = await handler.execute(input);

            expect(output.result.stored).toBe(true);

            const updates = output.result._sharedMemoryUpdates as JsonObject;
            const entries = updates.entries as Array<{ key: string; value: string }>;
            const entry = entries.find((e) => e.key === "jsonKey");
            expect(entry?.value).toBe(jsonValue);
        });
    });

    describe("value updates", () => {
        it("overwrites existing value with store", async () => {
            const context = createTestContext({
                sharedMemory: { counter: "5" }
            });

            // Store a new value for the same key
            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: CommonConfigs.sharedMemory.store("counter", "10"),
                context
            });

            const output = await handler.execute(input);

            expect(output.result.stored).toBe(true);
            expect(output.result.key).toBe("counter");

            // The new value should be in the updates
            const updates = output.result._sharedMemoryUpdates as JsonObject;
            const entries = updates.entries as Array<{ key: string; value: string }>;
            const entry = entries.find((e) => e.key === "counter");
            expect(entry?.value).toBe("10");
        });
    });

    describe("concurrent store operations", () => {
        it("handles multiple concurrent stores to different keys", async () => {
            const inputs = Array.from({ length: 10 }, (_, i) =>
                createHandlerInput({
                    nodeType: "shared-memory",
                    nodeConfig: {
                        operation: "store",
                        key: `key_${i}`,
                        value: `value_${i}`,
                        enableSemanticSearch: false
                    }
                })
            );

            const outputs = await Promise.all(inputs.map((input) => handler.execute(input)));

            expect(outputs).toHaveLength(10);
            outputs.forEach((output, i) => {
                expect(output.result.stored).toBe(true);
                expect(output.result.key).toBe(`key_${i}`);
            });
        });

        it("handles concurrent stores with interpolated values", async () => {
            const inputs = Array.from({ length: 5 }, (_, i) => {
                const context = createTestContext({
                    nodeOutputs: {
                        data: { value: `interpolated_${i}` }
                    }
                });

                return createHandlerInput({
                    nodeType: "shared-memory",
                    nodeConfig: {
                        operation: "store",
                        key: `interpolated_key_${i}`,
                        value: mustacheRef("data", "value"),
                        enableSemanticSearch: false
                    },
                    context
                });
            });

            const outputs = await Promise.all(inputs.map((input) => handler.execute(input)));

            expect(outputs).toHaveLength(5);
            outputs.forEach((output, i) => {
                expect(output.result.stored).toBe(true);
                const updates = output.result._sharedMemoryUpdates as JsonObject;
                const entries = updates.entries as Array<{ key: string; value: string }>;
                const entry = entries.find((e) => e.key === `interpolated_key_${i}`);
                expect(entry?.value).toBe(`interpolated_${i}`);
            });
        });
    });

    describe("search with embedding generator", () => {
        it("returns empty results when no matching entries exist", async () => {
            const handlerWithEmbeddings = createSharedMemoryNodeHandler();
            handlerWithEmbeddings.setEmbeddingGenerator(async () => [0.1, 0.2, 0.3]);

            const context = createTestContext({
                sharedMemory: {} // No entries
            });

            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "search",
                    searchQuery: "anything"
                },
                context
            });

            const output = await handlerWithEmbeddings.execute(input);

            expect(output.result.results).toBeDefined();
            expect(output.result.resultCount).toBe(0);
        });

        it("handles search with topK parameter", async () => {
            const handlerWithEmbeddings = createSharedMemoryNodeHandler();
            handlerWithEmbeddings.setEmbeddingGenerator(async () => [0.5, 0.5, 0.5]);

            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "search",
                    searchQuery: "test query",
                    topK: 5
                }
            });

            const output = await handlerWithEmbeddings.execute(input);

            expect(output.result.query).toBe("test query");
            expect(output.result.results).toBeDefined();
        });

        it("handles search with special characters in query", async () => {
            const handlerWithEmbeddings = createSharedMemoryNodeHandler();
            handlerWithEmbeddings.setEmbeddingGenerator(async () => [0.1, 0.2, 0.3]);

            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "search",
                    searchQuery: "test with émojis 🎉 and 日本語"
                }
            });

            const output = await handlerWithEmbeddings.execute(input);

            expect(output.result.query).toBe("test with émojis 🎉 and 日本語");
        });
    });

    describe("memory and large values", () => {
        it("handles very large string values", async () => {
            // Use 50KB string (well under 100KB limit to account for overhead)
            const largeValue = "x".repeat(50000);

            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "store",
                    key: "largeKey",
                    value: largeValue,
                    enableSemanticSearch: false
                }
            });

            const output = await handler.execute(input);

            expect(output.result.stored).toBe(true);

            const updates = output.result._sharedMemoryUpdates as JsonObject;
            const entries = updates.entries as Array<{ key: string; value: string }>;
            const entry = entries.find((e) => e.key === "largeKey");
            expect(entry?.value).toHaveLength(50000);
        });

        it("handles storing complex JSON as string", async () => {
            const complexJson = JSON.stringify({
                users: Array.from({ length: 100 }, (_, i) => ({
                    id: i,
                    name: `User ${i}`,
                    metadata: { createdAt: new Date().toISOString(), tags: ["a", "b", "c"] }
                }))
            });

            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "store",
                    key: "complexData",
                    value: complexJson,
                    enableSemanticSearch: false
                }
            });

            const output = await handler.execute(input);

            expect(output.result.stored).toBe(true);

            const updates = output.result._sharedMemoryUpdates as JsonObject;
            const entries = updates.entries as Array<{ key: string; value: string }>;
            const entry = entries.find((e) => e.key === "complexData");
            expect(JSON.parse(entry?.value || "{}").users).toHaveLength(100);
        });

        it("handles unicode and multi-byte characters in values", async () => {
            const unicodeValue = "Hello 你好 مرحبا שלום 🌍🌎🌏";

            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "store",
                    key: "unicodeKey",
                    value: unicodeValue,
                    enableSemanticSearch: false
                }
            });

            const output = await handler.execute(input);

            expect(output.result.stored).toBe(true);

            const updates = output.result._sharedMemoryUpdates as JsonObject;
            const entries = updates.entries as Array<{ key: string; value: string }>;
            const entry = entries.find((e) => e.key === "unicodeKey");
            expect(entry?.value).toBe(unicodeValue);
        });
    });

    describe("embedding generator edge cases", () => {
        it("handles embedding generator returning empty array", async () => {
            const handlerWithEmbeddings = createSharedMemoryNodeHandler();
            handlerWithEmbeddings.setEmbeddingGenerator(async () => []);

            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "search",
                    searchQuery: "test"
                }
            });

            const output = await handlerWithEmbeddings.execute(input);

            // Should handle empty embeddings gracefully
            expect(output.result.query).toBe("test");
        });

        it("handles embedding generator returning high-dimensional vectors", async () => {
            const handlerWithEmbeddings = createSharedMemoryNodeHandler();
            // Simulate OpenAI ada-002 embedding (1536 dimensions)
            handlerWithEmbeddings.setEmbeddingGenerator(async () =>
                Array.from({ length: 1536 }, () => Math.random())
            );

            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "search",
                    searchQuery: "high dimensional search"
                }
            });

            const output = await handlerWithEmbeddings.execute(input);

            expect(output.result.query).toBe("high dimensional search");
            expect(output.result.results).toBeDefined();
        });
    });

    describe("config validation", () => {
        it("throws error for invalid operation", async () => {
            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "invalid" as string,
                    key: "test"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("stores empty string when value is missing", async () => {
            const input = createHandlerInput({
                nodeType: "shared-memory",
                nodeConfig: {
                    operation: "store",
                    key: "testKey"
                    // value is missing - handler treats as empty string
                }
            });

            const output = await handler.execute(input);

            expect(output.result.stored).toBe(true);
            const updates = output.result._sharedMemoryUpdates as JsonObject;
            const entries = updates.entries as Array<{ key: string; value: string }>;
            const entry = entries.find((e) => e.key === "testKey");
            expect(entry?.value).toBe("");
        });
    });
});
