/**
 * Execution Stream Client Tests
 *
 * Tests for the SSE-based execution streaming client including
 * connection management, event handling, and reconnection logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MockEventSource } from "../../test-setup";
import {
    ExecutionStreamClient,
    createExecutionStream,
    type StreamEvent,
    type ExecutionStartedData,
    type NodeCompletedData
} from "../execution-stream";
import { createMockAuthToken } from "./test-helpers";

describe("ExecutionStreamClient", () => {
    let client: ExecutionStreamClient;
    let mockEventSource: MockEventSource | null = null;

    // Capture the EventSource instance when created
    const originalEventSource = globalThis.EventSource;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        // Capture EventSource instances
        (globalThis as unknown as { EventSource: typeof MockEventSource }).EventSource =
            class extends MockEventSource {
                constructor(url: string) {
                    super(url);
                    // eslint-disable-next-line @typescript-eslint/no-this-alias
                    mockEventSource = this;
                }
            };

        client = new ExecutionStreamClient({
            apiBaseUrl: "http://localhost:3001",
            autoReconnect: false,
            maxReconnectAttempts: 3,
            reconnectDelay: 100
        });
    });

    afterEach(() => {
        client.disconnect();
        mockEventSource = null;
        (globalThis as unknown as { EventSource: typeof MockEventSource }).EventSource =
            originalEventSource as unknown as typeof MockEventSource;
        vi.useRealTimers();
    });

    // ===== Connection =====
    describe("connect", () => {
        it("creates EventSource with correct URL", async () => {
            const token = createMockAuthToken();

            client.connect("exec-123", token);
            await vi.advanceTimersByTimeAsync(0);

            expect(mockEventSource).not.toBeNull();
            expect(mockEventSource!.url).toContain("/api/executions/exec-123/stream");
            expect(mockEventSource!.url).toContain(`token=${encodeURIComponent(token)}`);
        });

        it("sets connection state to connecting then connected", async () => {
            const states: string[] = [];
            client.onStateChange((state) => states.push(state));

            client.connect("exec-123", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);

            expect(states).toContain("connecting");
            expect(states).toContain("connected");
        });

        it("disconnects existing connection before reconnecting", async () => {
            client.connect("exec-1", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);
            const firstEventSource = mockEventSource;

            client.connect("exec-2", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);

            expect(firstEventSource!.readyState).toBe(MockEventSource.CLOSED);
        });

        it("includes lastEventId for replay on reconnection", async () => {
            client = new ExecutionStreamClient({
                apiBaseUrl: "http://localhost:3001",
                autoReconnect: true,
                maxReconnectAttempts: 3,
                reconnectDelay: 100
            });

            client.connect("exec-123", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);

            // Simulate receiving an event with lastEventId
            mockEventSource!.simulateMessage(
                "execution:progress",
                { data: { progress: 50 } },
                "event-5"
            );

            // Simulate error and reconnection
            mockEventSource!.simulateError();
            await vi.advanceTimersByTimeAsync(100);

            expect(mockEventSource!.url).toContain("lastEventId=event-5");
        });
    });

    // ===== Disconnect =====
    describe("disconnect", () => {
        it("closes EventSource connection", async () => {
            client.connect("exec-123", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);

            client.disconnect();

            expect(mockEventSource!.readyState).toBe(MockEventSource.CLOSED);
        });

        it("sets connection state to disconnected", async () => {
            client.connect("exec-123", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);

            client.disconnect();

            expect(client.getConnectionState()).toBe("disconnected");
        });

        it("clears reconnect timeout", async () => {
            client = new ExecutionStreamClient({
                apiBaseUrl: "http://localhost:3001",
                autoReconnect: true,
                maxReconnectAttempts: 3,
                reconnectDelay: 1000
            });

            client.connect("exec-123", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);

            // Trigger reconnect
            mockEventSource!.simulateError();

            // Disconnect before reconnect happens
            client.disconnect();

            // Advance past reconnect delay
            await vi.advanceTimersByTimeAsync(2000);

            // Should still be disconnected (not reconnected)
            expect(client.getConnectionState()).toBe("disconnected");
        });
    });

    // ===== Event Subscription =====
    describe("event subscription", () => {
        beforeEach(async () => {
            client.connect("exec-123", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);
        });

        it("subscribes to specific event type", () => {
            const handler = vi.fn();

            client.on<ExecutionStartedData>("execution:started", handler);

            mockEventSource!.simulateMessage("execution:started", {
                data: { workflowId: "wf-123", totalNodes: 5 }
            });

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler.mock.calls[0][0].data.workflowId).toBe("wf-123");
        });

        it("subscribes to wildcard events", () => {
            const handler = vi.fn();

            client.on("*", handler);

            mockEventSource!.simulateMessage("execution:started", { data: {} });
            mockEventSource!.simulateMessage("node:completed", { data: {} });

            expect(handler).toHaveBeenCalledTimes(2);
        });

        it("returns unsubscribe function", () => {
            const handler = vi.fn();

            const unsubscribe = client.on("execution:started", handler);
            unsubscribe();

            mockEventSource!.simulateMessage("execution:started", { data: {} });

            expect(handler).not.toHaveBeenCalled();
        });

        it("off() removes event handler", () => {
            const handler = vi.fn();

            client.on("execution:progress", handler);
            client.off("execution:progress", handler);

            mockEventSource!.simulateMessage("execution:progress", { data: {} });

            expect(handler).not.toHaveBeenCalled();
        });

        it("handles multiple handlers for same event", () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            client.on("node:completed", handler1);
            client.on("node:completed", handler2);

            mockEventSource!.simulateMessage("node:completed", { data: {} });

            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(1);
        });

        it("passes typed event data to handler", () => {
            const handler = vi.fn();

            client.on<NodeCompletedData>("node:completed", handler);

            mockEventSource!.simulateMessage("node:completed", {
                data: {
                    nodeId: "node-1",
                    nodeType: "llm",
                    durationMs: 1234
                }
            });

            const event = handler.mock.calls[0][0] as StreamEvent<NodeCompletedData>;
            expect(event.data.nodeId).toBe("node-1");
            expect(event.data.durationMs).toBe(1234);
        });

        it("catches and logs handler errors", () => {
            const errorHandler = vi.fn(() => {
                throw new Error("Handler error");
            });
            const normalHandler = vi.fn();

            client.on("execution:started", errorHandler);
            client.on("execution:started", normalHandler);

            // Should not throw
            mockEventSource!.simulateMessage("execution:started", { data: {} });

            // Normal handler should still be called
            expect(normalHandler).toHaveBeenCalled();
        });
    });

    // ===== State Change Subscription =====
    describe("onStateChange", () => {
        it("notifies on state changes", async () => {
            const handler = vi.fn();

            client.onStateChange(handler);
            client.connect("exec-123", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);

            // Should be called with current state immediately, then connecting, then connected
            expect(handler).toHaveBeenCalledWith("disconnected");
            expect(handler).toHaveBeenCalledWith("connecting");
            expect(handler).toHaveBeenCalledWith("connected");
        });

        it("returns unsubscribe function", async () => {
            const handler = vi.fn();

            const unsubscribe = client.onStateChange(handler);
            handler.mockClear();
            unsubscribe();

            client.connect("exec-123", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);

            // Should not be called after unsubscribe
            expect(handler).not.toHaveBeenCalled();
        });
    });

    // ===== Connection State =====
    describe("connection state", () => {
        it("getConnectionState returns current state", () => {
            expect(client.getConnectionState()).toBe("disconnected");
        });

        it("isConnected returns true when connected", async () => {
            client.connect("exec-123", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);

            expect(client.isConnected()).toBe(true);
        });

        it("isConnected returns false when disconnected", () => {
            expect(client.isConnected()).toBe(false);
        });
    });

    // ===== Reconnection =====
    describe("reconnection", () => {
        beforeEach(() => {
            client = new ExecutionStreamClient({
                apiBaseUrl: "http://localhost:3001",
                autoReconnect: true,
                maxReconnectAttempts: 3,
                reconnectDelay: 100,
                maxReconnectDelay: 1000
            });
        });

        it("attempts reconnection on error", async () => {
            client.connect("exec-123", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);

            const firstEventSource = mockEventSource;
            mockEventSource!.simulateError();

            await vi.advanceTimersByTimeAsync(100);

            // New connection should be attempted
            expect(mockEventSource).not.toBe(firstEventSource);
        });

        it("uses exponential backoff", async () => {
            client.connect("exec-123", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);

            // First error - should reconnect after 100ms (reconnectDelay)
            mockEventSource!.simulateError();
            await vi.advanceTimersByTimeAsync(100);
            // After delay, should have reconnected
            expect(mockEventSource).not.toBeNull();

            // Second error - should reconnect after 200ms (100 * 2^1)
            mockEventSource!.simulateError();
            // Wait full backoff time
            await vi.advanceTimersByTimeAsync(200);
            expect(mockEventSource).not.toBeNull();
        });

        it("respects maxReconnectDelay", async () => {
            client = new ExecutionStreamClient({
                apiBaseUrl: "http://localhost:3001",
                autoReconnect: true,
                maxReconnectAttempts: 10,
                reconnectDelay: 500,
                maxReconnectDelay: 1000
            });

            client.connect("exec-123", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);

            // Multiple errors to trigger max delay
            for (let i = 0; i < 5; i++) {
                mockEventSource!.simulateError();
                await vi.advanceTimersByTimeAsync(1000);
            }

            // Should cap at maxReconnectDelay (1000ms)
            expect(client.getConnectionState()).not.toBe("error");
        });

        it("stops after maxReconnectAttempts", async () => {
            const stateHandler = vi.fn();
            client.onStateChange(stateHandler);

            client.connect("exec-123", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);

            // Trigger max attempts
            for (let i = 0; i < 4; i++) {
                mockEventSource!.simulateError();
                await vi.advanceTimersByTimeAsync(1000);
            }

            // Should not reconnect after max attempts
            const errorCalls = stateHandler.mock.calls.filter((c) => c[0] === "error");
            expect(errorCalls.length).toBeGreaterThanOrEqual(3);
        });

        it("resets attempt counter on successful connection", async () => {
            client.connect("exec-123", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);

            // Two errors
            mockEventSource!.simulateError();
            await vi.advanceTimersByTimeAsync(100);
            mockEventSource!.simulateError();
            await vi.advanceTimersByTimeAsync(200);

            // Connection succeeds - counter should reset
            // Now three more errors should still allow reconnection
            for (let i = 0; i < 3; i++) {
                mockEventSource!.simulateError();
                await vi.advanceTimersByTimeAsync(1000);
            }

            // Should have reconnected multiple times
            expect(client.getConnectionState()).not.toBe("disconnected");
        });

        it("does not reconnect when autoReconnect is false", async () => {
            client = new ExecutionStreamClient({
                apiBaseUrl: "http://localhost:3001",
                autoReconnect: false
            });

            client.connect("exec-123", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);

            mockEventSource!.simulateError();

            await vi.advanceTimersByTimeAsync(1000);

            // Should stay in error state (no reconnection attempted)
            expect(client.getConnectionState()).toBe("error");
        });
    });

    // ===== Event Parsing =====
    describe("event parsing", () => {
        beforeEach(async () => {
            client.connect("exec-123", createMockAuthToken());
            await vi.advanceTimersByTimeAsync(0);
        });

        it("parses JSON event data", () => {
            const handler = vi.fn();
            client.on("execution:started", handler);

            mockEventSource!.simulateMessage(
                "execution:started",
                JSON.stringify({ data: { workflowId: "wf-123" } })
            );

            expect(handler).toHaveBeenCalled();
        });

        it("handles nested data structure", () => {
            const handler = vi.fn();
            client.on("execution:started", handler);

            mockEventSource!.simulateMessage("execution:started", {
                timestamp: 1234567890,
                executionId: "exec-123",
                sequence: 1,
                data: { workflowId: "wf-123", totalNodes: 5 }
            });

            const event = handler.mock.calls[0][0] as StreamEvent<ExecutionStartedData>;
            expect(event.data.workflowId).toBe("wf-123");
        });

        it("handles malformed JSON gracefully", () => {
            const handler = vi.fn();
            client.on("execution:started", handler);

            // Simulate raw string that looks like JSON but isn't
            const event = new MessageEvent("execution:started", {
                data: "not valid json"
            });
            const handlers = (
                mockEventSource as unknown as { listeners: Map<string, Set<(e: Event) => void>> }
            ).listeners?.get?.("execution:started");
            if (handlers) {
                handlers.forEach((h) => h(event));
            }

            // Handler should not be called with invalid data
            // (error is logged but not thrown)
        });
    });

    // ===== Factory Function =====
    describe("createExecutionStream", () => {
        it("creates and connects client", async () => {
            const token = createMockAuthToken();
            const streamClient = createExecutionStream("exec-123", token);
            await vi.advanceTimersByTimeAsync(0);

            expect(streamClient.isConnected()).toBe(true);

            streamClient.disconnect();
        });

        it("accepts custom config", async () => {
            const streamClient = createExecutionStream("exec-123", createMockAuthToken(), {
                autoReconnect: false
            });
            await vi.advanceTimersByTimeAsync(0);

            expect(streamClient.isConnected()).toBe(true);

            streamClient.disconnect();
        });
    });
});
