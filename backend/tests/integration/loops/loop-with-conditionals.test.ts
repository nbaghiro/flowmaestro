/**
 * Loop with Conditionals Integration Tests
 *
 * Tests for loops containing conditional branches:
 * - Conditional inside loop body
 * - Different branches per iteration
 * - Early exit on condition
 * - Skipped iterations
 * - Filter patterns
 * - Map-reduce patterns
 */

import {
    createContext,
    storeNodeOutput,
    setVariable,
    getVariable
} from "../../../src/temporal/core/services/context";
import type { LoopContext as _LoopContext } from "../../../src/temporal/activities/execution/types";
import type { ContextSnapshot } from "../../../src/temporal/core/types";

// ============================================================================
// HELPER TYPES
// ============================================================================

type BranchResult = "true" | "false" | "skipped";

interface ConditionalIterationResult {
    iteration: number;
    item: unknown;
    condition: boolean;
    branch: BranchResult;
    output: Record<string, unknown>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simulate forEach loop with conditional branch in body
 */
async function simulateLoopWithConditional<T>(
    items: T[],
    evaluateCondition: (item: T, index: number, context: ContextSnapshot) => boolean,
    processTrueBranch: (
        item: T,
        index: number,
        context: ContextSnapshot
    ) => { output: Record<string, unknown>; context: ContextSnapshot },
    processFalseBranch: (
        item: T,
        index: number,
        context: ContextSnapshot
    ) => { output: Record<string, unknown>; context: ContextSnapshot }
): Promise<{
    context: ContextSnapshot;
    results: ConditionalIterationResult[];
    trueBranchCount: number;
    falseBranchCount: number;
}> {
    let context = createContext({ items });
    const results: ConditionalIterationResult[] = [];
    let trueBranchCount = 0;
    let falseBranchCount = 0;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Store loop state
        context = setVariable(context, "loop", {
            index: i,
            item,
            total: items.length,
            results: [...results],
            isFirst: i === 0,
            isLast: i === items.length - 1
        });

        // Evaluate condition
        const conditionResult = evaluateCondition(item, i, context);
        context = storeNodeOutput(context, `Condition_${i}`, { result: conditionResult });

        let output: Record<string, unknown>;
        let branch: BranchResult;

        if (conditionResult) {
            const result = processTrueBranch(item, i, context);
            output = result.output;
            context = result.context;
            branch = "true";
            trueBranchCount++;
        } else {
            const result = processFalseBranch(item, i, context);
            output = result.output;
            context = result.context;
            branch = "false";
            falseBranchCount++;
        }

        context = storeNodeOutput(context, `LoopBody_${i}`, output);
        results.push({
            iteration: i,
            item,
            condition: conditionResult,
            branch,
            output
        });
    }

    context = setVariable(context, "loopResults", results);

    return { context, results, trueBranchCount, falseBranchCount };
}

/**
 * Simulate forEach loop with early exit capability
 */
async function simulateLoopWithEarlyExit<T>(
    items: T[],
    shouldExit: (item: T, index: number, context: ContextSnapshot) => boolean,
    processItem: (
        item: T,
        index: number,
        context: ContextSnapshot
    ) => { output: Record<string, unknown>; context: ContextSnapshot }
): Promise<{
    context: ContextSnapshot;
    results: Array<Record<string, unknown>>;
    iterationCount: number;
    exitedEarly: boolean;
    exitIndex: number | null;
}> {
    let context = createContext({ items });
    const results: Array<Record<string, unknown>> = [];
    let exitedEarly = false;
    let exitIndex: number | null = null;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        context = setVariable(context, "loop", {
            index: i,
            item,
            total: items.length,
            isFirst: i === 0,
            isLast: i === items.length - 1
        });

        // Check exit condition before processing
        if (shouldExit(item, i, context)) {
            exitedEarly = true;
            exitIndex = i;
            break;
        }

        const { output, context: newContext } = processItem(item, i, context);
        context = newContext;
        context = storeNodeOutput(context, `LoopBody_${i}`, output);
        results.push(output);
    }

    context = setVariable(context, "loopResults", results);
    context = setVariable(context, "exitedEarly", exitedEarly);

    return {
        context,
        results,
        iterationCount: results.length,
        exitedEarly,
        exitIndex
    };
}

/**
 * Simulate filter pattern (forEach with conditional skip)
 */
async function simulateFilterLoop<T>(
    items: T[],
    filterCondition: (item: T, index: number) => boolean,
    processItem: (
        item: T,
        index: number,
        context: ContextSnapshot
    ) => { output: Record<string, unknown>; context: ContextSnapshot }
): Promise<{
    context: ContextSnapshot;
    filteredResults: Array<Record<string, unknown>>;
    skippedCount: number;
    processedIndices: number[];
}> {
    let context = createContext({ items });
    const filteredResults: Array<Record<string, unknown>> = [];
    const processedIndices: number[] = [];
    let skippedCount = 0;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        context = setVariable(context, "loop", {
            index: i,
            item,
            total: items.length,
            isFirst: i === 0,
            isLast: i === items.length - 1
        });

        if (filterCondition(item, i)) {
            const { output, context: newContext } = processItem(item, i, context);
            context = newContext;
            context = storeNodeOutput(context, `LoopBody_${i}`, output);
            filteredResults.push(output);
            processedIndices.push(i);
        } else {
            context = storeNodeOutput(context, `LoopBody_${i}`, { skipped: true });
            skippedCount++;
        }
    }

    context = setVariable(context, "loopResults", filteredResults);

    return { context, filteredResults, skippedCount, processedIndices };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Loop with Conditionals", () => {
    describe("conditional inside loop body", () => {
        it("should execute different branches based on item value", async () => {
            const items = [1, 2, 3, 4, 5, 6];

            const { results, trueBranchCount, falseBranchCount } =
                await simulateLoopWithConditional(
                    items,
                    (item) => item % 2 === 0,
                    (item, _index, context) => ({
                        output: { type: "even", value: item },
                        context
                    }),
                    (item, _index, context) => ({
                        output: { type: "odd", value: item },
                        context
                    })
                );

            expect(trueBranchCount).toBe(3); // 2, 4, 6
            expect(falseBranchCount).toBe(3); // 1, 3, 5
            expect(results[0]).toMatchObject({ condition: false, branch: "false" });
            expect(results[1]).toMatchObject({ condition: true, branch: "true" });
        });

        it("should pass correct context to each branch", async () => {
            const items = ["a", "bb", "ccc"];
            const capturedContexts: Array<{ index: number; itemLength: number }> = [];

            await simulateLoopWithConditional(
                items,
                (item) => item.length > 1,
                (item, index, context) => {
                    const loop = getVariable(context, "loop") as { index: number };
                    capturedContexts.push({ index: loop.index, itemLength: item.length });
                    return { output: { long: true }, context };
                },
                (item, index, context) => {
                    const loop = getVariable(context, "loop") as { index: number };
                    capturedContexts.push({ index: loop.index, itemLength: item.length });
                    return { output: { long: false }, context };
                }
            );

            expect(capturedContexts).toEqual([
                { index: 0, itemLength: 1 },
                { index: 1, itemLength: 2 },
                { index: 2, itemLength: 3 }
            ]);
        });

        it("should store condition result in context", async () => {
            const items = [10, 20, 30];

            const { context } = await simulateLoopWithConditional(
                items,
                (item) => item > 15,
                (_item, _index, ctx) => ({ output: { big: true }, context: ctx }),
                (_item, _index, ctx) => ({ output: { big: false }, context: ctx })
            );

            expect(context.nodeOutputs.get("Condition_0")).toEqual({ result: false });
            expect(context.nodeOutputs.get("Condition_1")).toEqual({ result: true });
            expect(context.nodeOutputs.get("Condition_2")).toEqual({ result: true });
        });
    });

    describe("different branches per iteration", () => {
        it("should route items to appropriate processing", async () => {
            interface Order {
                id: string;
                type: "digital" | "physical";
                value: number;
            }

            const orders: Order[] = [
                { id: "1", type: "digital", value: 50 },
                { id: "2", type: "physical", value: 100 },
                { id: "3", type: "digital", value: 25 },
                { id: "4", type: "physical", value: 200 }
            ];

            const { results } = await simulateLoopWithConditional(
                orders,
                (order) => order.type === "digital",
                (order, _index, context) => ({
                    output: {
                        id: order.id,
                        processing: "instant-delivery",
                        fee: 0
                    },
                    context
                }),
                (order, _index, context) => ({
                    output: {
                        id: order.id,
                        processing: "shipping-required",
                        fee: order.value > 100 ? 0 : 10
                    },
                    context
                })
            );

            expect(results[0].output).toEqual({ id: "1", processing: "instant-delivery", fee: 0 });
            expect(results[1].output).toEqual({
                id: "2",
                processing: "shipping-required",
                fee: 10
            });
            expect(results[3].output).toEqual({ id: "4", processing: "shipping-required", fee: 0 });
        });

        it("should handle complex routing logic", async () => {
            interface User {
                name: string;
                role: "admin" | "user" | "guest";
                verified: boolean;
            }

            const users: User[] = [
                { name: "Alice", role: "admin", verified: true },
                { name: "Bob", role: "user", verified: true },
                { name: "Charlie", role: "user", verified: false },
                { name: "Dave", role: "guest", verified: false }
            ];

            // Condition: verified users get full access
            const { results } = await simulateLoopWithConditional(
                users,
                (user) => user.verified,
                (user, _index, context) => ({
                    output: {
                        name: user.name,
                        accessLevel: user.role === "admin" ? "full" : "standard"
                    },
                    context
                }),
                (user, _index, context) => ({
                    output: {
                        name: user.name,
                        accessLevel: "limited",
                        requiresVerification: true
                    },
                    context
                })
            );

            expect(results[0].output).toEqual({ name: "Alice", accessLevel: "full" });
            expect(results[1].output).toEqual({ name: "Bob", accessLevel: "standard" });
            expect(results[2].output).toEqual({
                name: "Charlie",
                accessLevel: "limited",
                requiresVerification: true
            });
        });

        it("should track branch execution counts", async () => {
            const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

            const { trueBranchCount, falseBranchCount } = await simulateLoopWithConditional(
                items,
                (item) => item <= 5,
                (_item, _index, context) => ({ output: { group: "first-half" }, context }),
                (_item, _index, context) => ({ output: { group: "second-half" }, context })
            );

            expect(trueBranchCount).toBe(5);
            expect(falseBranchCount).toBe(5);
        });
    });

    describe("early exit on condition", () => {
        it("should exit loop when condition is met", async () => {
            const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

            const { results, exitedEarly, exitIndex, iterationCount } =
                await simulateLoopWithEarlyExit(
                    items,
                    (item) => item > 5,
                    (item, _index, context) => ({
                        output: { processed: item },
                        context
                    })
                );

            expect(exitedEarly).toBe(true);
            expect(exitIndex).toBe(5); // Item 6 triggers exit
            expect(iterationCount).toBe(5);
            expect(results.map((r) => r.processed)).toEqual([1, 2, 3, 4, 5]);
        });

        it("should complete all iterations if exit condition never met", async () => {
            const items = [1, 2, 3, 4, 5];

            const { exitedEarly, iterationCount } = await simulateLoopWithEarlyExit(
                items,
                () => false, // Never exit
                (item, _index, context) => ({
                    output: { value: item },
                    context
                })
            );

            expect(exitedEarly).toBe(false);
            expect(iterationCount).toBe(5);
        });

        it("should exit on first iteration if condition met immediately", async () => {
            const items = ["error", "normal", "normal"];

            const { exitedEarly, exitIndex, iterationCount } = await simulateLoopWithEarlyExit(
                items,
                (item) => item === "error",
                (_item, _index, context) => ({
                    output: {},
                    context
                })
            );

            expect(exitedEarly).toBe(true);
            expect(exitIndex).toBe(0);
            expect(iterationCount).toBe(0);
        });

        it("should preserve context state when exiting early", async () => {
            const items = [10, 20, 30, 40, 50];

            const { context, exitedEarly } = await simulateLoopWithEarlyExit(
                items,
                (_item, _index, ctx) => {
                    const sum = (getVariable(ctx, "sum") as number) || 0;
                    return sum >= 50;
                },
                (item, _index, ctx) => {
                    const sum = (getVariable(ctx, "sum") as number) || 0;
                    return {
                        output: { added: item },
                        context: setVariable(ctx, "sum", sum + item)
                    };
                }
            );

            expect(exitedEarly).toBe(true);
            // 10 + 20 = 30 (continue), then 30 + 30 = 60 >= 50 (exit before processing)
            // Actually: first check happens before first item, so:
            // Check with sum=0, process 10 (sum=10)
            // Check with sum=10, process 20 (sum=30)
            // Check with sum=30, process 30 (sum=60)
            // Check with sum=60 >= 50, exit
            expect(getVariable(context, "sum")).toBe(60);
        });

        it("should find first matching item", async () => {
            const items = [
                { id: 1, status: "pending" },
                { id: 2, status: "pending" },
                { id: 3, status: "completed" },
                { id: 4, status: "pending" }
            ];

            let foundItem: (typeof items)[0] | null = null;

            const { exitedEarly, exitIndex } = await simulateLoopWithEarlyExit(
                items,
                (item, _index, _ctx) => {
                    if (item.status === "completed") {
                        foundItem = item;
                        return true;
                    }
                    return false;
                },
                (_item, _index, context) => ({
                    output: {},
                    context
                })
            );

            expect(exitedEarly).toBe(true);
            expect(exitIndex).toBe(2);
            expect(foundItem).toEqual({ id: 3, status: "completed" });
        });
    });

    describe("skipped iterations (filter pattern)", () => {
        it("should skip items that don't match filter", async () => {
            const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

            const { filteredResults, skippedCount, processedIndices } = await simulateFilterLoop(
                items,
                (item) => item % 2 === 0,
                (item, _index, context) => ({
                    output: { evenNumber: item, doubled: item * 2 },
                    context
                })
            );

            expect(skippedCount).toBe(5);
            expect(filteredResults).toHaveLength(5);
            expect(processedIndices).toEqual([1, 3, 5, 7, 9]);
            expect(filteredResults[0]).toEqual({ evenNumber: 2, doubled: 4 });
        });

        it("should skip all items if none match", async () => {
            const items = [1, 3, 5, 7, 9];

            const { filteredResults, skippedCount } = await simulateFilterLoop(
                items,
                (item) => item % 2 === 0,
                (_item, _index, context) => ({
                    output: {},
                    context
                })
            );

            expect(filteredResults).toHaveLength(0);
            expect(skippedCount).toBe(5);
        });

        it("should process all items if all match", async () => {
            const items = [2, 4, 6, 8];

            const { filteredResults, skippedCount } = await simulateFilterLoop(
                items,
                (item) => item % 2 === 0,
                (item, _index, context) => ({
                    output: { value: item },
                    context
                })
            );

            expect(filteredResults).toHaveLength(4);
            expect(skippedCount).toBe(0);
        });

        it("should filter objects by property", async () => {
            interface Product {
                name: string;
                inStock: boolean;
                price: number;
            }

            const products: Product[] = [
                { name: "Widget", inStock: true, price: 10 },
                { name: "Gadget", inStock: false, price: 20 },
                { name: "Gizmo", inStock: true, price: 15 },
                { name: "Doohickey", inStock: false, price: 5 }
            ];

            const { filteredResults } = await simulateFilterLoop(
                products,
                (product) => product.inStock,
                (product, _index, context) => ({
                    output: { name: product.name, price: product.price },
                    context
                })
            );

            expect(filteredResults).toEqual([
                { name: "Widget", price: 10 },
                { name: "Gizmo", price: 15 }
            ]);
        });

        it("should filter with complex conditions", async () => {
            interface Employee {
                name: string;
                department: string;
                salary: number;
                yearsOfService: number;
            }

            const employees: Employee[] = [
                { name: "Alice", department: "Engineering", salary: 80000, yearsOfService: 5 },
                { name: "Bob", department: "Sales", salary: 60000, yearsOfService: 3 },
                { name: "Charlie", department: "Engineering", salary: 90000, yearsOfService: 7 },
                { name: "Diana", department: "Marketing", salary: 55000, yearsOfService: 2 }
            ];

            const { filteredResults } = await simulateFilterLoop(
                employees,
                (emp) => emp.department === "Engineering" && emp.salary > 75000,
                (emp, _index, context) => ({
                    output: {
                        name: emp.name,
                        eligibleForBonus: emp.yearsOfService >= 5
                    },
                    context
                })
            );

            expect(filteredResults).toEqual([
                { name: "Alice", eligibleForBonus: true },
                { name: "Charlie", eligibleForBonus: true }
            ]);
        });
    });

    describe("conditional accumulation", () => {
        it("should conditionally accumulate values", async () => {
            const items = [
                { type: "income", amount: 1000 },
                { type: "expense", amount: 200 },
                { type: "income", amount: 500 },
                { type: "expense", amount: 100 },
                { type: "income", amount: 300 }
            ];

            const { context } = await simulateLoopWithConditional(
                items,
                (item) => item.type === "income",
                (item, _index, ctx) => {
                    const totalIncome = (getVariable(ctx, "totalIncome") as number) || 0;
                    return {
                        output: { type: "income", amount: item.amount },
                        context: setVariable(ctx, "totalIncome", totalIncome + item.amount)
                    };
                },
                (item, _index, ctx) => {
                    const totalExpenses = (getVariable(ctx, "totalExpenses") as number) || 0;
                    return {
                        output: { type: "expense", amount: item.amount },
                        context: setVariable(ctx, "totalExpenses", totalExpenses + item.amount)
                    };
                }
            );

            expect(getVariable(context, "totalIncome")).toBe(1800);
            expect(getVariable(context, "totalExpenses")).toBe(300);
        });

        it("should build separate lists based on condition", async () => {
            const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

            const { context } = await simulateLoopWithConditional(
                numbers,
                (num) => num <= 5,
                (num, _index, ctx) => {
                    const lowNumbers = (getVariable(ctx, "lowNumbers") as number[]) || [];
                    return {
                        output: { category: "low", value: num },
                        context: setVariable(ctx, "lowNumbers", [...lowNumbers, num])
                    };
                },
                (num, _index, ctx) => {
                    const highNumbers = (getVariable(ctx, "highNumbers") as number[]) || [];
                    return {
                        output: { category: "high", value: num },
                        context: setVariable(ctx, "highNumbers", [...highNumbers, num])
                    };
                }
            );

            expect(getVariable(context, "lowNumbers")).toEqual([1, 2, 3, 4, 5]);
            expect(getVariable(context, "highNumbers")).toEqual([6, 7, 8, 9, 10]);
        });
    });

    describe("nested conditional in loop", () => {
        it("should handle if-else-if pattern", async () => {
            const grades = [95, 85, 75, 65, 55, 45];

            const results: Array<{ score: number; grade: string }> = [];

            for (const score of grades) {
                let grade: string;
                if (score >= 90) {
                    grade = "A";
                } else if (score >= 80) {
                    grade = "B";
                } else if (score >= 70) {
                    grade = "C";
                } else if (score >= 60) {
                    grade = "D";
                } else {
                    grade = "F";
                }
                results.push({ score, grade });
            }

            expect(results).toEqual([
                { score: 95, grade: "A" },
                { score: 85, grade: "B" },
                { score: 75, grade: "C" },
                { score: 65, grade: "D" },
                { score: 55, grade: "F" },
                { score: 45, grade: "F" }
            ]);
        });

        it("should handle switch-like routing", async () => {
            type Action = { type: "create" | "update" | "delete"; id: string; data?: string };
            const actions: Action[] = [
                { type: "create", id: "1", data: "new" },
                { type: "update", id: "2", data: "modified" },
                { type: "delete", id: "3" },
                { type: "create", id: "4", data: "another" }
            ];

            const operations: string[] = [];

            for (const action of actions) {
                switch (action.type) {
                    case "create":
                        operations.push(`INSERT ${action.id}: ${action.data}`);
                        break;
                    case "update":
                        operations.push(`UPDATE ${action.id}: ${action.data}`);
                        break;
                    case "delete":
                        operations.push(`DELETE ${action.id}`);
                        break;
                }
            }

            expect(operations).toEqual([
                "INSERT 1: new",
                "UPDATE 2: modified",
                "DELETE 3",
                "INSERT 4: another"
            ]);
        });
    });

    describe("conditional with previous iteration results", () => {
        it("should condition on previous iteration output", async () => {
            const items = [5, 10, 3, 8, 2];
            const results: Array<{ value: number; comparison: string }> = [];

            let previousValue: number | null = null;

            for (const item of items) {
                let comparison: string;
                if (previousValue === null) {
                    comparison = "first";
                } else if (item > previousValue) {
                    comparison = "increasing";
                } else if (item < previousValue) {
                    comparison = "decreasing";
                } else {
                    comparison = "same";
                }
                results.push({ value: item, comparison });
                previousValue = item;
            }

            expect(results).toEqual([
                { value: 5, comparison: "first" },
                { value: 10, comparison: "increasing" },
                { value: 3, comparison: "decreasing" },
                { value: 8, comparison: "increasing" },
                { value: 2, comparison: "decreasing" }
            ]);
        });

        it("should detect streaks", async () => {
            const items = [1, 2, 3, 5, 6, 8, 9, 10];
            const streaks: Array<{ start: number; end: number; length: number }> = [];

            let streakStart = items[0];
            let streakLength = 1;

            for (let i = 1; i < items.length; i++) {
                if (items[i] === items[i - 1] + 1) {
                    streakLength++;
                } else {
                    if (streakLength >= 2) {
                        streaks.push({
                            start: streakStart,
                            end: items[i - 1],
                            length: streakLength
                        });
                    }
                    streakStart = items[i];
                    streakLength = 1;
                }
            }

            // Don't forget the last streak
            if (streakLength >= 2) {
                streaks.push({
                    start: streakStart,
                    end: items[items.length - 1],
                    length: streakLength
                });
            }

            expect(streaks).toEqual([
                { start: 1, end: 3, length: 3 },
                { start: 5, end: 6, length: 2 },
                { start: 8, end: 10, length: 3 }
            ]);
        });
    });

    describe("map-reduce patterns with conditionals", () => {
        it("should filter and sum in single pass", async () => {
            const transactions = [
                { category: "food", amount: 50 },
                { category: "transport", amount: 30 },
                { category: "food", amount: 25 },
                { category: "entertainment", amount: 100 },
                { category: "food", amount: 15 }
            ];

            const { context } = await simulateLoopWithConditional(
                transactions,
                (t) => t.category === "food",
                (t, _index, ctx) => {
                    const sum = (getVariable(ctx, "foodTotal") as number) || 0;
                    return {
                        output: { included: true, amount: t.amount },
                        context: setVariable(ctx, "foodTotal", sum + t.amount)
                    };
                },
                (_t, _index, ctx) => ({
                    output: { included: false },
                    context: ctx
                })
            );

            expect(getVariable(context, "foodTotal")).toBe(90);
        });

        it("should find min and max with conditions", async () => {
            const products = [
                { name: "A", price: 100, inStock: true },
                { name: "B", price: 50, inStock: false },
                { name: "C", price: 200, inStock: true },
                { name: "D", price: 75, inStock: true },
                { name: "E", price: 150, inStock: false }
            ];

            let minInStock = Infinity;
            let maxInStock = -Infinity;

            for (const product of products) {
                if (product.inStock) {
                    if (product.price < minInStock) minInStock = product.price;
                    if (product.price > maxInStock) maxInStock = product.price;
                }
            }

            expect(minInStock).toBe(75);
            expect(maxInStock).toBe(200);
        });

        it("should group by category", async () => {
            const items = [
                { id: 1, category: "A" },
                { id: 2, category: "B" },
                { id: 3, category: "A" },
                { id: 4, category: "C" },
                { id: 5, category: "B" }
            ];

            const grouped: Record<string, number[]> = {};

            for (const item of items) {
                if (!grouped[item.category]) {
                    grouped[item.category] = [];
                }
                grouped[item.category].push(item.id);
            }

            expect(grouped).toEqual({
                A: [1, 3],
                B: [2, 5],
                C: [4]
            });
        });
    });

    describe("error handling in conditional loops", () => {
        it("should handle errors differently based on condition", async () => {
            interface Task {
                id: string;
                critical: boolean;
                willFail: boolean;
            }

            const tasks: Task[] = [
                { id: "1", critical: true, willFail: false },
                { id: "2", critical: false, willFail: true },
                { id: "3", critical: true, willFail: true },
                { id: "4", critical: false, willFail: false }
            ];

            const results: Array<{ id: string; status: string }> = [];
            let shouldAbort = false;

            for (const task of tasks) {
                if (shouldAbort) {
                    results.push({ id: task.id, status: "skipped-due-to-abort" });
                    continue;
                }

                if (task.willFail) {
                    if (task.critical) {
                        results.push({ id: task.id, status: "critical-failure" });
                        shouldAbort = true;
                    } else {
                        results.push({ id: task.id, status: "non-critical-failure-continued" });
                    }
                } else {
                    results.push({ id: task.id, status: "success" });
                }
            }

            expect(results).toEqual([
                { id: "1", status: "success" },
                { id: "2", status: "non-critical-failure-continued" },
                { id: "3", status: "critical-failure" },
                { id: "4", status: "skipped-due-to-abort" }
            ]);
        });
    });
});
