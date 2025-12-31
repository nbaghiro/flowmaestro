/**
 * Loop Execution Integration Tests
 *
 * Tests for loop workflow execution behavior including:
 * - Iteration state management
 * - Loop termination conditions
 * - Nested loops
 * - Context accumulation across iterations
 */

import {
    createContext,
    storeNodeOutput,
    setVariable,
    getVariable,
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    resetNodeForIteration,
    resetNodesForIteration
} from "../../../../src/temporal/core/services/context";
import {
    createLoopState,
    createLoopStateWithResults,
    deepCloneContext
} from "../../../fixtures/contexts";
import { createLoopWorkflow, createLinearWorkflow } from "../../../fixtures/workflows";

describe("Loop Execution", () => {
    describe("iteration state", () => {
        it("should isolate loop.index per iteration", () => {
            const context = createContext({});

            // Simulate 3 iterations with different loop states
            const iterations: ContextSnapshot[] = [];

            for (let i = 0; i < 3; i++) {
                let iterContext = deepCloneContext(context);
                const loopState = createLoopState(i, 3, `item-${i}`);

                // Store iteration-specific output
                iterContext = storeNodeOutput(iterContext, `Iteration_${i}`, {
                    index: loopState.index,
                    item: loopState.item,
                    isFirst: loopState.isFirst,
                    isLast: loopState.isLast
                });

                iterations.push(iterContext);
            }

            // Each iteration should have its own index
            expect(iterations[0].nodeOutputs.get("Iteration_0")?.index).toBe(0);
            expect(iterations[1].nodeOutputs.get("Iteration_1")?.index).toBe(1);
            expect(iterations[2].nodeOutputs.get("Iteration_2")?.index).toBe(2);

            // First/last flags should be correct
            expect(iterations[0].nodeOutputs.get("Iteration_0")?.isFirst).toBe(true);
            expect(iterations[0].nodeOutputs.get("Iteration_0")?.isLast).toBe(false);
            expect(iterations[2].nodeOutputs.get("Iteration_2")?.isFirst).toBe(false);
            expect(iterations[2].nodeOutputs.get("Iteration_2")?.isLast).toBe(true);
        });

        it("should not corrupt iteration variables across loops", () => {
            let context = createContext({});

            // First loop
            const loop1State = createLoopState(0, 5, "loop1-item");
            context = storeNodeOutput(context, "Loop1_Iter0", {
                loopId: "loop1",
                index: loop1State.index,
                item: loop1State.item
            });

            // Second loop (different loop)
            const loop2State = createLoopState(2, 10, "loop2-item");
            context = storeNodeOutput(context, "Loop2_Iter2", {
                loopId: "loop2",
                index: loop2State.index,
                item: loop2State.item
            });

            // Both loop outputs should be independent
            const loop1Output = context.nodeOutputs.get("Loop1_Iter0");
            const loop2Output = context.nodeOutputs.get("Loop2_Iter2");

            expect(loop1Output?.index).toBe(0);
            expect(loop1Output?.item).toBe("loop1-item");
            expect(loop2Output?.index).toBe(2);
            expect(loop2Output?.item).toBe("loop2-item");
        });

        it("should make loop.item available for foreach loops", () => {
            const items = ["apple", "banana", "cherry"];
            let context = createContext({ items });

            for (let i = 0; i < items.length; i++) {
                const loopState = createLoopState(i, items.length, items[i]);

                context = storeNodeOutput(context, `Process_${i}`, {
                    processedItem: `processed-${loopState.item}`,
                    originalIndex: loopState.index
                });
            }

            // Verify each item was processed
            expect(context.nodeOutputs.get("Process_0")?.processedItem).toBe("processed-apple");
            expect(context.nodeOutputs.get("Process_1")?.processedItem).toBe("processed-banana");
            expect(context.nodeOutputs.get("Process_2")?.processedItem).toBe("processed-cherry");
        });

        it("should update loop.total correctly", () => {
            const loopState3 = createLoopState(0, 3);
            const loopState5 = createLoopState(0, 5);
            const loopState10 = createLoopState(0, 10);

            expect(loopState3.total).toBe(3);
            expect(loopState5.total).toBe(5);
            expect(loopState10.total).toBe(10);
        });
    });

    describe("loop termination", () => {
        it("should terminate when max iterations reached", () => {
            const workflow = createLoopWorkflow();
            let queue = initializeQueue(workflow);
            const maxIterations = 5;

            // Execute A
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            // Execute LoopStart
            queue = markExecuting(queue, ["LoopStart"]);
            queue = markCompleted(queue, "LoopStart", { loopInitialized: true }, workflow);

            // Simulate iterations
            for (let i = 0; i < maxIterations; i++) {
                // Reset body node for next iteration (if not first)
                if (i > 0) {
                    queue = resetNodeForIteration(queue, "Body");
                }

                // Execute Body
                queue = markExecuting(queue, ["Body"]);
                queue = markCompleted(queue, "Body", { iteration: i }, workflow);

                // Reset LoopEnd for iteration
                if (i > 0) {
                    queue = resetNodeForIteration(queue, "LoopEnd");
                }

                // Execute LoopEnd - checks if should continue
                queue = markExecuting(queue, ["LoopEnd"]);
                const shouldContinue = i < maxIterations - 1;
                queue = markCompleted(
                    queue,
                    "LoopEnd",
                    { continueLoop: shouldContinue, iteration: i },
                    workflow
                );
            }

            // After max iterations, B should be ready
            const ready = getReadyNodes(queue, 10);
            expect(ready).toContain("B");
        });

        it("should terminate when condition becomes false", () => {
            let context = createContext({ shouldContinue: true });
            let iterationCount = 0;
            const maxAllowed = 10;

            // Simulate condition-based termination
            while (iterationCount < maxAllowed) {
                const _loopState = createLoopState(iterationCount, maxAllowed);

                context = storeNodeOutput(context, `Iter_${iterationCount}`, {
                    index: iterationCount,
                    value: iterationCount * 2
                });

                iterationCount++;

                // Condition: stop when value >= 6 (iteration 3)
                const lastOutput = context.nodeOutputs.get(`Iter_${iterationCount - 1}`);
                if ((lastOutput?.value as number) >= 6) {
                    break;
                }
            }

            expect(iterationCount).toBe(4); // 0, 1, 2, 3 (stops at 3 when value = 6)
            expect(context.nodeOutputs.size).toBe(4);
        });

        it("should handle break conditions", () => {
            let context = createContext({});
            const items = ["keep", "keep", "break", "skip", "skip"];
            let brokeEarly = false;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                if (item === "break") {
                    context = storeNodeOutput(context, "BreakPoint", {
                        breakAt: i,
                        reason: "break-condition-met"
                    });
                    brokeEarly = true;
                    break;
                }

                context = storeNodeOutput(context, `Process_${i}`, {
                    item,
                    processed: true
                });
            }

            expect(brokeEarly).toBe(true);
            expect(context.nodeOutputs.has("BreakPoint")).toBe(true);
            expect(context.nodeOutputs.has("Process_0")).toBe(true);
            expect(context.nodeOutputs.has("Process_1")).toBe(true);
            expect(context.nodeOutputs.has("Process_2")).toBe(false); // break item
            expect(context.nodeOutputs.has("Process_3")).toBe(false); // skipped
        });

        it("should handle empty iteration list", () => {
            const items: string[] = [];
            let context = createContext({ items });
            let executed = false;

            for (const item of items) {
                executed = true;
                context = storeNodeOutput(context, "ShouldNotExecute", { item });
            }

            expect(executed).toBe(false);
            expect(context.nodeOutputs.size).toBe(0);
        });
    });

    describe("nested loops", () => {
        it("should maintain separate iteration state for nested loops", () => {
            let context = createContext({});
            const results: Array<{ outer: number; inner: number }> = [];

            // Outer loop
            for (let outer = 0; outer < 2; outer++) {
                const outerState = createLoopState(outer, 2, `outer-${outer}`);

                // Inner loop
                for (let inner = 0; inner < 3; inner++) {
                    const innerState = createLoopState(inner, 3, `inner-${inner}`);

                    results.push({ outer: outerState.index, inner: innerState.index });

                    context = storeNodeOutput(context, `Nested_${outer}_${inner}`, {
                        outerIndex: outerState.index,
                        innerIndex: innerState.index,
                        outerItem: outerState.item,
                        innerItem: innerState.item
                    });
                }
            }

            // Should have 2 * 3 = 6 outputs
            expect(context.nodeOutputs.size).toBe(6);
            expect(results).toEqual([
                { outer: 0, inner: 0 },
                { outer: 0, inner: 1 },
                { outer: 0, inner: 2 },
                { outer: 1, inner: 0 },
                { outer: 1, inner: 1 },
                { outer: 1, inner: 2 }
            ]);
        });

        it("should allow inner loop to access outer loop context", () => {
            let context = createContext({});
            const outerItems = ["A", "B"];
            const innerItems = [1, 2, 3];

            for (let o = 0; o < outerItems.length; o++) {
                const _outerState = createLoopState(o, outerItems.length, outerItems[o]);

                // Store outer loop state in context
                context = setVariable(context, "currentOuter", outerItems[o]);

                for (let i = 0; i < innerItems.length; i++) {
                    const innerState = createLoopState(i, innerItems.length, innerItems[i]);

                    // Inner loop can access outer loop's context
                    const outerValue = getVariable(context, "currentOuter");

                    context = storeNodeOutput(context, `Combined_${o}_${i}`, {
                        combined: `${outerValue}-${innerState.item}`,
                        outerFromContext: outerValue
                    });
                }
            }

            // Verify inner loop accessed outer context
            expect(context.nodeOutputs.get("Combined_0_0")?.combined).toBe("A-1");
            expect(context.nodeOutputs.get("Combined_1_2")?.combined).toBe("B-3");
        });
    });

    describe("context accumulation", () => {
        it("should accumulate outputs across iterations", () => {
            let context = createContext({});
            const accumulated: number[] = [];

            for (let i = 0; i < 5; i++) {
                const value = i * 10;
                accumulated.push(value);

                context = storeNodeOutput(context, `Accumulate_${i}`, {
                    value,
                    runningTotal: accumulated.reduce((a, b) => a + b, 0)
                });

                // Also store running results in a variable
                context = setVariable(context, "accumulatedResults", [...accumulated]);
            }

            // All iteration outputs should be available
            expect(context.nodeOutputs.size).toBe(5);

            // Running totals should be correct
            expect(context.nodeOutputs.get("Accumulate_0")?.runningTotal).toBe(0);
            expect(context.nodeOutputs.get("Accumulate_1")?.runningTotal).toBe(10);
            expect(context.nodeOutputs.get("Accumulate_2")?.runningTotal).toBe(30);
            expect(context.nodeOutputs.get("Accumulate_4")?.runningTotal).toBe(100);

            // Final accumulated results
            const finalResults = getVariable(context, "accumulatedResults") as number[];
            expect(finalResults).toEqual([0, 10, 20, 30, 40]);
        });

        it("should preserve previous iteration outputs", () => {
            let context = createContext({});

            // First iteration
            context = storeNodeOutput(context, "Iter_0", { data: "first" });

            // Second iteration - should not overwrite first
            context = storeNodeOutput(context, "Iter_1", { data: "second" });

            // Third iteration
            context = storeNodeOutput(context, "Iter_2", { data: "third" });

            // All outputs should be preserved
            expect(context.nodeOutputs.get("Iter_0")?.data).toBe("first");
            expect(context.nodeOutputs.get("Iter_1")?.data).toBe("second");
            expect(context.nodeOutputs.get("Iter_2")?.data).toBe("third");
        });

        it("should handle large iteration counts", () => {
            let context = createContext({});
            const iterationCount = 100;

            for (let i = 0; i < iterationCount; i++) {
                context = storeNodeOutput(context, `Large_${i}`, {
                    index: i,
                    squared: i * i
                });
            }

            expect(context.nodeOutputs.size).toBe(iterationCount);
            expect(context.nodeOutputs.get("Large_0")?.squared).toBe(0);
            expect(context.nodeOutputs.get("Large_50")?.squared).toBe(2500);
            expect(context.nodeOutputs.get("Large_99")?.squared).toBe(9801);
        });
    });

    describe("loop with results aggregation", () => {
        it("should aggregate results using loop state with results", () => {
            const items = ["a", "b", "c"];
            const allResults: string[] = [];

            for (let i = 0; i < items.length; i++) {
                const result = items[i].toUpperCase();
                allResults.push(result);

                const loopState = createLoopStateWithResults(i, items.length, items[i], [
                    ...allResults
                ]);

                expect(loopState.results).toEqual(allResults);
            }

            expect(allResults).toEqual(["A", "B", "C"]);
        });

        it("should handle loop with filtering", () => {
            let context = createContext({});
            const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            const filtered: number[] = [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                // Only keep even numbers
                if (item % 2 === 0) {
                    filtered.push(item);
                    context = storeNodeOutput(context, `Even_${item}`, {
                        value: item,
                        filteredIndex: filtered.length - 1
                    });
                }
            }

            // Should have 5 even numbers
            expect(filtered).toEqual([2, 4, 6, 8, 10]);
            expect(context.nodeOutputs.size).toBe(5);
        });

        it("should handle loop with transformation and accumulation", () => {
            let context = createContext({});
            const items = [
                { name: "Alice", score: 85 },
                { name: "Bob", score: 92 },
                { name: "Charlie", score: 78 }
            ];
            let totalScore = 0;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                totalScore += item.score;

                const _loopState = createLoopState(i, items.length, item);

                context = storeNodeOutput(context, `Student_${i}`, {
                    name: item.name,
                    score: item.score,
                    runningAverage: totalScore / (i + 1),
                    isAboveAverage: item.score > totalScore / (i + 1)
                });
            }

            // Verify transformations
            expect(context.nodeOutputs.get("Student_0")?.runningAverage).toBe(85);
            expect(context.nodeOutputs.get("Student_1")?.runningAverage).toBe(88.5);
            expect(context.nodeOutputs.get("Student_2")?.runningAverage).toBe(85);
        });
    });

    describe("queue state reset for iterations", () => {
        it("should reset single node for iteration", () => {
            const workflow = createLinearWorkflow();
            let queue = initializeQueue(workflow);

            // Execute A and B
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);
            queue = markExecuting(queue, ["B"]);
            queue = markCompleted(queue, "B", {}, workflow);

            // B is now completed
            expect(queue.completed.has("B")).toBe(true);

            // Reset B for next iteration
            queue = resetNodeForIteration(queue, "B");

            // B should be back to pending (not ready - that depends on dependencies)
            expect(queue.completed.has("B")).toBe(false);
            expect(queue.pending.has("B")).toBe(true);
        });

        it("should reset multiple nodes for iteration", () => {
            const workflow = createLoopWorkflow();
            let queue = initializeQueue(workflow);

            // Execute through loop once
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);
            queue = markExecuting(queue, ["LoopStart"]);
            queue = markCompleted(queue, "LoopStart", {}, workflow);
            queue = markExecuting(queue, ["Body"]);
            queue = markCompleted(queue, "Body", {}, workflow);
            queue = markExecuting(queue, ["LoopEnd"]);
            queue = markCompleted(queue, "LoopEnd", {}, workflow);

            // Reset loop body nodes for next iteration
            queue = resetNodesForIteration(queue, ["Body", "LoopEnd"]);

            // Both should be reset to pending
            expect(queue.completed.has("Body")).toBe(false);
            expect(queue.completed.has("LoopEnd")).toBe(false);
            expect(queue.pending.has("Body")).toBe(true);
            expect(queue.pending.has("LoopEnd")).toBe(true);
        });
    });
});
