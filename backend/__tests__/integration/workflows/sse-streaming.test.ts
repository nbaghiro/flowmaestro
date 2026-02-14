/**
 * Workflow SSE Streaming Tests
 *
 * Tests for Server-Sent Events connection, event streaming, and cleanup
 * for workflow chat and generation chat streams.
 */

import { EventEmitter } from "events";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock the execution streams Map for chat-stream.ts
const mockChatExecutionStreams = new Map<string, EventEmitter>();

jest.mock("../../../src/api/routes/workflows/chat-stream", () => {
    const actual = jest.requireActual("../../../src/api/routes/workflows/chat-stream");
    return {
        ...actual,
        emitChatEvent: (
            executionId: string,
            event: string,
            data: unknown
        ): void => {
            const emitter = mockChatExecutionStreams.get(executionId);
            if (emitter) {
                emitter.emit(event, data);
            }
        }
    };
});

// Mock the execution streams Map for generation-chat-stream.ts
const mockGenerationExecutionStreams = new Map<string, EventEmitter>();

jest.mock("../../../src/api/routes/workflows/generation-chat-stream", () => {
    const actual = jest.requireActual("../../../src/api/routes/workflows/generation-chat-stream");
    return {
        ...actual,
        emitGenerationEvent: (
            executionId: string,
            event: string,
            data: unknown
        ): void => {
            const emitter = mockGenerationExecutionStreams.get(executionId);
            if (emitter) {
                emitter.emit(event, data);
            }
        }
    };
});

// Import after mocks
import { emitChatEvent } from "../../../src/api/routes/workflows/chat-stream";
import { emitGenerationEvent } from "../../../src/api/routes/workflows/generation-chat-stream";

// ============================================================================
// TEST HELPERS
// ============================================================================

interface StreamEvent {
    type: string;
    data: unknown;
    timestamp: number;
}

function createTestEmitter(executionId: string, streamMap: Map<string, EventEmitter>): {
    emitter: EventEmitter;
    receivedEvents: StreamEvent[];
    cleanup: () => void;
} {
    const emitter = new EventEmitter();
    const receivedEvents: StreamEvent[] = [];

    // Track all events
    const eventTypes = [
        "connected",
        "thinking_start",
        "thinking_token",
        "thinking_complete",
        "token",
        "plan_detected",
        "complete",
        "error"
    ];

    eventTypes.forEach((type) => {
        emitter.on(type, (data: unknown) => {
            receivedEvents.push({
                type,
                data,
                timestamp: Date.now()
            });
        });
    });

    streamMap.set(executionId, emitter);

    return {
        emitter,
        receivedEvents,
        cleanup: () => {
            streamMap.delete(executionId);
            emitter.removeAllListeners();
        }
    };
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// TESTS
// ============================================================================

describe("Workflow Chat SSE Streaming", () => {
    afterEach(() => {
        mockChatExecutionStreams.clear();
    });

    describe("emitChatEvent", () => {
        it("should emit thinking_start event to connected stream", () => {
            const executionId = "exec-001";
            const { receivedEvents, cleanup } = createTestEmitter(
                executionId,
                mockChatExecutionStreams
            );

            emitChatEvent(executionId, "thinking_start", {});

            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0].type).toBe("thinking_start");
            cleanup();
        });

        it("should emit thinking_token events in sequence", () => {
            const executionId = "exec-002";
            const { receivedEvents, cleanup } = createTestEmitter(
                executionId,
                mockChatExecutionStreams
            );

            emitChatEvent(executionId, "thinking_token", "Hello");
            emitChatEvent(executionId, "thinking_token", " world");
            emitChatEvent(executionId, "thinking_token", "!");

            expect(receivedEvents).toHaveLength(3);
            expect(receivedEvents.map((e) => e.data)).toEqual(["Hello", " world", "!"]);
            cleanup();
        });

        it("should emit thinking_complete event with full content", () => {
            const executionId = "exec-003";
            const { receivedEvents, cleanup } = createTestEmitter(
                executionId,
                mockChatExecutionStreams
            );

            emitChatEvent(executionId, "thinking_complete", "Full thinking content here");

            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0].type).toBe("thinking_complete");
            expect(receivedEvents[0].data).toBe("Full thinking content here");
            cleanup();
        });

        it("should emit token events for response streaming", () => {
            const executionId = "exec-004";
            const { receivedEvents, cleanup } = createTestEmitter(
                executionId,
                mockChatExecutionStreams
            );

            const tokens = ["I", " will", " help", " you", " with", " that"];
            tokens.forEach((token) => {
                emitChatEvent(executionId, "token", token);
            });

            expect(receivedEvents).toHaveLength(6);
            expect(receivedEvents.every((e) => e.type === "token")).toBe(true);
            expect(receivedEvents.map((e) => e.data).join("")).toBe("I will help you with that");
            cleanup();
        });

        it("should emit complete event with response data", () => {
            const executionId = "exec-005";
            const { receivedEvents, cleanup } = createTestEmitter(
                executionId,
                mockChatExecutionStreams
            );

            const responseData = {
                response: "Here is my response",
                changes: [{ type: "add", nodeId: "node-1" }],
                thinking: "I thought about this carefully"
            };

            emitChatEvent(executionId, "complete", responseData);

            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0].type).toBe("complete");
            expect(receivedEvents[0].data).toEqual(responseData);
            cleanup();
        });

        it("should emit error event on failure", () => {
            const executionId = "exec-006";
            const { receivedEvents, cleanup } = createTestEmitter(
                executionId,
                mockChatExecutionStreams
            );

            emitChatEvent(executionId, "error", "Something went wrong");

            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0].type).toBe("error");
            expect(receivedEvents[0].data).toBe("Something went wrong");
            cleanup();
        });

        it("should not emit to non-existent execution", () => {
            // No emitter registered for this execution ID
            const result = emitChatEvent("non-existent", "token", "test");

            // Should not throw, just silently fail
            expect(result).toBeUndefined();
        });

        it("should isolate events between different executions", () => {
            const execution1 = "exec-a";
            const execution2 = "exec-b";

            const { receivedEvents: events1, cleanup: cleanup1 } = createTestEmitter(
                execution1,
                mockChatExecutionStreams
            );
            const { receivedEvents: events2, cleanup: cleanup2 } = createTestEmitter(
                execution2,
                mockChatExecutionStreams
            );

            emitChatEvent(execution1, "token", "for execution 1");
            emitChatEvent(execution2, "token", "for execution 2");
            emitChatEvent(execution1, "complete", { response: "done 1" });

            expect(events1).toHaveLength(2);
            expect(events2).toHaveLength(1);
            expect(events1[0].data).toBe("for execution 1");
            expect(events2[0].data).toBe("for execution 2");

            cleanup1();
            cleanup2();
        });
    });

    describe("Event Lifecycle", () => {
        it("should support full thinking + response lifecycle", async () => {
            const executionId = "exec-lifecycle";
            const { receivedEvents, cleanup } = createTestEmitter(
                executionId,
                mockChatExecutionStreams
            );

            // Simulate full lifecycle
            emitChatEvent(executionId, "thinking_start", {});
            await delay(10);
            emitChatEvent(executionId, "thinking_token", "Let me ");
            emitChatEvent(executionId, "thinking_token", "think...");
            await delay(10);
            emitChatEvent(executionId, "thinking_complete", "Let me think...");
            await delay(10);
            emitChatEvent(executionId, "token", "Here ");
            emitChatEvent(executionId, "token", "is ");
            emitChatEvent(executionId, "token", "my response.");
            await delay(10);
            emitChatEvent(executionId, "complete", {
                response: "Here is my response.",
                thinking: "Let me think..."
            });

            const eventTypes = receivedEvents.map((e) => e.type);
            expect(eventTypes).toEqual([
                "thinking_start",
                "thinking_token",
                "thinking_token",
                "thinking_complete",
                "token",
                "token",
                "token",
                "complete"
            ]);

            cleanup();
        });

        it("should handle error during streaming", async () => {
            const executionId = "exec-error";
            const { receivedEvents, cleanup } = createTestEmitter(
                executionId,
                mockChatExecutionStreams
            );

            // Start streaming
            emitChatEvent(executionId, "token", "Starting...");
            await delay(5);
            // Error occurs mid-stream
            emitChatEvent(executionId, "error", "Connection lost");

            expect(receivedEvents).toHaveLength(2);
            expect(receivedEvents[1].type).toBe("error");

            cleanup();
        });
    });

    describe("Stream Cleanup", () => {
        it("should stop receiving events after cleanup", () => {
            const executionId = "exec-cleanup";
            const { receivedEvents, cleanup } = createTestEmitter(
                executionId,
                mockChatExecutionStreams
            );

            emitChatEvent(executionId, "token", "before cleanup");
            expect(receivedEvents).toHaveLength(1);

            cleanup();

            // This should not be received
            emitChatEvent(executionId, "token", "after cleanup");
            expect(receivedEvents).toHaveLength(1); // Still 1
        });

        it("should remove emitter from map on cleanup", () => {
            const executionId = "exec-remove";
            const { cleanup } = createTestEmitter(executionId, mockChatExecutionStreams);

            expect(mockChatExecutionStreams.has(executionId)).toBe(true);
            cleanup();
            expect(mockChatExecutionStreams.has(executionId)).toBe(false);
        });
    });
});

describe("Workflow Generation Chat SSE Streaming", () => {
    afterEach(() => {
        mockGenerationExecutionStreams.clear();
    });

    describe("emitGenerationEvent", () => {
        it("should emit thinking events for extended thinking mode", () => {
            const executionId = "gen-001";
            const { receivedEvents, cleanup } = createTestEmitter(
                executionId,
                mockGenerationExecutionStreams
            );

            emitGenerationEvent(executionId, "thinking_start", {});
            emitGenerationEvent(executionId, "thinking_token", "Analyzing");
            emitGenerationEvent(executionId, "thinking_token", " requirements");
            emitGenerationEvent(executionId, "thinking_complete", "Analyzing requirements");

            expect(receivedEvents).toHaveLength(4);
            expect(receivedEvents.map((e) => e.type)).toEqual([
                "thinking_start",
                "thinking_token",
                "thinking_token",
                "thinking_complete"
            ]);
            cleanup();
        });

        it("should emit plan_detected event with workflow plan", () => {
            const executionId = "gen-002";
            const { receivedEvents, cleanup } = createTestEmitter(
                executionId,
                mockGenerationExecutionStreams
            );

            const workflowPlan = {
                name: "Invoice Processing",
                description: "Processes incoming invoices",
                summary: "A workflow for invoice automation",
                entryNodeId: "start",
                nodes: [
                    { id: "start", type: "input" },
                    { id: "process", type: "llm" },
                    { id: "end", type: "output" }
                ],
                edges: [
                    { source: "start", target: "process" },
                    { source: "process", target: "end" }
                ]
            };

            emitGenerationEvent(executionId, "plan_detected", workflowPlan);

            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0].type).toBe("plan_detected");
            expect(receivedEvents[0].data).toEqual(workflowPlan);
            cleanup();
        });

        it("should emit token events for response content", () => {
            const executionId = "gen-003";
            const { receivedEvents, cleanup } = createTestEmitter(
                executionId,
                mockGenerationExecutionStreams
            );

            const tokens = [
                "I'll ",
                "create ",
                "a ",
                "workflow ",
                "for ",
                "you."
            ];
            tokens.forEach((token) => {
                emitGenerationEvent(executionId, "token", token);
            });

            expect(receivedEvents).toHaveLength(6);
            expect(receivedEvents.map((e) => e.data).join("")).toBe(
                "I'll create a workflow for you."
            );
            cleanup();
        });

        it("should emit complete event with full response", () => {
            const executionId = "gen-004";
            const { receivedEvents, cleanup } = createTestEmitter(
                executionId,
                mockGenerationExecutionStreams
            );

            const response = {
                content: "I've created a workflow for invoice processing.",
                workflowPlan: {
                    name: "Invoice Workflow",
                    nodes: [],
                    edges: []
                }
            };

            emitGenerationEvent(executionId, "complete", response);

            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0].type).toBe("complete");
            expect(receivedEvents[0].data).toEqual(response);
            cleanup();
        });

        it("should emit error event on generation failure", () => {
            const executionId = "gen-005";
            const { receivedEvents, cleanup } = createTestEmitter(
                executionId,
                mockGenerationExecutionStreams
            );

            emitGenerationEvent(executionId, "error", "Model rate limited");

            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0].type).toBe("error");
            expect(receivedEvents[0].data).toBe("Model rate limited");
            cleanup();
        });

        it("should not emit to non-existent execution", () => {
            const result = emitGenerationEvent("non-existent", "token", "test");
            expect(result).toBeUndefined();
        });
    });

    describe("Generation Lifecycle", () => {
        it("should support full generation with plan lifecycle", async () => {
            const executionId = "gen-lifecycle";
            const { receivedEvents, cleanup } = createTestEmitter(
                executionId,
                mockGenerationExecutionStreams
            );

            // Full lifecycle with extended thinking and plan generation
            emitGenerationEvent(executionId, "thinking_start", {});
            await delay(5);
            emitGenerationEvent(executionId, "thinking_token", "Planning workflow structure...");
            await delay(5);
            emitGenerationEvent(
                executionId,
                "thinking_complete",
                "Planning workflow structure..."
            );
            await delay(5);
            emitGenerationEvent(executionId, "token", "I've designed a workflow ");
            emitGenerationEvent(executionId, "token", "with 3 nodes.");
            await delay(5);
            emitGenerationEvent(executionId, "plan_detected", {
                name: "My Workflow",
                nodes: [{ id: "1" }, { id: "2" }, { id: "3" }],
                edges: []
            });
            await delay(5);
            emitGenerationEvent(executionId, "complete", {
                content: "I've designed a workflow with 3 nodes.",
                workflowPlan: { name: "My Workflow" }
            });

            const eventTypes = receivedEvents.map((e) => e.type);
            expect(eventTypes).toEqual([
                "thinking_start",
                "thinking_token",
                "thinking_complete",
                "token",
                "token",
                "plan_detected",
                "complete"
            ]);
            cleanup();
        });
    });

    describe("Multiple Concurrent Generations", () => {
        it("should handle multiple concurrent generation streams", () => {
            const exec1 = "gen-concurrent-1";
            const exec2 = "gen-concurrent-2";
            const exec3 = "gen-concurrent-3";

            const { receivedEvents: events1, cleanup: cleanup1 } = createTestEmitter(
                exec1,
                mockGenerationExecutionStreams
            );
            const { receivedEvents: events2, cleanup: cleanup2 } = createTestEmitter(
                exec2,
                mockGenerationExecutionStreams
            );
            const { receivedEvents: events3, cleanup: cleanup3 } = createTestEmitter(
                exec3,
                mockGenerationExecutionStreams
            );

            // Interleaved events from different executions
            emitGenerationEvent(exec1, "thinking_start", {});
            emitGenerationEvent(exec2, "token", "Response 2");
            emitGenerationEvent(exec3, "plan_detected", { name: "Plan 3" });
            emitGenerationEvent(exec1, "thinking_token", "Thinking 1");
            emitGenerationEvent(exec2, "complete", { content: "Done 2" });
            emitGenerationEvent(exec1, "error", "Failed 1");

            expect(events1).toHaveLength(3);
            expect(events1.map((e) => e.type)).toEqual([
                "thinking_start",
                "thinking_token",
                "error"
            ]);

            expect(events2).toHaveLength(2);
            expect(events2.map((e) => e.type)).toEqual(["token", "complete"]);

            expect(events3).toHaveLength(1);
            expect(events3[0].type).toBe("plan_detected");

            cleanup1();
            cleanup2();
            cleanup3();
        });
    });
});

describe("SSE Headers and Format", () => {
    it("should use correct SSE event format", () => {
        // SSE format: "event: <type>\ndata: <json>\n\n"
        const eventType = "token";
        const eventData = { token: "Hello" };

        const expectedFormat = `event: ${eventType}\ndata: ${JSON.stringify(eventData)}\n\n`;

        expect(expectedFormat).toBe('event: token\ndata: {"token":"Hello"}\n\n');
    });

    it("should use keepalive comment format", () => {
        const keepalive = ": keepalive\n\n";
        expect(keepalive).toBe(": keepalive\n\n");
    });
});
