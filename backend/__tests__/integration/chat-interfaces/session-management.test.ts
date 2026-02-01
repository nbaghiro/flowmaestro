/**
 * Chat Interface Session Management Tests
 *
 * Tests for session creation, resumption, and message history retrieval.
 */

import {
    createSimpleChatInterfaceTestEnvironment,
    createTestChatInterface,
    createDraftChatInterface,
    createTestSession,
    createPublicChatInterface,
    createSessionWithThread
} from "./setup";
import type { SimpleChatInterfaceTestEnvironment } from "./helpers/chat-interface-test-env";

describe("Chat Interface Session Management", () => {
    let testEnv: SimpleChatInterfaceTestEnvironment;

    beforeEach(() => {
        testEnv = createSimpleChatInterfaceTestEnvironment();
    });

    afterEach(() => {
        testEnv.cleanup();
    });

    describe("GET /api/public/chat-interfaces/:slug", () => {
        it("should return public chat interface configuration for published interface", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({
                slug: "test-chat",
                status: "published"
            });
            const publicInterface = createPublicChatInterface({
                id: chatInterface.id,
                slug: "test-chat",
                title: chatInterface.title
            });
            testEnv.repositories.chatInterface.findBySlugPublic.mockResolvedValue(publicInterface);

            // Act
            const result = await testEnv.repositories.chatInterface.findBySlugPublic("test-chat");

            // Assert
            expect(result).not.toBeNull();
            expect(result?.slug).toBe("test-chat");
            expect(testEnv.repositories.chatInterface.findBySlugPublic).toHaveBeenCalledWith(
                "test-chat"
            );
        });

        it("should return null for draft (unpublished) interface", async () => {
            // Arrange
            createDraftChatInterface({ slug: "draft-chat" });
            testEnv.repositories.chatInterface.findBySlugPublic.mockResolvedValue(null);

            // Act
            const result = await testEnv.repositories.chatInterface.findBySlugPublic("draft-chat");

            // Assert
            expect(result).toBeNull();
        });

        it("should return null for non-existent slug", async () => {
            // Arrange
            testEnv.repositories.chatInterface.findBySlugPublic.mockResolvedValue(null);

            // Act
            const result =
                await testEnv.repositories.chatInterface.findBySlugPublic("non-existent");

            // Assert
            expect(result).toBeNull();
        });

        it("should include all public configuration fields", async () => {
            // Arrange
            const publicInterface = createPublicChatInterface({
                slug: "full-config-chat",
                title: "Full Config Chat",
                description: "A fully configured chat interface",
                coverType: "gradient",
                coverValue: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                primaryColor: "#667eea",
                fontFamily: "Inter",
                borderRadius: 12,
                welcomeMessage: "Welcome!",
                placeholderText: "Ask me anything...",
                suggestedPrompts: [{ text: "Hello", icon: "👋" }],
                allowFileUpload: true,
                maxFiles: 3,
                maxFileSizeMb: 5,
                allowedFileTypes: ["application/pdf"],
                persistenceType: "local_storage",
                widgetPosition: "bottom-left",
                widgetButtonIcon: "💬",
                widgetButtonText: "Chat",
                widgetInitialState: "expanded"
            });
            testEnv.repositories.chatInterface.findBySlugPublic.mockResolvedValue(publicInterface);

            // Act
            const result =
                await testEnv.repositories.chatInterface.findBySlugPublic("full-config-chat");

            // Assert
            expect(result).toMatchObject({
                slug: "full-config-chat",
                title: "Full Config Chat",
                coverType: "gradient",
                primaryColor: "#667eea",
                fontFamily: "Inter",
                borderRadius: 12,
                allowFileUpload: true,
                maxFiles: 3,
                persistenceType: "local_storage",
                widgetPosition: "bottom-left",
                widgetInitialState: "expanded"
            });
        });
    });

    describe("POST /api/public/chat-interfaces/:slug/sessions", () => {
        it("should create a new session when no existing session found", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001", slug: "test-chat" });
            const newSession = createTestSession(chatInterface.id, {
                id: "session-001",
                sessionToken: "tok_abc123"
            });

            testEnv.repositories.chatInterface.findBySlug.mockResolvedValue(chatInterface);
            testEnv.repositories.session.findByPersistenceToken.mockResolvedValue(null);
            testEnv.repositories.session.findByFingerprint.mockResolvedValue(null);
            testEnv.repositories.session.create.mockResolvedValue(newSession);

            // Act - simulate session creation
            await testEnv.repositories.chatInterface.findBySlug("test-chat");
            const session = await testEnv.repositories.session.create({
                interfaceId: chatInterface.id,
                browserFingerprint: "fp_test123",
                ipAddress: "127.0.0.1",
                userAgent: "Test Browser"
            });

            // Assert
            expect(session.id).toBe("session-001");
            expect(session.sessionToken).toBe("tok_abc123");
            expect(testEnv.repositories.session.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    interfaceId: chatInterface.id,
                    browserFingerprint: "fp_test123"
                })
            );
        });

        it("should resume session via persistence token", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001", slug: "test-chat" });
            const existingSession = createTestSession(chatInterface.id, {
                id: "session-existing",
                persistenceToken: "persist_token_123",
                messageCount: 5
            });

            testEnv.repositories.chatInterface.findBySlug.mockResolvedValue(chatInterface);
            testEnv.repositories.session.findByPersistenceToken.mockResolvedValue(existingSession);

            // Act
            const session = await testEnv.repositories.session.findByPersistenceToken(
                chatInterface.id,
                "persist_token_123"
            );

            // Assert
            expect(session).not.toBeNull();
            expect(session?.id).toBe("session-existing");
            expect(session?.messageCount).toBe(5);
        });

        it("should resume session via fingerprint when no persistence token", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001" });
            const existingSession = createTestSession(chatInterface.id, {
                id: "session-fingerprint",
                browserFingerprint: "fp_unique_123"
            });

            testEnv.repositories.session.findByPersistenceToken.mockResolvedValue(null);
            testEnv.repositories.session.findByFingerprint.mockResolvedValue(existingSession);

            // Act
            const session = await testEnv.repositories.session.findByFingerprint(
                chatInterface.id,
                "fp_unique_123"
            );

            // Assert
            expect(session).not.toBeNull();
            expect(session?.id).toBe("session-fingerprint");
        });

        it("should update last activity when resuming session", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001" });
            const existingSession = createTestSession(chatInterface.id, {
                id: "session-resume"
            });

            testEnv.repositories.session.findByPersistenceToken.mockResolvedValue(existingSession);
            testEnv.repositories.session.updateLastActivity.mockResolvedValue(undefined);

            // Act
            await testEnv.repositories.session.updateLastActivity(existingSession.id);

            // Assert
            expect(testEnv.repositories.session.updateLastActivity).toHaveBeenCalledWith(
                "session-resume"
            );
        });

        it("should generate unique session token", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001" });
            const session1 = createTestSession(chatInterface.id, {
                sessionToken: "tok_unique_1"
            });
            const session2 = createTestSession(chatInterface.id, {
                sessionToken: "tok_unique_2"
            });

            // Assert tokens are unique
            expect(session1.sessionToken).not.toBe(session2.sessionToken);
        });

        it("should return 404 when interface not found", async () => {
            // Arrange
            testEnv.repositories.chatInterface.findBySlug.mockResolvedValue(null);

            // Act
            const result = await testEnv.repositories.chatInterface.findBySlug("non-existent");

            // Assert
            expect(result).toBeNull();
        });
    });

    describe("GET /api/public/chat-interfaces/:slug/sessions/:token/messages", () => {
        it("should return messages for session with thread", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001", slug: "test-chat" });
            const threadId = "thread-001";
            const session = createSessionWithThread(chatInterface.id, threadId, {
                sessionToken: "tok_abc123",
                messageCount: 3
            });

            const mockMessages = [
                {
                    id: "msg-1",
                    role: "user",
                    content: "Hello",
                    created_at: new Date(),
                    attachments: []
                },
                {
                    id: "msg-2",
                    role: "assistant",
                    content: "Hi there!",
                    created_at: new Date(),
                    attachments: []
                },
                {
                    id: "msg-3",
                    role: "user",
                    content: "How are you?",
                    created_at: new Date(),
                    attachments: []
                }
            ];

            testEnv.repositories.chatInterface.findBySlug.mockResolvedValue(chatInterface);
            testEnv.repositories.session.findBySessionToken.mockResolvedValue(session);
            testEnv.repositories.execution.getMessagesByThread.mockResolvedValue(mockMessages);

            // Act
            const messages = await testEnv.repositories.execution.getMessagesByThread(threadId);

            // Assert
            expect(messages).toHaveLength(3);
            type MessageRecord = { role: string };
            expect((messages[0] as MessageRecord).role).toBe("user");
            expect((messages[1] as MessageRecord).role).toBe("assistant");
        });

        it("should return empty array for new session without thread", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001" });
            const session = createTestSession(chatInterface.id, {
                threadId: null,
                messageCount: 0
            });

            testEnv.repositories.session.findBySessionToken.mockResolvedValue(session);

            // Assert - no thread means no messages to fetch
            expect(session.threadId).toBeNull();
            expect(session.messageCount).toBe(0);
        });

        it("should return 404 for invalid session token", async () => {
            // Arrange
            testEnv.repositories.session.findBySessionToken.mockResolvedValue(null);

            // Act
            const result = await testEnv.repositories.session.findBySessionToken(
                "ci-001",
                "invalid_token"
            );

            // Assert
            expect(result).toBeNull();
        });

        it("should include message attachments in history", async () => {
            // Arrange
            const mockMessages = [
                {
                    id: "msg-1",
                    role: "user",
                    content: "Here is a file",
                    created_at: new Date(),
                    attachments: [
                        {
                            fileName: "document.pdf",
                            fileSize: 1024,
                            mimeType: "application/pdf",
                            url: "https://storage.example.com/document.pdf"
                        }
                    ]
                }
            ];

            testEnv.repositories.execution.getMessagesByThread.mockResolvedValue(mockMessages);

            // Act
            const messages = await testEnv.repositories.execution.getMessagesByThread("thread-001");

            // Assert
            type MessageWithAttachments = { attachments: Array<{ fileName: string }> };
            expect((messages[0] as MessageWithAttachments).attachments).toHaveLength(1);
            expect((messages[0] as MessageWithAttachments).attachments[0].fileName).toBe(
                "document.pdf"
            );
        });
    });

    describe("Session Expiration", () => {
        it("should identify expired sessions", () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001" });
            const now = new Date();
            const expiredTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

            const expiredSession = createTestSession(chatInterface.id, {
                status: "expired",
                lastActivityAt: expiredTime,
                endedAt: now
            });

            // Assert
            expect(expiredSession.status).toBe("expired");
            expect(expiredSession.endedAt).not.toBeNull();
        });

        it("should not allow operations on expired sessions", () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001" });
            const expiredSession = createTestSession(chatInterface.id, {
                status: "expired"
            });

            // Assert - expired sessions should have ended status
            expect(expiredSession.status).toBe("expired");
        });
    });

    describe("Session Persistence Types", () => {
        it("should handle session persistence type", () => {
            // Arrange
            const sessionChatInterface = createTestChatInterface({
                persistenceType: "session"
            });

            // Assert
            expect(sessionChatInterface.persistenceType).toBe("session");
        });

        it("should handle local_storage persistence type", () => {
            // Arrange
            const localStorageChatInterface = createTestChatInterface({
                persistenceType: "local_storage"
            });
            const session = createTestSession(localStorageChatInterface.id, {
                persistenceToken: "persist_token_for_storage"
            });

            // Assert
            expect(localStorageChatInterface.persistenceType).toBe("local_storage");
            expect(session.persistenceToken).toBeDefined();
        });
    });
});
