/**
 * Parallel Execution Integration Tests
 *
 * Tests for parallel workflow execution behavior including:
 * - Context isolation between parallel branches
 * - Output merging after parallel join
 * - Failure handling in parallel branches
 * - Execution order verification
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
    markFailed,
    isExecutionComplete,
    getExecutionSummary
} from "../../../src/temporal/core/services/context";
import { deepCloneContext, contextsAreEqual } from "../../fixtures/contexts";
import {
    createDiamondWorkflow,
    createErrorCascadeWorkflow,
    createComplexWorkflow
} from "../../fixtures/workflows";
import type { ContextSnapshot } from "../../../src/temporal/core/types";

describe("Parallel Execution", () => {
    describe("context isolation", () => {
        it("should isolate context between parallel branches", () => {
            // Simulate parallel execution: Start -> [Branch1, Branch2] -> Merge
            const context = createContext({ input: "shared" });

            // Store parent context before branching
            const parentSnapshot = deepCloneContext(context);

            // Branch 1 execution - adds its own output
            let branch1Context = deepCloneContext(context);
            branch1Context = storeNodeOutput(branch1Context, "Branch1", {
                branchId: 1,
                result: "branch1-result",
                localVar: "branch1-local"
            });
            branch1Context = setVariable(branch1Context, "branchFlag", "branch1");

            // Branch 2 execution - adds its own output
            let branch2Context = deepCloneContext(context);
            branch2Context = storeNodeOutput(branch2Context, "Branch2", {
                branchId: 2,
                result: "branch2-result",
                localVar: "branch2-local"
            });
            branch2Context = setVariable(branch2Context, "branchFlag", "branch2");

            // Parent context should be unchanged
            expect(contextsAreEqual(context, parentSnapshot)).toBe(true);
            expect(context.nodeOutputs.has("Branch1")).toBe(false);
            expect(context.nodeOutputs.has("Branch2")).toBe(false);

            // Branch contexts should be independent
            expect(branch1Context.workflowVariables.get("branchFlag")).toBe("branch1");
            expect(branch2Context.workflowVariables.get("branchFlag")).toBe("branch2");
        });

        it("should merge outputs correctly after parallel join", () => {
            let context = createContext({ input: "start" });

            // Simulate parallel branch execution
            context = storeNodeOutput(context, "BranchA", { value: "A" });
            context = storeNodeOutput(context, "BranchB", { value: "B" });
            context = storeNodeOutput(context, "BranchC", { value: "C" });

            // All outputs should be available
            expect(context.nodeOutputs.size).toBe(3);
            expect(context.nodeOutputs.get("BranchA")).toEqual({ value: "A" });
            expect(context.nodeOutputs.get("BranchB")).toEqual({ value: "B" });
            expect(context.nodeOutputs.get("BranchC")).toEqual({ value: "C" });

            // Merged execution context should contain all outputs
            const execContext = getExecutionContext(context);
            expect(execContext.BranchA).toBeDefined();
            expect(execContext.BranchB).toBeDefined();
            expect(execContext.BranchC).toBeDefined();
        });

        it("should not corrupt shared parent context", () => {
            let parentContext = createContext({ input: "parent" });
            parentContext = storeNodeOutput(parentContext, "Parent", { data: "parent-data" });

            const originalParent = deepCloneContext(parentContext);

            // Multiple branches read and extend from parent
            const branches: ContextSnapshot[] = [];
            for (let i = 0; i < 5; i++) {
                let branchContext = deepCloneContext(parentContext);
                branchContext = storeNodeOutput(branchContext, `Child${i}`, {
                    childId: i,
                    parentRef: parentContext.nodeOutputs.get("Parent")!
                });
                branches.push(branchContext);
            }

            // Parent should be completely unchanged
            expect(contextsAreEqual(parentContext, originalParent)).toBe(true);

            // Each branch should have parent output plus its own
            for (let i = 0; i < branches.length; i++) {
                expect(branches[i].nodeOutputs.has("Parent")).toBe(true);
                expect(branches[i].nodeOutputs.has(`Child${i}`)).toBe(true);
            }
        });

        it("should handle same variable name in parallel branches", () => {
            let context = createContext({});

            // Both branches write to same variable name in their output
            context = storeNodeOutput(context, "BranchLeft", { sharedName: "left-value" });
            context = storeNodeOutput(context, "BranchRight", { sharedName: "right-value" });

            // Both outputs should be preserved (stored by node ID, not output field name)
            expect(context.nodeOutputs.get("BranchLeft")?.sharedName).toBe("left-value");
            expect(context.nodeOutputs.get("BranchRight")?.sharedName).toBe("right-value");

            // When merged to execution context, last write wins for top-level keys
            const execContext = getExecutionContext(context);
            expect(execContext.BranchLeft).toBeDefined();
            expect(execContext.BranchRight).toBeDefined();
        });
    });

    describe("execution order", () => {
        it("should execute independent nodes in parallel", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);

            // Execute A (the start node)
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", { result: "A-done" }, workflow);

            // B and C should both be ready now
            const readyNodes = getReadyNodes(queue, 10);
            expect(readyNodes).toContain("B");
            expect(readyNodes).toContain("C");
            expect(readyNodes.length).toBe(2);
        });

        it("should wait for all parallel nodes before continuing", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);

            // Execute A
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            // Start both B and C
            queue = markExecuting(queue, ["B", "C"]);

            // Complete only B
            queue = markCompleted(queue, "B", {}, workflow);

            // D should not be ready yet (C still executing)
            const readyAfterB = getReadyNodes(queue, 10);
            expect(readyAfterB).not.toContain("D");

            // Complete C
            queue = markCompleted(queue, "C", {}, workflow);

            // Now D should be ready
            const readyAfterC = getReadyNodes(queue, 10);
            expect(readyAfterC).toContain("D");
        });

        it("should respect dependency order within branches", () => {
            const workflow = createComplexWorkflow();
            let queue = initializeQueue(workflow);

            // Only Start should be ready initially
            let ready = getReadyNodes(queue, 10);
            expect(ready).toEqual(["Start"]);

            // Complete Start
            queue = markExecuting(queue, ["Start"]);
            queue = markCompleted(queue, "Start", {}, workflow);

            // Now Cond1 and P1 should be ready (parallel branches from Start)
            ready = getReadyNodes(queue, 10);
            expect(ready).toContain("Cond1");
            expect(ready).toContain("P1");
        });
    });

    describe("failure handling", () => {
        it("should allow other branches to complete when one fails", () => {
            const workflow = createErrorCascadeWorkflow();
            let queue = initializeQueue(workflow);

            // Execute A
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            // Start both B and D in parallel
            queue = markExecuting(queue, ["B", "D"]);

            // B fails
            queue = markFailed(queue, "B", "B failed", workflow);

            // D should still be executing
            expect(queue.executing.has("D")).toBe(true);

            // Complete D
            queue = markCompleted(queue, "D", { result: "D-success" }, workflow);

            // D should be completed
            expect(queue.completed.has("D")).toBe(true);
        });

        it("should mark dependents of failed node as skipped", () => {
            const workflow = createErrorCascadeWorkflow();
            let queue = initializeQueue(workflow);

            // Execute A
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            // B fails
            queue = markExecuting(queue, ["B"]);
            queue = markFailed(queue, "B", "B failed", workflow);

            // C (depends on B) should be skipped
            expect(queue.skipped.has("C")).toBe(true);

            const summary = getExecutionSummary(queue);
            expect(summary.skipped).toBeGreaterThan(0);
        });

        it("should preserve outputs from successful parallel nodes", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);
            let context = createContext({});

            // Execute A
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);
            context = storeNodeOutput(context, "A", { value: "A" });

            // Start B and C
            queue = markExecuting(queue, ["B", "C"]);

            // B completes successfully
            queue = markCompleted(queue, "B", { value: "B" }, workflow);
            context = storeNodeOutput(context, "B", { value: "B" });

            // C fails
            markFailed(queue, "C", "C failed", workflow);

            // B's output should still be preserved
            expect(context.nodeOutputs.get("B")).toEqual({ value: "B" });
            expect(context.nodeOutputs.get("A")).toEqual({ value: "A" });
        });
    });

    describe("result aggregation", () => {
        it("should aggregate all parallel outputs in correct order", () => {
            let context = createContext({});
            const outputs: Array<{ id: number; value: string }> = [];

            // Simulate 5 parallel branches completing
            for (let i = 0; i < 5; i++) {
                const output = { id: i, value: `result-${i}` };
                context = storeNodeOutput(context, `parallel-${i}`, output);
                outputs.push(output);
            }

            // All outputs should be accessible
            for (let i = 0; i < 5; i++) {
                expect(context.nodeOutputs.get(`parallel-${i}`)).toEqual(outputs[i]);
            }

            // Verify order preservation in Map (insertion order)
            const keys = [...context.nodeOutputs.keys()];
            expect(keys).toEqual([
                "parallel-0",
                "parallel-1",
                "parallel-2",
                "parallel-3",
                "parallel-4"
            ]);
        });

        it("should handle mixed success/failure results", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);
            let context = createContext({});

            // Execute A
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);
            context = storeNodeOutput(context, "A", { value: "A" });

            // B succeeds, C fails
            queue = markExecuting(queue, ["B", "C"]);
            queue = markCompleted(queue, "B", {}, workflow);
            context = storeNodeOutput(context, "B", { value: "B-success" });

            queue = markFailed(queue, "C", "C failed", workflow);
            // No output stored for C (it failed)

            // Final state
            expect(queue.completed.has("A")).toBe(true);
            expect(queue.completed.has("B")).toBe(true);
            expect(queue.failed.has("C")).toBe(true);

            // Context should have successful outputs only
            expect(context.nodeOutputs.has("A")).toBe(true);
            expect(context.nodeOutputs.has("B")).toBe(true);
            expect(context.nodeOutputs.has("C")).toBe(false);
        });
    });

    describe("concurrency limits", () => {
        it("should respect max concurrent nodes limit", () => {
            const workflow = createComplexWorkflow();
            let queue = initializeQueue(workflow);

            // Complete Start
            queue = markExecuting(queue, ["Start"]);
            queue = markCompleted(queue, "Start", {}, workflow);

            // Multiple nodes become ready
            const allReady = getReadyNodes(queue, 100);
            expect(allReady.length).toBeGreaterThan(1);

            // But with limit of 1, should only return 1
            const limitedReady = getReadyNodes(queue, 1);
            expect(limitedReady.length).toBe(1);
        });

        it("should account for currently executing nodes", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);

            // Complete A
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", {}, workflow);

            // Start executing B
            queue = markExecuting(queue, ["B"]);

            // With max 2 and 1 executing, should only get 1 more
            const ready = getReadyNodes(queue, 2);
            expect(ready.length).toBe(1);
            expect(ready[0]).toBe("C");
        });
    });

    describe("complex parallel patterns", () => {
        it("should handle parallel + conditional combination", () => {
            const workflow = createComplexWorkflow();
            let queue = initializeQueue(workflow);
            let context = createContext({});

            // Execute Start
            queue = markExecuting(queue, ["Start"]);
            queue = markCompleted(queue, "Start", {}, workflow);
            context = storeNodeOutput(context, "Start", { initialized: true });

            // Cond1 and P1 should be ready (parallel)
            let ready = getReadyNodes(queue, 10);
            expect(ready).toContain("Cond1");
            expect(ready).toContain("P1");

            // Execute P1 (parallel branch)
            queue = markExecuting(queue, ["P1"]);
            queue = markCompleted(queue, "P1", {}, workflow);
            context = storeNodeOutput(context, "P1", { parallelResult: "P1" });

            // P2 and P3 should become ready (children of P1)
            ready = getReadyNodes(queue, 10);
            expect(ready).toContain("P2");
            expect(ready).toContain("P3");

            // Context should track all outputs
            expect(context.nodeOutputs.size).toBe(2);
        });

        it("should complete full diamond workflow", () => {
            const workflow = createDiamondWorkflow();
            let queue = initializeQueue(workflow);
            let context = createContext({ start: "value" });

            // A
            queue = markExecuting(queue, ["A"]);
            queue = markCompleted(queue, "A", { a: 1 }, workflow);
            context = storeNodeOutput(context, "A", { a: 1 });

            // B and C (parallel)
            queue = markExecuting(queue, ["B", "C"]);
            queue = markCompleted(queue, "B", { b: 2 }, workflow);
            context = storeNodeOutput(context, "B", { b: 2 });
            queue = markCompleted(queue, "C", { c: 3 }, workflow);
            context = storeNodeOutput(context, "C", { c: 3 });

            // D
            queue = markExecuting(queue, ["D"]);
            queue = markCompleted(queue, "D", { d: 4 }, workflow);
            context = storeNodeOutput(context, "D", { d: 4 });

            // Verify completion
            expect(isExecutionComplete(queue)).toBe(true);
            expect(context.nodeOutputs.size).toBe(4);

            // All outputs accessible
            const execContext = getExecutionContext(context);
            expect(execContext.A).toEqual({ a: 1 });
            expect(execContext.B).toEqual({ b: 2 });
            expect(execContext.C).toEqual({ c: 3 });
            expect(execContext.D).toEqual({ d: 4 });
        });
    });
});
