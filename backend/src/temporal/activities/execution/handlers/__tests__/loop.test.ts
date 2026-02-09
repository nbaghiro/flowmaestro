/**
 * Loop Node Handler Unit Tests
 *
 * Tests loop preparation logic:
 * - forEach: Array iteration setup
 * - while: Condition validation
 * - count: N-iteration setup
 * - Variable interpolation
 * - Error handling
 *
 * Note: The loop handler's resolveArrayPath does single-key lookup from the
 * flattened context. When nodeOutputs has { data: { items: [...] } },
 * getExecutionContext flattens it to { data: {...}, items: [...] } so we
 * can access items directly.
 */

import {
    createHandlerInput,
    createTestContext,
    assertValidOutput,
    assertLoopMetadata
} from "../../../../../../__tests__/helpers/handler-test-utils";
import { LoopNodeHandler, createLoopNodeHandler } from "../logic/loop";

describe("LoopNodeHandler", () => {
    let handler: LoopNodeHandler;

    beforeEach(() => {
        handler = createLoopNodeHandler();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("LoopNodeHandler");
        });

        it("supports loop node types", () => {
            expect(handler.supportedNodeTypes).toContain("loop");
            expect(handler.supportedNodeTypes).toContain("forEach");
            expect(handler.supportedNodeTypes).toContain("while");
            expect(handler.supportedNodeTypes).toContain("repeat");
        });

        it("can handle loop type", () => {
            expect(handler.canHandle("loop")).toBe(true);
            expect(handler.canHandle("forEach")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("conditional")).toBe(false);
            expect(handler.canHandle("transform")).toBe(false);
        });
    });

    describe("forEach loop", () => {
        it("prepares loop with array from context (top-level key)", async () => {
            // Use top-level key since resolveArrayPath does single-key lookup
            const context = createTestContext({
                nodeOutputs: {
                    sourceNode: { items: [1, 2, 3, 4, 5] }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "forEach",
                    // After getExecutionContext, "items" is spread to top level
                    arrayPath: "items"
                },
                context
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.iterations).toBe(5);
            expect(output.result.items).toEqual([1, 2, 3, 4, 5]);
            expect(output.result.completed).toBe(true);
        });

        it("sets loop metadata with shouldContinue", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    source: { items: ["a", "b", "c"] }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "forEach",
                    arrayPath: "items"
                },
                context
            });

            const output = await handler.execute(input);

            assertLoopMetadata(output, {
                shouldContinue: true,
                currentIndex: 0,
                totalItems: 3
            });
        });

        it("handles empty array", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    source: { items: [] }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "forEach",
                    arrayPath: "items"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.iterations).toBe(0);
            assertLoopMetadata(output, {
                shouldContinue: false,
                totalItems: 0
            });
        });

        it("handles array of objects", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    source: {
                        users: [
                            { id: 1, name: "Alice" },
                            { id: 2, name: "Bob" }
                        ]
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "forEach",
                    arrayPath: "users"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.iterations).toBe(2);
            expect(output.result.items).toEqual([
                { id: 1, name: "Alice" },
                { id: 2, name: "Bob" }
            ]);
        });

        it("throws error when arrayPath is missing", async () => {
            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "forEach"
                    // Missing arrayPath
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("throws error when arrayPath does not resolve to array", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    source: { notAnArray: "string value" }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "forEach",
                    arrayPath: "notAnArray"
                },
                context
            });

            await expect(handler.execute(input)).rejects.toThrow(/did not resolve to an array/);
        });

        it("provides currentItem from first element", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    source: { items: ["first", "second", "third"] }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "forEach",
                    arrayPath: "items"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.signals.loopMetadata?.currentItem).toBe("first");
        });
    });

    describe("while loop", () => {
        it("prepares while loop with condition", async () => {
            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "while",
                    condition: "{{counter}} < 10",
                    maxIterations: 100
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            // While loop just validates and returns metadata
            // Actual iteration happens in orchestrator
            expect(output.result.completed).toBe(false);
        });

        it("throws error when condition is missing", async () => {
            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "while"
                    // Missing condition
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("respects maxIterations config", async () => {
            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "while",
                    condition: "true",
                    maxIterations: 50
                }
            });

            const output = await handler.execute(input);

            // The handler just prepares metadata, max iterations enforced by orchestrator
            assertValidOutput(output);
        });
    });

    describe("count loop", () => {
        it("prepares count loop with static count", async () => {
            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "count",
                    count: 10
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.iterations).toBe(10);
            expect(output.result.completed).toBe(true);
        });

        it("prepares count loop with zero count", async () => {
            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "count",
                    count: 0
                }
            });

            const output = await handler.execute(input);

            expect(output.result.iterations).toBe(0);
            assertLoopMetadata(output, {
                shouldContinue: false,
                totalItems: 0
            });
        });

        it("interpolates count from context", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    source: { repeatCount: 5 }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "count",
                    // Use mustache reference that getExecutionContext will resolve
                    count: "{{repeatCount}}"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.iterations).toBe(5);
        });

        it("throws error when count is missing", async () => {
            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "count"
                    // Missing count
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("throws error for negative count", async () => {
            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "count",
                    count: -5
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/Invalid count/);
        });

        it("throws error for NaN count", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    source: { repeatCount: "not a number" }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "count",
                    count: "{{repeatCount}}"
                },
                context
            });

            await expect(handler.execute(input)).rejects.toThrow(/Invalid count/);
        });
    });

    describe("unknown loop type", () => {
        it("throws error for unknown loop type", async () => {
            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "unknown"
                }
            });

            // Schema validation may catch this
            await expect(handler.execute(input)).rejects.toThrow();
        });
    });

    describe("repeat loop type", () => {
        it("handles repeat nodeType with count loopType", async () => {
            const input = createHandlerInput({
                nodeType: "repeat",
                nodeConfig: {
                    loopType: "count",
                    count: 5
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.iterations).toBe(5);
        });

        it("handles loop nodeType with count loopType", async () => {
            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "count",
                    count: 3
                }
            });

            const output = await handler.execute(input);

            expect(output.result.iterations).toBe(3);
        });
    });

    describe("breakCondition handling", () => {
        it("stores breakCondition in loop metadata", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    source: { items: [1, 2, 3, 4, 5] }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "forEach",
                    arrayPath: "items",
                    breakCondition: "{{currentItem}} > 3"
                },
                context
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            // Break condition stored for orchestrator to evaluate
            expect(output.signals.loopMetadata).toBeDefined();
        });

        it("sets up break trigger flag as false initially", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    source: { items: [1, 2, 3] }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "forEach",
                    arrayPath: "items",
                    breakCondition: "{{currentItem}} === 2"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.signals.loopMetadata?.wasBreakTriggered).toBe(false);
        });

        it("handles break condition for while loop", async () => {
            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "while",
                    condition: "{{counter}} < 10",
                    breakCondition: "{{errorOccurred}} === true",
                    maxIterations: 100
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.signals.loopMetadata?.wasBreakTriggered).toBe(false);
        });

        it("handles break condition for count loop", async () => {
            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "count",
                    count: 100,
                    breakCondition: "{{result.status}} === 'error'"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.signals.loopMetadata?.wasBreakTriggered).toBe(false);
        });
    });

    describe("maxIterations config", () => {
        // Note: maxIterations is used by the orchestrator during loop execution,
        // not directly exposed in loop metadata. These tests verify config acceptance.
        it("accepts maxIterations config for while loop", async () => {
            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "while",
                    condition: "true",
                    maxIterations: 100
                }
            });

            const output = await handler.execute(input);

            // While loop should execute and return metadata
            expect(output.signals.loopMetadata).toBeDefined();
            expect(output.signals.loopMetadata?.shouldContinue).toBeDefined();
        });

        it("executes while loop with default maxIterations", async () => {
            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "while",
                    condition: "{{counter}} < 10"
                    // maxIterations not specified - uses default
                }
            });

            const output = await handler.execute(input);

            // Should execute without error
            expect(output.signals.loopMetadata).toBeDefined();
        });

        it("executes count loop with high count", async () => {
            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "count",
                    count: 1000
                }
            });

            const output = await handler.execute(input);

            // Count loop prepares all iterations
            expect(output.result.iterations).toBe(1000);
            expect(output.signals.loopMetadata?.totalItems).toBe(1000);
        });

        it("accepts maxIterations config for forEach loop", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    source: { items: Array.from({ length: 10 }, (_, i) => i) }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "forEach",
                    arrayPath: "items",
                    maxIterations: 5
                },
                context
            });

            const output = await handler.execute(input);

            // Loop handler prepares loop metadata
            expect(output.signals.loopMetadata).toBeDefined();
            expect(output.signals.loopMetadata?.totalItems).toBe(10);
        });
    });

    describe("loop metadata signals", () => {
        it("includes accumulatedResults as empty array", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    source: { items: [1, 2, 3] }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "forEach",
                    arrayPath: "items"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.signals.loopMetadata?.accumulatedResults).toEqual([]);
        });

        it("sets wasBreakTriggered to false initially", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    source: { items: [1, 2, 3] }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "forEach",
                    arrayPath: "items"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.signals.loopMetadata?.wasBreakTriggered).toBe(false);
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    source: { items: [1, 2, 3] }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "forEach",
                    arrayPath: "items"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe("edge cases", () => {
        it("handles very large array", async () => {
            const largeArray = Array.from({ length: 1000 }, (_, i) => i);
            const context = createTestContext({
                nodeOutputs: {
                    source: { items: largeArray }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "forEach",
                    arrayPath: "items"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.iterations).toBe(1000);
        });

        it("handles nested arrays", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    source: {
                        matrix: [
                            [1, 2],
                            [3, 4],
                            [5, 6]
                        ]
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "forEach",
                    arrayPath: "matrix"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.iterations).toBe(3);
            expect(output.result.items).toEqual([
                [1, 2],
                [3, 4],
                [5, 6]
            ]);
        });

        it("handles array with null values", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    source: { items: [1, null, 3, null, 5] }
                }
            });

            const input = createHandlerInput({
                nodeType: "loop",
                nodeConfig: {
                    loopType: "forEach",
                    arrayPath: "items"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.iterations).toBe(5);
            expect(output.result.items).toEqual([1, null, 3, null, 5]);
        });
    });
});
