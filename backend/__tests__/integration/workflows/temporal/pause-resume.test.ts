/**
 * Workflow Pause/Resume Integration Tests
 *
 * Tests for workflow pause and resume functionality:
 * - Pause workflow via signal
 * - Resume workflow via signal
 * - State snapshot preserved on pause
 * - Resume continues from correct node
 * - Pause during parallel execution
 * - Resume with modified context
 * - Multiple pause/resume cycles
 */

import {
    createTemporalTestEnv,
    startWorkflow,
    sendPauseSignal,
    sendResumeSignal,
    sendCancelSignal,
    queryExecutionProgress,
    queryExecutionSummary,
    waitForWorkflowState,
    waitForNodesComplete,
    createLinearTestWorkflow,
    createParallelTestWorkflow,
    createSlowTestWorkflow,
    waitForResult,
    delay,
    type TemporalTestEnv
} from "./helpers";

describe("Workflow Pause/Resume", () => {
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

    describe("basic pause functionality", () => {
        it("should pause a running workflow", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for workflow to start
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Pause
            await sendPauseSignal(handle, "Testing basic pause");

            // Verify paused state
            const summary = await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            expect(summary.status).toBe("paused");
            expect(summary.pauseReason).toBe("Testing basic pause");

            // Cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should preserve completed nodes on pause", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 6
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for some nodes to complete
            await waitForNodesComplete(handle, 3, { timeoutMs: 10000 });

            // Get progress before pause
            const progressBefore = await queryExecutionProgress(handle);

            // Pause
            await sendPauseSignal(handle, "Check state preservation");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Progress should still show completed nodes
            const progressAfter = await queryExecutionProgress(handle);
            expect(progressAfter.completedNodes).toBeGreaterThanOrEqual(
                progressBefore.completedNodes
            );

            // Cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should use default reason when pause has no payload", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Pause without reason
            await sendPauseSignal(handle);

            const summary = await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });
            expect(summary.pauseReason).toBe("Paused by user");

            // Cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);
    });

    describe("basic resume functionality", () => {
        it("should resume a paused workflow", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Pause
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });
            await sendPauseSignal(handle, "Pause before resume test");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Resume
            await sendResumeSignal(handle);

            // Should go back to running
            const summary = await waitForWorkflowState(handle, "running", { timeoutMs: 5000 });
            expect(summary.status).toBe("running");

            // Wait for completion
            const result = await waitForResult(handle, 15000);
            expect(result.success).toBe(true);
        }, 30000);

        it("should continue from where it left off after resume", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 6
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for some nodes and get progress
            await waitForNodesComplete(handle, 2, { timeoutMs: 5000 });
            const progressBeforePause = await queryExecutionProgress(handle);

            // Pause
            await sendPauseSignal(handle, "Check continuation");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Get progress while paused
            const progressWhilePaused = await queryExecutionProgress(handle);

            // Resume
            await sendResumeSignal(handle);

            // Wait for completion
            const result = await waitForResult(handle, 15000);

            expect(result.success).toBe(true);
            // Should have completed all nodes
            // Paused progress should be >= before pause progress
            expect(progressWhilePaused.completedNodes).toBeGreaterThanOrEqual(
                progressBeforePause.completedNodes
            );
        }, 30000);
    });

    describe("resume with context updates", () => {
        it("should apply context updates on resume", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Pause
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });
            await sendPauseSignal(handle, "Pause for context injection");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Resume with context updates
            await sendResumeSignal(handle, {
                injectedVariable: "test-value",
                numberVariable: 42,
                booleanVariable: true
            });

            // Should complete successfully with injected context
            const result = await waitForResult(handle, 15000);
            expect(result.success).toBe(true);
        }, 30000);

        it("should handle empty context updates object", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Pause and resume with empty context
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });
            await sendPauseSignal(handle, "Empty context test");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            await sendResumeSignal(handle, {});

            const result = await waitForResult(handle, 15000);
            expect(result.success).toBe(true);
        }, 30000);

        it("should handle no context updates (undefined)", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Pause and resume without context
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });
            await sendPauseSignal(handle, "No context test");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            await sendResumeSignal(handle);

            const result = await waitForResult(handle, 15000);
            expect(result.success).toBe(true);
        }, 30000);
    });

    describe("pause during parallel execution", () => {
        it("should pause workflow with parallel branches", async () => {
            const workflow = createParallelTestWorkflow({
                branchCount: 3,
                branchDelayMs: 1500
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for Input to complete, branches to start
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });
            await delay(200);

            // Pause while branches are executing
            await sendPauseSignal(handle, "Pause parallel execution");
            const summary = await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            expect(summary.status).toBe("paused");
            // Some branches may have started
            expect(summary.completedNodes.length).toBeGreaterThanOrEqual(1);

            // Cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should resume parallel branches correctly", async () => {
            const workflow = createParallelTestWorkflow({
                branchCount: 3,
                branchDelayMs: 800
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for Input, pause during branches
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });
            await delay(200);

            await sendPauseSignal(handle, "Pause parallel");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Get state while paused (verify we can still query)
            const progressPaused = await queryExecutionProgress(handle);
            expect(progressPaused.completedNodes).toBeGreaterThanOrEqual(1);

            // Resume
            await sendResumeSignal(handle);

            // Should complete successfully
            const result = await waitForResult(handle, 15000);
            expect(result.success).toBe(true);
        }, 30000);
    });

    describe("multiple pause/resume cycles", () => {
        it("should handle multiple pause/resume cycles", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 4000,
                nodeCount: 8
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // First cycle
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });
            await sendPauseSignal(handle, "First pause");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });
            await sendResumeSignal(handle);

            // Second cycle
            await waitForNodesComplete(handle, 3, { timeoutMs: 10000 });
            await sendPauseSignal(handle, "Second pause");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });
            await sendResumeSignal(handle);

            // Third cycle
            await waitForNodesComplete(handle, 5, { timeoutMs: 10000 });
            await sendPauseSignal(handle, "Third pause");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });
            await sendResumeSignal(handle);

            // Should complete successfully
            const result = await waitForResult(handle, 20000);
            expect(result.success).toBe(true);
        }, 45000);

        it("should maintain progress across multiple cycles", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 6
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            const progressHistory: number[] = [];

            // First cycle
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });
            await sendPauseSignal(handle, "Cycle 1");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });
            progressHistory.push((await queryExecutionProgress(handle)).completedNodes);
            await sendResumeSignal(handle);

            // Second cycle
            await waitForNodesComplete(handle, 3, { timeoutMs: 10000 });
            await sendPauseSignal(handle, "Cycle 2");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });
            progressHistory.push((await queryExecutionProgress(handle)).completedNodes);
            await sendResumeSignal(handle);

            // Complete
            const result = await waitForResult(handle, 15000);
            expect(result.success).toBe(true);

            // Progress should have increased monotonically
            for (let i = 1; i < progressHistory.length; i++) {
                expect(progressHistory[i]).toBeGreaterThanOrEqual(progressHistory[i - 1]);
            }
        }, 40000);
    });

    describe("edge cases", () => {
        it("should ignore resume when not paused", async () => {
            const workflow = createLinearTestWorkflow({
                nodeCount: 3,
                nodeDelayMs: 100
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Send resume without pause
            await sendResumeSignal(handle, { someData: "ignored" });

            // Should complete normally
            const result = await waitForResult(handle, 10000);
            expect(result.success).toBe(true);
        }, 30000);

        it("should handle rapid pause/resume signals", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Send rapid signals
            await sendPauseSignal(handle, "pause1");
            await sendResumeSignal(handle);
            await sendPauseSignal(handle, "pause2");
            await sendResumeSignal(handle);

            // Should complete successfully
            const result = await waitForResult(handle, 15000);
            expect(result.success).toBe(true);
        }, 30000);

        it("should transition from paused to cancelled", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Pause
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });
            await sendPauseSignal(handle, "Pause before cancel");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Cancel while paused
            await sendCancelSignal(handle, "Cancel from paused");

            const result = await waitForResult(handle, 10000);
            expect(result.success).toBe(false);
            expect(result.error).toContain("cancelled");
        }, 30000);

        it("should handle pause on fast-completing workflow", async () => {
            const workflow = createLinearTestWorkflow({
                nodeCount: 3,
                nodeDelayMs: 50
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Try to pause (may complete first)
            await sendPauseSignal(handle, "Fast workflow pause");

            // Try to get result with short timeout
            try {
                const result = await waitForResult(handle, 2000);
                // Workflow completed before pause was processed
                expect(typeof result.success).toBe("boolean");
            } catch {
                // Workflow is paused, need to resume or cancel
                await sendResumeSignal(handle);
                const result = await waitForResult(handle, 10000);
                expect(typeof result.success).toBe("boolean");
            }
        }, 30000);
    });

    describe("pause state visibility", () => {
        it("should report correct pause reason in summary", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            const customReason = "Custom pause reason for testing";
            await sendPauseSignal(handle, customReason);
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            const summary = await queryExecutionSummary(handle);
            expect(summary.pauseReason).toBe(customReason);

            // Cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should clear pause reason after resume", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            await sendPauseSignal(handle, "Temporary pause");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            await sendResumeSignal(handle);
            await waitForWorkflowState(handle, "running", { timeoutMs: 5000 });

            const summary = await queryExecutionSummary(handle);
            expect(summary.status).toBe("running");
            expect(summary.pauseReason).toBeUndefined();

            // Cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);
    });
});
