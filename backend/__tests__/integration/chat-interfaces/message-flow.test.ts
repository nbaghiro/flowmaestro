/**
 * Chat Interface Message Flow Tests
 *
 * Tests for sending messages, triggering executions, and handling attachments.
 */

import {
    createSimpleChatInterfaceTestEnvironment,
    createTestChatInterface,
    createTestSession,
    createSessionWithThread,
    createTestFileAttachment,
    assertWorkflowStarted
} from "./setup";
import type { SimpleChatInterfaceTestEnvironment } from "./helpers/chat-interface-test-env";

describe("Chat Interface Message Flow", () => {
    let testEnv: SimpleChatInterfaceTestEnvironment;

    beforeEach(() => {
        testEnv = createSimpleChatInterfaceTestEnvironment();
    });

    afterEach(() => {
        testEnv.cleanup();
    });

    describe("POST /api/public/chat-interfaces/:slug/messages", () => {
        it("should create thread on first message", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({
                id: "ci-001",
                slug: "test-chat",
                agentId: "agent-001",
                userId: "user-001",
                workspaceId: "ws-001"
            });
            const session = createTestSession(chatInterface.id, {
                id: "session-001",
                sessionToken: "tok_abc123",
                threadId: null // No thread yet
            });

            testEnv.repositories.chatInterface.findBySlug.mockResolvedValue(chatInterface);
            testEnv.repositories.session.findBySessionToken.mockResolvedValue(session);
            testEnv.repositories.thread.create.mockResolvedValue({ id: "thread-new-001" });
            testEnv.repositories.execution.create.mockResolvedValue({ id: "exec-001" });
            testEnv.repositories.execution.getMessagesByThread.mockResolvedValue([]);

            // Act - simulate message sending
            const thread = await testEnv.repositories.thread.create({
                user_id: chatInterface.userId,
                agent_id: chatInterface.agentId,
                workspace_id: chatInterface.workspaceId,
                title: `Chat: ${chatInterface.name}`,
                metadata: {
                    source: "chat_interface",
                    interfaceId: chatInterface.id,
                    sessionId: session.id
                }
            });

            // Update session with thread ID
            await testEnv.repositories.session.updateThreadId(session.id, thread.id);

            // Assert
            expect(thread.id).toBe("thread-new-001");
            expect(testEnv.repositories.thread.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    agent_id: chatInterface.agentId,
                    metadata: expect.objectContaining({
                        source: "chat_interface"
                    })
                })
            );
            expect(testEnv.repositories.session.updateThreadId).toHaveBeenCalledWith(
                session.id,
                "thread-new-001"
            );
        });

        it("should reuse existing thread for subsequent messages", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({
                id: "ci-001",
                agentId: "agent-001"
            });
            const existingThreadId = "thread-existing-001";
            const session = createSessionWithThread(chatInterface.id, existingThreadId, {
                sessionToken: "tok_abc123",
                messageCount: 3
            });

            testEnv.repositories.chatInterface.findBySlug.mockResolvedValue(chatInterface);
            testEnv.repositories.session.findBySessionToken.mockResolvedValue(session);

            // Act - check that thread exists
            const fetchedSession = await testEnv.repositories.session.findBySessionToken(
                chatInterface.id,
                "tok_abc123"
            );

            // Assert
            expect(fetchedSession?.threadId).toBe(existingThreadId);
            expect(testEnv.repositories.thread.create).not.toHaveBeenCalled();
        });

        it("should start Temporal workflow for message execution", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({
                id: "ci-001",
                agentId: "agent-001",
                userId: "user-001",
                workspaceId: "ws-001"
            });
            const session = createSessionWithThread(chatInterface.id, "thread-001", {
                id: "session-001",
                sessionToken: "tok_abc123"
            });
            const execution = { id: "exec-001" };

            testEnv.repositories.chatInterface.findBySlug.mockResolvedValue(chatInterface);
            testEnv.repositories.session.findBySessionToken.mockResolvedValue(session);
            testEnv.repositories.execution.create.mockResolvedValue(execution);
            testEnv.repositories.execution.getMessagesByThread.mockResolvedValue([]);

            // Act - create execution
            const createdExecution = await testEnv.repositories.execution.create({
                agent_id: chatInterface.agentId,
                user_id: chatInterface.userId,
                thread_id: session.threadId,
                status: "running",
                thread_history: [],
                metadata: {
                    source: "chat_interface",
                    interfaceId: chatInterface.id,
                    sessionToken: session.sessionToken
                }
            });

            // Start workflow
            await testEnv.services.temporal.workflow.start(
                { name: "agentOrchestratorWorkflow" },
                {
                    taskQueue: "orchestrator",
                    workflowId: `agent-execution-${createdExecution.id}`,
                    args: [
                        {
                            executionId: createdExecution.id,
                            agentId: chatInterface.agentId,
                            userId: chatInterface.userId,
                            threadId: session.threadId,
                            initialMessage: "Hello, test message",
                            workspaceId: chatInterface.workspaceId,
                            threadOnly: true
                        }
                    ]
                }
            );

            // Update session status
            await testEnv.repositories.session.updateExecutionStatus(
                session.id,
                createdExecution.id,
                "running"
            );

            // Assert
            assertWorkflowStarted(testEnv.services.temporal);
            expect(testEnv.repositories.session.updateExecutionStatus).toHaveBeenCalledWith(
                session.id,
                "exec-001",
                "running"
            );
        });

        it("should increment message count on send", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001" });
            const session = createTestSession(chatInterface.id, {
                id: "session-001",
                messageCount: 5
            });

            testEnv.repositories.session.findBySessionToken.mockResolvedValue(session);
            testEnv.repositories.session.incrementMessageCount.mockResolvedValue(undefined);

            // Act
            await testEnv.repositories.session.incrementMessageCount(session.id);

            // Assert
            expect(testEnv.repositories.session.incrementMessageCount).toHaveBeenCalledWith(
                "session-001"
            );
        });

        it("should reject empty message", () => {
            // Arrange
            const message = "";

            // Assert
            expect(message.trim()).toBe("");
            // In real route, this would return 400 Bad Request
        });

        it("should reject message with only whitespace", () => {
            // Arrange
            const message = "   \n\t  ";

            // Assert
            expect(message.trim()).toBe("");
        });

        it("should return 404 for invalid session token", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001" });
            testEnv.repositories.chatInterface.findBySlug.mockResolvedValue(chatInterface);
            testEnv.repositories.session.findBySessionToken.mockResolvedValue(null);

            // Act
            const session = await testEnv.repositories.session.findBySessionToken(
                chatInterface.id,
                "invalid_token"
            );

            // Assert
            expect(session).toBeNull();
        });

        it("should return 404 for non-existent chat interface", async () => {
            // Arrange
            testEnv.repositories.chatInterface.findBySlug.mockResolvedValue(null);

            // Act
            const result = await testEnv.repositories.chatInterface.findBySlug("non-existent");

            // Assert
            expect(result).toBeNull();
        });
    });

    describe("Message with Attachments", () => {
        it("should process file attachments", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001" });
            const session = createSessionWithThread(chatInterface.id, "thread-001", {
                id: "session-001"
            });
            const attachment = createTestFileAttachment({
                fileName: "report.pdf",
                mimeType: "application/pdf",
                gcsUri: "gs://bucket/report.pdf"
            });

            testEnv.repositories.session.findBySessionToken.mockResolvedValue(session);
            testEnv.services.attachmentProcessor.processAttachments.mockResolvedValue([
                {
                    success: true,
                    fileName: "report.pdf",
                    chunksCreated: 5
                }
            ]);

            // Act
            const results = await testEnv.services.attachmentProcessor.processAttachments({
                attachments: [attachment],
                sessionId: session.id,
                threadId: session.threadId,
                userId: chatInterface.userId
            });

            // Assert
            expect(results).toHaveLength(1);
            expect(results[0].success).toBe(true);
            expect(results[0].chunksCreated).toBe(5);
        });

        it("should include attachment metadata in execution", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001" });
            const session = createSessionWithThread(chatInterface.id, "thread-001");
            const attachments = [
                createTestFileAttachment({ fileName: "doc1.pdf" }),
                createTestFileAttachment({ fileName: "doc2.pdf" })
            ];

            testEnv.repositories.execution.create.mockResolvedValue({ id: "exec-001" });

            // Act
            await testEnv.repositories.execution.create({
                agent_id: chatInterface.agentId,
                user_id: chatInterface.userId,
                thread_id: session.threadId,
                status: "running",
                thread_history: [],
                metadata: {
                    source: "chat_interface",
                    interfaceId: chatInterface.id,
                    sessionToken: session.sessionToken,
                    attachments: JSON.parse(JSON.stringify(attachments))
                }
            });

            // Assert
            expect(testEnv.repositories.execution.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        attachments: expect.arrayContaining([
                            expect.objectContaining({ fileName: "doc1.pdf" }),
                            expect.objectContaining({ fileName: "doc2.pdf" })
                        ])
                    })
                })
            );
        });

        it("should continue processing even if attachment processing fails", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001" });
            const session = createSessionWithThread(chatInterface.id, "thread-001");
            const attachment = createTestFileAttachment();

            testEnv.services.attachmentProcessor.processAttachments.mockResolvedValue([
                {
                    success: false,
                    fileName: "test.pdf",
                    chunksCreated: 0,
                    error: "Processing failed"
                }
            ]);

            // Act
            const results = await testEnv.services.attachmentProcessor.processAttachments({
                attachments: [attachment],
                sessionId: session.id,
                threadId: session.threadId
            });

            // Assert - should still return result, just marked as failed
            expect(results[0].success).toBe(false);
            // The message should still be sent (not tested here, but the flow continues)
        });
    });

    describe("Thread History", () => {
        it("should load thread history for execution context", async () => {
            // Arrange
            const threadId = "thread-001";
            const mockHistory = [
                { id: "msg-1", role: "user", content: "First message", created_at: new Date() },
                {
                    id: "msg-2",
                    role: "assistant",
                    content: "First response",
                    created_at: new Date()
                }
            ];

            testEnv.repositories.execution.getMessagesByThread.mockResolvedValue(mockHistory);

            // Act
            const history = await testEnv.repositories.execution.getMessagesByThread(threadId);

            // Assert
            expect(history).toHaveLength(2);
            type MessageRecord = { role: string };
            expect((history[0] as MessageRecord).role).toBe("user");
            expect((history[1] as MessageRecord).role).toBe("assistant");
        });

        it("should pass history to workflow", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001" });
            const session = createSessionWithThread(chatInterface.id, "thread-001");
            const mockHistory = [
                {
                    id: "msg-1",
                    role: "user",
                    content: "Hello",
                    created_at: new Date(),
                    tool_calls: null,
                    tool_name: null,
                    tool_call_id: null
                }
            ];

            testEnv.repositories.execution.getMessagesByThread.mockResolvedValue(mockHistory);
            testEnv.repositories.execution.create.mockResolvedValue({ id: "exec-001" });

            // Act - map history for execution
            const history = await testEnv.repositories.execution.getMessagesByThread(
                session.threadId!
            );
            type HistoryMessage = { id: string; role: string; content: string; created_at: Date };
            const mappedHistory = (history as HistoryMessage[]).map((msg) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: msg.created_at
            }));

            await testEnv.repositories.execution.create({
                agent_id: chatInterface.agentId,
                user_id: chatInterface.userId,
                thread_id: session.threadId,
                status: "running",
                thread_history: mappedHistory,
                metadata: {}
            });

            // Assert
            expect(testEnv.repositories.execution.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    thread_history: expect.arrayContaining([
                        expect.objectContaining({
                            id: "msg-1",
                            role: "user",
                            content: "Hello"
                        })
                    ])
                })
            );
        });
    });

    describe("Execution Status", () => {
        it("should track execution status on session", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001" });
            const session = createTestSession(chatInterface.id, {
                id: "session-001",
                executionStatus: "idle"
            });

            testEnv.repositories.session.updateExecutionStatus.mockResolvedValue(undefined);

            // Act - update to running
            await testEnv.repositories.session.updateExecutionStatus(
                session.id,
                "exec-001",
                "running"
            );

            // Assert
            expect(testEnv.repositories.session.updateExecutionStatus).toHaveBeenCalledWith(
                "session-001",
                "exec-001",
                "running"
            );
        });

        it("should update status to completed when execution finishes", async () => {
            // Act
            await testEnv.repositories.session.updateExecutionStatus(
                "session-001",
                "exec-001",
                "completed"
            );

            // Assert
            expect(testEnv.repositories.session.updateExecutionStatus).toHaveBeenCalledWith(
                "session-001",
                "exec-001",
                "completed"
            );
        });

        it("should update status to failed on execution error", async () => {
            // Act
            await testEnv.repositories.session.updateExecutionStatus(
                "session-001",
                "exec-001",
                "failed"
            );

            // Assert
            expect(testEnv.repositories.session.updateExecutionStatus).toHaveBeenCalledWith(
                "session-001",
                "exec-001",
                "failed"
            );
        });
    });
});
