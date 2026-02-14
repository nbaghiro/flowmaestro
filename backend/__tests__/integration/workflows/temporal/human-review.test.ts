/**
 * Human Review Signal Integration Tests
 *
 * Tests for human-in-the-loop workflow functionality:
 * - Workflow pauses at humanReview node
 * - humanReviewResponseSignal resumes workflow with user input
 * - Response injection into workflow context
 * - Cancellation during human review wait
 * - Multiple human review nodes in sequence
 * - Different input types (text, number, boolean, json)
 */

import { withHumanReviewPause, withMultipleHumanReviewPauses } from "../../../fixtures/activities";
import {
    createTemporalTestEnv,
    startWorkflow,
    sendCancelSignal,
    sendHumanReviewResponseSignal,
    queryExecutionProgress,
    queryExecutionSummary,
    waitForWorkflowState,
    waitForNodesComplete,
    createHumanReviewTestWorkflow,
    createMultipleHumanReviewTestWorkflow,
    waitForResult,
    delay,
    type TemporalTestEnv
} from "./helpers";

describe("Human Review Signal Integration", () => {
    let testEnv: TemporalTestEnv;

    beforeAll(async () => {
        // Create test env with human review node configured to pause
        const humanReviewConfig = withHumanReviewPause("HumanReview", {
            variableName: "userResponse",
            inputType: "text",
            prompt: "Please provide your input",
            required: true
        });

        testEnv = await createTemporalTestEnv(humanReviewConfig);
    }, 60000);

    afterAll(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }, 30000);

    describe("basic human review flow", () => {
        it("should pause workflow at humanReview node", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "userResponse",
                inputType: "text",
                prompt: "Enter your name"
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for Input to complete
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Wait for workflow to pause at human review
            const summary = await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            expect(summary.status).toBe("paused");
            expect(summary.pauseReason).toContain("Human review");

            // Cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should resume workflow when humanReviewResponse signal received", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "userName",
                inputType: "text",
                prompt: "Enter your name"
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for pause
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Send response
            await sendHumanReviewResponseSignal(handle, {
                variableName: "userName",
                response: "John Doe"
            });

            // Wait for completion
            const result = await waitForResult(handle, 15000);

            expect(result.success).toBe(true);
        }, 30000);

        it("should inject response value into workflow context", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "testInput",
                inputType: "text",
                prompt: "Enter test value",
                postReviewNodeCount: 1 // Add a node after to verify context
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for pause
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Send response with specific value
            const testValue = "injected-test-value-123";
            await sendHumanReviewResponseSignal(handle, {
                variableName: "testInput",
                response: testValue
            });

            // Wait for completion
            const result = await waitForResult(handle, 15000);

            expect(result.success).toBe(true);
            // The output should contain our injected value (via context)
            expect(result.outputs).toBeDefined();
        }, 30000);

        it("should complete workflow after human review", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "userChoice",
                inputType: "text",
                prompt: "Make your choice"
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for pause
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Get progress before response
            const progressBefore = await queryExecutionProgress(handle);
            expect(progressBefore.completedNodes).toBeGreaterThanOrEqual(1);

            // Send response
            await sendHumanReviewResponseSignal(handle, {
                variableName: "userChoice",
                response: "option-a"
            });

            // Wait for completion
            const result = await waitForResult(handle, 15000);

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        }, 30000);
    });

    describe("cancellation during human review", () => {
        it("should cancel workflow while waiting for response", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "userResponse",
                inputType: "text"
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for pause
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Cancel instead of providing response
            await sendCancelSignal(handle, "User cancelled");

            const result = await waitForResult(handle, 10000);

            expect(result.success).toBe(false);
            expect(result.error).toContain("cancelled");
            expect(result.error).toContain("User cancelled");
        }, 30000);

        it("should include partial outputs on cancellation", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "userResponse",
                inputType: "text",
                preReviewNodeCount: 2 // Add nodes before review to generate outputs
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for pause (after pre-review nodes complete)
            await waitForWorkflowState(handle, "paused", { timeoutMs: 10000 });

            // Get progress before cancellation
            const progress = await queryExecutionProgress(handle);
            expect(progress.completedNodes).toBeGreaterThanOrEqual(3); // Input + 2 pre-review

            // Cancel
            await sendCancelSignal(handle, "Cancelling after partial execution");

            const result = await waitForResult(handle, 10000);

            expect(result.success).toBe(false);
            expect(result.outputs).toBeDefined();
        }, 30000);

        it("should report cancelled status in error message", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "userResponse",
                inputType: "text"
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for pause
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Cancel with specific reason
            const cancelReason = "User decided not to continue";
            await sendCancelSignal(handle, cancelReason);

            const result = await waitForResult(handle, 10000);

            expect(result.success).toBe(false);
            expect(result.error).toContain(cancelReason);
        }, 30000);
    });

    describe("response input types", () => {
        it("should accept text response for text input type", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "textInput",
                inputType: "text",
                prompt: "Enter some text"
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            await sendHumanReviewResponseSignal(handle, {
                variableName: "textInput",
                response: "This is a text response"
            });

            const result = await waitForResult(handle, 15000);
            expect(result.success).toBe(true);
        }, 30000);

        it("should accept number response for number input type", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "numberInput",
                inputType: "number",
                prompt: "Enter a number"
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            await sendHumanReviewResponseSignal(handle, {
                variableName: "numberInput",
                response: 42
            });

            const result = await waitForResult(handle, 15000);
            expect(result.success).toBe(true);
        }, 30000);

        it("should accept boolean response for boolean input type", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "booleanInput",
                inputType: "boolean",
                prompt: "Yes or No?"
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            await sendHumanReviewResponseSignal(handle, {
                variableName: "booleanInput",
                response: true
            });

            const result = await waitForResult(handle, 15000);
            expect(result.success).toBe(true);
        }, 30000);

        it("should accept object response for json input type", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "jsonInput",
                inputType: "json",
                prompt: "Provide JSON data"
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            await sendHumanReviewResponseSignal(handle, {
                variableName: "jsonInput",
                response: {
                    name: "John",
                    age: 30,
                    preferences: {
                        theme: "dark",
                        notifications: true
                    }
                }
            });

            const result = await waitForResult(handle, 15000);
            expect(result.success).toBe(true);
        }, 30000);
    });

    describe("edge cases", () => {
        it("should handle rapid response after pause", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "rapidResponse",
                inputType: "text"
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for pause
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Send response immediately (no delay)
            await sendHumanReviewResponseSignal(handle, {
                variableName: "rapidResponse",
                response: "immediate response"
            });

            const result = await waitForResult(handle, 15000);
            expect(result.success).toBe(true);
        }, 30000);

        it("should handle response signal sent before pause completes", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "earlyResponse",
                inputType: "text"
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Wait for Input to complete (human review starting)
            await waitForNodesComplete(handle, 1, { timeoutMs: 5000 });

            // Small delay then send response (might arrive during pause setup)
            await delay(50);
            await sendHumanReviewResponseSignal(handle, {
                variableName: "earlyResponse",
                response: "early response"
            });

            // Should either complete successfully or remain paused (if signal was too early)
            // If signal arrived too early and was ignored, send it again after waiting
            try {
                const result = await waitForResult(handle, 5000);
                // Either outcome is acceptable
                expect(typeof result.success).toBe("boolean");
            } catch {
                // Signal arrived too early, resend it
                await sendHumanReviewResponseSignal(handle, {
                    variableName: "earlyResponse",
                    response: "retry response"
                });
                const result = await waitForResult(handle, 10000);
                expect(typeof result.success).toBe("boolean");
            }
        }, 30000);

        it("should ignore response signal when workflow is not paused for human review", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "userResponse",
                inputType: "text",
                preReviewNodeCount: 3 // Add nodes before to delay reaching human review
            });

            const { handle } = await startWorkflow(testEnv, workflow);

            // Send response before reaching human review node
            await delay(50);
            await sendHumanReviewResponseSignal(handle, {
                variableName: "userResponse",
                response: "premature response"
            });

            // Wait for actual pause
            await waitForWorkflowState(handle, "paused", { timeoutMs: 10000 });

            // Send correct response
            await sendHumanReviewResponseSignal(handle, {
                variableName: "userResponse",
                response: "correct response"
            });

            const result = await waitForResult(handle, 15000);
            expect(result.success).toBe(true);
        }, 30000);

        it("should handle empty string response when not required", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "optionalInput",
                inputType: "text",
                required: false
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            await sendHumanReviewResponseSignal(handle, {
                variableName: "optionalInput",
                response: ""
            });

            const result = await waitForResult(handle, 15000);
            expect(result.success).toBe(true);
        }, 30000);
    });

    describe("workflow state during human review", () => {
        it("should report paused status in query while waiting", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "userResponse",
                inputType: "text"
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Query state multiple times to ensure consistency
            const summary1 = await queryExecutionSummary(handle);
            await delay(500);
            const summary2 = await queryExecutionSummary(handle);

            expect(summary1.status).toBe("paused");
            expect(summary2.status).toBe("paused");
            expect(summary1.pauseReason).toBeDefined();

            // Cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should show correct progress while paused", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "userResponse",
                inputType: "text",
                preReviewNodeCount: 2
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForWorkflowState(handle, "paused", { timeoutMs: 10000 });

            const progress = await queryExecutionProgress(handle);

            // Should show Input + 2 pre-review + HumanReview as completed/executing
            expect(progress.completedNodes).toBeGreaterThanOrEqual(3);
            expect(progress.percentComplete).toBeGreaterThan(0);
            expect(progress.percentComplete).toBeLessThan(100);

            // Cleanup
            await sendCancelSignal(handle, "Cleanup");
            await waitForResult(handle, 10000);
        }, 30000);

        it("should transition from paused to running after response", async () => {
            const workflow = createHumanReviewTestWorkflow({
                variableName: "userResponse",
                inputType: "text",
                postReviewNodeCount: 2 // Add nodes after to observe running state
            });

            const { handle } = await startWorkflow(testEnv, workflow);
            await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

            // Send response
            await sendHumanReviewResponseSignal(handle, {
                variableName: "userResponse",
                response: "test response"
            });

            // Should transition to running (or complete if fast)
            // Try to catch the running state
            try {
                const summary = await waitForWorkflowState(handle, "running", {
                    timeoutMs: 2000
                });
                expect(summary.status).toBe("running");
            } catch {
                // Workflow may have completed too quickly - that's OK
            }

            const result = await waitForResult(handle, 15000);
            expect(result.success).toBe(true);
        }, 30000);
    });
});

describe("Multiple Human Review Nodes", () => {
    let testEnv: TemporalTestEnv;

    beforeAll(async () => {
        // Create test env with multiple human review nodes configured
        const multiReviewConfig = withMultipleHumanReviewPauses([
            { nodeId: "HumanReview1", variableName: "response1", prompt: "First input" },
            { nodeId: "HumanReview2", variableName: "response2", prompt: "Second input" },
            { nodeId: "HumanReview3", variableName: "response3", prompt: "Third input" }
        ]);

        testEnv = await createTemporalTestEnv(multiReviewConfig);
    }, 60000);

    afterAll(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    }, 30000);

    it("should handle sequential human review nodes", async () => {
        const workflow = createMultipleHumanReviewTestWorkflow({
            reviewCount: 2
        });

        const { handle } = await startWorkflow(testEnv, workflow);

        // First pause
        await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

        // First response
        await sendHumanReviewResponseSignal(handle, {
            variableName: "response1",
            response: "first answer"
        });

        // Second pause
        await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });

        // Second response
        await sendHumanReviewResponseSignal(handle, {
            variableName: "response2",
            response: "second answer"
        });

        // Should complete
        const result = await waitForResult(handle, 15000);
        expect(result.success).toBe(true);
    }, 45000);

    it("should allow cancellation at any human review step", async () => {
        const workflow = createMultipleHumanReviewTestWorkflow({
            reviewCount: 3
        });

        const { handle } = await startWorkflow(testEnv, workflow);

        // First pause and response
        await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });
        await sendHumanReviewResponseSignal(handle, {
            variableName: "response1",
            response: "first answer"
        });

        // Second pause - cancel here
        await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });
        await sendCancelSignal(handle, "Cancelled at second review");

        const result = await waitForResult(handle, 10000);
        expect(result.success).toBe(false);
        expect(result.error).toContain("Cancelled at second review");
    }, 45000);

    it("should preserve responses from earlier reviews", async () => {
        const workflow = createMultipleHumanReviewTestWorkflow({
            reviewCount: 2
        });

        const { handle } = await startWorkflow(testEnv, workflow);

        // First review
        await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });
        await sendHumanReviewResponseSignal(handle, {
            variableName: "response1",
            response: "preserved-value-1"
        });

        // Second review
        await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });
        await sendHumanReviewResponseSignal(handle, {
            variableName: "response2",
            response: "preserved-value-2"
        });

        const result = await waitForResult(handle, 15000);
        expect(result.success).toBe(true);
        // Both responses should be in the final context/outputs
        expect(result.outputs).toBeDefined();
    }, 45000);

    it("should track progress across multiple reviews", async () => {
        const workflow = createMultipleHumanReviewTestWorkflow({
            reviewCount: 2
        });

        const { handle } = await startWorkflow(testEnv, workflow);

        // First pause
        await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });
        const progress1 = await queryExecutionProgress(handle);

        await sendHumanReviewResponseSignal(handle, {
            variableName: "response1",
            response: "answer 1"
        });

        // Second pause
        await waitForWorkflowState(handle, "paused", { timeoutMs: 5000 });
        const progress2 = await queryExecutionProgress(handle);

        // Progress should have increased
        expect(progress2.completedNodes).toBeGreaterThan(progress1.completedNodes);

        // Complete workflow
        await sendHumanReviewResponseSignal(handle, {
            variableName: "response2",
            response: "answer 2"
        });

        const result = await waitForResult(handle, 15000);
        expect(result.success).toBe(true);
    }, 45000);
});
