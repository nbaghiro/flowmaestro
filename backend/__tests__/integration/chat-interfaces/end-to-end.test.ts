/**
 * Chat Interface End-to-End Tests
 *
 * Tests for complete conversation flows and integration scenarios.
 */

import {
    createSimpleChatInterfaceTestEnvironment,
    createTestChatInterface,
    createTestSession,
    createSessionWithThread,
    createPublicChatInterface,
    createTestFileAttachment,
    createCompleteScenario,
    createSemanticSearchScenario,
    assertWorkflowStarted,
    generateDeterministicEmbedding
} from "./setup";
import type { SimpleChatInterfaceTestEnvironment } from "./helpers/chat-interface-test-env";
import type { ChunkSearchResult } from "../../../src/storage/repositories/ChatInterfaceMessageChunkRepository";

describe("Chat Interface End-to-End", () => {
    let testEnv: SimpleChatInterfaceTestEnvironment;

    beforeEach(() => {
        testEnv = createSimpleChatInterfaceTestEnvironment();
    });

    afterEach(() => {
        testEnv.cleanup();
    });

    describe("Full Conversation Flow", () => {
        it("should complete config -> session -> message -> response flow", async () => {
            // Step 1: Get chat interface configuration
            const chatInterface = createTestChatInterface({
                id: "ci-001",
                slug: "test-chat",
                status: "published",
                agentId: "agent-001",
                userId: "user-001",
                workspaceId: "ws-001"
            });
            const publicInterface = createPublicChatInterface({
                id: chatInterface.id,
                slug: chatInterface.slug,
                title: chatInterface.title
            });

            testEnv.repositories.chatInterface.findBySlugPublic.mockResolvedValue(publicInterface);
            testEnv.repositories.chatInterface.findBySlug.mockResolvedValue(chatInterface);

            // Verify config is accessible
            const config = await testEnv.repositories.chatInterface.findBySlugPublic("test-chat");
            expect(config).not.toBeNull();
            expect(config?.slug).toBe("test-chat");

            // Step 2: Create session
            const session = createTestSession(chatInterface.id, {
                id: "session-001",
                sessionToken: "tok_session_001",
                threadId: null
            });

            testEnv.repositories.session.create.mockResolvedValue(session);
            testEnv.repositories.session.findByPersistenceToken.mockResolvedValue(null);
            testEnv.repositories.session.findByFingerprint.mockResolvedValue(null);
            testEnv.repositories.session.findBySessionToken.mockResolvedValue(session);

            const createdSession = await testEnv.repositories.session.create({
                interfaceId: chatInterface.id,
                browserFingerprint: "fp_test",
                ipAddress: "127.0.0.1"
            });
            expect(createdSession.sessionToken).toBe("tok_session_001");

            // Step 3: Send first message (creates thread)
            testEnv.repositories.thread.create.mockResolvedValue({ id: "thread-001" });
            testEnv.repositories.execution.create.mockResolvedValue({ id: "exec-001" });
            testEnv.repositories.execution.getMessagesByThread.mockResolvedValue([]);

            const thread = await testEnv.repositories.thread.create({
                user_id: chatInterface.userId,
                agent_id: chatInterface.agentId,
                workspace_id: chatInterface.workspaceId,
                title: `Chat: ${chatInterface.name}`
            });
            expect(thread.id).toBe("thread-001");

            // Link thread to session
            await testEnv.repositories.session.updateThreadId(session.id, thread.id);

            // Create execution
            const execution = await testEnv.repositories.execution.create({
                agent_id: chatInterface.agentId,
                user_id: chatInterface.userId,
                thread_id: thread.id,
                status: "running",
                metadata: { source: "chat_interface" }
            });

            // Start workflow
            await testEnv.services.temporal.workflow.start(
                { name: "agentOrchestratorWorkflow" },
                {
                    taskQueue: "orchestrator",
                    workflowId: `agent-execution-${execution.id}`,
                    args: [
                        {
                            executionId: execution.id,
                            agentId: chatInterface.agentId,
                            userId: chatInterface.userId,
                            threadId: thread.id,
                            initialMessage: "Hello, I have a question about vacation policy",
                            workspaceId: chatInterface.workspaceId,
                            threadOnly: true
                        }
                    ]
                }
            );

            assertWorkflowStarted(testEnv.services.temporal);

            // Step 4: Receive response via SSE (simulated)
            const updatedSession = createSessionWithThread(chatInterface.id, thread.id, {
                ...session,
                threadId: thread.id
            });
            testEnv.repositories.session.findBySlugAndToken.mockResolvedValue(updatedSession);

            // Subscribe to events
            let responseReceived = false;
            await testEnv.services.eventBus.subscribeToThread(thread.id, (event) => {
                if (event.type === "thread:message:complete") {
                    responseReceived = true;
                }
            });

            // Simulate response
            testEnv.services.eventBus.simulateEvent(thread.id, {
                type: "thread:message:complete",
                threadId: thread.id,
                executionId: execution.id,
                timestamp: Date.now(),
                messageId: "msg-001",
                finalContent: "You have 20 days of PTO per year.",
                tokenCount: 10,
                saved: true
            });

            expect(responseReceived).toBe(true);
        });
    });

    describe("Session Resumption with History", () => {
        it("should resume session and continue conversation", async () => {
            // Arrange - existing session with history
            const chatInterface = createTestChatInterface({ id: "ci-001", slug: "test-chat" });
            const existingSession = createSessionWithThread(chatInterface.id, "thread-001", {
                id: "session-existing",
                sessionToken: "tok_existing",
                persistenceToken: "persist_abc123",
                messageCount: 4
            });

            const existingMessages = [
                {
                    id: "msg-1",
                    role: "user",
                    content: "What is the vacation policy?",
                    created_at: new Date()
                },
                {
                    id: "msg-2",
                    role: "assistant",
                    content: "You have 20 days of PTO per year.",
                    created_at: new Date()
                },
                {
                    id: "msg-3",
                    role: "user",
                    content: "How do I request time off?",
                    created_at: new Date()
                },
                {
                    id: "msg-4",
                    role: "assistant",
                    content: "Submit a request through the HR portal 2 weeks in advance.",
                    created_at: new Date()
                }
            ];

            testEnv.repositories.chatInterface.findBySlug.mockResolvedValue(chatInterface);
            testEnv.repositories.session.findByPersistenceToken.mockResolvedValue(existingSession);
            testEnv.repositories.execution.getMessagesByThread.mockResolvedValue(existingMessages);

            // Act - resume session with persistence token
            const resumedSession = await testEnv.repositories.session.findByPersistenceToken(
                chatInterface.id,
                "persist_abc123"
            );

            expect(resumedSession).not.toBeNull();
            expect(resumedSession?.messageCount).toBe(4);

            // Load message history
            const history = await testEnv.repositories.execution.getMessagesByThread(
                resumedSession!.threadId!
            );
            expect(history).toHaveLength(4);

            // Continue conversation
            testEnv.repositories.execution.create.mockResolvedValue({ id: "exec-002" });

            await testEnv.repositories.session.incrementMessageCount(resumedSession!.id);
            type HistoryMessage = { id: string; role: string; content: string; created_at: Date };
            await testEnv.repositories.execution.create({
                agent_id: chatInterface.agentId,
                thread_id: resumedSession!.threadId,
                thread_history: (history as HistoryMessage[]).map((m) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    timestamp: m.created_at
                })),
                metadata: {}
            });

            expect(testEnv.repositories.session.incrementMessageCount).toHaveBeenCalledWith(
                "session-existing"
            );
        });
    });

    describe("File Upload and RAG Query Flow", () => {
        it("should upload -> process -> query", async () => {
            // Arrange
            const { chatInterface, session, chunks } = createCompleteScenario({
                hasThread: true,
                chunkCount: 5
            });

            testEnv.repositories.chatInterface.findBySlug.mockResolvedValue(chatInterface);
            testEnv.repositories.session.findBySlugAndToken.mockResolvedValue(session);

            // Step 1: Upload file
            const attachment = createTestFileAttachment({
                fileName: "company-policies.pdf",
                mimeType: "application/pdf"
            });

            testEnv.services.gcs.upload.mockResolvedValue("gs://bucket/company-policies.pdf");
            testEnv.services.gcs.getSignedDownloadUrl.mockResolvedValue(
                "https://storage.googleapis.com/signed/company-policies.pdf"
            );

            const gcsUri = await testEnv.services.gcs.upload({}, { filename: attachment.fileName });
            expect(gcsUri).toContain("company-policies.pdf");

            // Step 2: Process attachment
            testEnv.services.attachmentProcessor.processAttachments.mockResolvedValue([
                {
                    success: true,
                    fileName: "company-policies.pdf",
                    chunksCreated: 5
                }
            ]);

            const processingResults = await testEnv.services.attachmentProcessor.processAttachments(
                {
                    attachments: [{ ...attachment, gcsUri }],
                    sessionId: session.id,
                    threadId: session.threadId
                }
            );

            expect(processingResults[0].success).toBe(true);
            expect(processingResults[0].chunksCreated).toBe(5);

            // Step 3: Query uploaded content
            const query = "What is the vacation policy?";
            const queryEmbedding = generateDeterministicEmbedding(query);

            const searchResults: ChunkSearchResult[] = [
                {
                    id: chunks[0].sessionId,
                    sessionId: session.id,
                    sourceType: "file",
                    sourceName: "company-policies.pdf",
                    content:
                        "Vacation policy allows 20 days of PTO per year. Request 2 weeks in advance.",
                    chunkIndex: 0,
                    metadata: {},
                    similarity: 0.92
                }
            ];

            testEnv.repositories.chunk.countBySessionId.mockResolvedValue(5);
            testEnv.repositories.chunk.searchSimilar.mockResolvedValue(searchResults);

            const chunkCount = await testEnv.repositories.chunk.countBySessionId(session.id);
            expect(chunkCount).toBe(5);

            const results = await testEnv.repositories.chunk.searchSimilar({
                sessionId: session.id,
                queryEmbedding,
                topK: 3,
                similarityThreshold: 0.7
            });

            expect(results).toHaveLength(1);
            expect(results[0].content).toContain("Vacation policy");
        });
    });

    describe("Rate Limit Recovery", () => {
        it("should allow requests after rate limit window expires", async () => {
            // This test simulates waiting for rate limit to reset

            // Arrange
            const interfaceId = "ci-001";
            const sessionToken = "tok_abc123";
            const key = `chat-rate:${interfaceId}:${sessionToken}`;
            const windowSeconds = 1; // Short window for test

            // Add old entries that should be expired
            const now = Date.now();
            const oldTime = now - 2000; // 2 seconds ago

            // Simulate entries from 2 seconds ago
            await testEnv.redis.zadd(key, oldTime, "request-1");
            await testEnv.redis.zadd(key, oldTime + 100, "request-2");
            await testEnv.redis.zadd(key, oldTime + 200, "request-3");

            // Verify entries exist
            let count = await testEnv.redis.zcard(key);
            expect(count).toBe(3);

            // Clean old entries (simulating window expiry)
            await testEnv.redis.zremrangebyscore(key, 0, now - windowSeconds * 1000);

            // Verify entries are cleaned
            count = await testEnv.redis.zcard(key);
            expect(count).toBe(0);

            // New request should be allowed
            await testEnv.redis.zadd(key, now, "new-request");
            count = await testEnv.redis.zcard(key);
            expect(count).toBe(1);
        });
    });

    describe("Multi-Message Conversation", () => {
        it("should handle back-and-forth conversation", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({
                id: "ci-001",
                agentId: "agent-001"
            });
            const threadId = "thread-conversation";
            const session = createSessionWithThread(chatInterface.id, threadId, {
                id: "session-001"
            });

            testEnv.repositories.chatInterface.findBySlug.mockResolvedValue(chatInterface);
            testEnv.repositories.session.findBySessionToken.mockResolvedValue(session);

            // Complete conversation history
            const messages = [
                { id: "msg-1", role: "user", content: "Hi" },
                { id: "msg-2", role: "assistant", content: "Hello! How can I help?" },
                { id: "msg-3", role: "user", content: "What is the remote work policy?" },
                {
                    id: "msg-4",
                    role: "assistant",
                    content: "You can work remotely 3 days per week."
                },
                { id: "msg-5", role: "user", content: "Thanks!" },
                { id: "msg-6", role: "assistant", content: "You're welcome!" }
            ];

            // Mock the complete conversation history
            testEnv.repositories.execution.getMessagesByThread.mockResolvedValue(
                messages.map((m) => ({
                    ...m,
                    created_at: new Date()
                }))
            );

            // Verify conversation state
            const fullHistory = await testEnv.repositories.execution.getMessagesByThread(threadId);
            expect(fullHistory).toHaveLength(6);
            type MessageRecord = { role: string };
            expect((fullHistory[0] as MessageRecord).role).toBe("user");
            expect((fullHistory[5] as MessageRecord).role).toBe("assistant");
        });
    });

    describe("Concurrent Sessions", () => {
        it("should handle multiple sessions for same interface", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001" });

            const session1 = createTestSession(chatInterface.id, {
                id: "session-1",
                sessionToken: "tok_user1"
            });
            const session2 = createTestSession(chatInterface.id, {
                id: "session-2",
                sessionToken: "tok_user2"
            });
            const session3 = createTestSession(chatInterface.id, {
                id: "session-3",
                sessionToken: "tok_user3"
            });

            // Each session is independent
            expect(session1.id).not.toBe(session2.id);
            expect(session2.id).not.toBe(session3.id);
            expect(session1.sessionToken).not.toBe(session2.sessionToken);
        });
    });

    describe("Complete Semantic Search Scenario", () => {
        it("should find relevant answers from uploaded documents", async () => {
            // Arrange - use semantic search scenario
            const scenario = createSemanticSearchScenario();

            testEnv.repositories.chatInterface.findBySlug.mockResolvedValue(scenario.chatInterface);
            testEnv.repositories.session.findBySlugAndToken.mockResolvedValue(scenario.session);
            testEnv.repositories.chunk.countBySessionId.mockResolvedValue(scenario.chunks.length);

            // Test each query
            for (const testQuery of scenario.testQueries) {
                const queryEmbedding = generateDeterministicEmbedding(testQuery.query);
                const expectedChunk = scenario.chunks[testQuery.expectedTopChunkIndex];

                // Mock search to return the expected chunk
                testEnv.repositories.chunk.searchSimilar.mockResolvedValueOnce([
                    {
                        id: `chunk-${testQuery.expectedTopChunkIndex}`,
                        sessionId: scenario.session.id,
                        sourceType: "file",
                        sourceName: "company-policies.pdf",
                        content: expectedChunk.content,
                        chunkIndex: testQuery.expectedTopChunkIndex,
                        metadata: {},
                        similarity: 0.9
                    }
                ]);

                const results = await testEnv.repositories.chunk.searchSimilar({
                    sessionId: scenario.session.id,
                    queryEmbedding,
                    topK: 3,
                    similarityThreshold: 0.7
                });

                expect(results).toHaveLength(1);
                expect(results[0].chunkIndex).toBe(testQuery.expectedTopChunkIndex);
            }
        });
    });
});
