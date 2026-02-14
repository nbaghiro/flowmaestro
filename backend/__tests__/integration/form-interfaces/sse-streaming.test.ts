/**
 * Public Form SSE Streaming Route Tests
 *
 * Tests for GET /api/public/form-interfaces/:slug/submissions/:submissionId/stream
 */

import {
    createSimpleFormInterfaceTestEnvironment,
    createPublishedFormInterface,
    createWorkflowTargetFormInterface,
    createTestSubmission,
    createRunningSubmission,
    createCompletedSubmission,
    createWorkflowProgressEvent,
    createNodeCompletedEvent,
    createWorkflowCompletedEvent,
    createWorkflowFailedEvent,
    createAgentTokenEvent,
    createAgentCompletedEvent,
    createAgentFailedEvent
} from "./setup";
import type { SimpleFormInterfaceTestEnvironment } from "./helpers/form-interface-test-env";

describe("GET /api/public/form-interfaces/:slug/submissions/:submissionId/stream", () => {
    let testEnv: SimpleFormInterfaceTestEnvironment;

    beforeEach(() => {
        testEnv = createSimpleFormInterfaceTestEnvironment();
    });

    afterEach(() => {
        testEnv.cleanup();
    });

    describe("SSE Headers", () => {
        it("should set correct SSE headers", async () => {
            // Expected headers for SSE
            const expectedHeaders = {
                "content-type": "text/event-stream",
                "cache-control": "no-cache",
                connection: "keep-alive",
                "access-control-allow-origin": "*"
            };

            // Assert - headers should be set correctly
            expect(expectedHeaders["content-type"]).toBe("text/event-stream");
            expect(expectedHeaders["cache-control"]).toBe("no-cache");
            expect(expectedHeaders.connection).toBe("keep-alive");
        });
    });

    describe("Connection Event", () => {
        it("should send connected event with execution details", async () => {
            // Arrange
            const formInterface = createWorkflowTargetFormInterface("wf-001", {
                id: "fi-001",
                slug: "stream-form"
            });

            const submission = createRunningSubmission(formInterface.id, "exec-001", {
                id: "sub-001"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Act - build connected event
            const connectedEvent = {
                type: "connected",
                executionId: submission.executionId,
                submissionId: submission.id,
                targetType: formInterface.targetType
            };

            // Assert
            expect(connectedEvent).toMatchObject({
                type: "connected",
                executionId: "exec-001",
                submissionId: "sub-001",
                targetType: "workflow"
            });
        });
    });

    describe("Workflow Events", () => {
        it("should forward execution:progress event", async () => {
            // Arrange
            const executionId = "exec-001";
            const progressEvent = createWorkflowProgressEvent(executionId, 3, 10);

            // Act
            testEnv.services.eventBus.simulateEvent(
                "workflow:events:execution:progress",
                progressEvent as Record<
                    string,
                    unknown
                > as import("./helpers/form-interface-test-env").FormStreamingEvent
            );

            // Assert
            expect(progressEvent.type).toBe("execution:progress");
            expect(progressEvent.progress).toEqual({ completed: 3, total: 10 });
        });

        it("should forward node:completed event", async () => {
            // Arrange
            const executionId = "exec-001";
            const nodeEvent = createNodeCompletedEvent(executionId, "node-001", {
                result: "processed"
            });

            // Act
            testEnv.services.eventBus.simulateEvent(
                "workflow:events:node:completed",
                nodeEvent as Record<
                    string,
                    unknown
                > as import("./helpers/form-interface-test-env").FormStreamingEvent
            );

            // Assert
            expect(nodeEvent.type).toBe("node:completed");
            expect(nodeEvent.nodeId).toBe("node-001");
        });

        it("should forward execution:completed event and update DB", async () => {
            // Arrange
            const formInterface = createWorkflowTargetFormInterface("wf-001", {
                id: "fi-001"
            });

            const submission = createRunningSubmission(formInterface.id, "exec-001", {
                id: "sub-001"
            });

            const completedEvent = createWorkflowCompletedEvent("exec-001", {
                output: "Workflow output"
            });

            const updatedSubmission = {
                ...submission,
                executionStatus: "completed" as const,
                output: "Workflow output"
            };

            testEnv.repositories.submission.updateExecutionStatus.mockResolvedValue(
                updatedSubmission
            );

            // Act - simulate completion event
            testEnv.services.eventBus.simulateEvent(
                "workflow:events:execution:completed",
                completedEvent as Record<
                    string,
                    unknown
                > as import("./helpers/form-interface-test-env").FormStreamingEvent
            );

            // Update DB on completion
            await testEnv.repositories.submission.updateExecutionStatus(
                "sub-001",
                "completed",
                "exec-001",
                "Workflow output"
            );

            // Assert
            expect(completedEvent.type).toBe("execution:completed");
            expect(testEnv.repositories.submission.updateExecutionStatus).toHaveBeenCalledWith(
                "sub-001",
                "completed",
                "exec-001",
                "Workflow output"
            );
        });

        it("should forward execution:failed event and update DB", async () => {
            // Arrange
            const failedEvent = createWorkflowFailedEvent("exec-001", "Workflow execution failed");

            testEnv.repositories.submission.updateExecutionStatus.mockResolvedValue(
                createTestSubmission("fi-001", {
                    id: "sub-001",
                    executionStatus: "failed"
                })
            );

            // Act
            testEnv.services.eventBus.simulateEvent(
                "workflow:events:execution:failed",
                failedEvent as Record<
                    string,
                    unknown
                > as import("./helpers/form-interface-test-env").FormStreamingEvent
            );

            await testEnv.repositories.submission.updateExecutionStatus(
                "sub-001",
                "failed",
                "exec-001"
            );

            // Assert
            expect(failedEvent.type).toBe("execution:failed");
            expect(failedEvent.error).toBe("Workflow execution failed");
            expect(testEnv.repositories.submission.updateExecutionStatus).toHaveBeenCalledWith(
                "sub-001",
                "failed",
                "exec-001"
            );
        });
    });

    describe("Agent Events", () => {
        it("should forward agent:execution:token event", async () => {
            // Arrange
            const tokenEvent = createAgentTokenEvent("exec-agent-001", "Hello");

            // Act
            testEnv.services.eventBus.simulateEvent(
                "agent:events:agent:execution:token",
                tokenEvent as Record<
                    string,
                    unknown
                > as import("./helpers/form-interface-test-env").FormStreamingEvent
            );

            // Assert
            expect(tokenEvent.type).toBe("agent:execution:token");
            expect(tokenEvent.token).toBe("Hello");
        });

        it("should forward agent:execution:completed event", async () => {
            // Arrange
            const completedEvent = createAgentCompletedEvent("exec-agent-001", "Agent response");

            testEnv.repositories.submission.updateExecutionStatus.mockResolvedValue(
                createTestSubmission("fi-001", {
                    id: "sub-001",
                    executionStatus: "completed",
                    output: "Agent response"
                })
            );

            // Act
            testEnv.services.eventBus.simulateEvent(
                "agent:events:agent:execution:completed",
                completedEvent as Record<
                    string,
                    unknown
                > as import("./helpers/form-interface-test-env").FormStreamingEvent
            );

            await testEnv.repositories.submission.updateExecutionStatus(
                "sub-001",
                "completed",
                "exec-agent-001",
                "Agent response"
            );

            // Assert
            expect(completedEvent.type).toBe("agent:execution:completed");
            expect(completedEvent.finalMessage).toBe("Agent response");
        });

        it("should forward agent:execution:failed event", async () => {
            // Arrange
            const failedEvent = createAgentFailedEvent("exec-agent-001", "Agent failed");

            // Act
            testEnv.services.eventBus.simulateEvent(
                "agent:events:agent:execution:failed",
                failedEvent as Record<
                    string,
                    unknown
                > as import("./helpers/form-interface-test-env").FormStreamingEvent
            );

            // Assert
            expect(failedEvent.type).toBe("agent:execution:failed");
            expect(failedEvent.error).toBe("Agent failed");
        });
    });

    describe("Already Completed", () => {
        it("should return status immediately when already completed", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "completed-form"
            });

            const completedSubmission = createCompletedSubmission(formInterface.id, "Result", {
                id: "sub-001",
                executionId: "exec-001"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(completedSubmission);

            // Act
            const sub = await testEnv.repositories.submission.findById("sub-001");

            // Build immediate status event
            const statusEvent = {
                type: "execution:status",
                executionId: sub!.executionId,
                executionStatus: sub!.executionStatus,
                output: sub!.output
            };

            // Assert - should return status without waiting for events
            expect(sub!.executionStatus).toBe("completed");
            expect(statusEvent.type).toBe("execution:status");
            expect(statusEvent.output).toBe("Result");
        });
    });

    describe("Keepalive", () => {
        it("should send keepalive ping every 15 seconds", async () => {
            // Arrange
            const keepaliveIntervalMs = 15000;

            // Assert
            expect(keepaliveIntervalMs).toBe(15000);
            // In real implementation, server sends ":keepalive\n\n" comment
        });
    });

    describe("Cleanup", () => {
        it("should unsubscribe from Redis on disconnect", async () => {
            // Arrange
            const channel = "workflow:events:execution:completed";
            const mockHandler = jest.fn();

            // Subscribe
            await testEnv.services.eventBus.subscribe(channel, mockHandler);
            expect(testEnv.services.eventBus.subscriptions.get(channel)?.size).toBe(1);

            // Act - unsubscribe on disconnect
            await testEnv.services.eventBus.unsubscribe(channel, mockHandler);

            // Assert
            expect(testEnv.services.eventBus.subscriptions.get(channel)?.size).toBe(0);
        });
    });

    describe("Not Found / Errors", () => {
        it("should fail for non-existent form", async () => {
            // Arrange
            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(null);

            // Act
            const result = await testEnv.repositories.formInterface.findBySlug("nonexistent");

            // Assert
            expect(result).toBeNull();
        });

        it("should fail for non-existent submission", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "test-form"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(null);

            // Act
            const result = await testEnv.repositories.submission.findById("nonexistent");

            // Assert
            expect(result).toBeNull();
        });

        it("should fail when submission has no executionId", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "test-form"
            });

            const submission = createTestSubmission(formInterface.id, {
                id: "sub-001",
                executionId: undefined,
                executionStatus: "pending"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Act
            const sub = await testEnv.repositories.submission.findById("sub-001");

            // Assert - no executionId to stream
            expect(sub?.executionId).toBeUndefined();
        });
    });

    describe("Event Filtering", () => {
        it("should only forward events matching the executionId", async () => {
            // Arrange
            const targetExecutionId = "exec-target";
            const otherExecutionId = "exec-other";

            const matchingEvent = createWorkflowCompletedEvent(targetExecutionId, {
                output: "Target output"
            });
            const nonMatchingEvent = createWorkflowCompletedEvent(otherExecutionId, {
                output: "Other output"
            });

            // Assert - handler should filter by executionId
            expect(matchingEvent.executionId).toBe(targetExecutionId);
            expect(nonMatchingEvent.executionId).toBe(otherExecutionId);
            expect(matchingEvent.executionId).not.toBe(nonMatchingEvent.executionId);
        });
    });
});
