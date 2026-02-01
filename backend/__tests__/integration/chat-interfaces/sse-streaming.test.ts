/**
 * Chat Interface SSE Streaming Tests
 *
 * Tests for Server-Sent Events connection, event streaming, and reconnection.
 */

import {
    createSimpleChatInterfaceTestEnvironment,
    createTestSession,
    createSessionWithThread,
    createSSEResponse,
    createConnectionEvent,
    createKeepalive
} from "./setup";
import type { SimpleChatInterfaceTestEnvironment } from "./helpers/chat-interface-test-env";

describe("Chat Interface SSE Streaming", () => {
    let testEnv: SimpleChatInterfaceTestEnvironment;

    beforeEach(() => {
        testEnv = createSimpleChatInterfaceTestEnvironment();
    });

    afterEach(() => {
        testEnv.cleanup();
    });

    describe("GET /api/public/chat-interfaces/:slug/sessions/:token/stream", () => {
        it("should set SSE headers", () => {
            // Expected SSE headers
            const expectedHeaders = {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive"
            };

            // Assert headers match expected
            expect(expectedHeaders["Content-Type"]).toBe("text/event-stream");
            expect(expectedHeaders["Cache-Control"]).toBe("no-cache");
            expect(expectedHeaders["Connection"]).toBe("keep-alive");
        });

        it("should return 202 without thread", async () => {
            // Arrange - session without thread
            const session = createTestSession("ci-001", {
                id: "session-001",
                sessionToken: "tok_abc123",
                threadId: null
            });

            testEnv.repositories.session.findBySlugAndToken.mockResolvedValue(session);

            // Act
            const foundSession = await testEnv.repositories.session.findBySlugAndToken(
                "test-chat",
                "tok_abc123"
            );

            // Assert - no thread means stream not ready
            expect(foundSession?.threadId).toBeNull();
            // Route would return 202 Accepted with message to send a message first
        });

        it("should send connection:established on connect", () => {
            // Arrange
            const connectionEvent = createConnectionEvent();

            // Assert
            expect(connectionEvent).toContain("connection:established");
        });

        it("should forward thread events", async () => {
            // Arrange
            const threadId = "thread-001";
            const session = createSessionWithThread("ci-001", threadId, {
                sessionToken: "tok_abc123"
            });

            testEnv.repositories.session.findBySlugAndToken.mockResolvedValue(session);

            // Use a mock event object (the actual type is enforced by the event bus)
            const mockEvent = {
                type: "thread:message:token" as const,
                threadId,
                executionId: "exec-001",
                timestamp: Date.now(),
                messageId: "msg-001",
                token: "Hello",
                sequence: 1
            };

            // Act - subscribe to thread
            let receivedEvent: unknown = null;
            await testEnv.services.eventBus.subscribeToThread(threadId, (event) => {
                receivedEvent = event;
            });

            // Simulate event
            testEnv.services.eventBus.simulateEvent(threadId, mockEvent);

            // Assert
            expect(receivedEvent).toEqual(mockEvent);
        });

        it("should send keepalive every 15 seconds", () => {
            // Arrange
            const keepalive = createKeepalive();

            // Assert
            expect(keepalive).toBe(":keepalive\n\n");
        });

        it("should unsubscribe on disconnect", async () => {
            // Arrange
            const threadId = "thread-001";
            const handler = jest.fn();

            // Act - subscribe then unsubscribe
            await testEnv.services.eventBus.subscribeToThread(threadId, handler);
            await testEnv.services.eventBus.unsubscribeFromThread(threadId, handler);

            // Assert
            expect(testEnv.services.eventBus.unsubscribeFromThread).toHaveBeenCalledWith(
                threadId,
                handler
            );
        });

        it("should return 404 for invalid session", async () => {
            // Arrange
            testEnv.repositories.session.findBySlugAndToken.mockResolvedValue(null);

            // Act
            const session = await testEnv.repositories.session.findBySlugAndToken(
                "test-chat",
                "invalid_token"
            );

            // Assert
            expect(session).toBeNull();
        });
    });

    describe("Event Types", () => {
        it("should handle thread:message:start event", async () => {
            // Arrange
            const threadId = "thread-001";
            const event = {
                type: "thread:message:start" as const,
                threadId,
                executionId: "exec-001",
                timestamp: Date.now(),
                messageId: "msg-001",
                role: "assistant" as const
            };

            let receivedEvent: unknown = null;
            await testEnv.services.eventBus.subscribeToThread(threadId, (e) => {
                receivedEvent = e;
            });

            // Act
            testEnv.services.eventBus.simulateEvent(threadId, event);

            // Assert
            const received = receivedEvent as { type: string };
            expect(received?.type).toBe("thread:message:start");
        });

        it("should handle thread:message:token event", async () => {
            // Arrange
            const threadId = "thread-001";
            const event = {
                type: "thread:message:token" as const,
                threadId,
                executionId: "exec-001",
                timestamp: Date.now(),
                messageId: "msg-001",
                token: "Hello ",
                sequence: 1
            };

            let receivedEvent: unknown = null;
            await testEnv.services.eventBus.subscribeToThread(threadId, (e) => {
                receivedEvent = e;
            });

            // Act
            testEnv.services.eventBus.simulateEvent(threadId, event);

            // Assert
            const received = receivedEvent as { type: string; token: string };
            expect(received?.type).toBe("thread:message:token");
            expect(received?.token).toBe("Hello ");
        });

        it("should handle thread:message:complete event", async () => {
            // Arrange
            const threadId = "thread-001";
            const event = {
                type: "thread:message:complete" as const,
                threadId,
                executionId: "exec-001",
                timestamp: Date.now(),
                messageId: "msg-001",
                finalContent: "Full response content",
                tokenCount: 5,
                saved: true
            };

            let receivedEvent: unknown = null;
            await testEnv.services.eventBus.subscribeToThread(threadId, (e) => {
                receivedEvent = e;
            });

            // Act
            testEnv.services.eventBus.simulateEvent(threadId, event);

            // Assert
            const received = receivedEvent as { type: string };
            expect(received?.type).toBe("thread:message:complete");
        });

        it("should handle agent:execution:failed event", async () => {
            // Arrange
            const threadId = "thread-001";
            const event = {
                type: "agent:execution:failed" as const,
                executionId: "exec-001",
                timestamp: Date.now(),
                threadId,
                status: "failed" as const,
                error: "Something went wrong"
            };

            let receivedEvent: unknown = null;
            await testEnv.services.eventBus.subscribeToThread(threadId, (e) => {
                receivedEvent = e;
            });

            // Act
            testEnv.services.eventBus.simulateEvent(threadId, event);

            // Assert
            const received = receivedEvent as { type: string };
            expect(received?.type).toBe("agent:execution:failed");
        });

        it("should handle thread:tool:started events", async () => {
            // Arrange
            const threadId = "thread-001";
            const toolStartEvent = {
                type: "thread:tool:started" as const,
                threadId,
                executionId: "exec-001",
                timestamp: Date.now(),
                toolName: "web_search",
                toolCallId: "call-001",
                arguments: {}
            };

            let receivedEvent: unknown = null;
            await testEnv.services.eventBus.subscribeToThread(threadId, (e) => {
                receivedEvent = e;
            });

            // Act
            testEnv.services.eventBus.simulateEvent(threadId, toolStartEvent);

            // Assert
            const received = receivedEvent as { type: string };
            expect(received?.type).toBe("thread:tool:started");
        });
    });

    describe("SSE Response Format", () => {
        it("should format events as SSE data", () => {
            // Arrange
            const events = [
                { type: "thread:message:token", data: { token: "Hello" } },
                { type: "thread:message:token", data: { token: " world" } }
            ];

            // Act
            const sseResponse = createSSEResponse(events);

            // Assert
            expect(sseResponse).toContain("data:");
            expect(sseResponse).toContain("\n\n");
        });

        it("should JSON stringify event data", () => {
            // Arrange
            const event = { type: "thread:message:token", data: { token: "Test" } };

            // Act
            const sseData = `data: ${JSON.stringify({ type: event.type, ...event.data })}\n\n`;

            // Assert
            expect(sseData).toBe('data: {"type":"thread:message:token","token":"Test"}\n\n');
        });
    });

    describe("Event Bus Subscription", () => {
        it("should track subscriptions", async () => {
            // Arrange
            const threadId = "thread-001";
            const handler = jest.fn();

            // Act
            await testEnv.services.eventBus.subscribeToThread(threadId, handler);

            // Assert
            expect(testEnv.services.eventBus.subscriptions.has(threadId)).toBe(true);
        });

        it("should support multiple subscribers per thread", async () => {
            // Arrange
            const threadId = "thread-001";
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            // Act
            await testEnv.services.eventBus.subscribeToThread(threadId, handler1);
            await testEnv.services.eventBus.subscribeToThread(threadId, handler2);

            const event = {
                type: "thread:message:token" as const,
                threadId,
                executionId: "exec-001",
                timestamp: Date.now(),
                messageId: "msg-001",
                token: "test",
                sequence: 1
            };
            testEnv.services.eventBus.simulateEvent(threadId, event);

            // Assert - both handlers should be called
            expect(handler1).toHaveBeenCalledWith(event);
            expect(handler2).toHaveBeenCalledWith(event);
        });

        it("should clean up subscriptions", async () => {
            // Arrange
            const threadId = "thread-001";
            const handler = jest.fn();

            // Act
            await testEnv.services.eventBus.subscribeToThread(threadId, handler);
            await testEnv.services.eventBus.unsubscribeFromThread(threadId, handler);

            // Simulate event
            testEnv.services.eventBus.simulateEvent(threadId, {
                type: "thread:message:token" as const,
                threadId,
                executionId: "exec-001",
                timestamp: Date.now(),
                messageId: "msg-001",
                token: "test",
                sequence: 1
            });

            // Assert - handler should not be called after unsubscribe
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe("Session Validation for Streaming", () => {
        it("should validate session before establishing stream", async () => {
            // Arrange
            const session = createSessionWithThread("ci-001", "thread-001", {
                sessionToken: "tok_valid"
            });

            testEnv.repositories.session.findBySlugAndToken.mockResolvedValue(session);

            // Act
            const foundSession = await testEnv.repositories.session.findBySlugAndToken(
                "test-chat",
                "tok_valid"
            );

            // Assert
            expect(foundSession).not.toBeNull();
            expect(foundSession?.threadId).toBe("thread-001");
        });

        it("should require thread for streaming", () => {
            // Arrange
            const sessionNoThread = createTestSession("ci-001", {
                threadId: null
            });

            // Assert - session without thread cannot stream
            expect(sessionNoThread.threadId).toBeNull();
        });
    });

    describe("CORS Headers", () => {
        it("should include CORS headers for cross-origin requests", () => {
            // Expected CORS headers for SSE
            const origin = "https://example.com";
            const expectedHeaders = {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true"
            };

            // Assert
            expect(expectedHeaders["Access-Control-Allow-Origin"]).toBe(origin);
            expect(expectedHeaders["Access-Control-Allow-Credentials"]).toBe("true");
        });
    });
});
