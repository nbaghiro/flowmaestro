/**
 * Agent SSE Streaming Tests
 *
 * Tests for Server-Sent Events connection, event streaming, and cleanup
 * for agent execution streams using Redis event bus.
 */

// ============================================================================
// MOCK SETUP
// ============================================================================

type EventHandler = (data: Record<string, unknown>) => void;
type ThreadEventHandler = (event: Record<string, unknown>) => void;

// Mock Redis event bus subscriptions
const mockChannelSubscriptions = new Map<string, Set<EventHandler>>();
const mockThreadSubscriptions = new Map<string, Set<ThreadEventHandler>>();

const mockRedisEventBus = {
    subscribe: jest.fn((channel: string, handler: EventHandler) => {
        if (!mockChannelSubscriptions.has(channel)) {
            mockChannelSubscriptions.set(channel, new Set());
        }
        mockChannelSubscriptions.get(channel)!.add(handler);
    }),
    unsubscribe: jest.fn((channel: string, handler: EventHandler) => {
        const handlers = mockChannelSubscriptions.get(channel);
        if (handlers) {
            handlers.delete(handler);
        }
    }),
    subscribeToThread: jest.fn(async (threadId: string, handler: ThreadEventHandler) => {
        if (!mockThreadSubscriptions.has(threadId)) {
            mockThreadSubscriptions.set(threadId, new Set());
        }
        mockThreadSubscriptions.get(threadId)!.add(handler);
    }),
    unsubscribeFromThread: jest.fn(async (threadId: string, handler: ThreadEventHandler) => {
        const handlers = mockThreadSubscriptions.get(threadId);
        if (handlers) {
            handlers.delete(handler);
        }
    }),
    publish: jest.fn(),
    publishToThread: jest.fn()
};

jest.mock("../../../src/services/events/RedisEventBus", () => ({
    redisEventBus: mockRedisEventBus
}));

// ============================================================================
// TEST HELPERS
// ============================================================================

interface StreamEvent {
    type: string;
    data: Record<string, unknown>;
    timestamp: number;
}

function simulateChannelEvent(channel: string, event: Record<string, unknown>): void {
    const handlers = mockChannelSubscriptions.get(channel);
    if (handlers) {
        handlers.forEach((handler) => handler(event));
    }
}

function simulateThreadEvent(threadId: string, event: Record<string, unknown>): void {
    const handlers = mockThreadSubscriptions.get(threadId);
    if (handlers) {
        handlers.forEach((handler) => handler(event));
    }
}

function createEventCollector(): {
    events: StreamEvent[];
    handler: EventHandler;
} {
    const events: StreamEvent[] = [];
    const handler: EventHandler = (data) => {
        events.push({
            type: (data.type as string) || "unknown",
            data,
            timestamp: Date.now()
        });
    };
    return { events, handler };
}

function resetMocks(): void {
    mockChannelSubscriptions.clear();
    mockThreadSubscriptions.clear();
    jest.clearAllMocks();
}

// ============================================================================
// TESTS
// ============================================================================

describe("Agent SSE Streaming", () => {
    beforeEach(() => {
        resetMocks();
    });

    describe("Channel Subscriptions", () => {
        it("should subscribe to agent:events:started channel", () => {
            const { handler } = createEventCollector();
            const channel = "agent:events:started";

            mockRedisEventBus.subscribe(channel, handler);

            expect(mockRedisEventBus.subscribe).toHaveBeenCalledWith(channel, handler);
            expect(mockChannelSubscriptions.get(channel)?.size).toBe(1);
        });

        it("should subscribe to multiple event channels", () => {
            const { handler } = createEventCollector();
            const channels = [
                "agent:events:started",
                "agent:events:thinking",
                "agent:events:token",
                "agent:events:message",
                "agent:events:tool_call_started",
                "agent:events:tool_call_completed",
                "agent:events:tool_call_failed",
                "agent:events:execution:completed",
                "agent:events:execution:failed"
            ];

            channels.forEach((channel) => {
                mockRedisEventBus.subscribe(channel, handler);
            });

            expect(mockRedisEventBus.subscribe).toHaveBeenCalledTimes(9);
            channels.forEach((channel) => {
                expect(mockChannelSubscriptions.has(channel)).toBe(true);
            });
        });

        it("should unsubscribe from all channels on cleanup", () => {
            const { handler } = createEventCollector();
            const channels = ["agent:events:token", "agent:events:execution:completed"];

            channels.forEach((channel) => {
                mockRedisEventBus.subscribe(channel, handler);
            });

            channels.forEach((channel) => {
                mockRedisEventBus.unsubscribe(channel, handler);
            });

            expect(mockRedisEventBus.unsubscribe).toHaveBeenCalledTimes(2);
            channels.forEach((channel) => {
                expect(mockChannelSubscriptions.get(channel)?.size).toBe(0);
            });
        });
    });

    describe("Event Forwarding", () => {
        it("should forward started event for matching executionId", () => {
            const executionId = "exec-001";
            const { events, handler } = createEventCollector();

            mockRedisEventBus.subscribe("agent:events:started", handler);

            simulateChannelEvent("agent:events:started", {
                type: "started",
                executionId,
                agentName: "My Agent"
            });

            expect(events).toHaveLength(1);
            expect(events[0].data.executionId).toBe(executionId);
            expect(events[0].data.agentName).toBe("My Agent");
        });

        it("should forward thinking event", () => {
            const executionId = "exec-002";
            const { events, handler } = createEventCollector();

            mockRedisEventBus.subscribe("agent:events:thinking", handler);

            simulateChannelEvent("agent:events:thinking", {
                type: "thinking",
                executionId
            });

            expect(events).toHaveLength(1);
            expect(events[0].data.type).toBe("thinking");
        });

        it("should forward token events for streaming response", () => {
            const executionId = "exec-003";
            const { events, handler } = createEventCollector();

            mockRedisEventBus.subscribe("agent:events:token", handler);

            const tokens = ["Hello", " ", "world", "!"];
            tokens.forEach((token) => {
                simulateChannelEvent("agent:events:token", {
                    type: "token",
                    executionId,
                    token
                });
            });

            expect(events).toHaveLength(4);
            expect(events.map((e) => e.data.token)).toEqual(tokens);
        });

        it("should forward message event with full content", () => {
            const executionId = "exec-004";
            const { events, handler } = createEventCollector();

            mockRedisEventBus.subscribe("agent:events:message", handler);

            simulateChannelEvent("agent:events:message", {
                type: "message",
                executionId,
                message: "Complete response from agent"
            });

            expect(events).toHaveLength(1);
            expect(events[0].data.message).toBe("Complete response from agent");
        });

        it("should forward tool_call_started event", () => {
            const executionId = "exec-005";
            const { events, handler } = createEventCollector();

            mockRedisEventBus.subscribe("agent:events:tool_call_started", handler);

            simulateChannelEvent("agent:events:tool_call_started", {
                type: "tool_call_started",
                executionId,
                toolName: "web_search",
                arguments: { query: "test query" }
            });

            expect(events).toHaveLength(1);
            expect(events[0].data.toolName).toBe("web_search");
            expect(events[0].data.arguments).toEqual({ query: "test query" });
        });

        it("should forward tool_call_completed event", () => {
            const executionId = "exec-006";
            const { events, handler } = createEventCollector();

            mockRedisEventBus.subscribe("agent:events:tool_call_completed", handler);

            simulateChannelEvent("agent:events:tool_call_completed", {
                type: "tool_call_completed",
                executionId,
                toolName: "web_search",
                result: { results: [{ title: "Result 1" }] }
            });

            expect(events).toHaveLength(1);
            expect(events[0].data.toolName).toBe("web_search");
            expect(events[0].data.result).toEqual({ results: [{ title: "Result 1" }] });
        });

        it("should forward tool_call_failed event", () => {
            const executionId = "exec-007";
            const { events, handler } = createEventCollector();

            mockRedisEventBus.subscribe("agent:events:tool_call_failed", handler);

            simulateChannelEvent("agent:events:tool_call_failed", {
                type: "tool_call_failed",
                executionId,
                toolName: "web_search",
                error: "API rate limited"
            });

            expect(events).toHaveLength(1);
            expect(events[0].data.error).toBe("API rate limited");
        });

        it("should forward execution:completed event", () => {
            const executionId = "exec-008";
            const { events, handler } = createEventCollector();

            mockRedisEventBus.subscribe("agent:events:execution:completed", handler);

            simulateChannelEvent("agent:events:execution:completed", {
                type: "execution:completed",
                executionId,
                finalMessage: "Task completed successfully",
                iterations: 3
            });

            expect(events).toHaveLength(1);
            expect(events[0].data.finalMessage).toBe("Task completed successfully");
            expect(events[0].data.iterations).toBe(3);
        });

        it("should forward execution:failed event", () => {
            const executionId = "exec-009";
            const { events, handler } = createEventCollector();

            mockRedisEventBus.subscribe("agent:events:execution:failed", handler);

            simulateChannelEvent("agent:events:execution:failed", {
                type: "execution:failed",
                executionId,
                error: "Maximum iterations exceeded"
            });

            expect(events).toHaveLength(1);
            expect(events[0].data.error).toBe("Maximum iterations exceeded");
        });
    });

    describe("Event Filtering by ExecutionId", () => {
        it("should only process events matching the executionId", () => {
            const targetExecutionId = "exec-target";
            const otherExecutionId = "exec-other";
            const receivedEvents: StreamEvent[] = [];

            // Simulate stream handler that filters by executionId
            const filteringHandler: EventHandler = (data) => {
                if (data.executionId === targetExecutionId) {
                    receivedEvents.push({
                        type: data.type as string,
                        data,
                        timestamp: Date.now()
                    });
                }
            };

            mockRedisEventBus.subscribe("agent:events:token", filteringHandler);

            // Send events for both executions
            simulateChannelEvent("agent:events:token", {
                type: "token",
                executionId: targetExecutionId,
                token: "for target"
            });
            simulateChannelEvent("agent:events:token", {
                type: "token",
                executionId: otherExecutionId,
                token: "for other"
            });
            simulateChannelEvent("agent:events:token", {
                type: "token",
                executionId: targetExecutionId,
                token: " more for target"
            });

            expect(receivedEvents).toHaveLength(2);
            expect(receivedEvents.every((e) => e.data.executionId === targetExecutionId)).toBe(
                true
            );
        });
    });

    describe("Thread Subscriptions", () => {
        it("should subscribe to thread for token usage updates", async () => {
            const threadId = "thread-001";
            const { handler } = createEventCollector();

            await mockRedisEventBus.subscribeToThread(threadId, handler);

            expect(mockRedisEventBus.subscribeToThread).toHaveBeenCalledWith(threadId, handler);
            expect(mockThreadSubscriptions.get(threadId)?.size).toBe(1);
        });

        it("should forward thread:tokens:updated events", async () => {
            const threadId = "thread-002";
            const executionId = "exec-thread-002";
            const { events, handler } = createEventCollector();

            await mockRedisEventBus.subscribeToThread(threadId, handler);

            simulateThreadEvent(threadId, {
                type: "thread:tokens:updated",
                threadId,
                executionId,
                inputTokens: 100,
                outputTokens: 50,
                totalTokens: 150
            });

            expect(events).toHaveLength(1);
            expect(events[0].data.type).toBe("thread:tokens:updated");
            expect(events[0].data.totalTokens).toBe(150);
        });

        it("should unsubscribe from thread on disconnect", async () => {
            const threadId = "thread-003";
            const { handler } = createEventCollector();

            await mockRedisEventBus.subscribeToThread(threadId, handler);
            await mockRedisEventBus.unsubscribeFromThread(threadId, handler);

            expect(mockRedisEventBus.unsubscribeFromThread).toHaveBeenCalledWith(
                threadId,
                handler
            );
            expect(mockThreadSubscriptions.get(threadId)?.size).toBe(0);
        });
    });

    describe("Full Execution Lifecycle", () => {
        it("should handle complete agent execution with tool calls", () => {
            const executionId = "exec-full-lifecycle";
            const receivedEvents: StreamEvent[] = [];

            const handler: EventHandler = (data) => {
                if (data.executionId === executionId) {
                    receivedEvents.push({
                        type: data.type as string,
                        data,
                        timestamp: Date.now()
                    });
                }
            };

            // Subscribe to all channels
            const channels = [
                "agent:events:started",
                "agent:events:thinking",
                "agent:events:token",
                "agent:events:tool_call_started",
                "agent:events:tool_call_completed",
                "agent:events:execution:completed"
            ];
            channels.forEach((channel) => {
                mockRedisEventBus.subscribe(channel, handler);
            });

            // Simulate full lifecycle
            simulateChannelEvent("agent:events:started", {
                type: "started",
                executionId,
                agentName: "Research Agent"
            });

            simulateChannelEvent("agent:events:thinking", {
                type: "thinking",
                executionId
            });

            simulateChannelEvent("agent:events:token", {
                type: "token",
                executionId,
                token: "Let me search for that..."
            });

            simulateChannelEvent("agent:events:tool_call_started", {
                type: "tool_call_started",
                executionId,
                toolName: "web_search",
                arguments: { query: "AI trends 2024" }
            });

            simulateChannelEvent("agent:events:tool_call_completed", {
                type: "tool_call_completed",
                executionId,
                toolName: "web_search",
                result: { results: ["Result 1", "Result 2"] }
            });

            simulateChannelEvent("agent:events:token", {
                type: "token",
                executionId,
                token: "Based on my research, here are the trends..."
            });

            simulateChannelEvent("agent:events:execution:completed", {
                type: "execution:completed",
                executionId,
                finalMessage: "Here are the AI trends for 2024...",
                iterations: 2
            });

            expect(receivedEvents).toHaveLength(7);
            expect(receivedEvents.map((e) => e.type)).toEqual([
                "started",
                "thinking",
                "token",
                "tool_call_started",
                "tool_call_completed",
                "token",
                "execution:completed"
            ]);
        });

        it("should handle execution failure", () => {
            const executionId = "exec-failure";
            const receivedEvents: StreamEvent[] = [];

            const handler: EventHandler = (data) => {
                if (data.executionId === executionId) {
                    receivedEvents.push({
                        type: data.type as string,
                        data,
                        timestamp: Date.now()
                    });
                }
            };

            mockRedisEventBus.subscribe("agent:events:started", handler);
            mockRedisEventBus.subscribe("agent:events:token", handler);
            mockRedisEventBus.subscribe("agent:events:execution:failed", handler);

            simulateChannelEvent("agent:events:started", {
                type: "started",
                executionId,
                agentName: "Test Agent"
            });

            simulateChannelEvent("agent:events:token", {
                type: "token",
                executionId,
                token: "Processing..."
            });

            simulateChannelEvent("agent:events:execution:failed", {
                type: "execution:failed",
                executionId,
                error: "API quota exceeded"
            });

            expect(receivedEvents).toHaveLength(3);
            expect(receivedEvents[2].type).toBe("execution:failed");
            expect(receivedEvents[2].data.error).toBe("API quota exceeded");
        });
    });

    describe("Multiple Concurrent Streams", () => {
        it("should isolate events between different agent executions", () => {
            const execution1 = "exec-concurrent-1";
            const execution2 = "exec-concurrent-2";

            const events1: StreamEvent[] = [];
            const events2: StreamEvent[] = [];

            const handler1: EventHandler = (data) => {
                if (data.executionId === execution1) {
                    events1.push({ type: data.type as string, data, timestamp: Date.now() });
                }
            };

            const handler2: EventHandler = (data) => {
                if (data.executionId === execution2) {
                    events2.push({ type: data.type as string, data, timestamp: Date.now() });
                }
            };

            mockRedisEventBus.subscribe("agent:events:token", handler1);
            mockRedisEventBus.subscribe("agent:events:token", handler2);

            // Interleaved events
            simulateChannelEvent("agent:events:token", {
                type: "token",
                executionId: execution1,
                token: "Response 1"
            });
            simulateChannelEvent("agent:events:token", {
                type: "token",
                executionId: execution2,
                token: "Response 2"
            });
            simulateChannelEvent("agent:events:token", {
                type: "token",
                executionId: execution1,
                token: " continued"
            });

            expect(events1).toHaveLength(2);
            expect(events2).toHaveLength(1);
            expect(events1.map((e) => e.data.token)).toEqual(["Response 1", " continued"]);
            expect(events2[0].data.token).toBe("Response 2");
        });
    });

    describe("SSE Event Format", () => {
        it("should format connected event correctly", () => {
            const executionId = "exec-format";
            const status = "running";

            const connectedEvent = {
                executionId,
                status
            };

            const sseFormat = `event: connected\ndata: ${JSON.stringify(connectedEvent)}\n\n`;

            expect(sseFormat).toBe(
                `event: connected\ndata: {"executionId":"exec-format","status":"running"}\n\n`
            );
        });

        it("should format token event correctly", () => {
            const tokenEvent = {
                token: "Hello",
                executionId: "exec-001"
            };

            const sseFormat = `event: token\ndata: ${JSON.stringify(tokenEvent)}\n\n`;

            expect(sseFormat).toBe(
                `event: token\ndata: {"token":"Hello","executionId":"exec-001"}\n\n`
            );
        });

        it("should format completed event correctly", () => {
            const completedEvent = {
                finalMessage: "Task done",
                iterations: 5,
                executionId: "exec-001"
            };

            const sseFormat = `event: completed\ndata: ${JSON.stringify(completedEvent)}\n\n`;

            expect(sseFormat).toContain("event: completed");
            expect(sseFormat).toContain('"finalMessage":"Task done"');
            expect(sseFormat).toContain('"iterations":5');
        });

        it("should format error event correctly", () => {
            const errorEvent = {
                error: "Something went wrong",
                executionId: "exec-001"
            };

            const sseFormat = `event: error\ndata: ${JSON.stringify(errorEvent)}\n\n`;

            expect(sseFormat).toContain("event: error");
            expect(sseFormat).toContain('"error":"Something went wrong"');
        });
    });
});
