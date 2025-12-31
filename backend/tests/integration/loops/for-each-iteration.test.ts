/**
 * ForEach Iteration Integration Tests
 *
 * Tests for forEach loop patterns:
 * - Iterating over arrays of strings and objects
 * - Access to {{loop.item}}, {{loop.index}}, {{loop.total}}
 * - Result accumulation with {{loop.results}}
 * - Empty array handling
 * - Single item arrays
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import {
    createContext,
    storeNodeOutput,
    setVariable,
    getVariable
} from "../../../src/temporal/core/services/context";
import { createLoopStateWithResults } from "../../fixtures/contexts";
import type { ContextSnapshot } from "../../../src/temporal/core/types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simulate forEach loop execution
 */
async function simulateForEachExecution<T extends JsonValue>(
    items: T[],
    processItem: (
        item: T,
        index: number,
        context: ContextSnapshot
    ) => { output: JsonObject; context: ContextSnapshot }
): Promise<{
    context: ContextSnapshot;
    results: JsonObject[];
    iterationCount: number;
}> {
    let context = createContext({ items: items as JsonValue[] });
    const results: JsonObject[] = [];
    let iterationCount = 0;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const loopState = createLoopStateWithResults(i, items.length, item, [
            ...results
        ] as JsonValue[]);

        // Store loop state for the iteration
        context = setVariable(context, "loop", {
            index: loopState.index,
            item: loopState.item ?? null,
            total: loopState.total ?? 0,
            results: loopState.results,
            isFirst: loopState.isFirst,
            isLast: loopState.isLast
        });

        // Process the item
        const { output, context: newContext } = processItem(item, i, context);
        context = newContext;

        // Store iteration output
        context = storeNodeOutput(context, `LoopBody_${i}`, output);
        results.push(output);
        iterationCount++;
    }

    // Store final results
    context = setVariable(context, "loopResults", results as JsonValue[]);

    return { context, results, iterationCount };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("ForEach Iteration", () => {
    describe("iterating over strings", () => {
        it("should iterate over an array of strings", async () => {
            const items = ["apple", "banana", "cherry"];

            const { results, iterationCount } = await simulateForEachExecution(
                items,
                (item, index, context) => ({
                    output: { processed: `processed-${item}`, index },
                    context
                })
            );

            expect(iterationCount).toBe(3);
            expect(results[0]).toEqual({ processed: "processed-apple", index: 0 });
            expect(results[1]).toEqual({ processed: "processed-banana", index: 1 });
            expect(results[2]).toEqual({ processed: "processed-cherry", index: 2 });
        });

        it("should transform each string item", async () => {
            const items = ["hello", "world", "test"];

            const { results } = await simulateForEachExecution(items, (item, _index, context) => ({
                output: {
                    original: item,
                    uppercase: item.toUpperCase(),
                    length: item.length
                },
                context
            }));

            expect(results[0]).toEqual({ original: "hello", uppercase: "HELLO", length: 5 });
            expect(results[1]).toEqual({ original: "world", uppercase: "WORLD", length: 5 });
            expect(results[2]).toEqual({ original: "test", uppercase: "TEST", length: 4 });
        });
    });

    describe("iterating over objects", () => {
        it("should iterate over an array of objects", async () => {
            const items = [
                { id: 1, name: "Alice", score: 85 },
                { id: 2, name: "Bob", score: 92 },
                { id: 3, name: "Charlie", score: 78 }
            ];

            const { results, iterationCount } = await simulateForEachExecution(
                items,
                (item, _index, context) => ({
                    output: {
                        studentId: item.id,
                        studentName: item.name,
                        passed: item.score >= 80
                    },
                    context
                })
            );

            expect(iterationCount).toBe(3);
            expect(results[0]).toEqual({ studentId: 1, studentName: "Alice", passed: true });
            expect(results[1]).toEqual({ studentId: 2, studentName: "Bob", passed: true });
            expect(results[2]).toEqual({ studentId: 3, studentName: "Charlie", passed: false });
        });

        it("should access nested object properties", async () => {
            const items = [
                { user: { profile: { email: "a@test.com" } }, active: true },
                { user: { profile: { email: "b@test.com" } }, active: false }
            ];

            const { results } = await simulateForEachExecution(items, (item, _index, context) => ({
                output: {
                    email: item.user.profile.email,
                    status: item.active ? "active" : "inactive"
                },
                context
            }));

            expect(results[0]).toEqual({ email: "a@test.com", status: "active" });
            expect(results[1]).toEqual({ email: "b@test.com", status: "inactive" });
        });
    });

    describe("loop.item access", () => {
        it("should provide loop.item for each iteration", async () => {
            const items = ["first", "second", "third"];
            const capturedItems: string[] = [];

            await simulateForEachExecution(items, (_item, _index, context) => {
                const loopVar = getVariable(context, "loop") as { item: string };
                capturedItems.push(loopVar.item);
                return { output: { item: loopVar.item }, context };
            });

            expect(capturedItems).toEqual(["first", "second", "third"]);
        });

        it("should handle complex objects as loop.item", async () => {
            const items = [
                { data: { nested: { value: 100 } } },
                { data: { nested: { value: 200 } } }
            ];

            const { results } = await simulateForEachExecution(items, (item, _index, context) => {
                const loopVar = getVariable(context, "loop") as { item: typeof item };
                return {
                    output: { extractedValue: loopVar.item.data.nested.value },
                    context
                };
            });

            expect(results[0]).toEqual({ extractedValue: 100 });
            expect(results[1]).toEqual({ extractedValue: 200 });
        });
    });

    describe("loop.index access", () => {
        it("should provide loop.index for each iteration", async () => {
            const items = ["a", "b", "c", "d", "e"];
            const capturedIndices: number[] = [];

            await simulateForEachExecution(items, (_item, _index, context) => {
                const loopVar = getVariable(context, "loop") as { index: number };
                capturedIndices.push(loopVar.index);
                return { output: { index: loopVar.index }, context };
            });

            expect(capturedIndices).toEqual([0, 1, 2, 3, 4]);
        });

        it("should provide isFirst and isLast flags", async () => {
            const items = ["first", "middle", "last"];
            const flags: Array<{ isFirst: boolean; isLast: boolean }> = [];

            await simulateForEachExecution(items, (_item, _index, context) => {
                const loopVar = getVariable(context, "loop") as {
                    isFirst: boolean;
                    isLast: boolean;
                };
                flags.push({ isFirst: loopVar.isFirst, isLast: loopVar.isLast });
                return { output: { isFirst: loopVar.isFirst, isLast: loopVar.isLast }, context };
            });

            expect(flags[0]).toEqual({ isFirst: true, isLast: false });
            expect(flags[1]).toEqual({ isFirst: false, isLast: false });
            expect(flags[2]).toEqual({ isFirst: false, isLast: true });
        });
    });

    describe("loop.total access", () => {
        it("should provide correct loop.total", async () => {
            const items = Array.from({ length: 7 }, (_, i) => i);
            let capturedTotal: number | undefined;

            await simulateForEachExecution(items, (_item, _index, context) => {
                const loopVar = getVariable(context, "loop") as { total: number };
                capturedTotal = loopVar.total;
                return { output: { total: loopVar.total }, context };
            });

            expect(capturedTotal).toBe(7);
        });
    });

    describe("result accumulation", () => {
        it("should accumulate results with loop.results", async () => {
            const items = [10, 20, 30];
            const capturedResultsPerIteration: Array<number[]> = [];

            await simulateForEachExecution(items, (item, _index, context) => {
                const loopVar = getVariable(context, "loop") as {
                    results: Array<{ doubled: number }>;
                };
                capturedResultsPerIteration.push(loopVar.results.map((r) => r.doubled));
                return { output: { doubled: item * 2 }, context };
            });

            // First iteration has no previous results
            expect(capturedResultsPerIteration[0]).toEqual([]);
            // Second iteration has first result
            expect(capturedResultsPerIteration[1]).toEqual([20]);
            // Third iteration has first two results
            expect(capturedResultsPerIteration[2]).toEqual([20, 40]);
        });

        it("should provide final results after loop completion", async () => {
            const items = ["a", "b", "c"];

            const { context } = await simulateForEachExecution(items, (item, _index, ctx) => ({
                output: { letter: item, code: item.charCodeAt(0) },
                context: ctx
            }));

            const finalResults = getVariable(context, "loopResults") as Array<{
                letter: string;
                code: number;
            }>;
            expect(finalResults).toEqual([
                { letter: "a", code: 97 },
                { letter: "b", code: 98 },
                { letter: "c", code: 99 }
            ]);
        });

        it("should aggregate numeric results", async () => {
            const items = [1, 2, 3, 4, 5];
            let runningSum = 0;

            const { results } = await simulateForEachExecution(items, (item, _index, context) => {
                runningSum += item;
                return {
                    output: { value: item, runningSum },
                    context
                };
            });

            expect(results[4]).toEqual({ value: 5, runningSum: 15 });
        });
    });

    describe("empty array handling", () => {
        it("should handle empty array with zero iterations", async () => {
            const items: string[] = [];

            const { results, iterationCount } = await simulateForEachExecution(
                items,
                (_item, _index, context) => ({
                    output: { shouldNotExecute: true },
                    context
                })
            );

            expect(iterationCount).toBe(0);
            expect(results).toEqual([]);
        });

        it("should still provide output node with empty results", async () => {
            const items: number[] = [];

            const { context } = await simulateForEachExecution(items, (_item, _index, ctx) => ({
                output: {},
                context: ctx
            }));

            const finalResults = getVariable(context, "loopResults");
            expect(finalResults).toEqual([]);
        });
    });

    describe("single item array", () => {
        it("should handle single item array", async () => {
            const items = ["only-one"];

            const { results, iterationCount } = await simulateForEachExecution(
                items,
                (item, _index, ctx) => {
                    const loopVar = getVariable(ctx, "loop") as {
                        isFirst: boolean;
                        isLast: boolean;
                    };
                    return {
                        output: {
                            item,
                            isFirst: loopVar.isFirst,
                            isLast: loopVar.isLast
                        },
                        context: ctx
                    };
                }
            );

            expect(iterationCount).toBe(1);
            expect(results[0]).toEqual({
                item: "only-one",
                isFirst: true,
                isLast: true
            });
        });
    });

    describe("large arrays", () => {
        it("should handle arrays with many items", async () => {
            const items = Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}` }));

            const { results, iterationCount } = await simulateForEachExecution(
                items,
                (item, _index, context) => ({
                    output: { processedId: item.id, doubled: item.id * 2 },
                    context
                })
            );

            expect(iterationCount).toBe(100);
            expect(results[0]).toEqual({ processedId: 0, doubled: 0 });
            expect(results[50]).toEqual({ processedId: 50, doubled: 100 });
            expect(results[99]).toEqual({ processedId: 99, doubled: 198 });
        });
    });

    describe("context preservation", () => {
        it("should preserve context between iterations", async () => {
            const items = ["a", "b", "c"];

            const { context } = await simulateForEachExecution(items, (item, index, ctx) => {
                // Set a variable that subsequent iterations can see
                const newCtx = setVariable(ctx, `processed_${index}`, item);
                return { output: { item }, context: newCtx };
            });

            // All variables should be preserved
            expect(getVariable(context, "processed_0")).toBe("a");
            expect(getVariable(context, "processed_1")).toBe("b");
            expect(getVariable(context, "processed_2")).toBe("c");
        });

        it("should allow iteration to reference previous iteration outputs", async () => {
            const items = [1, 2, 3];

            const { results } = await simulateForEachExecution(items, (item, index, ctx) => {
                // Reference previous iteration's output
                const prevOutput = index > 0 ? ctx.nodeOutputs.get(`LoopBody_${index - 1}`) : null;

                const prevValue = (prevOutput?.cumulative as number) || 0;

                return {
                    output: {
                        current: item,
                        cumulative: prevValue + item
                    },
                    context: ctx
                };
            });

            expect(results[0]).toEqual({ current: 1, cumulative: 1 });
            expect(results[1]).toEqual({ current: 2, cumulative: 3 });
            expect(results[2]).toEqual({ current: 3, cumulative: 6 });
        });
    });
});
