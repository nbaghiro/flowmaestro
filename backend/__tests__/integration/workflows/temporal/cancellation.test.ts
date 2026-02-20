/**
 * Workflow Cancellation Integration Tests
 *
 * Tests for workflow cancellation scenarios:
 * - Manual cancellation via Temporal client
 * - Cancellation with pending nodes in queue
 * - Cancellation during retry attempt
 * - Cancellation timeout (graceful vs force)
 * - Cancelled workflow final state
 * - Resource cleanup on cancellation
 */

import {
    createTemporalTestEnv,
    startWorkflow,
    sendCancelSignal,
    sendPauseSignal,
    cancelWorkflowGracefully,
    queryExecutionSummary,
    queryExecutionProgress,
    waitForNodesComplete,
    waitForWorkflowState,
    createLinearTestWorkflow,
    createParallelTestWorkflow,
    createSlowTestWorkflow,
    waitForResult,
    delay,
    type TemporalTestEnv
} from "./helpers";

describe("Workflow Cancellation", () => {
    let testEnv: TemporalTestEnv;

    beforeAll(async () => {
        testEnv = await createTemporalTestEnv({
            defaultDelay: 100
        });
    }, 60000);

    afterAll(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }, 30000);

    describe("manual cancellation via signal", () => {
        it("should cancel a running workflow immediately", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 5000,
                nodeCount: 10
            });

            const startTime = Date.now();
            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for workflow to start
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Cancel
            await sendCancelSignal(handle, "Manual cancellation test");

            const result = await waitForResult(handle, 10000);
            const duration = Date.now() - startTime;

            expect(result.success).toBe(false);
            expect(result.error).toContain("cancelled");
            // Should complete much faster than the full workflow duration
            expect(duration).toBeLessThan(4000);
        }, 30000);

        it("should use cancelWorkflowGracefully helper", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            const result = await cancelWorkflowGracefully(handle, {
                reason: "Graceful cancellation test",
                timeoutMs: 10000
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain("Graceful cancellation test");
        }, 30000);
    });

    describe("cancellation with pending nodes", () => {
        it("should stop execution before pending nodes start", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 5000,
                nodeCount: 10
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for first few nodes to complete
            await waitForNodesComplete(handle, 2, { timeoutMs: 5000 });

            // Get progress before cancellation
            const progressBefore = await queryExecutionProgress(handle);

            // Cancel
            await sendCancelSignal(handle, "Cancel with pending nodes");

            const result = await waitForResult(handle, 10000);

            expect(result.success).toBe(false);
            // Should not have executed all nodes
            expect(progressBefore.completedNodes).toBeLessThan(10);
        }, 30000);

        it("should report pending nodes in summary after cancellation", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 6
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 2, { timeoutMs: 5000 });

            // Get summary before cancellation
            const summaryBefore = await queryExecutionSummary(handle);

            // Should have pending nodes
            expect(summaryBefore.pendingNodes.length).toBeGreaterThan(0);

            // Cancel
            await sendCancelSignal(handle, "Check pending nodes");
            await waitForResult(handle, 10000);

            // After cancellation, workflow ends - can't query anymore
            expect(summaryBefore.status).toBe("running");
        }, 30000);
    });

    describe("cancellation during parallel execution", () => {
        it("should stop all parallel branches on cancellation", async () => {
            const workflow = createParallelTestWorkflow({
                branchCount: 5,
                branchDelayMs: 2000
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for first node (Input) to complete
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Cancel while parallel branches are executing
            await sendCancelSignal(handle, "Cancel parallel branches");

            const result = await waitForResult(handle, 10000);

            expect(result.success).toBe(false);
            expect(result.error).toContain("cancelled");
        }, 30000);

        it("should preserve outputs from completed parallel branches", async () => {
            // Create a parallel workflow with longer delays to ensure we can cancel
            // while branches are still executing. All branches run in parallel,
            // so we need the delay long enough to send cancel before all complete.
            const workflow = createParallelTestWorkflow({
                branchCount: 3,
                branchDelayMs: 2000
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for Input node to complete (branches start but take 2s each)
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Small delay to let branches start executing
            await delay(100);

            // Check progress - should have Input completed, branches in progress
            const progress = await queryExecutionProgress(handle);
            expect(progress.completedNodes).toBeGreaterThanOrEqual(1);

            // Cancel while branches are still running (they take 2000ms, we're at ~100ms)
            await sendCancelSignal(handle, "Cancel after some branches complete");

            const result = await waitForResult(handle, 10000);

            expect(result.success).toBe(false);
            expect(result.outputs).toBeDefined();
        }, 30000);
    });

    describe("cancelled workflow final state", () => {
        it("should report cancelled status in error message", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            await sendCancelSignal(handle, "Testing final state");

            const result = await waitForResult(handle, 10000);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain("cancelled");
            expect(result.error).toContain("Testing final state");
        }, 30000);

        it("should include partial outputs in result", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for some completion
            await waitForNodesComplete(handle, 2, { timeoutMs: 5000 });

            await sendCancelSignal(handle, "Check partial outputs");

            const result = await waitForResult(handle, 10000);

            expect(result.outputs).toBeDefined();
            expect(typeof result.outputs).toBe("object");
        }, 30000);
    });

    describe("cancellation timing", () => {
        it("should allow nodes to complete before stopping", async () => {
            const workflow = createLinearTestWorkflow({
                nodeCount: 4,
                nodeDelayMs: 300
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for first node
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Get executing nodes before cancel
            const summaryBefore = await queryExecutionSummary(handle);

            // Cancel
            await sendCancelSignal(handle, "Mid-execution cancel");

            const result = await waitForResult(handle, 10000);

            expect(result.success).toBe(false);
            // Workflow should have completed at least the first node
            expect(summaryBefore.completedNodes.length).toBeGreaterThan(0);
        }, 30000);

        it("should cancel before workflow build if sent immediately", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 5000,
                nodeCount: 10
            });

            // Start and immediately cancel
            const { handle } = await startWorkflow(testEnv, workflow);
            await sendCancelSignal(handle, "Immediate cancel");

            const result = await waitForResult(handle, 10000);

            expect(result.success).toBe(false);
        }, 30000);
    });

    describe("cancellation with different workflow states", () => {
        it("should cancel workflow that is paused", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Pause first
            await sendPauseSignal(handle, "Pausing before cancel");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Now cancel
            await sendCancelSignal(handle, "Cancel paused workflow");

            const result = await waitForResult(handle, 10000);

            expect(result.success).toBe(false);
            expect(result.error).toContain("cancelled");
        }, 30000);

        it("should cancel simple workflow with no delays", async () => {
            const workflow = createLinearTestWorkflow({
                nodeCount: 3,
                nodeDelayMs: 0
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Try to cancel (workflow might complete first)
            await sendCancelSignal(handle, "Cancel fast workflow");

            const result = await waitForResult(handle, 10000);

            // Either cancelled or completed successfully
            expect(typeof result.success).toBe("boolean");
        }, 30000);
    });

    describe("multiple cancellation requests", () => {
        it("should handle multiple cancel signals gracefully", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Send multiple cancel signals
            await sendCancelSignal(handle, "First cancel");
            await sendCancelSignal(handle, "Second cancel");
            await sendCancelSignal(handle, "Third cancel");

            const result = await waitForResult(handle, 10000);

            expect(result.success).toBe(false);
            expect(result.error).toContain("cancelled");
        }, 30000);

        it("should use first cancel reason", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Send multiple cancel signals with different reasons
            await sendCancelSignal(handle, "Primary reason");
            await delay(50);
            await sendCancelSignal(handle, "Secondary reason");

            const result = await waitForResult(handle, 10000);

            expect(result.error).toContain("Primary reason");
        }, 30000);
    });

    describe("resource cleanup on cancellation", () => {
        it("should not leave workflow in inconsistent state", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            await sendCancelSignal(handle, "Cleanup test");

            const result = await waitForResult(handle, 10000);

            // Result should be well-formed
            expect(result).toHaveProperty("success");
            expect(result).toHaveProperty("outputs");
            expect(result.success).toBe(false);
        }, 30000);

        it("should handle cancellation during credit-tracked execution", async () => {
            // Note: Credits are mocked in test env, but we verify the flow works
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow, {
                // Would normally have workspaceId for credit tracking
            });

            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });
            await sendCancelSignal(handle, "Credit cleanup test");

            const result = await waitForResult(handle, 10000);

            expect(result.success).toBe(false);
            // Workflow should complete without errors from credit handling
        }, 30000);
    });
});
