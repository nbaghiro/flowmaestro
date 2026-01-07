/**
 * Agent Events Activities Unit Tests
 *
 * Tests for: event emission activities (execution started, message, thinking, tokens, tool calls, etc.)
 */

// Mock logger utilities
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

// Mock external dependencies before imports
jest.mock("../../../../src/services/events/RedisEventBus");
jest.mock("../../../../src/temporal/core", () => ({
    activityLogger: mockLogger,
    createActivityLogger: jest.fn(() => mockLogger)
}));

import type { JsonObject } from "@flowmaestro/shared";
import { redisEventBus } from "../../../../src/services/events/RedisEventBus";
import {
    emitAgentExecutionStarted,
    emitAgentMessage,
    emitAgentThinking,
    emitAgentToken,
    emitAgentToolCallStarted,
    emitAgentToolCallCompleted,
    emitAgentToolCallFailed,
    emitAgentExecutionCompleted,
    emitAgentExecutionFailed
} from "../../../../src/temporal/activities/agents/events";

import type { ThreadMessage } from "../../../../src/storage/models/AgentExecution";

const mockRedisEventBus = jest.mocked(redisEventBus);

describe("Agent Event Activities", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRedisEventBus.publish.mockResolvedValue();
    });

    describe("emitAgentExecutionStarted", () => {
        it("should emit execution started event with correct data", async () => {
            await emitAgentExecutionStarted({
                executionId: "exec-1",
                agentId: "agent-1",
                agentName: "Test Agent"
            });

            expect(mockRedisEventBus.publish).toHaveBeenCalledWith(
                "agent:events:execution:started",
                expect.objectContaining({
                    type: "agent:execution:started",
                    executionId: "exec-1",
                    agentId: "agent-1",
                    agentName: "Test Agent",
                    timestamp: expect.any(Number)
                })
            );
        });

        it("should include timestamp in event", async () => {
            const beforeTimestamp = Date.now();

            await emitAgentExecutionStarted({
                executionId: "exec-1",
                agentId: "agent-1",
                agentName: "Test Agent"
            });

            const afterTimestamp = Date.now();

            const publishCall = mockRedisEventBus.publish.mock.calls[0];
            const eventData = publishCall[1] as { timestamp: number };

            expect(eventData.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
            expect(eventData.timestamp).toBeLessThanOrEqual(afterTimestamp);
        });
    });

    describe("emitAgentMessage", () => {
        it("should emit user message event", async () => {
            const message: ThreadMessage = {
                id: "msg-1",
                role: "user",
                content: "Hello agent!",
                timestamp: new Date("2024-01-01T12:00:00Z")
            };

            await emitAgentMessage({
                executionId: "exec-1",
                threadId: "thread-1",
                message
            });

            expect(mockRedisEventBus.publish).toHaveBeenCalledWith(
                "agent:events:message:new",
                expect.objectContaining({
                    type: "agent:message:new",
                    executionId: "exec-1",
                    threadId: "thread-1",
                    message: expect.objectContaining({
                        id: "msg-1",
                        role: "user",
                        content: "Hello agent!",
                        timestamp: "2024-01-01T12:00:00.000Z"
                    })
                })
            );
        });

        it("should emit assistant message event with tool calls", async () => {
            const message: ThreadMessage = {
                id: "msg-2",
                role: "assistant",
                content: "Let me check that for you.",
                timestamp: new Date("2024-01-01T12:00:00Z"),
                tool_calls: [
                    {
                        id: "call-1",
                        name: "search",
                        arguments: { query: "test" }
                    }
                ]
            };

            await emitAgentMessage({
                executionId: "exec-1",
                threadId: "thread-1",
                message
            });

            const publishCall = mockRedisEventBus.publish.mock.calls[0];
            const eventData = publishCall[1] as unknown as { message: { tool_calls: unknown[] } };

            expect(eventData.message.tool_calls).toHaveLength(1);
            expect(eventData.message.tool_calls[0]).toMatchObject({
                id: "call-1",
                name: "search",
                arguments: { query: "test" }
            });
        });

        it("should emit tool message event", async () => {
            const message: ThreadMessage = {
                id: "msg-3",
                role: "tool",
                content: JSON.stringify({ result: "data" }),
                timestamp: new Date(),
                tool_name: "search",
                tool_call_id: "call-1"
            };

            await emitAgentMessage({
                executionId: "exec-1",
                threadId: "thread-1",
                message
            });

            const publishCall = mockRedisEventBus.publish.mock.calls[0];
            const eventData = publishCall[1] as unknown as {
                message: { tool_name: string; tool_call_id: string };
            };

            expect(eventData.message.tool_name).toBe("search");
            expect(eventData.message.tool_call_id).toBe("call-1");
        });

        it("should handle Date object timestamp", async () => {
            const timestamp = new Date("2024-06-15T10:30:00Z");
            const message: ThreadMessage = {
                id: "msg-1",
                role: "user",
                content: "Test",
                timestamp
            };

            await emitAgentMessage({
                executionId: "exec-1",
                threadId: "thread-1",
                message
            });

            const publishCall = mockRedisEventBus.publish.mock.calls[0];
            const eventData = publishCall[1] as unknown as { message: { timestamp: string } };

            expect(eventData.message.timestamp).toBe("2024-06-15T10:30:00.000Z");
        });

        it("should handle string timestamp", async () => {
            const message: ThreadMessage = {
                id: "msg-1",
                role: "user",
                content: "Test",
                timestamp: "2024-06-15T10:30:00Z" as unknown as Date // Simulating Temporal serialization
            };

            await emitAgentMessage({
                executionId: "exec-1",
                threadId: "thread-1",
                message
            });

            const publishCall = mockRedisEventBus.publish.mock.calls[0];
            const eventData = publishCall[1] as unknown as { message: { timestamp: string } };

            expect(eventData.message.timestamp).toBe("2024-06-15T10:30:00.000Z");
        });
    });

    describe("emitAgentThinking", () => {
        it("should emit thinking event", async () => {
            await emitAgentThinking({
                executionId: "exec-1",
                threadId: "thread-1"
            });

            expect(mockRedisEventBus.publish).toHaveBeenCalledWith(
                "agent:events:thinking",
                expect.objectContaining({
                    type: "agent:thinking",
                    executionId: "exec-1",
                    threadId: "thread-1",
                    timestamp: expect.any(Number)
                })
            );
        });
    });

    describe("emitAgentToken", () => {
        it("should emit token event for streaming", async () => {
            await emitAgentToken({
                executionId: "exec-1",
                token: "Hello"
            });

            expect(mockRedisEventBus.publish).toHaveBeenCalledWith(
                "agent:events:token",
                expect.objectContaining({
                    type: "agent:token",
                    executionId: "exec-1",
                    token: "Hello",
                    timestamp: expect.any(Number)
                })
            );
        });

        it("should handle long tokens", async () => {
            const longToken = "a".repeat(1000);

            await emitAgentToken({
                executionId: "exec-1",
                token: longToken
            });

            const publishCall = mockRedisEventBus.publish.mock.calls[0];
            const eventData = publishCall[1] as unknown as { token: string };

            expect(eventData.token).toBe(longToken);
            expect(eventData.token).toHaveLength(1000);
        });

        it("should handle special characters in tokens", async () => {
            const specialToken = 'Hello\n\t"world"';

            await emitAgentToken({
                executionId: "exec-1",
                token: specialToken
            });

            const publishCall = mockRedisEventBus.publish.mock.calls[0];
            const eventData = publishCall[1] as unknown as { token: string };

            expect(eventData.token).toBe('Hello\n\t"world"');
        });
    });

    describe("emitAgentToolCallStarted", () => {
        it("should emit tool call started event", async () => {
            const toolArgs: JsonObject = {
                query: "test search",
                limit: 10
            };

            await emitAgentToolCallStarted({
                executionId: "exec-1",
                threadId: "thread-1",
                toolName: "search",
                arguments: toolArgs
            });

            expect(mockRedisEventBus.publish).toHaveBeenCalledWith(
                "agent:events:tool:call:started",
                expect.objectContaining({
                    type: "agent:tool:call:started",
                    executionId: "exec-1",
                    threadId: "thread-1",
                    toolName: "search",
                    arguments: toolArgs,
                    timestamp: expect.any(Number)
                })
            );
        });

        it("should handle complex nested arguments", async () => {
            const complexArgs: JsonObject = {
                filters: {
                    category: ["tech", "science"],
                    date: { from: "2024-01-01", to: "2024-12-31" }
                },
                options: {
                    includeMetadata: true,
                    limit: 100
                }
            };

            await emitAgentToolCallStarted({
                executionId: "exec-1",
                threadId: "thread-1",
                toolName: "advanced_search",
                arguments: complexArgs
            });

            const publishCall = mockRedisEventBus.publish.mock.calls[0];
            const eventData = publishCall[1] as { arguments: JsonObject };

            expect(eventData.arguments).toEqual(complexArgs);
        });
    });

    describe("emitAgentToolCallCompleted", () => {
        it("should emit tool call completed event", async () => {
            const result: JsonObject = {
                success: true,
                data: [{ id: 1, name: "Item 1" }],
                count: 1
            };

            await emitAgentToolCallCompleted({
                executionId: "exec-1",
                threadId: "thread-1",
                toolName: "search",
                result
            });

            expect(mockRedisEventBus.publish).toHaveBeenCalledWith(
                "agent:events:tool:call:completed",
                expect.objectContaining({
                    type: "agent:tool:call:completed",
                    executionId: "exec-1",
                    threadId: "thread-1",
                    toolName: "search",
                    result,
                    timestamp: expect.any(Number)
                })
            );
        });

        it("should handle large result objects", async () => {
            const largeResult: JsonObject = {
                items: Array.from({ length: 100 }, (_, i) => ({
                    id: i,
                    name: `Item ${i}`,
                    description: `Description for item ${i}`.repeat(10)
                }))
            };

            await emitAgentToolCallCompleted({
                executionId: "exec-1",
                threadId: "thread-1",
                toolName: "bulk_fetch",
                result: largeResult
            });

            const publishCall = mockRedisEventBus.publish.mock.calls[0];
            const eventData = publishCall[1] as { result: JsonObject };

            expect((eventData.result.items as unknown[]).length).toBe(100);
        });
    });

    describe("emitAgentToolCallFailed", () => {
        it("should emit tool call failed event", async () => {
            await emitAgentToolCallFailed({
                executionId: "exec-1",
                threadId: "thread-1",
                toolName: "search",
                error: "Connection timeout"
            });

            expect(mockRedisEventBus.publish).toHaveBeenCalledWith(
                "agent:events:tool:call:failed",
                expect.objectContaining({
                    type: "agent:tool:call:failed",
                    executionId: "exec-1",
                    threadId: "thread-1",
                    toolName: "search",
                    error: "Connection timeout",
                    timestamp: expect.any(Number)
                })
            );
        });

        it("should handle long error messages", async () => {
            const longError = "Error: ".repeat(500);

            await emitAgentToolCallFailed({
                executionId: "exec-1",
                threadId: "thread-1",
                toolName: "complex_operation",
                error: longError
            });

            const publishCall = mockRedisEventBus.publish.mock.calls[0];
            const eventData = publishCall[1] as { error: string };

            expect(eventData.error).toBe(longError);
        });
    });

    describe("emitAgentExecutionCompleted", () => {
        it("should emit execution completed event", async () => {
            await emitAgentExecutionCompleted({
                executionId: "exec-1",
                threadId: "thread-1",
                finalMessage: "Task completed successfully.",
                iterations: 3
            });

            expect(mockRedisEventBus.publish).toHaveBeenCalledWith(
                "agent:events:execution:completed",
                expect.objectContaining({
                    type: "agent:execution:completed",
                    executionId: "exec-1",
                    threadId: "thread-1",
                    status: "completed",
                    finalMessage: "Task completed successfully.",
                    iterations: 3,
                    timestamp: expect.any(Number)
                })
            );
        });

        it("should handle zero iterations", async () => {
            await emitAgentExecutionCompleted({
                executionId: "exec-1",
                threadId: "thread-1",
                finalMessage: "Simple response",
                iterations: 0
            });

            const publishCall = mockRedisEventBus.publish.mock.calls[0];
            const eventData = publishCall[1] as { iterations: number };

            expect(eventData.iterations).toBe(0);
        });

        it("should handle high iteration count", async () => {
            await emitAgentExecutionCompleted({
                executionId: "exec-1",
                threadId: "thread-1",
                finalMessage: "Complex task completed",
                iterations: 50
            });

            const publishCall = mockRedisEventBus.publish.mock.calls[0];
            const eventData = publishCall[1] as { iterations: number };

            expect(eventData.iterations).toBe(50);
        });
    });

    describe("emitAgentExecutionFailed", () => {
        it("should emit execution failed event", async () => {
            await emitAgentExecutionFailed({
                executionId: "exec-1",
                threadId: "thread-1",
                error: "LLM rate limit exceeded"
            });

            expect(mockRedisEventBus.publish).toHaveBeenCalledWith(
                "agent:events:execution:failed",
                expect.objectContaining({
                    type: "agent:execution:failed",
                    executionId: "exec-1",
                    threadId: "thread-1",
                    status: "failed",
                    error: "LLM rate limit exceeded",
                    timestamp: expect.any(Number)
                })
            );
        });

        it("should include status as failed", async () => {
            await emitAgentExecutionFailed({
                executionId: "exec-1",
                threadId: "thread-1",
                error: "Max iterations reached"
            });

            const publishCall = mockRedisEventBus.publish.mock.calls[0];
            const eventData = publishCall[1] as { status: string };

            expect(eventData.status).toBe("failed");
        });
    });

    describe("Event Channel Names", () => {
        it("should use correct channel names for all events", async () => {
            const expectedChannels = [
                "agent:events:execution:started",
                "agent:events:message:new",
                "agent:events:thinking",
                "agent:events:token",
                "agent:events:tool:call:started",
                "agent:events:tool:call:completed",
                "agent:events:tool:call:failed",
                "agent:events:execution:completed",
                "agent:events:execution:failed"
            ];

            // Emit all events
            await emitAgentExecutionStarted({
                executionId: "e",
                agentId: "a",
                agentName: "n"
            });
            await emitAgentMessage({
                executionId: "e",
                threadId: "t",
                message: {
                    id: "m",
                    role: "user",
                    content: "c",
                    timestamp: new Date()
                }
            });
            await emitAgentThinking({ executionId: "e", threadId: "t" });
            await emitAgentToken({ executionId: "e", token: "t" });
            await emitAgentToolCallStarted({
                executionId: "e",
                threadId: "t",
                toolName: "n",
                arguments: {}
            });
            await emitAgentToolCallCompleted({
                executionId: "e",
                threadId: "t",
                toolName: "n",
                result: {}
            });
            await emitAgentToolCallFailed({
                executionId: "e",
                threadId: "t",
                toolName: "n",
                error: "e"
            });
            await emitAgentExecutionCompleted({
                executionId: "e",
                threadId: "t",
                finalMessage: "m",
                iterations: 1
            });
            await emitAgentExecutionFailed({
                executionId: "e",
                threadId: "t",
                error: "e"
            });

            const usedChannels = mockRedisEventBus.publish.mock.calls.map((call) => call[0]);

            expect(usedChannels).toEqual(expectedChannels);
        });
    });
});
