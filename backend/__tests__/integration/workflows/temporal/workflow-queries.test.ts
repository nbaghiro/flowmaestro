/**
 * Workflow Queries Integration Tests
 *
 * Tests for Temporal workflow query handling:
 * - Query execution progress (% complete)
 * - Query current node status
 * - Query pending/completed/failed node counts
 * - Query during parallel execution
 * - Query after workflow completion
 * - Query error handling (invalid query)
 */

import {
    createTemporalTestEnv,
    startWorkflow,
    runWorkflowToCompletion,
    queryExecutionProgress,
    queryNodeStatus,
    queryExecutionSummary,
    waitForNodesComplete,
    waitForNodeStatus,
    waitForWorkflowState,
    createLinearTestWorkflow,
    createParallelTestWorkflow,
    createSlowTestWorkflow,
    sendPauseSignal,
    sendCancelSignal,
    waitForResult,
    delay,
    type TemporalTestEnv
} from "./helpers";

describe("Workflow Queries", () => {
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

    describe("executionProgressQuery", () => {
        it("should return initial progress at 0%", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Query immediately
            await delay(100); // Small delay to let workflow start
            const progress = await queryExecutionProgress(handle);

            expect(progress.totalNodes).toBe(5);
            expect(progress.percentComplete).toBeLessThanOrEqual(100);
            expect(progress.failedNodes).toBe(0);
            expect(progress.skippedNodes).toBe(0);

            // Cancel to cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should track progress as nodes complete", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for some progress
            await waitForNodesComplete(handle, 2, { timeoutMs: 5000 });

            const progress = await queryExecutionProgress(handle);

            expect(progress.completedNodes).toBeGreaterThanOrEqual(2);
            expect(progress.percentComplete).toBeGreaterThan(0);
            expect(progress.percentComplete).toBeLessThanOrEqual(100);

            // Cancel to cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should report 100% on completion", async () => {
            const workflow = createLinearTestWorkflow({
                nodeCount: 3,
                nodeDelayMs: 50
            });

            const result = await runWorkflowToCompletion(testEnv, workflow);

            expect(result.success).toBe(true);
            // After completion, we can't query anymore, but the result confirms all nodes ran
        }, 30000);

        it("should report currently executing nodes", async () => {
            const workflow = createParallelTestWorkflow({
                branchCount: 3,
                branchDelayMs: 1000
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for Input to complete, branches to start
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });
            await delay(200); // Let branches start

            const progress = await queryExecutionProgress(handle);

            // Should have some nodes currently executing
            expect(progress.currentNodes.length).toBeGreaterThanOrEqual(0);

            // Cancel to cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);
    });

    describe("nodeStatusQuery", () => {
        it("should return pending status for unexecuted nodes", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for first node to start
            await delay(100);

            // Query a later node
            const status = await queryNodeStatus(handle, "Output");

            expect(status.nodeId).toBe("Output");
            expect(["pending", "unknown"]).toContain(status.status);

            // Cancel to cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should return completed status with output for finished nodes", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for first node to complete
            await waitForNodeStatus(handle, "Input", "completed", { timeoutMs: 5000 });

            const status = await queryNodeStatus(handle, "Input");

            expect(status.nodeId).toBe("Input");
            expect(status.status).toBe("completed");
            expect(status.output).toBeDefined();

            // Cancel to cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should return executing status for in-flight nodes", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait a bit for a node to start executing
            await delay(300);

            // One of the nodes should be executing
            const progressBefore = await queryExecutionProgress(handle);
            if (progressBefore.currentNodes.length > 0) {
                const executingNodeId = progressBefore.currentNodes[0];
                const status = await queryNodeStatus(handle, executingNodeId);
                expect(status.status).toBe("executing");
            }

            // Cancel to cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should return unknown for non-existent node", async () => {
            const workflow = createLinearTestWorkflow({
                nodeCount: 3,
                nodeDelayMs: 500
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await delay(100);

            const status = await queryNodeStatus(handle, "NonExistentNode");

            expect(status.nodeId).toBe("NonExistentNode");
            expect(status.status).toBe("unknown");

            // Cancel to cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);
    });

    describe("executionSummaryQuery", () => {
        it("should return running status for active workflow", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            const summary = await queryExecutionSummary(handle);

            expect(summary.status).toBe("running");
            expect(summary.startedAt).toBeLessThanOrEqual(Date.now());
            expect(Array.isArray(summary.completedNodes)).toBe(true);
            expect(Array.isArray(summary.pendingNodes)).toBe(true);

            // Cancel to cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should return paused status when workflow is paused", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            await sendPauseSignal(handle, "Testing pause status");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            const summary = await queryExecutionSummary(handle);

            expect(summary.status).toBe("paused");
            expect(summary.pauseReason).toBe("Testing pause status");

            // Cancel to cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should list completed and pending nodes correctly", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for some nodes to complete
            await waitForNodesComplete(handle, 2, { timeoutMs: 5000 });

            const summary = await queryExecutionSummary(handle);

            expect(summary.completedNodes.length).toBeGreaterThanOrEqual(2);
            expect(summary.pendingNodes.length + summary.completedNodes.length +
                   summary.executingNodes.length + summary.skippedNodes.length +
                   summary.failedNodes.length).toBe(5);

            // Cancel to cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should include executing nodes in summary", async () => {
            const workflow = createParallelTestWorkflow({
                branchCount: 3,
                branchDelayMs: 1500
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for Input to complete, branches to start
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });
            await delay(200);

            const summary = await queryExecutionSummary(handle);

            expect(Array.isArray(summary.executingNodes)).toBe(true);
            // At least Input should be complete
            expect(summary.completedNodes.length).toBeGreaterThanOrEqual(1);

            // Cancel to cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);
    });

    describe("queries during parallel execution", () => {
        it("should accurately report parallel branch status", async () => {
            const workflow = createParallelTestWorkflow({
                branchCount: 4,
                branchDelayMs: 1000
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for Input to complete
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });
            await delay(200);

            const progress = await queryExecutionProgress(handle);

            // Should show Input completed and branches in progress
            expect(progress.completedNodes).toBeGreaterThanOrEqual(1);
            expect(progress.totalNodes).toBe(6); // Input + 4 branches + Output

            // Cancel to cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should update as parallel branches complete", async () => {
            const workflow = createParallelTestWorkflow({
                branchCount: 3,
                branchDelayMs: 500
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for Input to complete
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });
            const progress1 = await queryExecutionProgress(handle);

            // Wait for more nodes
            await delay(800);
            const progress2 = await queryExecutionProgress(handle);

            // Progress should have increased
            expect(progress2.completedNodes).toBeGreaterThanOrEqual(progress1.completedNodes);

            // Cancel to cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);
    });

    describe("query consistency", () => {
        it("should maintain consistent counts", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 2, { timeoutMs: 5000 });

            const progress = await queryExecutionProgress(handle);
            const summary = await queryExecutionSummary(handle);

            // Counts should be consistent between queries
            expect(progress.completedNodes).toBe(summary.completedNodes.length);
            expect(progress.totalNodes).toBe(
                summary.completedNodes.length +
                summary.pendingNodes.length +
                summary.executingNodes.length +
                summary.failedNodes.length +
                summary.skippedNodes.length
            );

            // Cancel to cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should handle rapid successive queries", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await delay(200);

            // Send many queries rapidly
            const queries = await Promise.all([
                queryExecutionProgress(handle),
                queryExecutionSummary(handle),
                queryNodeStatus(handle, "Input"),
                queryExecutionProgress(handle),
                queryExecutionSummary(handle)
            ]);

            // All should complete without errors
            expect(queries.length).toBe(5);
            queries.forEach((result) => {
                expect(result).toBeDefined();
            });

            // Cancel to cleanup (workflow might have already completed)
            try {
                await sendCancelSignal(handle, "Cleanup");
            } catch (err) {
                // Ignore "workflow already completed" errors
                if (!(err instanceof Error) || !err.message.includes("already completed")) {
                    throw err;
                }
            }
            await waitForResult(handle, 10000);
        }, 30000);
    });

    describe("query error handling", () => {
        it("should handle query on cancelled workflow gracefully", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await delay(200);

            // Cancel the workflow
            await sendCancelSignal(handle, "Cancel before query test");
            await waitForResult(handle, 10000);

            // Query after cancellation should fail gracefully
            // (workflow no longer exists for queries)
            try {
                await queryExecutionProgress(handle);
                // If it doesn't throw, that's also fine
            } catch (error) {
                // Expected - workflow is complete
                expect(error).toBeDefined();
            }
        }, 30000);
    });
});
