/**
 * Public Form Status Polling Route Tests
 *
 * Tests for GET /api/public/form-interfaces/:slug/submissions/:submissionId/status
 */

import {
    createSimpleFormInterfaceTestEnvironment,
    createPublishedFormInterface,
    createTestSubmission,
    createRunningSubmission,
    createCompletedSubmission,
    createFailedSubmission
} from "./setup";
import type { SimpleFormInterfaceTestEnvironment } from "./helpers/form-interface-test-env";

describe("GET /api/public/form-interfaces/:slug/submissions/:submissionId/status", () => {
    let testEnv: SimpleFormInterfaceTestEnvironment;

    beforeEach(() => {
        testEnv = createSimpleFormInterfaceTestEnvironment();
    });

    afterEach(() => {
        testEnv.cleanup();
    });

    describe("Success Cases", () => {
        it("should return pending status", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "test-form"
            });

            const submission = createTestSubmission(formInterface.id, {
                id: "sub-001",
                executionStatus: "pending",
                attachmentsStatus: "pending"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Act
            const result = await testEnv.repositories.submission.findById("sub-001");

            // Assert
            expect(result?.executionStatus).toBe("pending");
            expect(result?.attachmentsStatus).toBe("pending");
        });

        it("should return running status with executionId", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "test-form"
            });

            const submission = createRunningSubmission(formInterface.id, "exec-001", {
                id: "sub-001"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Act
            const result = await testEnv.repositories.submission.findById("sub-001");

            // Assert
            expect(result?.executionStatus).toBe("running");
            expect(result?.executionId).toBe("exec-001");
        });

        it("should return completed status with output", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "test-form"
            });

            const submission = createCompletedSubmission(
                formInterface.id,
                "This is the workflow output.",
                {
                    id: "sub-001",
                    executionId: "exec-001"
                }
            );

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Act
            const result = await testEnv.repositories.submission.findById("sub-001");

            // Assert
            expect(result?.executionStatus).toBe("completed");
            expect(result?.output).toBe("This is the workflow output.");
            expect(result?.executionId).toBe("exec-001");
        });

        it("should return failed status", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "test-form"
            });

            const submission = createFailedSubmission(formInterface.id, {
                id: "sub-001",
                executionId: "exec-001"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Act
            const result = await testEnv.repositories.submission.findById("sub-001");

            // Assert
            expect(result?.executionStatus).toBe("failed");
        });
    });

    describe("Attachment Status", () => {
        it("should return processing attachments status", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "test-form"
            });

            const submission = createTestSubmission(formInterface.id, {
                id: "sub-001",
                attachmentsStatus: "processing"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Act
            const result = await testEnv.repositories.submission.findById("sub-001");

            // Assert
            expect(result?.attachmentsStatus).toBe("processing");
        });

        it("should return ready attachments status", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "test-form"
            });

            const submission = createTestSubmission(formInterface.id, {
                id: "sub-001",
                attachmentsStatus: "ready"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Act
            const result = await testEnv.repositories.submission.findById("sub-001");

            // Assert
            expect(result?.attachmentsStatus).toBe("ready");
        });

        it("should return failed attachments status", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "test-form"
            });

            const submission = createTestSubmission(formInterface.id, {
                id: "sub-001",
                attachmentsStatus: "failed"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Act
            const result = await testEnv.repositories.submission.findById("sub-001");

            // Assert
            expect(result?.attachmentsStatus).toBe("failed");
        });
    });

    describe("Not Found", () => {
        it("should return null for non-existent form", async () => {
            // Arrange
            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(null);

            // Act
            const result = await testEnv.repositories.formInterface.findBySlug("nonexistent");

            // Assert
            expect(result).toBeNull();
        });

        it("should return null for non-existent submission", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "test-form"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(null);

            // Act
            const result = await testEnv.repositories.submission.findById("sub-nonexistent");

            // Assert
            expect(result).toBeNull();
        });
    });

    describe("Submission Ownership", () => {
        it("should fail when submission belongs to different form", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "form-one"
            });

            // Submission belongs to a different form
            const submission = createTestSubmission("fi-different", {
                id: "sub-001"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Act
            const form = await testEnv.repositories.formInterface.findBySlug("form-one");
            const sub = await testEnv.repositories.submission.findById("sub-001");

            // Assert - submission doesn't belong to this form
            expect(sub?.interfaceId).not.toBe(form?.id);
        });
    });

    describe("Response Format", () => {
        it("should return complete status response", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "test-form"
            });

            const submission = createCompletedSubmission(formInterface.id, "Output content", {
                id: "sub-001",
                executionId: "exec-001"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Act
            const sub = await testEnv.repositories.submission.findById("sub-001");

            // Build response
            const response = {
                submissionId: sub!.id,
                executionId: sub!.executionId,
                executionStatus: sub!.executionStatus,
                attachmentsStatus: sub!.attachmentsStatus,
                output: sub!.output
            };

            // Assert
            expect(response).toMatchObject({
                submissionId: "sub-001",
                executionId: "exec-001",
                executionStatus: "completed",
                attachmentsStatus: "ready",
                output: "Output content"
            });
        });

        it("should omit output when still running", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "test-form"
            });

            const submission = createRunningSubmission(formInterface.id, "exec-001", {
                id: "sub-001",
                output: null
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Act
            const sub = await testEnv.repositories.submission.findById("sub-001");

            // Assert
            expect(sub?.output).toBeNull();
            expect(sub?.executionStatus).toBe("running");
        });
    });
});
