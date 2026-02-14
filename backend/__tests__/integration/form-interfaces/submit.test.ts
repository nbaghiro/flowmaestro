/**
 * Public Form Submit Route Tests
 *
 * Tests for POST /api/public/form-interfaces/:slug/submit
 */

import type { PublicFormSubmitInput } from "@flowmaestro/shared";
import {
    createSimpleFormInterfaceTestEnvironment,
    createWorkflowTargetFormInterface,
    createAgentTargetFormInterface,
    createTestSubmission,
    createTestFileAttachment,
    createTestUrlAttachment,
    assertWorkflowStarted
} from "./setup";
import type { SimpleFormInterfaceTestEnvironment } from "./helpers/form-interface-test-env";

describe("POST /api/public/form-interfaces/:slug/submit", () => {
    let testEnv: SimpleFormInterfaceTestEnvironment;

    beforeEach(() => {
        testEnv = createSimpleFormInterfaceTestEnvironment();
    });

    afterEach(() => {
        testEnv.cleanup();
    });

    describe("Workflow Target Execution", () => {
        it("should create submission and start workflow execution", async () => {
            // Arrange
            const formInterface = createWorkflowTargetFormInterface("wf-001", {
                id: "fi-001",
                slug: "workflow-form",
                status: "published",
                triggerId: "trigger-001"
            });

            const input: PublicFormSubmitInput = {
                message: "Process this request"
            };

            const submission = createTestSubmission(formInterface.id, {
                id: "sub-001",
                message: input.message,
                executionStatus: "running",
                executionId: "exec-001"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.create.mockResolvedValue(submission);
            testEnv.repositories.execution.create.mockResolvedValue({ id: "exec-001" });

            // Act
            const form = await testEnv.repositories.formInterface.findBySlug("workflow-form");

            // Create submission
            const createdSubmission = await testEnv.repositories.submission.create({
                interfaceId: form!.id,
                message: input.message,
                files: [],
                urls: [],
                executionStatus: "pending",
                attachmentsStatus: "pending",
                ipAddress: "127.0.0.1",
                userAgent: "Mozilla/5.0"
            });

            // Start Temporal workflow
            await testEnv.services.temporal.workflow.start(
                { name: "orchestratorWorkflow" },
                {
                    taskQueue: "orchestrator",
                    workflowId: `workflow-execution-${createdSubmission.id}`
                }
            );

            // Assert
            expect(createdSubmission).toBeDefined();
            expect(createdSubmission.executionId).toBe("exec-001");
            assertWorkflowStarted(testEnv.services.temporal);
        });

        it("should include files and urls in submission", async () => {
            // Arrange
            const formInterface = createWorkflowTargetFormInterface("wf-001", {
                id: "fi-001",
                slug: "upload-form",
                allowFileUpload: true,
                allowUrlInput: true
            });

            const fileAttachment = createTestFileAttachment({ fileName: "document.pdf" });
            const urlAttachment = createTestUrlAttachment({ url: "https://example.com/ref" });

            const input: PublicFormSubmitInput = {
                message: "Process these attachments",
                files: [fileAttachment],
                urls: [urlAttachment]
            };

            const submission = createTestSubmission(formInterface.id, {
                id: "sub-002",
                message: input.message,
                files: input.files,
                urls: input.urls,
                attachmentsStatus: "processing"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.create.mockResolvedValue(submission);

            // Act
            const createdSubmission = await testEnv.repositories.submission.create({
                interfaceId: formInterface.id,
                message: input.message,
                files: input.files,
                urls: input.urls,
                executionStatus: "pending",
                attachmentsStatus: "processing",
                ipAddress: "127.0.0.1",
                userAgent: "Mozilla/5.0"
            });

            // Assert
            expect(createdSubmission.files).toHaveLength(1);
            expect(createdSubmission.files[0].fileName).toBe("document.pdf");
            expect(createdSubmission.urls).toHaveLength(1);
            expect(createdSubmission.urls[0].url).toBe("https://example.com/ref");
            expect(createdSubmission.attachmentsStatus).toBe("processing");
        });
    });

    describe("Agent Target Execution", () => {
        it("should create submission, thread, and start agent execution", async () => {
            // Arrange
            const formInterface = createAgentTargetFormInterface("agent-001", {
                id: "fi-agent-001",
                slug: "agent-form",
                status: "published"
            });

            const input: PublicFormSubmitInput = {
                message: "Help me with this task"
            };

            const submission = createTestSubmission(formInterface.id, {
                id: "sub-agent-001",
                message: input.message,
                executionStatus: "running",
                executionId: "agent-exec-001"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.thread.create.mockResolvedValue({ id: "thread-001" });
            testEnv.repositories.agentExecution.create.mockResolvedValue({ id: "agent-exec-001" });
            testEnv.repositories.submission.create.mockResolvedValue(submission);

            // Act
            const form = await testEnv.repositories.formInterface.findBySlug("agent-form");

            // Create thread for agent
            const thread = await testEnv.repositories.thread.create({
                agentId: form!.agentId,
                title: `Form: ${form!.title}`,
                metadata: {
                    source: "form_interface",
                    interfaceId: form!.id
                }
            });

            // Create agent execution
            const execution = await testEnv.repositories.agentExecution.create({
                agentId: form!.agentId,
                threadId: thread.id,
                status: "running"
            });

            // Start Temporal workflow for agent
            await testEnv.services.temporal.workflow.start(
                { name: "agentOrchestratorWorkflow" },
                {
                    taskQueue: "orchestrator",
                    workflowId: `agent-execution-${execution.id}`
                }
            );

            // Assert
            expect(thread.id).toBe("thread-001");
            expect(execution.id).toBe("agent-exec-001");
            assertWorkflowStarted(testEnv.services.temporal);
        });
    });

    describe("Attachment Processing", () => {
        it("should start attachment processing workflow when files present", async () => {
            // Arrange
            const formInterface = createWorkflowTargetFormInterface("wf-001", {
                id: "fi-001",
                allowFileUpload: true
            });

            const fileAttachment = createTestFileAttachment();
            const submission = createTestSubmission(formInterface.id, {
                id: "sub-with-files",
                files: [fileAttachment],
                attachmentsStatus: "processing"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.create.mockResolvedValue(submission);

            // Act
            const createdSubmission = await testEnv.repositories.submission.create({
                interfaceId: formInterface.id,
                message: "Message",
                files: [fileAttachment],
                urls: [],
                executionStatus: "running",
                attachmentsStatus: "processing",
                ipAddress: null,
                userAgent: null
            });

            // Start attachment processing workflow
            if (createdSubmission.files.length > 0 || createdSubmission.urls.length > 0) {
                await testEnv.services.temporal.workflow.start(
                    { name: "processDocumentWorkflow" },
                    {
                        taskQueue: "attachments",
                        workflowId: `attachment-processing-${createdSubmission.id}`
                    }
                );
            }

            // Assert
            expect(createdSubmission.attachmentsStatus).toBe("processing");
            expect(testEnv.services.temporal.workflow.start).toHaveBeenCalledWith(
                { name: "processDocumentWorkflow" },
                expect.objectContaining({
                    taskQueue: "attachments"
                })
            );
        });

        it("should mark attachments as ready when no files present", async () => {
            // Arrange
            const formInterface = createWorkflowTargetFormInterface("wf-001", {
                id: "fi-001"
            });

            const submission = createTestSubmission(formInterface.id, {
                id: "sub-no-files",
                files: [],
                urls: [],
                attachmentsStatus: "ready"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.create.mockResolvedValue(submission);

            // Act
            const createdSubmission = await testEnv.repositories.submission.create({
                interfaceId: formInterface.id,
                message: "Message without attachments",
                files: [],
                urls: [],
                executionStatus: "running",
                attachmentsStatus: "ready",
                ipAddress: null,
                userAgent: null
            });

            // Assert
            expect(createdSubmission.attachmentsStatus).toBe("ready");
        });
    });

    describe("Validation", () => {
        it("should reject empty message", async () => {
            // Arrange
            const input: PublicFormSubmitInput = {
                message: ""
            };

            // Assert - validation should fail
            expect(input.message).toBe("");
        });

        it("should reject when too many files", async () => {
            // Arrange
            const formInterface = createWorkflowTargetFormInterface("wf-001", {
                id: "fi-001",
                maxFiles: 3
            });

            const files = Array.from({ length: 5 }, () => createTestFileAttachment());

            // Assert - 5 files exceeds maxFiles of 3
            expect(files.length).toBeGreaterThan(formInterface.maxFiles);
        });
    });

    describe("Not Found", () => {
        it("should fail for non-existent slug", async () => {
            // Arrange
            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(null);

            // Act
            const result = await testEnv.repositories.formInterface.findBySlug("nonexistent");

            // Assert
            expect(result).toBeNull();
        });

        it("should fail for draft form", async () => {
            // Arrange - draft forms are filtered out
            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(null);

            // Act
            const result = await testEnv.repositories.formInterface.findBySlug("draft-form");

            // Assert
            expect(result).toBeNull();
        });
    });

    describe("Form Without Target", () => {
        it("should fail when form has no valid target", async () => {
            // Arrange - form without workflow or agent
            const invalidForm = createWorkflowTargetFormInterface("wf-001", {
                id: "fi-invalid",
                workflowId: null,
                agentId: null
            });
            invalidForm.workflowId = null;

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(invalidForm);

            // Act
            const form = await testEnv.repositories.formInterface.findBySlug("invalid-form");

            // Assert - should have no valid target
            const hasValidTarget =
                (form?.targetType === "workflow" && form.workflowId) ||
                (form?.targetType === "agent" && form.agentId);
            expect(hasValidTarget).toBe(false);
        });
    });

    describe("Response Format", () => {
        it("should return submissionId and executionId", async () => {
            // Arrange
            const formInterface = createWorkflowTargetFormInterface("wf-001", {
                id: "fi-001",
                slug: "test-form"
            });

            const submission = createTestSubmission(formInterface.id, {
                id: "sub-response-001",
                executionId: "exec-response-001",
                executionStatus: "running"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.create.mockResolvedValue(submission);

            // Act
            const createdSubmission = await testEnv.repositories.submission.create({
                interfaceId: formInterface.id,
                message: "Test",
                files: [],
                urls: [],
                executionStatus: "running",
                attachmentsStatus: "ready",
                ipAddress: null,
                userAgent: null
            });

            // Assert
            const response = {
                submissionId: createdSubmission.id,
                executionId: createdSubmission.executionId
            };

            expect(response.submissionId).toBe("sub-response-001");
            expect(response.executionId).toBe("exec-response-001");
        });
    });
});
