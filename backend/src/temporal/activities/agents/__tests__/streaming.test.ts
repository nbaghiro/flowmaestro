/**
 * Streaming Activities Unit Tests
 *
 * Tests for: thread-scoped streaming event emission
 * - emitMessageStart
 * - emitMessageToken
 * - emitMessageComplete
 * - emitMessageError
 * - emitThinking
 * - emitTokensUpdated
 * - publishWithRetry (retry logic)
 */

// Mock logger utilities
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

// Mock Redis event bus
const mockPublishThreadEvent = jest.fn();

jest.mock("../../../../services/events/RedisEventBus", () => ({
    redisEventBus: {
        publishThreadEvent: mockPublishThreadEvent
    }
}));

jest.mock("../../../../temporal/core", () => ({
    activityLogger: mockLogger,
    createActivityLogger: jest.fn(() => mockLogger)
}));

import {
    emitMessageStart,
    emitMessageToken,
    emitMessageComplete,
    emitMessageError,
    emitThinking,
    emitTokensUpdated
} from "../streaming";

describe("Streaming Activities", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPublishThreadEvent.mockResolvedValue(undefined);
    });

    describe("emitMessageStart", () => {
        it("should emit message start event with correct data", async () => {
            await emitMessageStart({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789"
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledWith(
                "thread-123",
                expect.objectContaining({
                    type: "thread:message:start",
                    threadId: "thread-123",
                    executionId: "exec-456",
                    messageId: "msg-789",
                    role: "assistant",
                    timestamp: expect.any(Number)
                })
            );
        });

        it("should include correct timestamp", async () => {
            const before = Date.now();

            await emitMessageStart({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789"
            });

            const after = Date.now();

            const call = mockPublishThreadEvent.mock.calls[0];
            const event = call[1] as { timestamp: number };

            expect(event.timestamp).toBeGreaterThanOrEqual(before);
            expect(event.timestamp).toBeLessThanOrEqual(after);
        });

        it("should log message start event", async () => {
            await emitMessageStart({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789"
            });

            expect(mockLogger.info).toHaveBeenCalledWith(
                "Message start event emitted",
                expect.objectContaining({
                    messageId: "msg-789",
                    threadId: "thread-123"
                })
            );
        });

        it("should retry on failure and succeed", async () => {
            mockPublishThreadEvent
                .mockRejectedValueOnce(new Error("Connection lost"))
                .mockResolvedValueOnce(undefined);

            await emitMessageStart({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789"
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledTimes(2);
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Publish attempt failed",
                expect.any(Error),
                expect.objectContaining({ attempt: 1 })
            );
        });

        it("should fail gracefully after max retries", async () => {
            mockPublishThreadEvent.mockRejectedValue(new Error("Redis down"));

            // Should not throw
            await emitMessageStart({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789"
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledTimes(3); // MAX_RETRIES = 3
            expect(mockLogger.error).toHaveBeenCalledWith(
                "FAILED to publish event after all retries",
                expect.any(Error),
                expect.objectContaining({
                    eventType: "thread:message:start",
                    threadId: "thread-123",
                    maxRetries: 3
                })
            );
        });
    });

    describe("emitMessageToken", () => {
        it("should emit token event with sequence number", async () => {
            await emitMessageToken({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789",
                token: "Hello",
                sequence: 1
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledWith(
                "thread-123",
                expect.objectContaining({
                    type: "thread:message:token",
                    threadId: "thread-123",
                    executionId: "exec-456",
                    messageId: "msg-789",
                    token: "Hello",
                    sequence: 1,
                    timestamp: expect.any(Number)
                })
            );
        });

        it("should handle empty token", async () => {
            await emitMessageToken({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789",
                token: "",
                sequence: 0
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledWith(
                "thread-123",
                expect.objectContaining({
                    token: "",
                    sequence: 0
                })
            );
        });

        it("should handle special characters in token", async () => {
            const specialToken = "\n\t\"'<>&";

            await emitMessageToken({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789",
                token: specialToken,
                sequence: 5
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledWith(
                "thread-123",
                expect.objectContaining({
                    token: specialToken
                })
            );
        });

        it("should handle unicode tokens", async () => {
            const unicodeToken = "Hello \u4e16\u754c \ud83d\ude00";

            await emitMessageToken({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789",
                token: unicodeToken,
                sequence: 10
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledWith(
                "thread-123",
                expect.objectContaining({
                    token: unicodeToken
                })
            );
        });

        it("should maintain sequence ordering", async () => {
            for (let i = 0; i < 5; i++) {
                await emitMessageToken({
                    threadId: "thread-123",
                    executionId: "exec-456",
                    messageId: "msg-789",
                    token: `token${i}`,
                    sequence: i
                });
            }

            expect(mockPublishThreadEvent).toHaveBeenCalledTimes(5);

            for (let i = 0; i < 5; i++) {
                const call = mockPublishThreadEvent.mock.calls[i];
                const event = call[1] as { sequence: number; token: string };
                expect(event.sequence).toBe(i);
                expect(event.token).toBe(`token${i}`);
            }
        });
    });

    describe("emitMessageComplete", () => {
        it("should emit complete event with all fields", async () => {
            await emitMessageComplete({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789",
                finalContent: "Hello, world!",
                tokenCount: 5,
                saved: true
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledWith(
                "thread-123",
                expect.objectContaining({
                    type: "thread:message:complete",
                    threadId: "thread-123",
                    executionId: "exec-456",
                    messageId: "msg-789",
                    finalContent: "Hello, world!",
                    tokenCount: 5,
                    saved: true,
                    timestamp: expect.any(Number)
                })
            );
        });

        it("should log completion with token count", async () => {
            await emitMessageComplete({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789",
                finalContent: "Response",
                tokenCount: 100,
                saved: true
            });

            expect(mockLogger.info).toHaveBeenCalledWith(
                "Message complete event emitted",
                expect.objectContaining({
                    messageId: "msg-789",
                    tokenCount: 100,
                    saved: true
                })
            );
        });

        it("should handle saved=false", async () => {
            await emitMessageComplete({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789",
                finalContent: "Partial response",
                tokenCount: 50,
                saved: false
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledWith(
                "thread-123",
                expect.objectContaining({
                    saved: false
                })
            );
        });

        it("should handle zero token count", async () => {
            await emitMessageComplete({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789",
                finalContent: "",
                tokenCount: 0,
                saved: true
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledWith(
                "thread-123",
                expect.objectContaining({
                    finalContent: "",
                    tokenCount: 0
                })
            );
        });

        it("should handle large content", async () => {
            const largeContent = "x".repeat(100000);

            await emitMessageComplete({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789",
                finalContent: largeContent,
                tokenCount: 25000,
                saved: true
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledWith(
                "thread-123",
                expect.objectContaining({
                    finalContent: largeContent
                })
            );
        });
    });

    describe("emitMessageError", () => {
        it("should emit error event with error message", async () => {
            await emitMessageError({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789",
                error: "LLM rate limit exceeded"
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledWith(
                "thread-123",
                expect.objectContaining({
                    type: "thread:message:error",
                    threadId: "thread-123",
                    executionId: "exec-456",
                    messageId: "msg-789",
                    error: "LLM rate limit exceeded",
                    timestamp: expect.any(Number)
                })
            );
        });

        it("should include partial content when provided", async () => {
            await emitMessageError({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789",
                error: "Connection interrupted",
                partialContent: "I was saying..."
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledWith(
                "thread-123",
                expect.objectContaining({
                    error: "Connection interrupted",
                    partialContent: "I was saying..."
                })
            );
        });

        it("should handle missing partial content", async () => {
            await emitMessageError({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789",
                error: "Timeout"
            });

            const call = mockPublishThreadEvent.mock.calls[0];
            const event = call[1] as { partialContent?: string };
            expect(event.partialContent).toBeUndefined();
        });

        it("should log error event", async () => {
            await emitMessageError({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789",
                error: "Test error"
            });

            expect(mockLogger.error).toHaveBeenCalledWith(
                "Message error event emitted",
                expect.any(Error),
                expect.objectContaining({
                    messageId: "msg-789"
                })
            );
        });
    });

    describe("emitThinking", () => {
        it("should emit thinking event", async () => {
            await emitThinking({
                threadId: "thread-123",
                executionId: "exec-456"
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledWith(
                "thread-123",
                expect.objectContaining({
                    type: "thread:thinking",
                    threadId: "thread-123",
                    executionId: "exec-456",
                    timestamp: expect.any(Number)
                })
            );
        });

        it("should be idempotent (multiple calls same state)", async () => {
            await emitThinking({ threadId: "thread-123", executionId: "exec-456" });
            await emitThinking({ threadId: "thread-123", executionId: "exec-456" });
            await emitThinking({ threadId: "thread-123", executionId: "exec-456" });

            expect(mockPublishThreadEvent).toHaveBeenCalledTimes(3);

            // All calls should have same event type
            mockPublishThreadEvent.mock.calls.forEach(function (call) {
                expect(call[1]).toMatchObject({
                    type: "thread:thinking",
                    threadId: "thread-123"
                });
            });
        });
    });

    describe("emitTokensUpdated", () => {
        it("should emit tokens updated event with usage data", async () => {
            await emitTokensUpdated({
                threadId: "thread-123",
                executionId: "exec-456",
                tokenUsage: {
                    promptTokens: 100,
                    completionTokens: 50,
                    totalTokens: 150,
                    totalCost: 0.0015,
                    lastUpdatedAt: "2024-01-01T12:00:00Z"
                }
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledWith(
                "thread-123",
                expect.objectContaining({
                    type: "thread:tokens:updated",
                    threadId: "thread-123",
                    executionId: "exec-456",
                    tokenUsage: {
                        promptTokens: 100,
                        completionTokens: 50,
                        totalTokens: 150,
                        totalCost: 0.0015,
                        lastUpdatedAt: "2024-01-01T12:00:00Z"
                    },
                    timestamp: expect.any(Number)
                })
            );
        });

        it("should log token update", async () => {
            await emitTokensUpdated({
                threadId: "thread-123",
                executionId: "exec-456",
                tokenUsage: {
                    promptTokens: 500,
                    completionTokens: 250,
                    totalTokens: 750,
                    totalCost: 0.0075,
                    lastUpdatedAt: "2024-01-01T12:00:00Z"
                }
            });

            expect(mockLogger.info).toHaveBeenCalledWith(
                "Tokens updated event emitted",
                expect.objectContaining({
                    threadId: "thread-123",
                    totalTokens: 750,
                    totalCost: 0.0075
                })
            );
        });

        it("should handle zero tokens", async () => {
            await emitTokensUpdated({
                threadId: "thread-123",
                executionId: "exec-456",
                tokenUsage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    totalCost: 0,
                    lastUpdatedAt: "2024-01-01T12:00:00Z"
                }
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledWith(
                "thread-123",
                expect.objectContaining({
                    tokenUsage: expect.objectContaining({
                        totalTokens: 0,
                        totalCost: 0
                    })
                })
            );
        });

        it("should handle large token counts", async () => {
            await emitTokensUpdated({
                threadId: "thread-123",
                executionId: "exec-456",
                tokenUsage: {
                    promptTokens: 100000,
                    completionTokens: 50000,
                    totalTokens: 150000,
                    totalCost: 1.5,
                    lastUpdatedAt: "2024-01-01T12:00:00Z"
                }
            });

            expect(mockPublishThreadEvent).toHaveBeenCalledWith(
                "thread-123",
                expect.objectContaining({
                    tokenUsage: expect.objectContaining({
                        totalTokens: 150000
                    })
                })
            );
        });
    });

    describe("publishWithRetry (via event functions)", () => {
        it("should use exponential backoff on retries", async () => {
            const delays: number[] = [];
            const originalSetTimeout = global.setTimeout;

            jest.spyOn(global, "setTimeout").mockImplementation(function (
                fn: () => void,
                delay: number
            ) {
                delays.push(delay);
                return originalSetTimeout(fn, 0); // Execute immediately for test
            } as typeof setTimeout);

            mockPublishThreadEvent
                .mockRejectedValueOnce(new Error("Fail 1"))
                .mockRejectedValueOnce(new Error("Fail 2"))
                .mockResolvedValueOnce(undefined);

            await emitThinking({
                threadId: "thread-123",
                executionId: "exec-456"
            });

            // First retry: 100ms * 1 = 100ms
            // Second retry: 100ms * 2 = 200ms
            expect(delays).toEqual([100, 200]);

            jest.restoreAllMocks();
        });

        it("should not throw on complete failure", async () => {
            mockPublishThreadEvent.mockRejectedValue(new Error("Permanent failure"));

            // Should not throw
            await expect(
                emitMessageStart({
                    threadId: "thread-123",
                    executionId: "exec-456",
                    messageId: "msg-789"
                })
            ).resolves.toBeUndefined();
        });

        it("should continue workflow even when events fail", async () => {
            mockPublishThreadEvent.mockRejectedValue(new Error("Redis unavailable"));

            // Multiple event emissions should all complete without throwing
            await emitMessageStart({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-1"
            });

            await emitMessageToken({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-1",
                token: "Hello",
                sequence: 0
            });

            await emitMessageComplete({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-1",
                finalContent: "Hello",
                tokenCount: 1,
                saved: true
            });

            // All should have been attempted
            expect(mockPublishThreadEvent).toHaveBeenCalledTimes(9); // 3 calls * 3 retries each
        });
    });

    describe("Thread isolation", () => {
        it("should publish to correct thread channel", async () => {
            await emitMessageStart({
                threadId: "thread-A",
                executionId: "exec-1",
                messageId: "msg-1"
            });

            await emitMessageStart({
                threadId: "thread-B",
                executionId: "exec-2",
                messageId: "msg-2"
            });

            expect(mockPublishThreadEvent).toHaveBeenNthCalledWith(
                1,
                "thread-A",
                expect.objectContaining({ threadId: "thread-A" })
            );

            expect(mockPublishThreadEvent).toHaveBeenNthCalledWith(
                2,
                "thread-B",
                expect.objectContaining({ threadId: "thread-B" })
            );
        });
    });

    describe("Event ordering", () => {
        it("should emit events in sequence for a message lifecycle", async () => {
            const events: string[] = [];

            mockPublishThreadEvent.mockImplementation(async function (_threadId, event) {
                events.push((event as { type: string }).type);
            });

            // Simulate message lifecycle
            await emitThinking({
                threadId: "thread-123",
                executionId: "exec-456"
            });

            await emitMessageStart({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789"
            });

            await emitMessageToken({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789",
                token: "Hello",
                sequence: 0
            });

            await emitMessageToken({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789",
                token: " world",
                sequence: 1
            });

            await emitMessageComplete({
                threadId: "thread-123",
                executionId: "exec-456",
                messageId: "msg-789",
                finalContent: "Hello world",
                tokenCount: 2,
                saved: true
            });

            await emitTokensUpdated({
                threadId: "thread-123",
                executionId: "exec-456",
                tokenUsage: {
                    promptTokens: 10,
                    completionTokens: 2,
                    totalTokens: 12,
                    totalCost: 0.0001,
                    lastUpdatedAt: new Date().toISOString()
                }
            });

            expect(events).toEqual([
                "thread:thinking",
                "thread:message:start",
                "thread:message:token",
                "thread:message:token",
                "thread:message:complete",
                "thread:tokens:updated"
            ]);
        });
    });
});
