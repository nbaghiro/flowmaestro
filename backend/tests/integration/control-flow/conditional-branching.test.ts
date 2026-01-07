/**
 * Conditional Branching Integration Tests
 *
 * Tests for conditional workflow execution behavior including:
 * - Branch selection based on condition evaluation
 * - Nested conditionals
 * - Context handling in branches
 * - Edge cases
 */

import {
    createContext,
    storeNodeOutput,
    setVariable,
    getExecutionContext,
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    markSkipped,
    isExecutionComplete,
    getExecutionSummary
} from "../../../src/temporal/core/services/context";
import { deepCloneContext } from "../../fixtures/contexts";
import { createConditionalWorkflow, createComplexWorkflow } from "../../fixtures/workflows";

describe("Conditional Branching", () => {
    describe("branch selection", () => {
        it("should execute true branch when condition is true", () => {
            const workflow = createConditionalWorkflow();
            let queue = initializeQueue(workflow);
            let context = createContext({ value: 15 }); // > 10, so true branch

            // Execute A
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", { value: 15 }, workflow);
            context = storeNodeOutput(context, "A", { value: 15 });

            // Execute Cond - evaluates to true
            queue = markExecuting(queue, ["Cond"]);
            // Simulate condition evaluation: value > 10 = true
            queue = markCompleted(
                queue,
                "Cond",
                { result: true, selectedBranch: "true" },
                workflow
            );
            context = storeNodeOutput(context, "Cond", { result: true, selectedBranch: "true" });

            // Skip false branch (C)
            queue = markSkipped(queue, "C", workflow);

            // B should be ready (true branch)
            let ready = getReadyNodes(queue, 10);
            expect(ready).toContain("B");
            expect(ready).not.toContain("C");

            // Execute B
            queue = markExecuting(queue, ["B"]);
            queue = markCompleted(queue, "B", { transformed: "true-result" }, workflow);
            context = storeNodeOutput(context, "B", { transformed: "true-result" });

            // D should be ready
            ready = getReadyNodes(queue, 10);
            expect(ready).toContain("D");

            // Verify state
            expect(queue.completed.has("B")).toBe(true);
            expect(queue.skipped.has("C")).toBe(true);
            expect(context.nodeOutputs.get("B")).toEqual({ transformed: "true-result" });
        });

        it("should execute false branch when condition is false", () => {
            const workflow = createConditionalWorkflow();
            let queue = initializeQueue(workflow);
            let context = createContext({ value: 5 }); // <= 10, so false branch

            // Execute A
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", { value: 5 }, workflow);
            context = storeNodeOutput(context, "A", { value: 5 });

            // Execute Cond - evaluates to false
            queue = markExecuting(queue, ["Cond"]);
            queue = markCompleted(
                queue,
                "Cond",
                { result: false, selectedBranch: "false" },
                workflow
            );
            context = storeNodeOutput(context, "Cond", { result: false, selectedBranch: "false" });

            // Skip true branch (B)
            queue = markSkipped(queue, "B", workflow);

            // C should be ready (false branch)
            const ready = getReadyNodes(queue, 10);
            expect(ready).toContain("C");
            expect(ready).not.toContain("B");

            // Execute C
            queue = markExecuting(queue, ["C"]);
            queue = markCompleted(queue, "C", { transformed: "false-result" }, workflow);
            context = storeNodeOutput(context, "C", { transformed: "false-result" });

            // Verify state
            expect(queue.completed.has("C")).toBe(true);
            expect(queue.skipped.has("B")).toBe(true);
            expect(context.nodeOutputs.get("C")).toEqual({ transformed: "false-result" });
        });

        it("should skip inactive branch nodes entirely", () => {
            const workflow = createConditionalWorkflow();
            let queue = initializeQueue(workflow);

            // Execute A and Cond
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);
            queue = markExecuting(queue, ["Cond"]);
            queue = markCompleted(queue, "Cond", { result: true }, workflow);

            // Skip C (false branch)
            queue = markSkipped(queue, "C", workflow);

            // Execute B and D
            queue = markExecuting(queue, ["B"]);
            queue = markCompleted(queue, "B", {}, workflow);
            queue = markExecuting(queue, ["D"]);
            queue = markCompleted(queue, "D", {}, workflow);

            // Verify completion
            expect(isExecutionComplete(queue)).toBe(true);

            const summary = getExecutionSummary(queue);
            expect(summary.completed).toBe(4); // A, Cond, B, D
            expect(summary.skipped).toBe(1); // C
        });
    });

    describe("nested conditionals", () => {
        it("should handle nested if/else correctly", () => {
            const workflow = createComplexWorkflow();
            let queue = initializeQueue(workflow);
            let context = createContext({});

            // Execute Start
            queue = markExecuting(queue, ["Start"]);
            queue = markCompleted(queue, "Start", { initialized: true }, workflow);
            context = storeNodeOutput(context, "Start", { initialized: true });

            // Cond1 and P1 should be ready (parallel from Start)
            let ready = getReadyNodes(queue, 10);
            expect(ready).toContain("Cond1");
            expect(ready).toContain("P1");

            // Execute Cond1 - takes true branch
            queue = markExecuting(queue, ["Cond1"]);
            queue = markCompleted(queue, "Cond1", { result: true }, workflow);
            context = storeNodeOutput(context, "Cond1", { result: true });

            // Skip F1 (false branch of Cond1)
            queue = markSkipped(queue, "F1", workflow);

            // Execute T1 (true branch of Cond1)
            queue = markExecuting(queue, ["T1"]);
            queue = markCompleted(queue, "T1", { t1Result: "passed" }, workflow);
            context = storeNodeOutput(context, "T1", { t1Result: "passed" });

            // Now Cond2 should be ready (nested conditional)
            ready = getReadyNodes(queue, 10);
            expect(ready).toContain("Cond2");

            // Execute Cond2 - takes false branch
            queue = markExecuting(queue, ["Cond2"]);
            queue = markCompleted(queue, "Cond2", { result: false }, workflow);
            context = storeNodeOutput(context, "Cond2", { result: false });

            // Skip T2, execute F2
            queue = markSkipped(queue, "T2", workflow);
            queue = markExecuting(queue, ["F2"]);
            queue = markCompleted(queue, "F2", { f2Result: "executed" }, workflow);
            context = storeNodeOutput(context, "F2", { f2Result: "executed" });

            // Verify the nested path executed correctly
            expect(queue.completed.has("T1")).toBe(true);
            expect(queue.completed.has("F2")).toBe(true);
            expect(queue.skipped.has("F1")).toBe(true);
            expect(queue.skipped.has("T2")).toBe(true);
            expect(context.nodeOutputs.get("F2")).toEqual({ f2Result: "executed" });
        });

        it("should propagate skip through nested structures", () => {
            const workflow = createComplexWorkflow();
            let queue = initializeQueue(workflow);

            // Execute Start
            queue = markExecuting(queue, ["Start"]);
            queue = markCompleted(queue, "Start", {}, workflow);

            // Execute Cond1 - takes FALSE branch this time
            queue = markExecuting(queue, ["Cond1"]);
            queue = markCompleted(queue, "Cond1", { result: false }, workflow);

            // Skip T1 and its entire subtree (Cond2, T2, F2)
            queue = markSkipped(queue, "T1", workflow);

            // T1's dependents should also be skipped
            expect(queue.skipped.has("T1")).toBe(true);
            // Cond2 depends only on T1, so it should be skipped
            expect(queue.skipped.has("Cond2")).toBe(true);

            // F1 should be ready (false branch of Cond1)
            const ready = getReadyNodes(queue, 10);
            expect(ready).toContain("F1");
        });
    });

    describe("context in branches", () => {
        it("should make parent context available in branches", () => {
            let context = createContext({ inputValue: "parent-data" });

            // Store parent output
            context = storeNodeOutput(context, "Parent", {
                processedValue: "from-parent"
            });
            context = setVariable(context, "parentVar", "shared-value");

            // Branch should see parent context
            const execContext = getExecutionContext(context);
            expect(execContext.Parent).toEqual({ processedValue: "from-parent" });
            expect(execContext.parentVar).toBe("shared-value");
            expect(execContext.inputValue).toBe("parent-data");
        });

        it("should not leak branch variables to other branches", () => {
            const context = createContext({});

            // Simulate true branch execution
            let trueBranchContext = deepCloneContext(context);
            trueBranchContext = storeNodeOutput(trueBranchContext, "TrueBranch", {
                branchData: "true-only"
            });
            trueBranchContext = setVariable(trueBranchContext, "branchSpecific", "true-value");

            // Simulate false branch execution (from original context)
            let falseBranchContext = deepCloneContext(context);
            falseBranchContext = storeNodeOutput(falseBranchContext, "FalseBranch", {
                branchData: "false-only"
            });
            falseBranchContext = setVariable(falseBranchContext, "branchSpecific", "false-value");

            // Original context should be unchanged
            expect(context.nodeOutputs.has("TrueBranch")).toBe(false);
            expect(context.nodeOutputs.has("FalseBranch")).toBe(false);

            // Branch contexts should be independent
            expect(trueBranchContext.workflowVariables.get("branchSpecific")).toBe("true-value");
            expect(falseBranchContext.workflowVariables.get("branchSpecific")).toBe("false-value");

            // True branch shouldn't have false branch output
            expect(trueBranchContext.nodeOutputs.has("FalseBranch")).toBe(false);
            expect(falseBranchContext.nodeOutputs.has("TrueBranch")).toBe(false);
        });

        it("should merge selected branch output to main context", () => {
            let context = createContext({ initial: "value" });

            // Execute conditional
            context = storeNodeOutput(context, "Cond", { result: true });

            // Execute selected branch (true branch)
            context = storeNodeOutput(context, "TrueBranch", {
                branchResult: "selected-output"
            });

            // After merge point, both outputs should be available
            const execContext = getExecutionContext(context);
            expect(execContext.Cond).toEqual({ result: true });
            expect(execContext.TrueBranch).toEqual({ branchResult: "selected-output" });
        });
    });

    describe("edge cases", () => {
        it("should handle empty branches", () => {
            const workflow = createConditionalWorkflow();
            let queue = initializeQueue(workflow);

            // Execute A and Cond
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);
            queue = markExecuting(queue, ["Cond"]);
            queue = markCompleted(queue, "Cond", { result: true }, workflow);

            // Skip false branch
            queue = markSkipped(queue, "C", workflow);

            // Even with minimal branch content, execution should proceed
            queue = markExecuting(queue, ["B"]);
            queue = markCompleted(queue, "B", {}, workflow); // Empty output

            // D should still be reachable
            const ready = getReadyNodes(queue, 10);
            expect(ready).toContain("D");
        });

        it("should handle condition evaluation errors gracefully", () => {
            const workflow = createConditionalWorkflow();
            let queue = initializeQueue(workflow);
            let context = createContext({});

            // Execute A
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            // Cond fails during evaluation
            queue = markExecuting(queue, ["Cond"]);
            // Store error in output for downstream handling
            context = storeNodeOutput(context, "Cond", {
                error: "Condition evaluation failed",
                errorType: "EvaluationError"
            });

            // Even with error, we can mark completed with error state
            queue = markCompleted(queue, "Cond", { error: true }, workflow);

            // Both branches become ready - workflow can decide how to handle
            const ready = getReadyNodes(queue, 10);
            expect(ready.length).toBeGreaterThan(0);
            expect(context.nodeOutputs.get("Cond")?.error).toBe("Condition evaluation failed");
        });

        it("should handle boolean coercion edge cases", () => {
            let context = createContext({});

            // Test various truthy/falsy values
            const testCases = [
                { value: 0, expected: false },
                { value: 1, expected: true },
                { value: "", expected: false },
                { value: "false", expected: true }, // String "false" is truthy
                { value: null, expected: false },
                { value: undefined, expected: false },
                { value: [], expected: true }, // Empty array is truthy
                { value: {}, expected: true } // Empty object is truthy
            ];

            for (const testCase of testCases) {
                context = storeNodeOutput(context, `Test_${String(testCase.value)}`, {
                    conditionValue: testCase.value ?? null,
                    booleanResult: Boolean(testCase.value)
                });

                const output = context.nodeOutputs.get(`Test_${String(testCase.value)}`);
                expect(output?.booleanResult).toBe(testCase.expected);
            }
        });

        it("should handle multiple conditional branches converging", () => {
            const workflow = createComplexWorkflow();
            let queue = initializeQueue(workflow);

            // Execute all paths to Merge
            queue = markExecuting(queue, ["Start"]);
            queue = markCompleted(queue, "Start", {}, workflow);

            // Execute both parallel branches from Start
            queue = markExecuting(queue, ["Cond1", "P1"]);
            queue = markCompleted(queue, "Cond1", { result: false }, workflow);
            queue = markCompleted(queue, "P1", {}, workflow);

            // F1 executes (false branch)
            queue = markExecuting(queue, ["F1"]);
            queue = markCompleted(queue, "F1", {}, workflow);

            // Skip T1 and its subtree
            queue = markSkipped(queue, "T1", workflow);
            queue = markSkipped(queue, "Cond2", workflow);
            queue = markSkipped(queue, "T2", workflow);
            queue = markSkipped(queue, "F2", workflow);

            // P2 and P3 execute
            queue = markExecuting(queue, ["P2", "P3"]);
            queue = markCompleted(queue, "P2", {}, workflow);
            queue = markCompleted(queue, "P3", {}, workflow);

            // Merge should now be ready (F1, P2, P3 completed; T2, F2 skipped)
            const ready = getReadyNodes(queue, 10);
            expect(ready).toContain("Merge");

            // Complete Merge
            queue = markExecuting(queue, ["Merge"]);
            queue = markCompleted(queue, "Merge", {}, workflow);

            expect(isExecutionComplete(queue)).toBe(true);
        });
    });

    describe("conditional with parallel branches", () => {
        it("should handle conditional inside parallel execution", () => {
            const workflow = createComplexWorkflow();
            let queue = initializeQueue(workflow);

            // Start both parallel paths
            queue = markExecuting(queue, ["Start"]);
            queue = markCompleted(queue, "Start", {}, workflow);

            // Get ready nodes - should have Cond1 and P1
            let ready = getReadyNodes(queue, 10);
            expect(ready).toContain("Cond1");
            expect(ready).toContain("P1");
            expect(ready.length).toBe(2);

            // Execute both in parallel
            queue = markExecuting(queue, ["Cond1", "P1"]);

            // P1 completes first
            queue = markCompleted(queue, "P1", { parallel: true }, workflow);

            // Cond1 completes with true result
            queue = markCompleted(queue, "Cond1", { result: true }, workflow);

            // Now P2, P3 (from P1) and T1 (from Cond1) should be ready
            ready = getReadyNodes(queue, 10);
            expect(ready).toContain("P2");
            expect(ready).toContain("P3");
            expect(ready).toContain("T1");
        });
    });
});
