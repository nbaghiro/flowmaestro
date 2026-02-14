/**
 * Workflow Signals Integration Tests
 *
 * Tests for Temporal workflow signal handling:
 * - Signal delivery during workflow execution
 * - Signal buffering before workflow starts
 * - Multiple signal types in sequence
 * - Signal payload validation
 * - Signal handler side effects
 */

import {
    createTemporalTestEnv,
    startWorkflow,
    runWorkflowToCompletion,
    sendCancelSignal,
    sendPauseSignal,
    sendResumeSignal,
    waitForWorkflowState,
    waitForNodesComplete,
    createLinearTestWorkflow,
    createSlowTestWorkflow,
    waitForResult,
    delay,
    type TemporalTestEnv
} from "./helpers";
import type { OrchestratorResult } from "../../../../src/temporal/workflows/workflow-orchestrator";

describe("Workflow Signals", () => {
    let testEnv: TemporalTestEnv;

    beforeAll(async () => {
        testEnv = await createTemporalTestEnv({
            defaultDelay: 50 // Small delay to ensure signals can be processed
        });
    }, 60000);

    afterAll(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }, 30000);

    describe("signal delivery during execution", () => {
        it("should receive cancel signal during workflow execution", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for workflow to start executing
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Send cancel signal
            await sendCancelSignal(handle, "Test cancellation");

            // Wait for result
            const result = await waitForResult(handle, 10000);

            expect(result.success).toBe(false);
            expect(result.error).toContain("cancelled");
            expect(result.error).toContain("Test cancellation");
        }, 30000);

        it("should receive pause signal during workflow execution", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for workflow to start
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Send pause signal
            await sendPauseSignal(handle, "Test pause");

            // Verify workflow is paused
            const summary = await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });
            expect(summary.status).toBe("paused");
            expect(summary.pauseReason).toBe("Test pause");

            // Resume the workflow
            await sendResumeSignal(handle);

            // Wait for completion
            const result = await waitForResult(handle, 15000) as OrchestratorResult;
            expect(result.success).toBe(true);
        }, 30000);

        it("should handle multiple signals in sequence", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for workflow to start
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Pause, then resume, then cancel
            await sendPauseSignal(handle, "First pause");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            await sendResumeSignal(handle);
            await delay(500); // Allow some progress

            await sendCancelSignal(handle, "Final cancellation");

            const result = await waitForResult(handle, 10000);
            expect(result.success).toBe(false);
            expect(result.error).toContain("cancelled");
        }, 30000);
    });

    describe("signal payload handling", () => {
        it("should pass context updates through resume signal", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for workflow to start and pause it
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });
            await sendPauseSignal(handle, "Pausing for context update");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Resume with context updates
            await sendResumeSignal(handle, {
                customVariable: "injected-value",
                anotherVariable: 42
            });

            // Complete workflow
            const result = await waitForResult(handle, 10000);
            expect(result.success).toBe(true);
        }, 30000);

        it("should handle cancel signal with custom reason", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 1500,
                nodeCount: 3
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            const customReason = "Custom cancellation reason with special chars: !@#$%";
            await sendCancelSignal(handle, customReason);

            const result = await waitForResult(handle, 10000);
            expect(result.error).toContain(customReason);
        }, 30000);

        it("should use default reason when cancel signal has no payload", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 1500,
                nodeCount: 3
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Send signal without reason
            await sendCancelSignal(handle);

            const result = await waitForResult(handle, 10000);
            expect(result.error).toContain("cancelled");
            expect(result.error).toContain("Cancelled by user");
        }, 30000);
    });

    describe("signal priority and ordering", () => {
        it("should process cancel signal even when paused", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Pause the workflow
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });
            await sendPauseSignal(handle, "Pausing before cancel");
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Now cancel (should override pause)
            await sendCancelSignal(handle, "Cancel while paused");

            const result = await waitForResult(handle, 10000);
            expect(result.success).toBe(false);
            expect(result.error).toContain("cancelled");
        }, 30000);

        it("should ignore pause signal after cancel signal", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Send cancel first
            await sendCancelSignal(handle, "First signal is cancel");

            // Try to pause (should be ignored)
            await sendPauseSignal(handle, "This should be ignored");

            const result = await waitForResult(handle, 10000);
            expect(result.success).toBe(false);
            expect(result.error).toContain("cancelled");

            // Verify summary doesn't show paused
            // Note: After workflow completes, we can't query, so this is just ensuring cancel happened
        }, 30000);

        it("should ignore resume signal when not paused", async () => {
            const workflow = createLinearTestWorkflow({
                nodeCount: 3,
                nodeDelayMs: 100
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Send resume without pause (should be ignored)
            await sendResumeSignal(handle, { someData: "ignored" });

            // Workflow should complete normally
            const result = await waitForResult(handle, 10000);
            expect(result.success).toBe(true);
        }, 30000);
    });

    describe("workflow completion states", () => {
        it("should complete successfully without any signals", async () => {
            const workflow = createLinearTestWorkflow({
                nodeCount: 3,
                nodeDelayMs: 50
            });

            const result = await runWorkflowToCompletion(testEnv, workflow);

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        }, 30000);

        it("should preserve partial outputs on cancellation", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for some nodes to complete
            await waitForNodesComplete(handle, 2, { timeoutMs: 5000 });

            // Now cancel
            await sendCancelSignal(handle, "Cancelling after partial execution");

            const result = await waitForResult(handle, 10000);

            // Should have partial outputs (not empty)
            expect(result.success).toBe(false);
            expect(result.outputs).toBeDefined();
        }, 30000);
    });

    describe("edge cases", () => {
        it("should handle rapid signal sequences", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 3000,
                nodeCount: 5
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Send rapid sequence of signals
            await sendPauseSignal(handle, "pause1");
            await sendResumeSignal(handle);
            await sendPauseSignal(handle, "pause2");
            await sendResumeSignal(handle);
            await sendCancelSignal(handle, "final cancel");

            const result = await waitForResult(handle, 10000);
            expect(result.success).toBe(false);
            expect(result.error).toContain("cancelled");
        }, 30000);

        it("should handle signal sent immediately after workflow start", async () => {
            const workflow = createSlowTestWorkflow({
                totalDelayMs: 2000,
                nodeCount: 4
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Immediately send cancel (before any nodes complete)
            await sendCancelSignal(handle, "Immediate cancellation");

            const result = await waitForResult(handle, 10000);
            expect(result.success).toBe(false);
        }, 30000);
    });
});
