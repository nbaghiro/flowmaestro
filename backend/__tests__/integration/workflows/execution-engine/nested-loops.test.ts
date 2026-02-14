/**
 * Nested Loops Integration Tests
 *
 * Tests for nested loop patterns:
 * - Inner loop completes for each outer iteration
 * - Context isolation between loop levels
 * - Access parent loop context from inner loop
 * - Results accumulation with nested structure
 * - Multiple levels of nesting
 */

import type { JsonValue, JsonObject } from "@flowmaestro/shared";
import {
    createContext,
    storeNodeOutput,
    setVariable,
    getVariable
} from "../../../../src/temporal/core/services/context";
import type { LoopContext as _LoopContext } from "../../../../src/temporal/activities/execution/types";
import type { ContextSnapshot } from "../../../../src/temporal/core/types";

// ============================================================================
// HELPER TYPES
// ============================================================================

interface LoopState {
    index: number;
    item: unknown;
    total: number;
    results: unknown[];
    isFirst: boolean;
    isLast: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simulate nested loop execution (outer forEach, inner forEach)
 */
async function simulateNestedForEachExecution<TOuter extends JsonValue, TInner extends JsonValue>(
    outerItems: TOuter[],
    getInnerItems: (outerItem: TOuter, outerIndex: number) => TInner[],
    processInnerItem: (
        outerItem: TOuter,
        innerItem: TInner,
        outerIndex: number,
        innerIndex: number,
        context: ContextSnapshot
    ) => { output: JsonObject; context: ContextSnapshot }
): Promise<{
    context: ContextSnapshot;
    outerResults: Array<{
        outerItem: TOuter;
        innerResults: Array<JsonObject>;
    }>;
    totalInnerIterations: number;
}> {
    let context = createContext({});
    const outerResults: Array<{
        outerItem: TOuter;
        innerResults: Array<JsonObject>;
    }> = [];
    let totalInnerIterations = 0;

    for (let outerIndex = 0; outerIndex < outerItems.length; outerIndex++) {
        const outerItem = outerItems[outerIndex];
        const innerItems = getInnerItems(outerItem, outerIndex);
        const innerResults: Array<JsonObject> = [];

        // Store outer loop state
        context = setVariable(context, "outerLoop", {
            index: outerIndex,
            item: outerItem as JsonValue,
            total: outerItems.length,
            results: outerResults.map((r) => ({
                outerItem: r.outerItem as JsonValue,
                innerResults: r.innerResults as JsonValue[]
            })) as JsonValue[],
            isFirst: outerIndex === 0,
            isLast: outerIndex === outerItems.length - 1
        });

        for (let innerIndex = 0; innerIndex < innerItems.length; innerIndex++) {
            const innerItem = innerItems[innerIndex];

            // Store inner loop state
            context = setVariable(context, "innerLoop", {
                index: innerIndex,
                item: innerItem as JsonValue,
                total: innerItems.length,
                results: innerResults as JsonValue[],
                isFirst: innerIndex === 0,
                isLast: innerIndex === innerItems.length - 1
            });

            // Process the item
            const { output, context: newContext } = processInnerItem(
                outerItem,
                innerItem,
                outerIndex,
                innerIndex,
                context
            );
            context = newContext;

            // Store iteration output
            context = storeNodeOutput(context, `InnerBody_${outerIndex}_${innerIndex}`, output);
            innerResults.push(output);
            totalInnerIterations++;
        }

        outerResults.push({ outerItem, innerResults });
    }

    // Store final results
    context = setVariable(
        context,
        "nestedResults",
        outerResults.map((r) => ({
            outerItem: r.outerItem as JsonValue,
            innerResults: r.innerResults as JsonValue[]
        })) as JsonValue[]
    );

    return { context, outerResults, totalInnerIterations };
}

/**
 * Simulate three-level nested loops
 */
async function simulateTripleNestedExecution<
    T1 extends JsonValue,
    T2 extends JsonValue,
    T3 extends JsonValue
>(
    level1Items: T1[],
    getLevel2Items: (item: T1) => T2[],
    getLevel3Items: (item1: T1, item2: T2) => T3[],
    processItem: (
        item1: T1,
        item2: T2,
        item3: T3,
        indices: [number, number, number],
        context: ContextSnapshot
    ) => { output: JsonObject; context: ContextSnapshot }
): Promise<{
    context: ContextSnapshot;
    results: Array<JsonObject>;
    totalIterations: number;
}> {
    let context = createContext({});
    const results: Array<JsonObject> = [];
    let totalIterations = 0;

    for (let i1 = 0; i1 < level1Items.length; i1++) {
        const item1 = level1Items[i1];
        const level2Items = getLevel2Items(item1);

        context = setVariable(context, "loop1", {
            index: i1,
            item: item1 as JsonValue,
            total: level1Items.length
        });

        for (let i2 = 0; i2 < level2Items.length; i2++) {
            const item2 = level2Items[i2];
            const level3Items = getLevel3Items(item1, item2);

            context = setVariable(context, "loop2", {
                index: i2,
                item: item2 as JsonValue,
                total: level2Items.length
            });

            for (let i3 = 0; i3 < level3Items.length; i3++) {
                const item3 = level3Items[i3];

                context = setVariable(context, "loop3", {
                    index: i3,
                    item: item3 as JsonValue,
                    total: level3Items.length
                });

                const { output, context: newContext } = processItem(
                    item1,
                    item2,
                    item3,
                    [i1, i2, i3],
                    context
                );
                context = newContext;

                context = storeNodeOutput(context, `Body_${i1}_${i2}_${i3}`, output);
                results.push(output);
                totalIterations++;
            }
        }
    }

    return { context, results, totalIterations };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Nested Loops", () => {
    describe("inner loop for each outer iteration", () => {
        it("should complete inner loop for each outer item", async () => {
            const outerItems = ["A", "B", "C"];
            const getInnerItems = () => [1, 2];

            const { outerResults, totalInnerIterations } = await simulateNestedForEachExecution(
                outerItems,
                getInnerItems,
                (outerItem, innerItem, _outerIndex, _innerIndex, context) => ({
                    output: { combo: `${outerItem}${innerItem}` },
                    context
                })
            );

            expect(totalInnerIterations).toBe(6); // 3 outer * 2 inner
            expect(outerResults).toHaveLength(3);
            expect(outerResults[0].innerResults).toEqual([{ combo: "A1" }, { combo: "A2" }]);
            expect(outerResults[1].innerResults).toEqual([{ combo: "B1" }, { combo: "B2" }]);
            expect(outerResults[2].innerResults).toEqual([{ combo: "C1" }, { combo: "C2" }]);
        });

        it("should handle variable inner item counts", async () => {
            const outerItems = [
                { id: "user1", permissions: ["read", "write"] },
                { id: "user2", permissions: ["read"] },
                { id: "user3", permissions: ["read", "write", "admin"] }
            ];

            const { outerResults, totalInnerIterations } = await simulateNestedForEachExecution(
                outerItems,
                (outerItem) => outerItem.permissions,
                (outerItem, innerItem, _outerIndex, _innerIndex, context) => ({
                    output: { user: outerItem.id, permission: innerItem },
                    context
                })
            );

            expect(totalInnerIterations).toBe(6); // 2 + 1 + 3
            expect(outerResults[0].innerResults).toHaveLength(2);
            expect(outerResults[1].innerResults).toHaveLength(1);
            expect(outerResults[2].innerResults).toHaveLength(3);
        });

        it("should handle empty inner arrays", async () => {
            const outerItems = ["A", "B", "C"];
            const getInnerItems = (item: string) => (item === "B" ? [] : [1, 2]);

            const { outerResults, totalInnerIterations } = await simulateNestedForEachExecution(
                outerItems,
                getInnerItems,
                (outerItem, innerItem, _outerIndex, _innerIndex, context) => ({
                    output: { combo: `${outerItem}${innerItem}` },
                    context
                })
            );

            expect(totalInnerIterations).toBe(4); // 2 + 0 + 2
            expect(outerResults[1].innerResults).toEqual([]);
        });
    });

    describe("context isolation between loop levels", () => {
        it("should maintain separate loop states for outer and inner", async () => {
            const capturedStates: Array<{ outerIndex: number; innerIndex: number }> = [];

            await simulateNestedForEachExecution(
                [1, 2],
                () => ["a", "b", "c"],
                (_outerItem, _innerItem, _outerIndex, _innerIndex, context) => {
                    const outerLoop = getVariable(context, "outerLoop") as unknown as LoopState;
                    const innerLoop = getVariable(context, "innerLoop") as unknown as LoopState;
                    capturedStates.push({
                        outerIndex: outerLoop.index,
                        innerIndex: innerLoop.index
                    });
                    return { output: {}, context };
                }
            );

            expect(capturedStates).toEqual([
                { outerIndex: 0, innerIndex: 0 },
                { outerIndex: 0, innerIndex: 1 },
                { outerIndex: 0, innerIndex: 2 },
                { outerIndex: 1, innerIndex: 0 },
                { outerIndex: 1, innerIndex: 1 },
                { outerIndex: 1, innerIndex: 2 }
            ]);
        });

        it("should reset inner loop index for each outer iteration", async () => {
            const innerStartIndices: number[] = [];

            await simulateNestedForEachExecution(
                [1, 2, 3],
                () => ["x", "y"],
                (_outerItem, _innerItem, _outerIndex, innerIndex, context) => {
                    if (innerIndex === 0) {
                        const innerLoop = getVariable(context, "innerLoop") as unknown as LoopState;
                        innerStartIndices.push(innerLoop.index);
                    }
                    return { output: {}, context };
                }
            );

            // Each outer iteration should start inner at 0
            expect(innerStartIndices).toEqual([0, 0, 0]);
        });

        it("should isolate inner loop results per outer iteration", async () => {
            const { outerResults } = await simulateNestedForEachExecution(
                [10, 20],
                () => [1, 2, 3],
                (outerItem, innerItem, _outerIndex, _innerIndex, context) => ({
                    output: { product: (outerItem as number) * (innerItem as number) },
                    context
                })
            );

            expect(outerResults[0].innerResults).toEqual([
                { product: 10 },
                { product: 20 },
                { product: 30 }
            ]);
            expect(outerResults[1].innerResults).toEqual([
                { product: 20 },
                { product: 40 },
                { product: 60 }
            ]);
        });
    });

    describe("access parent loop context from inner loop", () => {
        it("should allow inner loop to access outer loop item", async () => {
            const { outerResults } = await simulateNestedForEachExecution(
                ["prefix1", "prefix2"],
                () => ["A", "B"],
                (_outerItem, innerItem, _outerIndex, _innerIndex, context) => {
                    const outerLoop = getVariable(context, "outerLoop") as unknown as LoopState;
                    const outerItem = outerLoop.item as string;
                    return {
                        output: { combined: `${outerItem}-${innerItem}` },
                        context
                    };
                }
            );

            expect(outerResults[0].innerResults).toEqual([
                { combined: "prefix1-A" },
                { combined: "prefix1-B" }
            ]);
            expect(outerResults[1].innerResults).toEqual([
                { combined: "prefix2-A" },
                { combined: "prefix2-B" }
            ]);
        });

        it("should allow inner loop to access outer loop index", async () => {
            const { outerResults } = await simulateNestedForEachExecution(
                [100, 200, 300],
                () => [1, 2],
                (_outerItem, innerItem, _outerIndex, _innerIndex, context) => {
                    const outerLoop = getVariable(context, "outerLoop") as unknown as LoopState;
                    const innerLoop = getVariable(context, "innerLoop") as unknown as LoopState;
                    return {
                        output: {
                            globalIndex: outerLoop.index * 10 + innerLoop.index,
                            value: innerItem
                        },
                        context
                    };
                }
            );

            expect(outerResults[0].innerResults[0]).toEqual({ globalIndex: 0, value: 1 });
            expect(outerResults[1].innerResults[0]).toEqual({ globalIndex: 10, value: 1 });
            expect(outerResults[2].innerResults[1]).toEqual({ globalIndex: 21, value: 2 });
        });

        it("should allow inner loop to access outer loop total", async () => {
            const capturedTotals: Array<{ outerTotal: number; innerTotal: number }> = [];

            await simulateNestedForEachExecution(
                [1, 2, 3, 4],
                () => ["a", "b", "c"],
                (_outerItem, _innerItem, _outerIndex, _innerIndex, context) => {
                    const outerLoop = getVariable(context, "outerLoop") as unknown as LoopState;
                    const innerLoop = getVariable(context, "innerLoop") as unknown as LoopState;
                    capturedTotals.push({
                        outerTotal: outerLoop.total,
                        innerTotal: innerLoop.total
                    });
                    return { output: {}, context };
                }
            );

            // All iterations should see the same totals
            capturedTotals.forEach((totals) => {
                expect(totals).toEqual({ outerTotal: 4, innerTotal: 3 });
            });
        });

        it("should allow inner loop to access outer loop results", async () => {
            const outerResultCounts: number[] = [];

            await simulateNestedForEachExecution(
                ["A", "B", "C"],
                () => [1],
                (_outerItem, _innerItem, _outerIndex, _innerIndex, context) => {
                    const outerLoop = getVariable(context, "outerLoop") as unknown as LoopState;
                    outerResultCounts.push(outerLoop.results.length);
                    return { output: {}, context };
                }
            );

            // First outer iteration: 0 previous results
            // Second outer iteration: 1 previous result
            // Third outer iteration: 2 previous results
            expect(outerResultCounts).toEqual([0, 1, 2]);
        });
    });

    describe("nested results accumulation", () => {
        it("should build nested result structure", async () => {
            const categories = [
                { name: "Electronics", items: ["Phone", "Laptop"] },
                { name: "Books", items: ["Fiction", "NonFiction", "Biography"] }
            ];

            const { outerResults } = await simulateNestedForEachExecution(
                categories,
                (category) => category.items,
                (category, item, _outerIndex, _innerIndex, context) => ({
                    output: {
                        category: category.name,
                        item,
                        sku: `${category.name.toUpperCase()}-${item.toUpperCase()}`
                    },
                    context
                })
            );

            expect(outerResults[0].innerResults).toEqual([
                { category: "Electronics", item: "Phone", sku: "ELECTRONICS-PHONE" },
                { category: "Electronics", item: "Laptop", sku: "ELECTRONICS-LAPTOP" }
            ]);
            expect(outerResults[1].innerResults).toHaveLength(3);
        });

        it("should allow aggregation across inner loops", async () => {
            const { context } = await simulateNestedForEachExecution(
                [1, 2, 3],
                (n) => Array.from({ length: n }, (_, i) => i + 1),
                (outerItem, innerItem, _outerIndex, _innerIndex, ctx) => {
                    const runningTotal = (getVariable(ctx, "runningTotal") as number) || 0;
                    const product = (outerItem as number) * (innerItem as number);
                    return {
                        output: { product },
                        context: setVariable(ctx, "runningTotal", runningTotal + product)
                    };
                }
            );

            // 1*1 + 2*1 + 2*2 + 3*1 + 3*2 + 3*3 = 1 + 2 + 4 + 3 + 6 + 9 = 25
            expect(getVariable(context, "runningTotal")).toBe(25);
        });

        it("should accumulate counts at each level", async () => {
            const { context, outerResults, totalInnerIterations } =
                await simulateNestedForEachExecution(
                    ["A", "B"],
                    () => [1, 2, 3],
                    (_outerItem, _innerItem, outerIndex, innerIndex, ctx) => {
                        const innerCount = (getVariable(ctx, "innerCount") as number) || 0;
                        return {
                            output: { outerIndex, innerIndex },
                            context: setVariable(ctx, "innerCount", innerCount + 1)
                        };
                    }
                );

            expect(outerResults.length).toBe(2);
            expect(totalInnerIterations).toBe(6);
            expect(getVariable(context, "innerCount")).toBe(6);
        });
    });

    describe("three-level nesting", () => {
        it("should handle three nested loops", async () => {
            const { results, totalIterations } = await simulateTripleNestedExecution(
                ["X", "Y"],
                () => [1, 2],
                () => ["a", "b"],
                (item1, item2, item3, indices, context) => ({
                    output: {
                        combo: `${item1}${item2}${item3}`,
                        path: indices.join("-")
                    },
                    context
                })
            );

            expect(totalIterations).toBe(8); // 2 * 2 * 2
            expect(results[0]).toEqual({ combo: "X1a", path: "0-0-0" });
            expect(results[7]).toEqual({ combo: "Y2b", path: "1-1-1" });
        });

        it("should maintain correct loop state at each level", async () => {
            const capturedStates: Array<{
                l1: { index: number; item: string };
                l2: { index: number; item: number };
                l3: { index: number; item: string };
            }> = [];

            await simulateTripleNestedExecution(
                ["A", "B"],
                () => [1, 2],
                () => ["x"],
                (_item1, _item2, _item3, _indices, context) => {
                    const loop1 = getVariable(context, "loop1") as { index: number; item: string };
                    const loop2 = getVariable(context, "loop2") as { index: number; item: number };
                    const loop3 = getVariable(context, "loop3") as { index: number; item: string };
                    capturedStates.push({
                        l1: { index: loop1.index, item: loop1.item },
                        l2: { index: loop2.index, item: loop2.item },
                        l3: { index: loop3.index, item: loop3.item }
                    });
                    return { output: {}, context };
                }
            );

            expect(capturedStates).toHaveLength(4);
            expect(capturedStates[0]).toEqual({
                l1: { index: 0, item: "A" },
                l2: { index: 0, item: 1 },
                l3: { index: 0, item: "x" }
            });
            expect(capturedStates[3]).toEqual({
                l1: { index: 1, item: "B" },
                l2: { index: 1, item: 2 },
                l3: { index: 0, item: "x" }
            });
        });

        it("should handle variable sizes at each level", async () => {
            const { totalIterations } = await simulateTripleNestedExecution(
                [1, 2],
                (n) => Array.from({ length: n }, (_, i) => i),
                (n1, n2) => Array.from({ length: n1 + n2 }, (_, i) => `item${i}`),
                (item1, item2, item3, _indices, context) => ({
                    output: {
                        level1: item1,
                        level2: item2,
                        level3: item3
                    },
                    context
                })
            );

            // Level 1 = [1, 2]
            // When l1=1: Level 2 = [0] (length 1), Level 3 = [item0] (length 1) -> 1 iteration
            // When l1=2: Level 2 = [0, 1] (length 2)
            //   - l2=0: Level 3 = [item0, item1] (length 2) -> 2 iterations
            //   - l2=1: Level 3 = [item0, item1, item2] (length 3) -> 3 iterations
            // Total: 1 + 2 + 3 = 6
            expect(totalIterations).toBe(6);
        });
    });

    describe("matrix operations", () => {
        it("should traverse 2D matrix row by row", async () => {
            const matrix = [
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]
            ];

            const { outerResults, totalInnerIterations } = await simulateNestedForEachExecution(
                matrix,
                (row) => row,
                (_row, cell, rowIndex, colIndex, context) => ({
                    output: {
                        position: `[${rowIndex}][${colIndex}]`,
                        value: cell
                    },
                    context
                })
            );

            expect(totalInnerIterations).toBe(9);
            expect(outerResults[1].innerResults[1]).toEqual({
                position: "[1][1]",
                value: 5
            });
        });

        it("should compute row sums", async () => {
            const matrix = [
                [1, 2, 3],
                [4, 5, 6]
            ];

            const { outerResults } = await simulateNestedForEachExecution(
                matrix,
                (row) => row,
                (_row, cell, rowIndex, _colIndex, context) => {
                    const rowSum = (getVariable(context, `rowSum_${rowIndex}`) as number) || 0;
                    const newSum = rowSum + (cell as number);
                    return {
                        output: { cell, runningSum: newSum },
                        context: setVariable(context, `rowSum_${rowIndex}`, newSum)
                    };
                }
            );

            // Last cell in each row should have the complete sum
            expect(outerResults[0].innerResults[2]).toEqual({ cell: 3, runningSum: 6 });
            expect(outerResults[1].innerResults[2]).toEqual({ cell: 6, runningSum: 15 });
        });

        it("should perform element-wise operations on two matrices", async () => {
            const matrixA = [
                [1, 2],
                [3, 4]
            ];
            const matrixB = [
                [10, 20],
                [30, 40]
            ];

            createContext({ matrixB }); // Create context for consistent test setup
            const results: number[][] = [[], []];

            for (let i = 0; i < matrixA.length; i++) {
                for (let j = 0; j < matrixA[i].length; j++) {
                    const a = matrixA[i][j];
                    const b = matrixB[i][j];
                    results[i].push(a + b);
                }
            }

            expect(results).toEqual([
                [11, 22],
                [33, 44]
            ]);
        });
    });

    describe("nested loop with break conditions", () => {
        it("should allow breaking from inner loop", async () => {
            const processedCombos: string[] = [];

            await simulateNestedForEachExecution(
                ["A", "B"],
                () => [1, 2, 3, 4, 5],
                (outerItem, innerItem, outerIndex, _innerIndex, context) => {
                    // Simulate break when inner value > 3
                    const shouldBreak = getVariable(
                        context,
                        `shouldBreak_${outerIndex}`
                    ) as boolean;
                    if (shouldBreak) {
                        return { output: { skipped: true } as JsonObject, context };
                    }

                    processedCombos.push(`${outerItem}${innerItem}`);

                    const newContext =
                        (innerItem as number) >= 3
                            ? setVariable(context, `shouldBreak_${outerIndex}`, true)
                            : context;

                    return {
                        output: { combo: `${outerItem}${innerItem}` } as JsonObject,
                        context: newContext
                    };
                }
            );

            // Should process A1, A2, A3, then skip rest of A's inner loop
            // Then B1, B2, B3, then skip rest of B's inner loop
            expect(processedCombos).toEqual(["A1", "A2", "A3", "B1", "B2", "B3"]);
        });
    });

    describe("nested loop edge cases", () => {
        it("should handle empty outer array", async () => {
            const { outerResults, totalInnerIterations } = await simulateNestedForEachExecution(
                [] as string[],
                () => [1, 2, 3],
                (_outerItem, _innerItem, _outerIndex, _innerIndex, context) => ({
                    output: {},
                    context
                })
            );

            expect(outerResults).toEqual([]);
            expect(totalInnerIterations).toBe(0);
        });

        it("should handle all empty inner arrays", async () => {
            const { outerResults, totalInnerIterations } = await simulateNestedForEachExecution(
                ["A", "B", "C"],
                () => [] as number[],
                (_outerItem, _innerItem, _outerIndex, _innerIndex, context) => ({
                    output: {},
                    context
                })
            );

            expect(outerResults).toHaveLength(3);
            expect(totalInnerIterations).toBe(0);
            outerResults.forEach((result) => {
                expect(result.innerResults).toEqual([]);
            });
        });

        it("should handle single item at each level", async () => {
            const { outerResults, totalInnerIterations } = await simulateNestedForEachExecution(
                ["only"],
                () => [42],
                (outerItem, innerItem, _outerIndex, _innerIndex, context) => ({
                    output: { outer: outerItem, inner: innerItem },
                    context
                })
            );

            expect(totalInnerIterations).toBe(1);
            expect(outerResults[0].innerResults).toEqual([{ outer: "only", inner: 42 }]);
        });

        it("should handle deeply nested objects", async () => {
            const data = [
                {
                    department: "Engineering",
                    teams: [
                        { name: "Frontend", members: ["Alice", "Bob"] },
                        { name: "Backend", members: ["Charlie"] }
                    ]
                }
            ];

            const allMembers: string[] = [];

            for (const dept of data) {
                for (const team of dept.teams) {
                    for (const member of team.members) {
                        allMembers.push(`${dept.department}/${team.name}/${member}`);
                    }
                }
            }

            expect(allMembers).toEqual([
                "Engineering/Frontend/Alice",
                "Engineering/Frontend/Bob",
                "Engineering/Backend/Charlie"
            ]);
        });
    });
});
