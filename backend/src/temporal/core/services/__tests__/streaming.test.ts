/**
 * Streaming Module Tests
 *
 * Tests for SSE connection management, LLM token stream splitting,
 * and helper functions for event serialization.
 */

import {
    // Event Helpers
    createBaseEvent,
    serializeEvent,
    parseEvent,
    // SSE Manager
    SSEManager,
    // Stream Splitter
    StreamSplitter,
    // Consumer Factories
    createSSEConsumer,
    createCaptureConsumer,
    // Types
    type ExecutionStreamEvent,
    type StreamToken
} from "../streaming";
import type { FastifyReply } from "fastify";

// ============================================================================
// TEST HELPERS
// ============================================================================

interface MockRaw {
    writeHead: jest.Mock;
    write: jest.Mock;
    end: jest.Mock;
    on: jest.Mock;
    chunks: string[];
    closed: boolean;
    closeHandlers: Array<() => void>;
}

function createMockReply(): FastifyReply & { raw: MockRaw } {
    const chunks: string[] = [];
    const closeHandlers: Array<() => void> = [];
    let closed = false;

    const raw: MockRaw = {
        writeHead: jest.fn(),
        write: jest.fn((data: string) => {
            if (!closed) {
                chunks.push(data);
            }
            return true;
        }),
        end: jest.fn(() => {
            closed = true;
        }),
        on: jest.fn((event: string, handler: () => void) => {
            if (event === "close") {
                closeHandlers.push(handler);
            }
        }),
        chunks,
        closed: false,
        closeHandlers
    };

    // Use getters to access the actual state
    Object.defineProperty(raw, "closed", {
        get: () => closed
    });

    return {
        raw
    } as unknown as FastifyReply & { raw: MockRaw };
}

/**
 * Utility to flush pending microtasks/promises
 */
function flushPromises(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

// ============================================================================
// EVENT HELPERS TESTS
// ============================================================================

describe("Event Helpers", () => {
    describe("createBaseEvent", () => {
        it("should create event with type, timestamp, executionId, sequence", () => {
            const event = createBaseEvent("node:started", "exec-123", 1);

            expect(event.type).toBe("node:started");
            expect(event.executionId).toBe("exec-123");
            expect(event.sequence).toBe(1);
            expect(typeof event.timestamp).toBe("number");
        });

        it("should use current timestamp", () => {
            const before = Date.now();
            const event = createBaseEvent("execution:started", "exec-123", 1);
            const after = Date.now();

            expect(event.timestamp).toBeGreaterThanOrEqual(before);
            expect(event.timestamp).toBeLessThanOrEqual(after);
        });
    });

    describe("serializeEvent", () => {
        it("should serialize to SSE format with event type, data, and id", () => {
            const event: ExecutionStreamEvent = {
                type: "node:started",
                timestamp: 1000000,
                executionId: "exec-123",
                sequence: 5,
                data: {
                    nodeId: "node-1",
                    nodeType: "llm"
                }
            };

            const serialized = serializeEvent(event);

            expect(serialized).toContain("event: node:started");
            expect(serialized).toContain("data: ");
            expect(serialized).toContain("id: exec-123-5");
        });

        it("should end with double newline", () => {
            const event: ExecutionStreamEvent = {
                type: "keepalive",
                timestamp: 1000000,
                executionId: "exec-123",
                sequence: 1,
                data: { serverTime: 1000000 }
            };

            const serialized = serializeEvent(event);

            expect(serialized.endsWith("\n\n")).toBe(true);
        });

        it("should include all event fields in JSON data", () => {
            const event: ExecutionStreamEvent = {
                type: "execution:completed",
                timestamp: 1000000,
                executionId: "exec-123",
                sequence: 10,
                data: {
                    outputs: { result: "success" },
                    durationMs: 5000,
                    nodesExecuted: 3
                }
            };

            const serialized = serializeEvent(event);
            const dataLine = serialized.split("\n").find((line) => line.startsWith("data: "));
            const jsonData = JSON.parse(dataLine!.substring(6));

            expect(jsonData.type).toBe("execution:completed");
            expect(jsonData.timestamp).toBe(1000000);
            expect(jsonData.executionId).toBe("exec-123");
            expect(jsonData.sequence).toBe(10);
            expect(jsonData.data.outputs).toEqual({ result: "success" });
        });
    });

    describe("parseEvent", () => {
        it("should parse valid SSE string back to event", () => {
            const originalEvent: ExecutionStreamEvent = {
                type: "node:completed",
                timestamp: 1000000,
                executionId: "exec-456",
                sequence: 3,
                data: {
                    nodeId: "node-2",
                    nodeType: "http",
                    durationMs: 150
                }
            };

            const serialized = serializeEvent(originalEvent);
            const parsed = parseEvent(serialized);

            expect(parsed).not.toBeNull();
            expect(parsed!.type).toBe("node:completed");
            expect(parsed!.executionId).toBe("exec-456");
            expect(parsed!.sequence).toBe(3);
            expect((parsed as { data: { nodeId: string } }).data.nodeId).toBe("node-2");
        });

        it("should return null for invalid SSE string", () => {
            const invalid = "invalid sse string without data";
            const parsed = parseEvent(invalid);

            expect(parsed).toBeNull();
        });

        it("should return null for missing data line", () => {
            const noData = "event: node:started\nid: exec-123-1\n\n";
            const parsed = parseEvent(noData);

            expect(parsed).toBeNull();
        });

        it("should return null for malformed JSON", () => {
            const malformed = "event: test\ndata: {invalid json}\nid: test-1\n\n";
            const parsed = parseEvent(malformed);

            expect(parsed).toBeNull();
        });
    });
});

// ============================================================================
// SSE MANAGER TESTS
// ============================================================================

describe("SSEManager", () => {
    let manager: SSEManager;

    beforeEach(() => {
        jest.useFakeTimers();
        manager = new SSEManager();
    });

    afterEach(() => {
        manager.stop();
        jest.useRealTimers();
    });

    describe("constructor", () => {
        it("should use default config when none provided", () => {
            const stats = manager.getStats();

            expect(stats.totalConnections).toBe(0);
            expect(stats.executionsWithConnections).toBe(0);
            expect(stats.totalBufferedEvents).toBe(0);
        });

        it("should merge partial config with defaults", () => {
            const customManager = new SSEManager({ keepaliveIntervalMs: 30000 });
            customManager.start();

            // Add a connection to test keepalive
            const reply = createMockReply();
            customManager.addConnection("exec-1", "user-1", reply);

            // Advance less than custom keepalive interval - should not send keepalive
            jest.advanceTimersByTime(20000);
            expect(reply.raw.chunks.length).toBe(0);

            // Advance past custom keepalive interval - should send keepalive
            jest.advanceTimersByTime(15000);
            expect(reply.raw.chunks.length).toBeGreaterThan(0);

            customManager.stop();
        });
    });

    describe("start / stop lifecycle", () => {
        it("should start keepalive interval", () => {
            manager.start();

            const reply = createMockReply();
            manager.addConnection("exec-1", "user-1", reply);

            // Initial state - no keepalives sent yet
            expect(reply.raw.chunks.length).toBe(0);

            // Advance past keepalive interval (default 15s)
            jest.advanceTimersByTime(15000);

            // Should have received keepalive
            expect(reply.raw.chunks.length).toBeGreaterThan(0);
            expect(reply.raw.chunks[0]).toContain("keepalive");
        });

        it("should start cleanup interval", () => {
            const shortTimeoutManager = new SSEManager({ connectionTimeoutMs: 30000 });
            shortTimeoutManager.start();

            const reply = createMockReply();
            shortTimeoutManager.addConnection("exec-1", "user-1", reply);

            expect(shortTimeoutManager.getConnectionCount("exec-1")).toBe(1);

            // Advance past timeout and cleanup interval (60s)
            jest.advanceTimersByTime(65000);

            expect(shortTimeoutManager.getConnectionCount("exec-1")).toBe(0);
            expect(reply.raw.end).toHaveBeenCalled();

            shortTimeoutManager.stop();
        });

        it("should clear intervals on stop", () => {
            manager.start();

            const reply = createMockReply();
            manager.addConnection("exec-1", "user-1", reply);

            manager.stop();

            // After stop, advancing timers should not cause errors
            // Connections are closed on stop, so no more writes will occur
            jest.advanceTimersByTime(30000);
        });

        it("should close all connections on stop", () => {
            manager.start();

            const reply1 = createMockReply();
            const reply2 = createMockReply();
            manager.addConnection("exec-1", "user-1", reply1);
            manager.addConnection("exec-2", "user-2", reply2);

            expect(manager.getTotalConnections()).toBe(2);

            manager.stop();

            expect(reply1.raw.end).toHaveBeenCalled();
            expect(reply2.raw.end).toHaveBeenCalled();
            expect(manager.getTotalConnections()).toBe(0);
        });

        it("should clear all state on stop", () => {
            manager.start();

            const reply = createMockReply();
            manager.addConnection("exec-1", "user-1", reply);
            manager.broadcast("exec-1", "node:started", { nodeId: "n1", nodeType: "llm" });

            const statsBefore = manager.getStats();
            expect(statsBefore.totalConnections).toBe(1);
            expect(statsBefore.totalBufferedEvents).toBe(1);

            manager.stop();

            const statsAfter = manager.getStats();
            expect(statsAfter.totalConnections).toBe(0);
            expect(statsAfter.totalBufferedEvents).toBe(0);
            expect(statsAfter.executionsWithConnections).toBe(0);
        });
    });

    describe("addConnection", () => {
        it("should write SSE headers to reply", () => {
            const reply = createMockReply();
            manager.addConnection("exec-1", "user-1", reply);

            expect(reply.raw.writeHead).toHaveBeenCalledWith(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no"
            });
        });

        it("should add connection to connections map", () => {
            const reply = createMockReply();
            manager.addConnection("exec-1", "user-1", reply);

            expect(manager.getConnectionCount("exec-1")).toBe(1);
        });

        it("should handle multiple connections for same execution", () => {
            const reply1 = createMockReply();
            const reply2 = createMockReply();

            manager.addConnection("exec-1", "user-1", reply1);
            manager.addConnection("exec-1", "user-2", reply2);

            expect(manager.getConnectionCount("exec-1")).toBe(2);
        });

        it("should replay buffered events to new connection", () => {
            const reply1 = createMockReply();
            manager.addConnection("exec-1", "user-1", reply1);

            // Broadcast some events
            manager.broadcast("exec-1", "node:started", { nodeId: "n1", nodeType: "llm" });
            manager.broadcast("exec-1", "node:completed", {
                nodeId: "n1",
                nodeType: "llm",
                durationMs: 100
            });

            // Add a new connection
            const reply2 = createMockReply();
            manager.addConnection("exec-1", "user-2", reply2);

            // New connection should receive replayed events
            expect(reply2.raw.chunks.length).toBe(2);
            expect(reply2.raw.chunks[0]).toContain("node:started");
            expect(reply2.raw.chunks[1]).toContain("node:completed");
        });

        it("should parse lastEventId for replay", () => {
            const reply1 = createMockReply();
            manager.addConnection("exec-1", "user-1", reply1);

            // Broadcast 3 events (sequences 1, 2, 3)
            manager.broadcast("exec-1", "node:started", { nodeId: "n1", nodeType: "llm" });
            manager.broadcast("exec-1", "node:completed", {
                nodeId: "n1",
                nodeType: "llm",
                durationMs: 100
            });
            manager.broadcast("exec-1", "execution:completed", {
                outputs: {},
                durationMs: 200,
                nodesExecuted: 1
            });

            // New connection with lastEventId - should only get events after sequence 2
            const reply2 = createMockReply();
            manager.addConnection("exec-1", "user-2", reply2, "exec-1-2");

            // Should only receive the event with sequence 3
            expect(reply2.raw.chunks.length).toBe(1);
            expect(reply2.raw.chunks[0]).toContain("execution:completed");
        });

        it("should register close handler on raw stream", () => {
            const reply = createMockReply();
            manager.addConnection("exec-1", "user-1", reply);

            expect(reply.raw.on).toHaveBeenCalledWith("close", expect.any(Function));
        });
    });

    describe("removeConnection", () => {
        it("should remove connection from map", () => {
            const reply = createMockReply();
            manager.addConnection("exec-1", "user-1", reply);
            expect(manager.getConnectionCount("exec-1")).toBe(1);

            manager.removeConnection("exec-1", reply);
            expect(manager.getConnectionCount("exec-1")).toBe(0);
        });

        it("should delete execution entry when last connection removed", () => {
            const reply1 = createMockReply();
            const reply2 = createMockReply();

            manager.addConnection("exec-1", "user-1", reply1);
            manager.addConnection("exec-1", "user-2", reply2);

            expect(manager.getStats().executionsWithConnections).toBe(1);

            manager.removeConnection("exec-1", reply1);
            expect(manager.getStats().executionsWithConnections).toBe(1);

            manager.removeConnection("exec-1", reply2);
            expect(manager.getStats().executionsWithConnections).toBe(0);
        });

        it("should handle removing non-existent connection", () => {
            const reply = createMockReply();

            // Should not throw
            expect(() => {
                manager.removeConnection("non-existent", reply);
            }).not.toThrow();
        });
    });

    describe("broadcast", () => {
        it("should increment sequence counter", () => {
            const reply = createMockReply();
            manager.addConnection("exec-1", "user-1", reply);

            manager.broadcast("exec-1", "node:started", { nodeId: "n1", nodeType: "llm" });
            manager.broadcast("exec-1", "node:completed", {
                nodeId: "n1",
                nodeType: "llm",
                durationMs: 100
            });

            // Check that sequence numbers are incrementing
            expect(reply.raw.chunks[0]).toContain("id: exec-1-1");
            expect(reply.raw.chunks[1]).toContain("id: exec-1-2");
        });

        it("should buffer event for replay", () => {
            const reply1 = createMockReply();
            manager.addConnection("exec-1", "user-1", reply1);

            manager.broadcast("exec-1", "node:started", { nodeId: "n1", nodeType: "llm" });

            expect(manager.getStats().totalBufferedEvents).toBe(1);
        });

        it("should send to all connections for execution", () => {
            const reply1 = createMockReply();
            const reply2 = createMockReply();

            manager.addConnection("exec-1", "user-1", reply1);
            manager.addConnection("exec-1", "user-2", reply2);

            manager.broadcast("exec-1", "node:started", { nodeId: "n1", nodeType: "llm" });

            expect(reply1.raw.chunks.length).toBe(1);
            expect(reply2.raw.chunks.length).toBe(1);
        });

        it("should handle no connections gracefully", () => {
            // Should not throw when broadcasting to execution with no connections
            expect(() => {
                manager.broadcast("non-existent", "node:started", {
                    nodeId: "n1",
                    nodeType: "llm"
                });
            }).not.toThrow();

            // Event should still be buffered
            expect(manager.getStats().totalBufferedEvents).toBe(1);
        });

        it("should trim buffer when exceeding max size", () => {
            const smallBufferManager = new SSEManager({ maxBufferedEvents: 3 });

            const reply = createMockReply();
            smallBufferManager.addConnection("exec-1", "user-1", reply);

            // Broadcast 5 events
            for (let i = 0; i < 5; i++) {
                smallBufferManager.broadcast("exec-1", "node:started", {
                    nodeId: `n${i}`,
                    nodeType: "llm"
                });
            }

            // Should only have 3 buffered events
            expect(smallBufferManager.getStats().totalBufferedEvents).toBe(3);

            smallBufferManager.stop();
        });
    });

    describe("getConnectionCount / getTotalConnections", () => {
        it("should return 0 for no connections", () => {
            expect(manager.getConnectionCount("exec-1")).toBe(0);
            expect(manager.getTotalConnections()).toBe(0);
        });

        it("should count connections per execution", () => {
            const reply1 = createMockReply();
            const reply2 = createMockReply();
            const reply3 = createMockReply();

            manager.addConnection("exec-1", "user-1", reply1);
            manager.addConnection("exec-1", "user-2", reply2);
            manager.addConnection("exec-2", "user-3", reply3);

            expect(manager.getConnectionCount("exec-1")).toBe(2);
            expect(manager.getConnectionCount("exec-2")).toBe(1);
        });

        it("should count total connections across executions", () => {
            const reply1 = createMockReply();
            const reply2 = createMockReply();
            const reply3 = createMockReply();

            manager.addConnection("exec-1", "user-1", reply1);
            manager.addConnection("exec-2", "user-2", reply2);
            manager.addConnection("exec-3", "user-3", reply3);

            expect(manager.getTotalConnections()).toBe(3);
        });
    });

    describe("getStats", () => {
        it("should return connection counts", () => {
            const reply1 = createMockReply();
            const reply2 = createMockReply();

            manager.addConnection("exec-1", "user-1", reply1);
            manager.addConnection("exec-2", "user-2", reply2);

            const stats = manager.getStats();
            expect(stats.totalConnections).toBe(2);
        });

        it("should return buffered event counts", () => {
            const reply = createMockReply();
            manager.addConnection("exec-1", "user-1", reply);

            manager.broadcast("exec-1", "node:started", { nodeId: "n1", nodeType: "llm" });
            manager.broadcast("exec-1", "node:completed", {
                nodeId: "n1",
                nodeType: "llm",
                durationMs: 100
            });
            manager.broadcast("exec-2", "execution:started", {
                workflowId: "w1",
                workflowName: "Test",
                totalNodes: 5,
                inputs: {}
            });

            const stats = manager.getStats();
            expect(stats.totalBufferedEvents).toBe(3);
        });

        it("should return execution count", () => {
            const reply1 = createMockReply();
            const reply2 = createMockReply();

            manager.addConnection("exec-1", "user-1", reply1);
            manager.addConnection("exec-2", "user-2", reply2);

            const stats = manager.getStats();
            expect(stats.executionsWithConnections).toBe(2);
        });
    });

    describe("keepalive", () => {
        it("should send keepalive events at interval", () => {
            manager.start();

            const reply = createMockReply();
            manager.addConnection("exec-1", "user-1", reply);

            // Advance to first keepalive
            jest.advanceTimersByTime(15000);
            expect(reply.raw.chunks.length).toBe(1);

            // Advance to second keepalive
            jest.advanceTimersByTime(15000);
            expect(reply.raw.chunks.length).toBe(2);
        });

        it("should include serverTime in data", () => {
            manager.start();

            const reply = createMockReply();
            manager.addConnection("exec-1", "user-1", reply);

            jest.advanceTimersByTime(15000);

            const chunk = reply.raw.chunks[0];
            expect(chunk).toContain("keepalive");
            expect(chunk).toContain("serverTime");
        });

        it("should send to all connections", () => {
            manager.start();

            const reply1 = createMockReply();
            const reply2 = createMockReply();
            const reply3 = createMockReply();

            manager.addConnection("exec-1", "user-1", reply1);
            manager.addConnection("exec-1", "user-2", reply2);
            manager.addConnection("exec-2", "user-3", reply3);

            jest.advanceTimersByTime(15000);

            expect(reply1.raw.chunks.length).toBe(1);
            expect(reply2.raw.chunks.length).toBe(1);
            expect(reply3.raw.chunks.length).toBe(1);
        });
    });

    describe("cleanup", () => {
        it("should remove stale connections past timeout", () => {
            const shortTimeoutManager = new SSEManager({ connectionTimeoutMs: 30000 });
            shortTimeoutManager.start();

            const reply = createMockReply();
            shortTimeoutManager.addConnection("exec-1", "user-1", reply);

            expect(shortTimeoutManager.getConnectionCount("exec-1")).toBe(1);

            // Advance past timeout and past cleanup interval
            jest.advanceTimersByTime(65000);

            expect(shortTimeoutManager.getConnectionCount("exec-1")).toBe(0);

            shortTimeoutManager.stop();
        });

        it("should remove expired events from buffer", () => {
            const shortTtlManager = new SSEManager({ bufferTtlMs: 30000 });
            shortTtlManager.start();

            const reply = createMockReply();
            shortTtlManager.addConnection("exec-1", "user-1", reply);
            shortTtlManager.broadcast("exec-1", "node:started", { nodeId: "n1", nodeType: "llm" });

            expect(shortTtlManager.getStats().totalBufferedEvents).toBe(1);

            // Advance past TTL and cleanup interval
            jest.advanceTimersByTime(65000);

            expect(shortTtlManager.getStats().totalBufferedEvents).toBe(0);

            shortTtlManager.stop();
        });

        it("should close stale connections", () => {
            const shortTimeoutManager = new SSEManager({ connectionTimeoutMs: 30000 });
            shortTimeoutManager.start();

            const reply = createMockReply();
            shortTimeoutManager.addConnection("exec-1", "user-1", reply);

            // Advance past timeout and cleanup
            jest.advanceTimersByTime(65000);

            expect(reply.raw.end).toHaveBeenCalled();

            shortTimeoutManager.stop();
        });
    });
});

// ============================================================================
// STREAM SPLITTER TESTS
// ============================================================================

describe("StreamSplitter", () => {
    let splitter: StreamSplitter;

    beforeEach(() => {
        splitter = new StreamSplitter();
    });

    describe("constructor", () => {
        it("should use default config when none provided", () => {
            const stats = splitter.getStats();

            expect(stats.activeStreams).toBe(0);
            expect(stats.totalConsumers).toBe(0);
            expect(stats.totalTokensProcessed).toBe(0);
        });

        it("should merge partial config with defaults", () => {
            const customSplitter = new StreamSplitter({ maxConsumers: 5 });

            const streamId = customSplitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            // Add 5 consumers - should work
            for (let i = 0; i < 5; i++) {
                customSplitter.addConsumer(streamId, `consumer-${i}`, () => {});
            }

            // 6th should throw
            expect(() => {
                customSplitter.addConsumer(streamId, "consumer-5", () => {});
            }).toThrow(/max consumers/);
        });
    });

    describe("createStream", () => {
        it("should create new stream with metadata", () => {
            const streamId = splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1",
                model: "gpt-4",
                provider: "openai"
            });

            expect(streamId).toBe("stream-1");

            const metadata = splitter.getMetadata("stream-1");
            expect(metadata?.nodeId).toBe("node-1");
            expect(metadata?.executionId).toBe("exec-1");
            expect(metadata?.model).toBe("gpt-4");
            expect(metadata?.provider).toBe("openai");
        });

        it("should set startTime to current time", () => {
            const before = Date.now();
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });
            const after = Date.now();

            const metadata = splitter.getMetadata("stream-1");
            expect(metadata?.startTime).toBeGreaterThanOrEqual(before);
            expect(metadata?.startTime).toBeLessThanOrEqual(after);
        });

        it("should initialize empty buffer", () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            expect(splitter.getAccumulatedText("stream-1")).toBe("");
        });

        it("should initialize token counter to 0", () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            const metadata = splitter.getMetadata("stream-1");
            expect(metadata?.totalTokens).toBe(0);
        });

        it("should replace existing stream with same ID", () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            splitter.addConsumer("stream-1", "consumer-1", () => {});

            // Create new stream with same ID
            splitter.createStream("stream-1", {
                nodeId: "node-2",
                executionId: "exec-2"
            });

            const metadata = splitter.getMetadata("stream-1");
            expect(metadata?.nodeId).toBe("node-2");

            // Consumer should be cleared
            const stats = splitter.getStats();
            expect(stats.totalConsumers).toBe(0);
        });
    });

    describe("addConsumer", () => {
        it("should add consumer to stream", () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            splitter.addConsumer("stream-1", "consumer-1", () => {});

            expect(splitter.getStats().totalConsumers).toBe(1);
        });

        it("should throw if stream not found", () => {
            expect(() => {
                splitter.addConsumer("non-existent", "consumer-1", () => {});
            }).toThrow(/not found/);
        });

        it("should throw if max consumers reached", () => {
            const limitedSplitter = new StreamSplitter({ maxConsumers: 2 });

            limitedSplitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            limitedSplitter.addConsumer("stream-1", "c1", () => {});
            limitedSplitter.addConsumer("stream-1", "c2", () => {});

            expect(() => {
                limitedSplitter.addConsumer("stream-1", "c3", () => {});
            }).toThrow(/max consumers/);
        });

        it("should replay buffer to late-joining consumer when enabled", async () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            // Push some tokens
            await splitter.pushToken("stream-1", "Hello");
            await splitter.pushToken("stream-1", " World");

            // Add late-joining consumer
            const received: StreamToken[] = [];
            splitter.addConsumer("stream-1", "late-consumer", (token) => {
                received.push(token);
            });

            // Give async replay time to execute
            await flushPromises();

            expect(received.length).toBe(2);
            expect(received[0].token).toBe("Hello");
            expect(received[1].token).toBe(" World");
        });

        it("should skip replay when disabled", async () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            // Push some tokens
            await splitter.pushToken("stream-1", "Hello");

            // Add consumer with replay disabled
            const received: StreamToken[] = [];
            splitter.addConsumer(
                "stream-1",
                "no-replay-consumer",
                (token) => {
                    received.push(token);
                },
                false
            );

            // Give time for potential async operations
            await flushPromises();

            expect(received.length).toBe(0);
        });
    });

    describe("removeConsumer", () => {
        it("should remove consumer from stream", () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            splitter.addConsumer("stream-1", "consumer-1", () => {});
            expect(splitter.getStats().totalConsumers).toBe(1);

            splitter.removeConsumer("stream-1", "consumer-1");
            expect(splitter.getStats().totalConsumers).toBe(0);
        });

        it("should handle removing from non-existent stream", () => {
            expect(() => {
                splitter.removeConsumer("non-existent", "consumer-1");
            }).not.toThrow();
        });
    });

    describe("pushToken", () => {
        it("should increment token counter", async () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            await splitter.pushToken("stream-1", "token1");
            await splitter.pushToken("stream-1", "token2");

            const metadata = splitter.getMetadata("stream-1");
            expect(metadata?.totalTokens).toBe(2);
        });

        it("should append to fullText", async () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            await splitter.pushToken("stream-1", "Hello");
            await splitter.pushToken("stream-1", " ");
            await splitter.pushToken("stream-1", "World");

            expect(splitter.getAccumulatedText("stream-1")).toBe("Hello World");
        });

        it("should add to buffer", async () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            await splitter.pushToken("stream-1", "token1");

            // Verify buffer by adding a late consumer
            const received: StreamToken[] = [];
            splitter.addConsumer("stream-1", "late", (token) => {
                received.push(token);
            });

            await flushPromises();

            expect(received.length).toBe(1);
        });

        it("should trim buffer when exceeding max size", async () => {
            const smallBufferSplitter = new StreamSplitter({ bufferSize: 3 });

            smallBufferSplitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            await smallBufferSplitter.pushToken("stream-1", "token1");
            await smallBufferSplitter.pushToken("stream-1", "token2");
            await smallBufferSplitter.pushToken("stream-1", "token3");
            await smallBufferSplitter.pushToken("stream-1", "token4");
            await smallBufferSplitter.pushToken("stream-1", "token5");

            // Late consumer should only get last 3 tokens
            const received: StreamToken[] = [];
            smallBufferSplitter.addConsumer("stream-1", "late", (token) => {
                received.push(token);
            });

            await flushPromises();

            expect(received.length).toBe(3);
            expect(received[0].token).toBe("token3");
            expect(received[1].token).toBe("token4");
            expect(received[2].token).toBe("token5");
        });

        it("should mark complete on isComplete=true", async () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            expect(splitter.isStreamActive("stream-1")).toBe(true);

            await splitter.pushToken("stream-1", "final", true);

            expect(splitter.isStreamActive("stream-1")).toBe(false);
        });

        it("should set endTime on completion", async () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            expect(splitter.getMetadata("stream-1")?.endTime).toBeUndefined();

            const before = Date.now();
            await splitter.pushToken("stream-1", "final", true);
            const after = Date.now();

            const metadata = splitter.getMetadata("stream-1");
            expect(metadata?.endTime).toBeGreaterThanOrEqual(before);
            expect(metadata?.endTime).toBeLessThanOrEqual(after);
        });

        it("should distribute to all consumers", async () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            const received1: StreamToken[] = [];
            const received2: StreamToken[] = [];

            splitter.addConsumer("stream-1", "c1", (token) => {
                received1.push(token);
            });
            splitter.addConsumer("stream-1", "c2", (token) => {
                received2.push(token);
            });

            await splitter.pushToken("stream-1", "Hello");

            expect(received1.length).toBe(1);
            expect(received2.length).toBe(1);
            expect(received1[0].token).toBe("Hello");
            expect(received2[0].token).toBe("Hello");
        });

        it("should throw if stream not found", async () => {
            await expect(splitter.pushToken("non-existent", "token")).rejects.toThrow(/not found/);
        });
    });

    describe("closeStream", () => {
        it("should mark stream complete", () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            splitter.closeStream("stream-1");

            // Stream should be removed, so isStreamActive returns false
            expect(splitter.isStreamActive("stream-1")).toBe(false);
        });

        it("should set endTime", () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            const before = Date.now();
            const metadata = splitter.closeStream("stream-1");
            const after = Date.now();

            expect(metadata?.endTime).toBeGreaterThanOrEqual(before);
            expect(metadata?.endTime).toBeLessThanOrEqual(after);
        });

        it("should return metadata", async () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1",
                model: "gpt-4"
            });

            await splitter.pushToken("stream-1", "Hello");
            await splitter.pushToken("stream-1", " World");

            const metadata = splitter.closeStream("stream-1");

            expect(metadata?.nodeId).toBe("node-1");
            expect(metadata?.model).toBe("gpt-4");
            expect(metadata?.totalTokens).toBe(2);
            expect(metadata?.fullText).toBe("Hello World");
        });

        it("should clear consumers and buffer", () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            splitter.addConsumer("stream-1", "c1", () => {});

            splitter.closeStream("stream-1");

            expect(splitter.getStats().totalConsumers).toBe(0);
        });

        it("should remove stream from map", () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            expect(splitter.getStats().activeStreams).toBe(1);

            splitter.closeStream("stream-1");

            expect(splitter.getStats().activeStreams).toBe(0);
        });

        it("should return null for non-existent stream", () => {
            const result = splitter.closeStream("non-existent");
            expect(result).toBeNull();
        });
    });

    describe("getMetadata / getAccumulatedText", () => {
        it("should return copy of metadata", async () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            await splitter.pushToken("stream-1", "test");

            const metadata1 = splitter.getMetadata("stream-1");
            const metadata2 = splitter.getMetadata("stream-1");

            expect(metadata1).toEqual(metadata2);
            expect(metadata1).not.toBe(metadata2);
        });

        it("should return accumulated text", async () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            await splitter.pushToken("stream-1", "Hello");
            await splitter.pushToken("stream-1", " World");

            expect(splitter.getAccumulatedText("stream-1")).toBe("Hello World");
        });

        it("should return null for non-existent stream", () => {
            expect(splitter.getMetadata("non-existent")).toBeNull();
            expect(splitter.getAccumulatedText("non-existent")).toBeNull();
        });
    });

    describe("isStreamActive", () => {
        it("should return true for active stream", () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            expect(splitter.isStreamActive("stream-1")).toBe(true);
        });

        it("should return false for completed stream", async () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });

            await splitter.pushToken("stream-1", "final", true);

            expect(splitter.isStreamActive("stream-1")).toBe(false);
        });

        it("should return false for non-existent stream", () => {
            expect(splitter.isStreamActive("non-existent")).toBe(false);
        });
    });

    describe("getStats", () => {
        it("should return active stream count", () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });
            splitter.createStream("stream-2", {
                nodeId: "node-2",
                executionId: "exec-2"
            });

            expect(splitter.getStats().activeStreams).toBe(2);
        });

        it("should return total consumer count", () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });
            splitter.createStream("stream-2", {
                nodeId: "node-2",
                executionId: "exec-2"
            });

            splitter.addConsumer("stream-1", "c1", () => {});
            splitter.addConsumer("stream-1", "c2", () => {});
            splitter.addConsumer("stream-2", "c3", () => {});

            expect(splitter.getStats().totalConsumers).toBe(3);
        });

        it("should return total tokens processed", async () => {
            splitter.createStream("stream-1", {
                nodeId: "node-1",
                executionId: "exec-1"
            });
            splitter.createStream("stream-2", {
                nodeId: "node-2",
                executionId: "exec-2"
            });

            await splitter.pushToken("stream-1", "token1");
            await splitter.pushToken("stream-1", "token2");
            await splitter.pushToken("stream-2", "token3");

            expect(splitter.getStats().totalTokensProcessed).toBe(3);
        });
    });
});

// ============================================================================
// CONSUMER FACTORIES TESTS
// ============================================================================

describe("Consumer Factories", () => {
    describe("createSSEConsumer", () => {
        it("should accumulate text across tokens", () => {
            const emittedEvents: Array<{ eventType: string; data: Record<string, unknown> }> = [];
            const emitter = (eventType: string, data: Record<string, unknown>) => {
                emittedEvents.push({ eventType, data });
            };

            const consumer = createSSEConsumer(emitter, "exec-1", "node-1");

            consumer({ token: "Hello", index: 0, timestamp: 1000, isComplete: false });
            consumer({ token: " World", index: 1, timestamp: 1001, isComplete: false });

            expect(emittedEvents[0].data.cumulativeText).toBe("Hello");
            expect(emittedEvents[1].data.cumulativeText).toBe("Hello World");
        });

        it("should emit node:token events", () => {
            const emittedEvents: Array<{ eventType: string; data: Record<string, unknown> }> = [];
            const emitter = (eventType: string, data: Record<string, unknown>) => {
                emittedEvents.push({ eventType, data });
            };

            const consumer = createSSEConsumer(emitter, "exec-1", "node-1");

            consumer({ token: "test", index: 0, timestamp: 1000, isComplete: false });

            expect(emittedEvents.length).toBe(1);
            expect(emittedEvents[0].eventType).toBe("node:token");
        });

        it("should include cumulativeText in events", () => {
            const emittedEvents: Array<{ eventType: string; data: Record<string, unknown> }> = [];
            const emitter = (eventType: string, data: Record<string, unknown>) => {
                emittedEvents.push({ eventType, data });
            };

            const consumer = createSSEConsumer(emitter, "exec-1", "node-1");

            consumer({ token: "Hello", index: 0, timestamp: 1000, isComplete: false });

            expect(emittedEvents[0].data.cumulativeText).toBeDefined();
        });

        it("should pass isComplete flag", () => {
            const emittedEvents: Array<{ eventType: string; data: Record<string, unknown> }> = [];
            const emitter = (eventType: string, data: Record<string, unknown>) => {
                emittedEvents.push({ eventType, data });
            };

            const consumer = createSSEConsumer(emitter, "exec-1", "node-1");

            consumer({ token: "first", index: 0, timestamp: 1000, isComplete: false });
            consumer({ token: " final", index: 1, timestamp: 1001, isComplete: true });

            expect(emittedEvents[0].data.isComplete).toBe(false);
            expect(emittedEvents[1].data.isComplete).toBe(true);
        });

        it("should include nodeId in events", () => {
            const emittedEvents: Array<{ eventType: string; data: Record<string, unknown> }> = [];
            const emitter = (eventType: string, data: Record<string, unknown>) => {
                emittedEvents.push({ eventType, data });
            };

            const consumer = createSSEConsumer(emitter, "exec-1", "my-node");

            consumer({ token: "test", index: 0, timestamp: 1000, isComplete: false });

            expect(emittedEvents[0].data.nodeId).toBe("my-node");
        });
    });

    describe("createCaptureConsumer", () => {
        it("should accumulate full text", () => {
            const { consumer, getResult } = createCaptureConsumer(() => {});

            consumer({ token: "Hello", index: 0, timestamp: 1000, isComplete: false });
            consumer({ token: " ", index: 1, timestamp: 1001, isComplete: false });
            consumer({ token: "World", index: 2, timestamp: 1002, isComplete: false });

            expect(getResult()).toBe("Hello World");
        });

        it("should count tokens", () => {
            let tokenCount = 0;
            const callback = (
                _fullText: string,
                metadata: { totalTokens: number; durationMs: number }
            ): void => {
                tokenCount = metadata.totalTokens;
            };

            const { consumer } = createCaptureConsumer(callback);

            consumer({ token: "a", index: 0, timestamp: 1000, isComplete: false });
            consumer({ token: "b", index: 1, timestamp: 1001, isComplete: false });
            consumer({ token: "c", index: 2, timestamp: 1002, isComplete: true });

            expect(tokenCount).toBe(3);
        });

        it("should call callback on completion with text and metadata", () => {
            let callbackCalled = false;
            let finalText = "";
            let tokenCount = 0;

            const callback = (
                fullText: string,
                metadata: { totalTokens: number; durationMs: number }
            ): void => {
                callbackCalled = true;
                finalText = fullText;
                tokenCount = metadata.totalTokens;
            };

            const { consumer } = createCaptureConsumer(callback);

            consumer({ token: "Hello", index: 0, timestamp: 1000, isComplete: false });
            expect(callbackCalled).toBe(false);

            consumer({ token: " World", index: 1, timestamp: 1001, isComplete: true });
            expect(callbackCalled).toBe(true);
            expect(finalText).toBe("Hello World");
            expect(tokenCount).toBe(2);
        });

        it("should provide getResult function", () => {
            const { consumer, getResult } = createCaptureConsumer(() => {});

            expect(getResult()).toBe("");

            consumer({ token: "test", index: 0, timestamp: 1000, isComplete: false });
            expect(getResult()).toBe("test");

            consumer({ token: "ing", index: 1, timestamp: 1001, isComplete: false });
            expect(getResult()).toBe("testing");
        });

        it("should calculate durationMs correctly", () => {
            jest.useFakeTimers();

            let duration = 0;
            const callback = (
                _fullText: string,
                metadata: { totalTokens: number; durationMs: number }
            ): void => {
                duration = metadata.durationMs;
            };

            const { consumer } = createCaptureConsumer(callback);

            consumer({ token: "start", index: 0, timestamp: 1000, isComplete: false });

            // Advance time
            jest.advanceTimersByTime(500);

            consumer({ token: " end", index: 1, timestamp: 1500, isComplete: true });

            expect(duration).toBeGreaterThanOrEqual(500);

            jest.useRealTimers();
        });
    });
});
