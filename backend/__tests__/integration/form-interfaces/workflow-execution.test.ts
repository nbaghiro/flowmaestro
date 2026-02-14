/**
 * Form Interface End-to-End Workflow Execution Tests
 *
 * Tests the complete flow: submit form -> stream events -> receive output
 */

import type { PublicFormSubmitInput } from "@flowmaestro/shared";
import {
    createSimpleFormInterfaceTestEnvironment,
    createWorkflowTargetFormInterface,
    createAgentTargetFormInterface,
    createTestSubmission,
    createTestFileAttachment,
    createWorkflowProgressEvent,
    createNodeCompletedEvent,
    createWorkflowCompletedEvent,
    createAgentTokenEvent,
    createAgentCompletedEvent,
    assertWorkflowStarted
} from "./setup";
import type { SimpleFormInterfaceTestEnvironment } from "./helpers/form-interface-test-env";

describe("Form Interface E2E: Workflow Execution", () => {
    let testEnv: SimpleFormInterfaceTestEnvironment;

    beforeEach(() => {
        testEnv = createSimpleFormInterfaceTestEnvironment();
    });

    afterEach(() => {
        testEnv.cleanup();
    });

    describe("Complete Workflow Execution Flow", () => {
        it("should execute workflow and stream results", async () => {
            // ============================================================
            // STEP 1: Setup - Create published form with workflow target
            // ============================================================
            const formInterface = createWorkflowTargetFormInterface("wf-001", {
                id: "fi-e2e-001",
                slug: "e2e-workflow-form",
                status: "published",
                triggerId: "trigger-001",
                title: "E2E Test Form"
            });

            const workflow = {
                id: "wf-001",
                name: "Test Workflow",
                definition: {
                    nodes: {
                        input: { type: "input", name: "input" },
                        process: { type: "llm", name: "process" },
                        output: { type: "output", name: "output" }
                    },
                    edges: [
                        { source: "input", target: "process" },
                        { source: "process", target: "output" }
                    ]
                }
            };

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.workflow.findByIdAndWorkspaceId.mockResolvedValue(workflow);

            // ============================================================
            // STEP 2: Submit form
            // ============================================================
            const submitInput: PublicFormSubmitInput = {
                message: "Summarize this document",
                files: [createTestFileAttachment({ fileName: "document.pdf" })]
            };

            const submission = createTestSubmission(formInterface.id, {
                id: "sub-e2e-001",
                message: submitInput.message,
                files: submitInput.files,
                executionStatus: "running",
                executionId: "exec-e2e-001",
                attachmentsStatus: "processing"
            });

            testEnv.repositories.submission.create.mockResolvedValue(submission);
            testEnv.repositories.execution.create.mockResolvedValue({ id: "exec-e2e-001" });

            // Act - Submit form
            const form = await testEnv.repositories.formInterface.findBySlug("e2e-workflow-form");
            expect(form).not.toBeNull();

            const createdSubmission = await testEnv.repositories.submission.create({
                interfaceId: form!.id,
                message: submitInput.message,
                files: submitInput.files,
                urls: [],
                executionStatus: "pending",
                attachmentsStatus: "processing",
                ipAddress: "127.0.0.1",
                userAgent: "Mozilla/5.0"
            });

            // Start Temporal workflow
            await testEnv.services.temporal.workflow.start(
                { name: "orchestratorWorkflow" },
                {
                    taskQueue: "orchestrator",
                    workflowId: `workflow-execution-${createdSubmission.id}`,
                    args: [
                        {
                            executionId: createdSubmission.executionId,
                            workflowId: form!.workflowId,
                            input: { message: submitInput.message }
                        }
                    ]
                }
            );

            // Assert submission created
            expect(createdSubmission.id).toBe("sub-e2e-001");
            expect(createdSubmission.executionId).toBe("exec-e2e-001");
            assertWorkflowStarted(testEnv.services.temporal);

            // ============================================================
            // STEP 3: Connect to SSE stream
            // ============================================================
            testEnv.repositories.submission.findById.mockResolvedValue(createdSubmission);

            const sub = await testEnv.repositories.submission.findById("sub-e2e-001");
            expect(sub).not.toBeNull();
            expect(sub!.executionId).toBe("exec-e2e-001");

            // Track received events
            const receivedEvents: Record<string, unknown>[] = [];

            // Subscribe to workflow events
            await testEnv.services.eventBus.subscribe(
                "workflow:events:execution:progress",
                (message: string) => {
                    const event = JSON.parse(message);
                    if (event.executionId === "exec-e2e-001") {
                        receivedEvents.push(event);
                    }
                }
            );

            await testEnv.services.eventBus.subscribe(
                "workflow:events:node:completed",
                (message: string) => {
                    const event = JSON.parse(message);
                    if (event.executionId === "exec-e2e-001") {
                        receivedEvents.push(event);
                    }
                }
            );

            await testEnv.services.eventBus.subscribe(
                "workflow:events:execution:completed",
                (message: string) => {
                    const event = JSON.parse(message);
                    if (event.executionId === "exec-e2e-001") {
                        receivedEvents.push(event);
                    }
                }
            );

            // ============================================================
            // STEP 4: Simulate workflow events via event bus
            // ============================================================

            // Event 1: Progress (1/3 nodes completed)
            const progressEvent1 = createWorkflowProgressEvent("exec-e2e-001", 1, 3);
            testEnv.services.eventBus.simulateEvent(
                "workflow:events:execution:progress",
                progressEvent1 as import("./helpers/form-interface-test-env").FormStreamingEvent
            );

            // Event 2: Node completed (input)
            const nodeEvent1 = createNodeCompletedEvent("exec-e2e-001", "input", {
                message: "Summarize this document"
            });
            testEnv.services.eventBus.simulateEvent(
                "workflow:events:node:completed",
                nodeEvent1 as import("./helpers/form-interface-test-env").FormStreamingEvent
            );

            // Event 3: Progress (2/3 nodes completed)
            const progressEvent2 = createWorkflowProgressEvent("exec-e2e-001", 2, 3);
            testEnv.services.eventBus.simulateEvent(
                "workflow:events:execution:progress",
                progressEvent2 as import("./helpers/form-interface-test-env").FormStreamingEvent
            );

            // Event 4: Node completed (process)
            const nodeEvent2 = createNodeCompletedEvent("exec-e2e-001", "process", {
                summary: "Document summary generated"
            });
            testEnv.services.eventBus.simulateEvent(
                "workflow:events:node:completed",
                nodeEvent2 as import("./helpers/form-interface-test-env").FormStreamingEvent
            );

            // Event 5: Execution completed
            const completedEvent = createWorkflowCompletedEvent("exec-e2e-001", {
                output: "This document discusses important topics..."
            });
            testEnv.services.eventBus.simulateEvent(
                "workflow:events:execution:completed",
                completedEvent as import("./helpers/form-interface-test-env").FormStreamingEvent
            );

            // Assert events were received
            expect(receivedEvents.length).toBeGreaterThan(0);
            expect(receivedEvents.some((e) => e.type === "execution:progress")).toBe(true);
            expect(receivedEvents.some((e) => e.type === "node:completed")).toBe(true);
            expect(receivedEvents.some((e) => e.type === "execution:completed")).toBe(true);

            // ============================================================
            // STEP 5: Verify DB was updated with output
            // ============================================================
            const completedSubmission = {
                ...submission,
                executionStatus: "completed" as const,
                output: "This document discusses important topics..."
            };

            testEnv.repositories.submission.updateExecutionStatus.mockResolvedValue(
                completedSubmission
            );

            await testEnv.repositories.submission.updateExecutionStatus(
                "sub-e2e-001",
                "completed",
                "exec-e2e-001",
                "This document discusses important topics..."
            );

            expect(testEnv.repositories.submission.updateExecutionStatus).toHaveBeenCalledWith(
                "sub-e2e-001",
                "completed",
                "exec-e2e-001",
                "This document discusses important topics..."
            );
        });
    });

    describe("Complete Agent Execution Flow", () => {
        it("should execute agent and stream token results", async () => {
            // ============================================================
            // STEP 1: Setup - Create published form with agent target
            // ============================================================
            const formInterface = createAgentTargetFormInterface("agent-001", {
                id: "fi-agent-e2e",
                slug: "e2e-agent-form",
                status: "published",
                title: "E2E Agent Form"
            });

            const agent = {
                id: "agent-001",
                name: "Test Agent",
                systemPrompt: "You are a helpful assistant."
            };

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.agent.findByIdAndWorkspaceId.mockResolvedValue(agent);

            // ============================================================
            // STEP 2: Submit form
            // ============================================================
            const submitInput: PublicFormSubmitInput = {
                message: "What is the capital of France?"
            };

            const submission = createTestSubmission(formInterface.id, {
                id: "sub-agent-e2e",
                message: submitInput.message,
                executionStatus: "running",
                executionId: "exec-agent-e2e",
                attachmentsStatus: "ready"
            });

            testEnv.repositories.submission.create.mockResolvedValue(submission);
            testEnv.repositories.thread.create.mockResolvedValue({ id: "thread-e2e" });
            testEnv.repositories.agentExecution.create.mockResolvedValue({ id: "exec-agent-e2e" });

            // Act - Submit
            const form = await testEnv.repositories.formInterface.findBySlug("e2e-agent-form");
            const thread = await testEnv.repositories.thread.create({
                agentId: form!.agentId,
                title: `Form: ${form!.title}`
            });
            const execution = await testEnv.repositories.agentExecution.create({
                agentId: form!.agentId,
                threadId: thread.id
            });

            // Start Temporal workflow
            await testEnv.services.temporal.workflow.start(
                { name: "agentOrchestratorWorkflow" },
                {
                    taskQueue: "orchestrator",
                    workflowId: `agent-execution-${execution.id}`,
                    args: [
                        {
                            executionId: execution.id,
                            agentId: form!.agentId,
                            threadId: thread.id,
                            message: submitInput.message
                        }
                    ]
                }
            );

            assertWorkflowStarted(testEnv.services.temporal);

            // ============================================================
            // STEP 3: Simulate agent streaming events
            // ============================================================
            const receivedTokens: string[] = [];

            await testEnv.services.eventBus.subscribe(
                "agent:events:agent:execution:token",
                (message: string) => {
                    const event = JSON.parse(message);
                    if (event.executionId === "exec-agent-e2e") {
                        receivedTokens.push(event.token);
                    }
                }
            );

            // Simulate streaming tokens
            const tokens = ["The", " capital", " of", " France", " is", " Paris", "."];
            for (const token of tokens) {
                const tokenEvent = createAgentTokenEvent("exec-agent-e2e", token);
                testEnv.services.eventBus.simulateEvent(
                    "agent:events:agent:execution:token",
                    tokenEvent as import("./helpers/form-interface-test-env").FormStreamingEvent
                );
            }

            // Assert tokens received
            expect(receivedTokens).toEqual(tokens);
            expect(receivedTokens.join("")).toBe("The capital of France is Paris.");

            // ============================================================
            // STEP 4: Simulate completion
            // ============================================================
            const completedEvent = createAgentCompletedEvent(
                "exec-agent-e2e",
                "The capital of France is Paris."
            );

            testEnv.services.eventBus.simulateEvent(
                "agent:events:agent:execution:completed",
                completedEvent as import("./helpers/form-interface-test-env").FormStreamingEvent
            );

            // Update DB
            const completedSubmission = {
                ...submission,
                executionStatus: "completed" as const,
                output: "The capital of France is Paris."
            };

            testEnv.repositories.submission.updateExecutionStatus.mockResolvedValue(
                completedSubmission
            );

            await testEnv.repositories.submission.updateExecutionStatus(
                "sub-agent-e2e",
                "completed",
                "exec-agent-e2e",
                "The capital of France is Paris."
            );

            expect(testEnv.repositories.submission.updateExecutionStatus).toHaveBeenCalledWith(
                "sub-agent-e2e",
                "completed",
                "exec-agent-e2e",
                "The capital of France is Paris."
            );
        });
    });

    describe("Attachment Processing Flow", () => {
        it("should process attachments and make them available for RAG", async () => {
            // ============================================================
            // STEP 1: Submit form with files
            // ============================================================
            const formInterface = createWorkflowTargetFormInterface("wf-001", {
                id: "fi-rag-e2e",
                slug: "e2e-rag-form",
                allowFileUpload: true
            });

            const fileAttachment = createTestFileAttachment({
                fileName: "policy-document.pdf",
                fileSize: 1024 * 500
            });

            const submission = createTestSubmission(formInterface.id, {
                id: "sub-rag-e2e",
                message: "What is the vacation policy?",
                files: [fileAttachment],
                executionStatus: "running",
                executionId: "exec-rag-e2e",
                attachmentsStatus: "processing"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.create.mockResolvedValue(submission);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Create submission
            const createdSubmission = await testEnv.repositories.submission.create({
                interfaceId: formInterface.id,
                message: "What is the vacation policy?",
                files: [fileAttachment],
                urls: [],
                executionStatus: "running",
                attachmentsStatus: "processing",
                ipAddress: null,
                userAgent: null
            });

            // Start attachment processing workflow
            await testEnv.services.temporal.workflow.start(
                { name: "processDocumentWorkflow" },
                {
                    taskQueue: "attachments",
                    workflowId: `attachment-processing-${createdSubmission.id}`,
                    args: [
                        {
                            submissionId: createdSubmission.id,
                            files: createdSubmission.files
                        }
                    ]
                }
            );

            expect(testEnv.services.temporal.workflow.start).toHaveBeenCalledWith(
                { name: "processDocumentWorkflow" },
                expect.objectContaining({
                    taskQueue: "attachments"
                })
            );

            // ============================================================
            // STEP 2: Simulate attachment processing completion
            // ============================================================
            const processedSubmission = {
                ...submission,
                attachmentsStatus: "ready" as const
            };

            testEnv.repositories.submission.updateAttachmentsStatus.mockResolvedValue(
                processedSubmission
            );

            await testEnv.repositories.submission.updateAttachmentsStatus("sub-rag-e2e", "ready");

            // ============================================================
            // STEP 3: Verify chunks were created
            // ============================================================
            const chunks = [
                {
                    submissionId: "sub-rag-e2e",
                    sourceType: "file" as const,
                    sourceName: "policy-document.pdf",
                    sourceIndex: 0,
                    content: "Our vacation policy allows 20 days PTO per year...",
                    chunkIndex: 0,
                    embedding: new Array(1536).fill(0.1),
                    metadata: { page: 1 }
                },
                {
                    submissionId: "sub-rag-e2e",
                    sourceType: "file" as const,
                    sourceName: "policy-document.pdf",
                    sourceIndex: 0,
                    content: "Vacation requests must be submitted 2 weeks in advance...",
                    chunkIndex: 1,
                    embedding: new Array(1536).fill(0.2),
                    metadata: { page: 2 }
                }
            ];

            testEnv.repositories.submissionChunk.createChunks.mockResolvedValue(undefined);

            await testEnv.repositories.submissionChunk.createChunks(chunks);

            expect(testEnv.repositories.submissionChunk.createChunks).toHaveBeenCalledWith(chunks);

            // ============================================================
            // STEP 4: RAG query can now find relevant content
            // ============================================================
            const searchResults = [
                {
                    id: "chunk-001",
                    content: "Our vacation policy allows 20 days PTO per year...",
                    sourceName: "policy-document.pdf",
                    sourceType: "file" as const,
                    similarity: 0.92,
                    metadata: { page: 1 }
                }
            ];

            testEnv.repositories.submissionChunk.searchSimilar.mockResolvedValue(searchResults);

            const results = await testEnv.repositories.submissionChunk.searchSimilar({
                submissionId: "sub-rag-e2e",
                queryEmbedding: new Array(1536).fill(0.15),
                topK: 5,
                similarityThreshold: 0.7
            });

            expect(results).toHaveLength(1);
            expect((results[0] as { similarity: number }).similarity).toBeGreaterThan(0.9);
            expect((results[0] as { content: string }).content).toContain("vacation policy");
        });
    });

    describe("Error Handling Flow", () => {
        it("should handle workflow failure gracefully", async () => {
            // Setup
            const formInterface = createWorkflowTargetFormInterface("wf-failing", {
                id: "fi-error-e2e",
                slug: "e2e-error-form"
            });

            const submission = createTestSubmission(formInterface.id, {
                id: "sub-error-e2e",
                executionStatus: "running",
                executionId: "exec-error-e2e"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Subscribe to failure events
            let receivedError: string | null = null;
            await testEnv.services.eventBus.subscribe(
                "workflow:events:execution:failed",
                (message: string) => {
                    const event = JSON.parse(message);
                    if (event.executionId === "exec-error-e2e") {
                        receivedError = event.error;
                    }
                }
            );

            // Simulate failure
            testEnv.services.eventBus.simulateEvent("workflow:events:execution:failed", {
                type: "execution:failed",
                executionId: "exec-error-e2e",
                error: "Node 'process' failed: API rate limit exceeded",
                timestamp: Date.now()
            });

            // Update DB
            const failedSubmission = {
                ...submission,
                executionStatus: "failed" as const
            };

            testEnv.repositories.submission.updateExecutionStatus.mockResolvedValue(
                failedSubmission
            );

            await testEnv.repositories.submission.updateExecutionStatus(
                "sub-error-e2e",
                "failed",
                "exec-error-e2e"
            );

            // Assert
            expect(receivedError).toBe("Node 'process' failed: API rate limit exceeded");
            expect(testEnv.repositories.submission.updateExecutionStatus).toHaveBeenCalledWith(
                "sub-error-e2e",
                "failed",
                "exec-error-e2e"
            );
        });
    });
});
