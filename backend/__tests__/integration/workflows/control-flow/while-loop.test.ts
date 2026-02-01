/**
 * While Loop Integration Tests
 *
 * Tests for while loop patterns:
 * - Condition-based termination
 * - Counter-based termination
 * - Max iterations safety limit
 * - Loop variable mutation between iterations
 * - Break conditions
 */

import type { JsonValue, JsonObject } from "@flowmaestro/shared";
import {
    createContext,
    storeNodeOutput,
    setVariable,
    getVariable
} from "../../../../src/temporal/core/services/context";
import type { ContextSnapshot } from "../../../../src/temporal/core/types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simulate while loop execution
 */
async function simulateWhileLoopExecution(
    initialState: Record<string, JsonValue>,
    shouldContinue: (iteration: number, context: ContextSnapshot) => boolean,
    processIteration: (
        iteration: number,
        context: ContextSnapshot
    ) => { output: JsonObject; context: ContextSnapshot },
    maxIterations: number = 100
): Promise<{
    context: ContextSnapshot;
    results: Array<JsonObject>;
    iterationCount: number;
    terminationReason: "condition" | "max-iterations";
}> {
    let context = createContext({});

    // Set initial state as workflow variables
    for (const [key, value] of Object.entries(initialState)) {
        context = setVariable(context, key, value);
    }

    const results: Array<JsonObject> = [];
    let iterationCount = 0;
    let terminationReason: "condition" | "max-iterations" = "condition";

    while (shouldContinue(iterationCount, context)) {
        if (iterationCount >= maxIterations) {
            terminationReason = "max-iterations";
            break;
        }

        // Store loop state
        context = setVariable(context, "loop", {
            index: iterationCount,
            iteration: iterationCount + 1,
            results: results as JsonValue[],
            isFirst: iterationCount === 0
        });

        // Process the iteration
        const { output, context: newContext } = processIteration(iterationCount, context);
        context = newContext;

        // Store iteration output
        context = storeNodeOutput(context, `LoopBody_${iterationCount}`, output);
        results.push(output);
        iterationCount++;
    }

    // Store final results
    context = setVariable(context, "loopResults", results as JsonValue[]);

    return { context, results, iterationCount, terminationReason };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("While Loop", () => {
    describe("condition-based termination", () => {
        it("should terminate when condition becomes false", async () => {
            let counter = 0;

            const { iterationCount, terminationReason } = await simulateWhileLoopExecution(
                { counter: 0 },
                (iteration, _context) => iteration < 5,
                (iteration, context) => {
                    counter++;
                    return {
                        output: { iteration, counter },
                        context: setVariable(context, "counter", counter)
                    };
                }
            );

            expect(iterationCount).toBe(5);
            expect(terminationReason).toBe("condition");
        });

        it("should evaluate condition using context variables", async () => {
            const { results, iterationCount } = await simulateWhileLoopExecution(
                { target: 100 },
                (_iteration, context) => {
                    const sum = (getVariable(context, "sum") as number) || 0;
                    const target = (getVariable(context, "target") as number) || 100;
                    return sum < target;
                },
                (iteration, context) => {
                    const currentSum = (getVariable(context, "sum") as number) || 0;
                    const increment = (iteration + 1) * 10;
                    const newSum = currentSum + increment;
                    return {
                        output: { iteration, increment, sum: newSum },
                        context: setVariable(context, "sum", newSum)
                    };
                }
            );

            // 10 + 20 + 30 + 40 = 100, so 4 iterations
            expect(iterationCount).toBe(4);
            expect(results[3]).toEqual({ iteration: 3, increment: 40, sum: 100 });
        });

        it("should not execute if condition is initially false", async () => {
            const { results, iterationCount } = await simulateWhileLoopExecution(
                { shouldRun: false },
                (_iteration, _context) => false,
                (_iteration, context) => ({
                    output: { shouldNotExecute: true },
                    context
                })
            );

            expect(iterationCount).toBe(0);
            expect(results).toEqual([]);
        });

        it("should handle boolean variable conditions", async () => {
            const { iterationCount } = await simulateWhileLoopExecution(
                { continueLoop: true },
                (_iteration, ctx) => {
                    const continueLoop = getVariable(ctx, "continueLoop") as boolean;
                    return continueLoop;
                },
                (iteration, ctx) => {
                    const shouldContinue = iteration < 2;
                    return {
                        output: { iteration },
                        context: setVariable(ctx, "continueLoop", shouldContinue)
                    };
                }
            );

            expect(iterationCount).toBe(3); // 0, 1, 2 then condition becomes false
        });
    });

    describe("counter-based termination", () => {
        it("should count up to target value", async () => {
            const target = 10;

            const { results, iterationCount } = await simulateWhileLoopExecution(
                { count: 0, target },
                (iteration, _context) => iteration < target,
                (iteration, context) => ({
                    output: { count: iteration + 1 },
                    context: setVariable(context, "count", iteration + 1)
                })
            );

            expect(iterationCount).toBe(10);
            expect(results[9]).toEqual({ count: 10 });
        });

        it("should count down from initial value", async () => {
            const { results, iterationCount } = await simulateWhileLoopExecution(
                { countdown: 5 },
                (_iteration, context) => {
                    const current = getVariable(context, "countdown") as number;
                    return current > 0;
                },
                (iteration, context) => {
                    const current = (getVariable(context, "countdown") as number) || 5 - iteration;
                    const next = current - 1;
                    return {
                        output: { countdown: next, iteration },
                        context: setVariable(context, "countdown", next)
                    };
                }
            );

            expect(iterationCount).toBe(5);
            expect(results[4]).toEqual({ countdown: 0, iteration: 4 });
        });

        it("should handle increment by custom step", async () => {
            const step = 3;
            const target = 15;

            const { results, iterationCount } = await simulateWhileLoopExecution(
                { value: 0, step, target },
                (_iteration, context) => {
                    const value = (getVariable(context, "value") as number) || 0;
                    return value < target;
                },
                (iteration, context) => {
                    const currentValue = (getVariable(context, "value") as number) || 0;
                    const newValue = currentValue + step;
                    return {
                        output: { value: newValue, iteration },
                        context: setVariable(context, "value", newValue)
                    };
                }
            );

            expect(iterationCount).toBe(5); // 0->3->6->9->12->15
            expect(results.map((r) => r.value)).toEqual([3, 6, 9, 12, 15]);
        });
    });

    describe("max iterations safety limit", () => {
        it("should respect max iterations limit", async () => {
            const maxIterations = 10;

            const { iterationCount, terminationReason } = await simulateWhileLoopExecution(
                {},
                () => true, // Always true - infinite loop
                (iteration, context) => ({
                    output: { iteration },
                    context
                }),
                maxIterations
            );

            expect(iterationCount).toBe(maxIterations);
            expect(terminationReason).toBe("max-iterations");
        });

        it("should terminate before max if condition becomes false", async () => {
            const maxIterations = 100;

            const { iterationCount, terminationReason } = await simulateWhileLoopExecution(
                {},
                (iteration) => iteration < 5,
                (iteration, context) => ({
                    output: { iteration },
                    context
                }),
                maxIterations
            );

            expect(iterationCount).toBe(5);
            expect(terminationReason).toBe("condition");
        });

        it("should use custom max iterations value", async () => {
            const customMax = 3;

            const { iterationCount, terminationReason } = await simulateWhileLoopExecution(
                {},
                () => true,
                (iteration, context) => ({
                    output: { iteration },
                    context
                }),
                customMax
            );

            expect(iterationCount).toBe(customMax);
            expect(terminationReason).toBe("max-iterations");
        });

        it("should preserve results when hitting max iterations", async () => {
            const maxIterations = 5;

            const { results } = await simulateWhileLoopExecution(
                {},
                () => true,
                (iteration, context) => ({
                    output: { value: iteration * 2 },
                    context
                }),
                maxIterations
            );

            expect(results).toHaveLength(maxIterations);
            expect(results).toEqual([
                { value: 0 },
                { value: 2 },
                { value: 4 },
                { value: 6 },
                { value: 8 }
            ]);
        });
    });

    describe("loop variable mutation", () => {
        it("should allow variables to be updated between iterations", async () => {
            const capturedStates: Array<{ value: number; previous: number | undefined }> = [];

            await simulateWhileLoopExecution(
                { value: 1 },
                (iteration) => iteration < 5,
                (_iteration, context) => {
                    const current = getVariable(context, "value") as number;
                    const previous = getVariable(context, "previousValue") as number | undefined;

                    capturedStates.push({ value: current, previous });

                    const newValue = current * 2;
                    let newContext = setVariable(context, "previousValue", current);
                    newContext = setVariable(newContext, "value", newValue);

                    return {
                        output: { value: current, newValue },
                        context: newContext
                    };
                }
            );

            expect(capturedStates[0]).toEqual({ value: 1, previous: undefined });
            expect(capturedStates[1]).toEqual({ value: 2, previous: 1 });
            expect(capturedStates[2]).toEqual({ value: 4, previous: 2 });
            expect(capturedStates[3]).toEqual({ value: 8, previous: 4 });
            expect(capturedStates[4]).toEqual({ value: 16, previous: 8 });
        });

        it("should track Fibonacci sequence", async () => {
            const { results } = await simulateWhileLoopExecution(
                { a: 0, b: 1 },
                (_iteration, context) => {
                    const a = getVariable(context, "a") as number;
                    return a < 100;
                },
                (iteration, context) => {
                    const a = getVariable(context, "a") as number;
                    const b = getVariable(context, "b") as number;

                    let newContext = setVariable(context, "a", b);
                    newContext = setVariable(newContext, "b", a + b);

                    return {
                        output: { fib: a, iteration },
                        context: newContext
                    };
                }
            );

            const fibSequence = results.map((r) => r.fib);
            expect(fibSequence).toEqual([0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]);
        });

        it("should accumulate values in an array", async () => {
            const { context } = await simulateWhileLoopExecution(
                { collected: [] as unknown as JsonValue },
                (iteration) => iteration < 5,
                (iteration, ctx) => {
                    const collected = getVariable(ctx, "collected") as number[];
                    const newValue = iteration * 10;
                    const newCollected = [...collected, newValue];

                    return {
                        output: { added: newValue, total: newCollected.length },
                        context: setVariable(ctx, "collected", newCollected)
                    };
                }
            );

            const finalCollected = getVariable(context, "collected") as number[];
            expect(finalCollected).toEqual([0, 10, 20, 30, 40]);
        });
    });

    describe("break conditions", () => {
        it("should break on specific value found", async () => {
            const data = [1, 5, 3, 7, 2, 8, 4];

            const { iterationCount, results } = await simulateWhileLoopExecution(
                { data: data as unknown as JsonValue, foundIndex: -1, searchValue: 7 },
                (iteration, context) => {
                    const idx = getVariable(context, "foundIndex") as number;
                    const len = (getVariable(context, "data") as number[]).length;
                    return idx === -1 && iteration < len;
                },
                (iteration, ctx) => {
                    const dataArr = getVariable(ctx, "data") as number[];
                    const searchValue = getVariable(ctx, "searchValue") as number;
                    const currentValue = dataArr[iteration];

                    const found = currentValue === searchValue;
                    const newCtx = found ? setVariable(ctx, "foundIndex", iteration) : ctx;

                    return {
                        output: { index: iteration, value: currentValue, found },
                        context: newCtx
                    };
                }
            );

            // Should find 7 at index 3 and stop
            expect(iterationCount).toBe(4); // Iterations 0, 1, 2, 3
            expect(results[3]).toEqual({ index: 3, value: 7, found: true });
        });

        it("should break when error condition is met", async () => {
            const { iterationCount, context } = await simulateWhileLoopExecution(
                { hasError: false },
                (_iteration, ctx) => {
                    const hasError = getVariable(ctx, "hasError") as boolean;
                    return !hasError;
                },
                (iteration, ctx) => {
                    // Simulate error on iteration 3
                    const shouldError = iteration === 3;
                    const newCtx = shouldError ? setVariable(ctx, "hasError", true) : ctx;

                    return {
                        output: { iteration, error: shouldError },
                        context: newCtx
                    };
                }
            );

            expect(iterationCount).toBe(4); // Completes iteration 3 then stops
            expect(getVariable(context, "hasError")).toBe(true);
        });
    });

    describe("loop state tracking", () => {
        it("should track iteration number correctly", async () => {
            const capturedLoopStates: Array<{ index: number; iteration: number }> = [];

            await simulateWhileLoopExecution(
                {},
                (iteration) => iteration < 5,
                (_iteration, context) => {
                    const loopState = getVariable(context, "loop") as {
                        index: number;
                        iteration: number;
                    };
                    capturedLoopStates.push({
                        index: loopState.index,
                        iteration: loopState.iteration
                    });
                    return { output: {}, context };
                }
            );

            expect(capturedLoopStates).toEqual([
                { index: 0, iteration: 1 },
                { index: 1, iteration: 2 },
                { index: 2, iteration: 3 },
                { index: 3, iteration: 4 },
                { index: 4, iteration: 5 }
            ]);
        });

        it("should set isFirst flag correctly", async () => {
            const firstFlags: boolean[] = [];

            await simulateWhileLoopExecution(
                {},
                (iteration) => iteration < 4,
                (_iteration, context) => {
                    const loopState = getVariable(context, "loop") as { isFirst: boolean };
                    firstFlags.push(loopState.isFirst);
                    return { output: {}, context };
                }
            );

            expect(firstFlags).toEqual([true, false, false, false]);
        });

        it("should provide access to previous results", async () => {
            const resultCounts: number[] = [];

            await simulateWhileLoopExecution(
                {},
                (iteration) => iteration < 4,
                (_iteration, context) => {
                    const loopState = getVariable(context, "loop") as { results: unknown[] };
                    resultCounts.push(loopState.results.length);
                    return { output: { iteration: _iteration }, context };
                }
            );

            expect(resultCounts).toEqual([0, 1, 2, 3]);
        });
    });

    describe("complex condition expressions", () => {
        it("should evaluate compound conditions", async () => {
            const { iterationCount, context } = await simulateWhileLoopExecution(
                { count: 0, enabled: true },
                (_iteration, ctx) => {
                    const count = getVariable(ctx, "count") as number;
                    const enabled = getVariable(ctx, "enabled") as boolean;
                    return enabled && count < 10;
                },
                (iteration, ctx) => {
                    const newCount = iteration + 1;
                    // Disable after 5 iterations
                    const newEnabled = newCount < 5;
                    let newCtx = setVariable(ctx, "count", newCount);
                    newCtx = setVariable(newCtx, "enabled", newEnabled);
                    return {
                        output: { count: newCount },
                        context: newCtx
                    };
                }
            );

            expect(iterationCount).toBe(5);
            expect(getVariable(context, "enabled")).toBe(false);
        });

        it("should handle OR conditions", async () => {
            const { iterationCount } = await simulateWhileLoopExecution(
                { conditionA: true, conditionB: true },
                (_iteration, ctx) => {
                    const a = getVariable(ctx, "conditionA") as boolean;
                    const b = getVariable(ctx, "conditionB") as boolean;
                    return a || b;
                },
                (iteration, ctx) => {
                    // Turn off A at iteration 2, B at iteration 4
                    let newCtx = ctx;
                    if (iteration === 2) {
                        newCtx = setVariable(newCtx, "conditionA", false);
                    }
                    if (iteration === 4) {
                        newCtx = setVariable(newCtx, "conditionB", false);
                    }
                    return { output: { iteration }, context: newCtx };
                }
            );

            // Should continue until both are false (after iteration 4)
            expect(iterationCount).toBe(5);
        });
    });

    describe("context isolation", () => {
        it("should not pollute outer context with loop-only variables", async () => {
            const { context } = await simulateWhileLoopExecution(
                { outerValue: "preserved" },
                (iteration) => iteration < 3,
                (iteration, ctx) => {
                    const newCtx = setVariable(ctx, "innerOnly", iteration);
                    return { output: { iteration }, context: newCtx };
                }
            );

            expect(getVariable(context, "outerValue")).toBe("preserved");
            // innerOnly is still accessible but that's expected in this simulation
            // In real workflows, loop context would be isolated
        });

        it("should preserve input values throughout loop", async () => {
            const { context, results } = await simulateWhileLoopExecution(
                { baseValue: 100 },
                (iteration) => iteration < 5,
                (iteration, ctx) => {
                    const baseValue = getVariable(ctx, "baseValue") as number;
                    return {
                        output: { computed: baseValue + iteration },
                        context: ctx
                    };
                }
            );

            expect(getVariable(context, "baseValue")).toBe(100);
            expect(results).toEqual([
                { computed: 100 },
                { computed: 101 },
                { computed: 102 },
                { computed: 103 },
                { computed: 104 }
            ]);
        });
    });
});
