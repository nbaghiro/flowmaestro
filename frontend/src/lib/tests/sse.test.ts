/**
 * SSE (Server-Sent Events) Streaming Client Tests
 *
 * Tests for SSE streaming functions including chat, agent, workflow,
 * knowledge base, and generation chat streams.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the API functions
vi.mock("../api", () => ({
    getAuthToken: vi.fn(() => "test-token")
}));

// Mock workspace store
vi.mock("../../stores/workspaceStore", () => ({
    getCurrentWorkspaceId: vi.fn(() => "workspace-123")
}));

// Mock logger
vi.mock("../logger", () => ({
    logger: {
        debug: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    }
}));

// Mock EventSource
class MockEventSource {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 2;

    url: string;
    readyState: number = MockEventSource.OPEN;
    withCredentials: boolean;
    private listeners: Map<string, ((event: MessageEvent) => void)[]> = new Map();
    onerror: ((event: Event) => void) | null = null;

    constructor(url: string, options?: { withCredentials?: boolean }) {
        this.url = url;
        this.withCredentials = options?.withCredentials || false;
        MockEventSource.instances.push(this);
    }

    addEventListener(type: string, listener: (event: MessageEvent) => void) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type)!.push(listener);
    }

    removeEventListener(type: string, listener: (event: MessageEvent) => void) {
        const listeners = this.listeners.get(type);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    dispatchEvent(type: string, data?: string) {
        const listeners = this.listeners.get(type);
        if (listeners) {
            const event = { data } as MessageEvent;
            listeners.forEach((l) => l(event));
        }
    }

    triggerError() {
        if (this.onerror) {
            this.onerror(new Event("error"));
        }
    }

    close() {
        this.readyState = MockEventSource.CLOSED;
    }

    // Static tracking for tests
    static instances: MockEventSource[] = [];
    static reset() {
        MockEventSource.instances = [];
    }
}

// @ts-expect-error - Mocking EventSource
globalThis.EventSource = MockEventSource;

import { getCurrentWorkspaceId } from "../../stores/workspaceStore";
import { getAuthToken } from "../api";
import {
    streamChatResponse,
    streamAgentExecution,
    streamWorkflowExecution,
    streamKnowledgeBase,
    streamGenerationChatResponse
} from "../sse";

describe("SSE streaming", () => {
    beforeEach(() => {
        MockEventSource.reset();
        vi.clearAllMocks();
    });

    afterEach(() => {
        MockEventSource.reset();
    });

    // ===== streamChatResponse =====
    describe("streamChatResponse", () => {
        it("creates EventSource with correct URL", () => {
            const callbacks = {
                onToken: vi.fn(),
                onComplete: vi.fn(),
                onError: vi.fn()
            };

            streamChatResponse("exec-123", callbacks);

            expect(MockEventSource.instances).toHaveLength(1);
            expect(MockEventSource.instances[0].url).toContain("/workflows/chat-stream/exec-123");
            expect(MockEventSource.instances[0].url).toContain("token=test-token");
        });

        it("returns cleanup function that closes connection", () => {
            const callbacks = {
                onToken: vi.fn(),
                onComplete: vi.fn(),
                onError: vi.fn()
            };

            const cleanup = streamChatResponse("exec-123", callbacks);
            cleanup();

            expect(MockEventSource.instances[0].readyState).toBe(MockEventSource.CLOSED);
        });

        it("calls onToken callback for token events", () => {
            const callbacks = {
                onToken: vi.fn(),
                onComplete: vi.fn(),
                onError: vi.fn()
            };

            streamChatResponse("exec-123", callbacks);
            MockEventSource.instances[0].dispatchEvent("token", JSON.stringify({ token: "Hello" }));

            expect(callbacks.onToken).toHaveBeenCalledWith("Hello");
        });

        it("calls onComplete callback and closes connection", () => {
            const callbacks = {
                onToken: vi.fn(),
                onComplete: vi.fn(),
                onError: vi.fn()
            };

            streamChatResponse("exec-123", callbacks);
            const completeData = { message: "Response complete" };
            MockEventSource.instances[0].dispatchEvent("complete", JSON.stringify(completeData));

            expect(callbacks.onComplete).toHaveBeenCalledWith(completeData);
            expect(MockEventSource.instances[0].readyState).toBe(MockEventSource.CLOSED);
        });

        it("calls onThinkingStart callback", () => {
            const callbacks = {
                onToken: vi.fn(),
                onComplete: vi.fn(),
                onError: vi.fn(),
                onThinkingStart: vi.fn()
            };

            streamChatResponse("exec-123", callbacks);
            MockEventSource.instances[0].dispatchEvent("thinking_start");

            expect(callbacks.onThinkingStart).toHaveBeenCalled();
        });

        it("calls onThinkingToken callback", () => {
            const callbacks = {
                onToken: vi.fn(),
                onComplete: vi.fn(),
                onError: vi.fn(),
                onThinkingToken: vi.fn()
            };

            streamChatResponse("exec-123", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "thinking_token",
                JSON.stringify({ token: "thinking..." })
            );

            expect(callbacks.onThinkingToken).toHaveBeenCalledWith("thinking...");
        });

        it("calls onThinkingComplete callback", () => {
            const callbacks = {
                onToken: vi.fn(),
                onComplete: vi.fn(),
                onError: vi.fn(),
                onThinkingComplete: vi.fn()
            };

            streamChatResponse("exec-123", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "thinking_complete",
                JSON.stringify({ content: "full thinking content" })
            );

            expect(callbacks.onThinkingComplete).toHaveBeenCalledWith("full thinking content");
        });

        it("handles connection error", () => {
            const callbacks = {
                onToken: vi.fn(),
                onComplete: vi.fn(),
                onError: vi.fn()
            };

            streamChatResponse("exec-123", callbacks);
            MockEventSource.instances[0].triggerError();

            expect(callbacks.onError).toHaveBeenCalledWith("Connection lost");
        });
    });

    // ===== streamAgentExecution =====
    describe("streamAgentExecution", () => {
        it("creates EventSource with correct URL and credentials", () => {
            const callbacks = {
                onToken: vi.fn()
            };

            streamAgentExecution("agent-123", "exec-456", callbacks);

            expect(MockEventSource.instances).toHaveLength(1);
            expect(MockEventSource.instances[0].url).toContain(
                "/agents/agent-123/executions/exec-456/stream"
            );
            expect(MockEventSource.instances[0].url).toContain("token=test-token");
            expect(MockEventSource.instances[0].url).toContain("workspaceId=workspace-123");
            expect(MockEventSource.instances[0].withCredentials).toBe(true);
        });

        it("calls onError when no auth token", () => {
            vi.mocked(getAuthToken).mockReturnValueOnce(null);
            const callbacks = {
                onError: vi.fn()
            };

            const cleanup = streamAgentExecution("agent-123", "exec-456", callbacks);

            expect(callbacks.onError).toHaveBeenCalledWith("Authentication required");
            expect(MockEventSource.instances).toHaveLength(0);
            expect(typeof cleanup).toBe("function");
        });

        it("calls onError when no workspace", () => {
            vi.mocked(getCurrentWorkspaceId).mockReturnValueOnce(null);
            const callbacks = {
                onError: vi.fn()
            };

            streamAgentExecution("agent-123", "exec-456", callbacks);

            expect(callbacks.onError).toHaveBeenCalledWith("Workspace context required");
        });

        it("calls onConnected callback", () => {
            const callbacks = {
                onConnected: vi.fn()
            };

            streamAgentExecution("agent-123", "exec-456", callbacks);
            MockEventSource.instances[0].dispatchEvent("connected");

            expect(callbacks.onConnected).toHaveBeenCalled();
        });

        it("calls onToken callback with matching execution ID", () => {
            const callbacks = {
                onToken: vi.fn()
            };

            streamAgentExecution("agent-123", "exec-456", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "token",
                JSON.stringify({ token: "response", executionId: "exec-456" })
            );

            expect(callbacks.onToken).toHaveBeenCalledWith("response");
        });

        it("ignores token events with different execution ID", () => {
            const callbacks = {
                onToken: vi.fn()
            };

            streamAgentExecution("agent-123", "exec-456", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "token",
                JSON.stringify({ token: "response", executionId: "other-exec" })
            );

            expect(callbacks.onToken).not.toHaveBeenCalled();
        });

        it("calls onToolCallStarted callback", () => {
            const callbacks = {
                onToolCallStarted: vi.fn()
            };

            streamAgentExecution("agent-123", "exec-456", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "tool_call_started",
                JSON.stringify({
                    toolName: "search",
                    arguments: { query: "test" },
                    executionId: "exec-456"
                })
            );

            expect(callbacks.onToolCallStarted).toHaveBeenCalledWith({
                toolName: "search",
                arguments: { query: "test" }
            });
        });

        it("calls onToolCallCompleted callback", () => {
            const callbacks = {
                onToolCallCompleted: vi.fn()
            };

            streamAgentExecution("agent-123", "exec-456", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "tool_call_completed",
                JSON.stringify({
                    toolName: "search",
                    result: { data: "results" },
                    executionId: "exec-456"
                })
            );

            expect(callbacks.onToolCallCompleted).toHaveBeenCalledWith({
                toolName: "search",
                result: { data: "results" }
            });
        });

        it("calls onCompleted callback and closes connection", () => {
            const callbacks = {
                onCompleted: vi.fn()
            };

            streamAgentExecution("agent-123", "exec-456", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "completed",
                JSON.stringify({
                    finalMessage: "Done",
                    iterations: 3,
                    executionId: "exec-456"
                })
            );

            expect(callbacks.onCompleted).toHaveBeenCalledWith({
                finalMessage: "Done",
                iterations: 3
            });
            expect(MockEventSource.instances[0].readyState).toBe(MockEventSource.CLOSED);
        });
    });

    // ===== streamWorkflowExecution =====
    describe("streamWorkflowExecution", () => {
        it("creates EventSource with correct URL", () => {
            const callbacks = {};

            streamWorkflowExecution("exec-789", callbacks);

            expect(MockEventSource.instances).toHaveLength(1);
            expect(MockEventSource.instances[0].url).toContain("/executions/exec-789/stream");
        });

        it("calls onExecutionStarted callback", () => {
            const callbacks = {
                onExecutionStarted: vi.fn()
            };

            streamWorkflowExecution("exec-789", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "execution:started",
                JSON.stringify({
                    executionId: "exec-789",
                    workflowName: "My Workflow",
                    totalNodes: 5
                })
            );

            expect(callbacks.onExecutionStarted).toHaveBeenCalledWith({
                workflowName: "My Workflow",
                totalNodes: 5
            });
        });

        it("calls onExecutionProgress callback", () => {
            const callbacks = {
                onExecutionProgress: vi.fn()
            };

            streamWorkflowExecution("exec-789", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "execution:progress",
                JSON.stringify({
                    executionId: "exec-789",
                    completed: 2,
                    total: 5,
                    percentage: 40
                })
            );

            expect(callbacks.onExecutionProgress).toHaveBeenCalledWith({
                completed: 2,
                total: 5,
                percentage: 40
            });
        });

        it("calls onExecutionCompleted callback and closes connection", () => {
            const callbacks = {
                onExecutionCompleted: vi.fn()
            };

            streamWorkflowExecution("exec-789", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "execution:completed",
                JSON.stringify({
                    executionId: "exec-789",
                    duration: 5000,
                    outputs: { result: "success" }
                })
            );

            expect(callbacks.onExecutionCompleted).toHaveBeenCalledWith({
                duration: 5000,
                outputs: { result: "success" }
            });
            expect(MockEventSource.instances[0].readyState).toBe(MockEventSource.CLOSED);
        });

        it("calls onNodeStarted callback", () => {
            const callbacks = {
                onNodeStarted: vi.fn()
            };

            streamWorkflowExecution("exec-789", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "node:started",
                JSON.stringify({
                    executionId: "exec-789",
                    nodeId: "node-1",
                    nodeName: "LLM Node",
                    nodeType: "llm",
                    timestamp: "2024-01-15T10:00:00Z"
                })
            );

            expect(callbacks.onNodeStarted).toHaveBeenCalledWith({
                nodeId: "node-1",
                nodeName: "LLM Node",
                nodeType: "llm",
                timestamp: "2024-01-15T10:00:00Z"
            });
        });

        it("calls onNodeCompleted callback", () => {
            const callbacks = {
                onNodeCompleted: vi.fn()
            };

            streamWorkflowExecution("exec-789", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "node:completed",
                JSON.stringify({
                    executionId: "exec-789",
                    nodeId: "node-1",
                    nodeName: "LLM Node",
                    nodeType: "llm",
                    output: { text: "Generated response" },
                    duration: 1500,
                    timestamp: "2024-01-15T10:00:01Z"
                })
            );

            expect(callbacks.onNodeCompleted).toHaveBeenCalledWith({
                nodeId: "node-1",
                nodeName: "LLM Node",
                nodeType: "llm",
                output: { text: "Generated response" },
                duration: 1500,
                timestamp: "2024-01-15T10:00:01Z"
            });
        });

        it("calls onNodeFailed callback", () => {
            const callbacks = {
                onNodeFailed: vi.fn()
            };

            streamWorkflowExecution("exec-789", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "node:failed",
                JSON.stringify({
                    executionId: "exec-789",
                    nodeId: "node-1",
                    nodeName: "LLM Node",
                    nodeType: "llm",
                    error: "Rate limit exceeded",
                    timestamp: "2024-01-15T10:00:02Z"
                })
            );

            expect(callbacks.onNodeFailed).toHaveBeenCalledWith({
                nodeId: "node-1",
                nodeName: "LLM Node",
                nodeType: "llm",
                error: "Rate limit exceeded",
                timestamp: "2024-01-15T10:00:02Z"
            });
        });

        it("calls onExecutionPaused callback", () => {
            const callbacks = {
                onExecutionPaused: vi.fn()
            };

            streamWorkflowExecution("exec-789", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "execution:paused",
                JSON.stringify({
                    executionId: "exec-789",
                    reason: "user_input_required",
                    nodeId: "node-2",
                    nodeName: "User Input",
                    pauseContext: { prompt: "Enter value" }
                })
            );

            expect(callbacks.onExecutionPaused).toHaveBeenCalledWith({
                reason: "user_input_required",
                nodeId: "node-2",
                nodeName: "User Input",
                pauseContext: { prompt: "Enter value" }
            });
        });
    });

    // ===== streamKnowledgeBase =====
    describe("streamKnowledgeBase", () => {
        it("creates EventSource with correct URL", () => {
            const callbacks = {};

            streamKnowledgeBase("kb-123", callbacks);

            expect(MockEventSource.instances).toHaveLength(1);
            expect(MockEventSource.instances[0].url).toContain("/knowledge-bases/kb-123/stream");
        });

        it("calls onDocumentProcessing callback", () => {
            const callbacks = {
                onDocumentProcessing: vi.fn()
            };

            streamKnowledgeBase("kb-123", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "document:processing",
                JSON.stringify({
                    documentId: "doc-1",
                    documentName: "Manual.pdf",
                    timestamp: "2024-01-15T10:00:00Z"
                })
            );

            expect(callbacks.onDocumentProcessing).toHaveBeenCalledWith({
                documentId: "doc-1",
                documentName: "Manual.pdf",
                timestamp: "2024-01-15T10:00:00Z"
            });
        });

        it("calls onDocumentCompleted callback", () => {
            const callbacks = {
                onDocumentCompleted: vi.fn()
            };

            streamKnowledgeBase("kb-123", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "document:completed",
                JSON.stringify({
                    documentId: "doc-1",
                    chunkCount: 25,
                    timestamp: "2024-01-15T10:00:30Z"
                })
            );

            expect(callbacks.onDocumentCompleted).toHaveBeenCalledWith({
                documentId: "doc-1",
                chunkCount: 25,
                timestamp: "2024-01-15T10:00:30Z"
            });
        });

        it("calls onDocumentFailed callback", () => {
            const callbacks = {
                onDocumentFailed: vi.fn()
            };

            streamKnowledgeBase("kb-123", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "document:failed",
                JSON.stringify({
                    documentId: "doc-1",
                    error: "Failed to parse PDF",
                    timestamp: "2024-01-15T10:00:05Z"
                })
            );

            expect(callbacks.onDocumentFailed).toHaveBeenCalledWith({
                documentId: "doc-1",
                error: "Failed to parse PDF",
                timestamp: "2024-01-15T10:00:05Z"
            });
        });
    });

    // ===== streamGenerationChatResponse =====
    describe("streamGenerationChatResponse", () => {
        it("creates EventSource with correct URL", () => {
            const callbacks = {};

            streamGenerationChatResponse("gen-exec-123", callbacks);

            expect(MockEventSource.instances).toHaveLength(1);
            expect(MockEventSource.instances[0].url).toContain(
                "/workflows/generation/chat-stream/gen-exec-123"
            );
        });

        it("calls onPlanDetected callback", () => {
            const callbacks = {
                onPlanDetected: vi.fn()
            };

            const mockPlan = {
                name: "Data Processing Workflow",
                description: "A workflow to process data",
                nodes: []
            };

            streamGenerationChatResponse("gen-exec-123", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "plan_detected",
                JSON.stringify({ plan: mockPlan })
            );

            expect(callbacks.onPlanDetected).toHaveBeenCalledWith(mockPlan);
        });

        it("calls onToken callback", () => {
            const callbacks = {
                onToken: vi.fn()
            };

            streamGenerationChatResponse("gen-exec-123", callbacks);
            MockEventSource.instances[0].dispatchEvent(
                "token",
                JSON.stringify({ token: "Generated" })
            );

            expect(callbacks.onToken).toHaveBeenCalledWith("Generated");
        });

        it("calls onComplete callback and closes connection", () => {
            const callbacks = {
                onComplete: vi.fn()
            };

            const response = { message: "Generation complete", workflowId: "wf-123" };

            streamGenerationChatResponse("gen-exec-123", callbacks);
            MockEventSource.instances[0].dispatchEvent("complete", JSON.stringify(response));

            expect(callbacks.onComplete).toHaveBeenCalledWith(response);
            expect(MockEventSource.instances[0].readyState).toBe(MockEventSource.CLOSED);
        });

        it("handles thinking events", () => {
            const callbacks = {
                onThinkingStart: vi.fn(),
                onThinkingToken: vi.fn(),
                onThinkingComplete: vi.fn()
            };

            streamGenerationChatResponse("gen-exec-123", callbacks);

            MockEventSource.instances[0].dispatchEvent("thinking_start");
            expect(callbacks.onThinkingStart).toHaveBeenCalled();

            MockEventSource.instances[0].dispatchEvent(
                "thinking_token",
                JSON.stringify({ token: "analyzing..." })
            );
            expect(callbacks.onThinkingToken).toHaveBeenCalledWith("analyzing...");

            MockEventSource.instances[0].dispatchEvent(
                "thinking_complete",
                JSON.stringify({ content: "full analysis" })
            );
            expect(callbacks.onThinkingComplete).toHaveBeenCalledWith("full analysis");
        });
    });

    // ===== Error Handling =====
    describe("error handling", () => {
        it("handles connection error in streamChatResponse", () => {
            const callbacks = {
                onToken: vi.fn(),
                onComplete: vi.fn(),
                onError: vi.fn()
            };

            streamChatResponse("exec-123", callbacks);
            MockEventSource.instances[0].triggerError();

            expect(callbacks.onError).toHaveBeenCalledWith("Connection lost");
            expect(MockEventSource.instances[0].readyState).toBe(MockEventSource.CLOSED);
        });

        it("handles stream connection failure in streamAgentExecution", () => {
            const callbacks = {
                onError: vi.fn()
            };

            streamAgentExecution("agent-123", "exec-456", callbacks);
            MockEventSource.instances[0].triggerError();

            expect(callbacks.onError).toHaveBeenCalledWith("Stream connection failed");
        });

        it("ignores onerror after intentional close", () => {
            const callbacks = {
                onCompleted: vi.fn(),
                onError: vi.fn()
            };

            const _cleanup = streamAgentExecution("agent-123", "exec-456", callbacks);

            // Complete the stream
            MockEventSource.instances[0].dispatchEvent(
                "completed",
                JSON.stringify({
                    finalMessage: "Done",
                    iterations: 1,
                    executionId: "exec-456"
                })
            );

            // Trigger error after completion
            MockEventSource.instances[0].triggerError();

            // onError should not be called again after intentional close
            expect(callbacks.onError).not.toHaveBeenCalled();
        });
    });

    // ===== JSON Parsing Error Resilience =====
    describe("JSON parsing error resilience", () => {
        it("silently ignores malformed JSON in agent token events", () => {
            const callbacks = { onToken: vi.fn(), onError: vi.fn() };
            streamAgentExecution("agent-123", "exec-456", callbacks);

            MockEventSource.instances[0].dispatchEvent("token", "not valid json {{{");

            expect(callbacks.onToken).not.toHaveBeenCalled();
            expect(callbacks.onError).not.toHaveBeenCalled();
        });

        it("silently ignores malformed JSON in message events", () => {
            const callbacks = { onMessage: vi.fn(), onError: vi.fn() };
            streamAgentExecution("agent-123", "exec-456", callbacks);

            MockEventSource.instances[0].dispatchEvent("message", "invalid json");

            expect(callbacks.onMessage).not.toHaveBeenCalled();
            expect(callbacks.onError).not.toHaveBeenCalled();
        });

        it("silently ignores malformed JSON in tool_call_started events", () => {
            const callbacks = { onToolCallStarted: vi.fn(), onError: vi.fn() };
            streamAgentExecution("agent-123", "exec-456", callbacks);

            MockEventSource.instances[0].dispatchEvent("tool_call_started", "{broken");

            expect(callbacks.onToolCallStarted).not.toHaveBeenCalled();
            expect(callbacks.onError).not.toHaveBeenCalled();
        });

        it("silently ignores malformed JSON in workflow execution events", () => {
            const callbacks = { onExecutionStarted: vi.fn(), onError: vi.fn() };
            streamWorkflowExecution("exec-789", callbacks);

            MockEventSource.instances[0].dispatchEvent("execution:started", "not json");

            expect(callbacks.onExecutionStarted).not.toHaveBeenCalled();
            expect(callbacks.onError).not.toHaveBeenCalled();
        });

        it("silently ignores malformed JSON in node events", () => {
            const callbacks = { onNodeStarted: vi.fn(), onNodeCompleted: vi.fn() };
            streamWorkflowExecution("exec-789", callbacks);

            MockEventSource.instances[0].dispatchEvent("node:started", "{{invalid");
            MockEventSource.instances[0].dispatchEvent("node:completed", "also invalid}}");

            expect(callbacks.onNodeStarted).not.toHaveBeenCalled();
            expect(callbacks.onNodeCompleted).not.toHaveBeenCalled();
        });
    });

    // ===== Server Error Event Parsing =====
    describe("server error event parsing", () => {
        it("parses error message from server error event in chat stream", () => {
            const callbacks = {
                onToken: vi.fn(),
                onComplete: vi.fn(),
                onError: vi.fn()
            };
            streamChatResponse("exec-123", callbacks);

            MockEventSource.instances[0].dispatchEvent(
                "error",
                JSON.stringify({ message: "Rate limit exceeded" })
            );

            expect(callbacks.onError).toHaveBeenCalledWith("Rate limit exceeded");
            expect(MockEventSource.instances[0].readyState).toBe(MockEventSource.CLOSED);
        });

        it("falls back to 'Connection error' when chat error event has invalid JSON", () => {
            const callbacks = {
                onToken: vi.fn(),
                onComplete: vi.fn(),
                onError: vi.fn()
            };
            streamChatResponse("exec-123", callbacks);

            MockEventSource.instances[0].dispatchEvent("error", "invalid json data");

            expect(callbacks.onError).toHaveBeenCalledWith("Connection error");
        });

        it("parses error from server error event in agent stream", () => {
            const callbacks = { onError: vi.fn() };
            streamAgentExecution("agent-123", "exec-456", callbacks);

            MockEventSource.instances[0].dispatchEvent(
                "error",
                JSON.stringify({ error: "Agent timeout", executionId: "exec-456" })
            );

            expect(callbacks.onError).toHaveBeenCalledWith("Agent timeout");
        });

        it("falls back to generic error when agent error event has invalid JSON", () => {
            const callbacks = { onError: vi.fn() };
            streamAgentExecution("agent-123", "exec-456", callbacks);

            MockEventSource.instances[0].dispatchEvent("error", "bad json");

            expect(callbacks.onError).toHaveBeenCalledWith("Stream connection error");
        });

        it("parses error from server error event in generation chat stream", () => {
            const callbacks = { onError: vi.fn() };
            streamGenerationChatResponse("gen-123", callbacks);

            MockEventSource.instances[0].dispatchEvent(
                "error",
                JSON.stringify({ message: "Model unavailable" })
            );

            expect(callbacks.onError).toHaveBeenCalledWith("Model unavailable");
        });

        it("falls back to 'Connection error' for generation chat invalid error", () => {
            const callbacks = { onError: vi.fn() };
            streamGenerationChatResponse("gen-123", callbacks);

            MockEventSource.instances[0].dispatchEvent("error", "not json");

            expect(callbacks.onError).toHaveBeenCalledWith("Connection error");
        });
    });

    // ===== Missing Agent Stream Callbacks =====
    describe("agent stream additional callbacks", () => {
        it("calls onToolCallFailed callback", () => {
            const callbacks = { onToolCallFailed: vi.fn() };
            streamAgentExecution("agent-123", "exec-456", callbacks);

            MockEventSource.instances[0].dispatchEvent(
                "tool_call_failed",
                JSON.stringify({
                    toolName: "web_search",
                    error: "API timeout",
                    executionId: "exec-456"
                })
            );

            expect(callbacks.onToolCallFailed).toHaveBeenCalledWith({
                toolName: "web_search",
                error: "API timeout"
            });
        });

        it("ignores onToolCallFailed with different executionId", () => {
            const callbacks = { onToolCallFailed: vi.fn() };
            streamAgentExecution("agent-123", "exec-456", callbacks);

            MockEventSource.instances[0].dispatchEvent(
                "tool_call_failed",
                JSON.stringify({
                    toolName: "web_search",
                    error: "API timeout",
                    executionId: "other-exec"
                })
            );

            expect(callbacks.onToolCallFailed).not.toHaveBeenCalled();
        });

        it("calls onMessage callback with thread message", () => {
            const callbacks = { onMessage: vi.fn() };
            streamAgentExecution("agent-123", "exec-456", callbacks);

            const message = { id: "msg-1", role: "assistant", content: "Hello" };
            MockEventSource.instances[0].dispatchEvent(
                "message",
                JSON.stringify({ message, executionId: "exec-456" })
            );

            expect(callbacks.onMessage).toHaveBeenCalledWith(message);
        });

        it("ignores message events with different executionId", () => {
            const callbacks = { onMessage: vi.fn() };
            streamAgentExecution("agent-123", "exec-456", callbacks);

            MockEventSource.instances[0].dispatchEvent(
                "message",
                JSON.stringify({
                    message: { id: "msg-1", content: "Hello" },
                    executionId: "other-exec"
                })
            );

            expect(callbacks.onMessage).not.toHaveBeenCalled();
        });

        it("calls onTokenUsageUpdated with lastUpdatedAt", () => {
            const callbacks = { onTokenUsageUpdated: vi.fn() };
            streamAgentExecution("agent-123", "exec-456", callbacks);

            MockEventSource.instances[0].dispatchEvent(
                "thread:tokens:updated",
                JSON.stringify({
                    threadId: "thread-1",
                    executionId: "exec-456",
                    tokenUsage: {
                        inputTokens: 100,
                        outputTokens: 50,
                        lastUpdatedAt: "2024-01-15T10:00:00Z"
                    }
                })
            );

            expect(callbacks.onTokenUsageUpdated).toHaveBeenCalledWith({
                threadId: "thread-1",
                executionId: "exec-456",
                tokenUsage: expect.objectContaining({
                    inputTokens: 100,
                    outputTokens: 50,
                    lastUpdatedAt: "2024-01-15T10:00:00Z"
                })
            });
        });

        it("handles token usage with lastUpdated fallback field", () => {
            const callbacks = { onTokenUsageUpdated: vi.fn() };
            streamAgentExecution("agent-123", "exec-456", callbacks);

            MockEventSource.instances[0].dispatchEvent(
                "thread:tokens:updated",
                JSON.stringify({
                    threadId: "thread-1",
                    executionId: "exec-456",
                    tokenUsage: {
                        inputTokens: 100,
                        outputTokens: 50,
                        lastUpdated: "2024-01-15T10:00:00Z" // Old field name
                    }
                })
            );

            expect(callbacks.onTokenUsageUpdated).toHaveBeenCalledWith(
                expect.objectContaining({
                    tokenUsage: expect.objectContaining({
                        lastUpdatedAt: "2024-01-15T10:00:00Z"
                    })
                })
            );
        });

        it("uses current timestamp when no lastUpdated fields present", () => {
            const callbacks = { onTokenUsageUpdated: vi.fn() };
            streamAgentExecution("agent-123", "exec-456", callbacks);

            MockEventSource.instances[0].dispatchEvent(
                "thread:tokens:updated",
                JSON.stringify({
                    threadId: "thread-1",
                    executionId: "exec-456",
                    tokenUsage: {
                        inputTokens: 100,
                        outputTokens: 50
                        // No lastUpdatedAt or lastUpdated
                    }
                })
            );

            expect(callbacks.onTokenUsageUpdated).toHaveBeenCalledWith(
                expect.objectContaining({
                    tokenUsage: expect.objectContaining({
                        lastUpdatedAt: expect.any(String)
                    })
                })
            );
        });

        it("ignores token usage updates with different executionId", () => {
            const callbacks = { onTokenUsageUpdated: vi.fn() };
            streamAgentExecution("agent-123", "exec-456", callbacks);

            MockEventSource.instances[0].dispatchEvent(
                "thread:tokens:updated",
                JSON.stringify({
                    threadId: "thread-1",
                    executionId: "other-exec",
                    tokenUsage: { inputTokens: 100 }
                })
            );

            expect(callbacks.onTokenUsageUpdated).not.toHaveBeenCalled();
        });
    });

    // ===== Workflow Execution Additional Tests =====
    describe("workflow execution additional callbacks", () => {
        it("calls onError when no auth token", () => {
            vi.mocked(getAuthToken).mockReturnValueOnce(null);
            const callbacks = { onError: vi.fn() };

            const cleanup = streamWorkflowExecution("exec-789", callbacks);

            expect(callbacks.onError).toHaveBeenCalledWith("Authentication required");
            expect(MockEventSource.instances).toHaveLength(0);
            expect(typeof cleanup).toBe("function");
        });

        it("calls onError when no workspace", () => {
            vi.mocked(getCurrentWorkspaceId).mockReturnValueOnce(null);
            const callbacks = { onError: vi.fn() };

            streamWorkflowExecution("exec-789", callbacks);

            expect(callbacks.onError).toHaveBeenCalledWith("Workspace context required");
        });

        it("calls onConnected callback", () => {
            const callbacks = { onConnected: vi.fn() };
            streamWorkflowExecution("exec-789", callbacks);

            MockEventSource.instances[0].dispatchEvent("connected");

            expect(callbacks.onConnected).toHaveBeenCalled();
        });

        it("calls onExecutionFailed and closes connection", () => {
            const callbacks = { onExecutionFailed: vi.fn() };
            streamWorkflowExecution("exec-789", callbacks);

            MockEventSource.instances[0].dispatchEvent(
                "execution:failed",
                JSON.stringify({
                    executionId: "exec-789",
                    error: "Node timeout after 30s"
                })
            );

            expect(callbacks.onExecutionFailed).toHaveBeenCalledWith({
                error: "Node timeout after 30s"
            });
            expect(MockEventSource.instances[0].readyState).toBe(MockEventSource.CLOSED);
        });

        it("ignores execution:failed with different executionId", () => {
            const callbacks = { onExecutionFailed: vi.fn() };
            streamWorkflowExecution("exec-789", callbacks);

            MockEventSource.instances[0].dispatchEvent(
                "execution:failed",
                JSON.stringify({
                    executionId: "other-exec",
                    error: "Some error"
                })
            );

            expect(callbacks.onExecutionFailed).not.toHaveBeenCalled();
            expect(MockEventSource.instances[0].readyState).toBe(MockEventSource.OPEN);
        });

        it("calls onNodeRetry callback", () => {
            const callbacks = { onNodeRetry: vi.fn() };
            streamWorkflowExecution("exec-789", callbacks);

            MockEventSource.instances[0].dispatchEvent(
                "node:retry",
                JSON.stringify({
                    executionId: "exec-789",
                    nodeId: "node-1",
                    nodeName: "HTTP Request",
                    attempt: 2,
                    error: "Connection refused"
                })
            );

            expect(callbacks.onNodeRetry).toHaveBeenCalledWith({
                nodeId: "node-1",
                nodeName: "HTTP Request",
                attempt: 2,
                error: "Connection refused"
            });
        });

        it("ignores node:retry with different executionId", () => {
            const callbacks = { onNodeRetry: vi.fn() };
            streamWorkflowExecution("exec-789", callbacks);

            MockEventSource.instances[0].dispatchEvent(
                "node:retry",
                JSON.stringify({
                    executionId: "other-exec",
                    nodeId: "node-1",
                    nodeName: "HTTP Request",
                    attempt: 2,
                    error: "Connection refused"
                })
            );

            expect(callbacks.onNodeRetry).not.toHaveBeenCalled();
        });

        it("cleanup function closes workflow stream", () => {
            const callbacks = {};
            const cleanup = streamWorkflowExecution("exec-789", callbacks);

            cleanup();

            expect(MockEventSource.instances[0].readyState).toBe(MockEventSource.CLOSED);
        });

        it("ignores events with different executionId for all event types", () => {
            const callbacks = {
                onExecutionStarted: vi.fn(),
                onExecutionProgress: vi.fn(),
                onNodeStarted: vi.fn(),
                onNodeCompleted: vi.fn(),
                onNodeFailed: vi.fn(),
                onExecutionPaused: vi.fn()
            };
            streamWorkflowExecution("exec-789", callbacks);

            // Dispatch events with wrong executionId
            MockEventSource.instances[0].dispatchEvent(
                "execution:started",
                JSON.stringify({ executionId: "wrong", workflowName: "Test", totalNodes: 5 })
            );
            MockEventSource.instances[0].dispatchEvent(
                "execution:progress",
                JSON.stringify({ executionId: "wrong", completed: 1, total: 5, percentage: 20 })
            );
            MockEventSource.instances[0].dispatchEvent(
                "node:started",
                JSON.stringify({
                    executionId: "wrong",
                    nodeId: "n1",
                    nodeName: "Node",
                    nodeType: "llm",
                    timestamp: "2024-01-15T10:00:00Z"
                })
            );

            expect(callbacks.onExecutionStarted).not.toHaveBeenCalled();
            expect(callbacks.onExecutionProgress).not.toHaveBeenCalled();
            expect(callbacks.onNodeStarted).not.toHaveBeenCalled();
        });
    });

    // ===== Knowledge Base Stream Additional Tests =====
    describe("knowledge base stream additional tests", () => {
        it("calls onError when no auth token", () => {
            vi.mocked(getAuthToken).mockReturnValueOnce(null);
            const callbacks = { onError: vi.fn() };

            const cleanup = streamKnowledgeBase("kb-123", callbacks);

            expect(callbacks.onError).toHaveBeenCalledWith("Authentication required");
            expect(MockEventSource.instances).toHaveLength(0);
            expect(typeof cleanup).toBe("function");
        });

        it("calls onError when no workspace", () => {
            vi.mocked(getCurrentWorkspaceId).mockReturnValueOnce(null);
            const callbacks = { onError: vi.fn() };

            streamKnowledgeBase("kb-123", callbacks);

            expect(callbacks.onError).toHaveBeenCalledWith("Workspace context required");
        });

        it("calls onConnected callback", () => {
            const callbacks = { onConnected: vi.fn() };
            streamKnowledgeBase("kb-123", callbacks);

            MockEventSource.instances[0].dispatchEvent("connected");

            expect(callbacks.onConnected).toHaveBeenCalled();
        });

        it("handles connection error", () => {
            const callbacks = { onError: vi.fn() };
            streamKnowledgeBase("kb-123", callbacks);

            MockEventSource.instances[0].triggerError();

            expect(callbacks.onError).toHaveBeenCalledWith("Stream connection failed");
        });

        it("cleanup function closes KB stream", () => {
            const callbacks = {};
            const cleanup = streamKnowledgeBase("kb-123", callbacks);

            cleanup();

            expect(MockEventSource.instances[0].readyState).toBe(MockEventSource.CLOSED);
        });

        it("ignores onerror after cleanup", () => {
            const callbacks = { onError: vi.fn() };
            const cleanup = streamKnowledgeBase("kb-123", callbacks);

            cleanup();
            MockEventSource.instances[0].triggerError();

            expect(callbacks.onError).not.toHaveBeenCalled();
        });

        it("creates EventSource with correct URL including auth and workspace", () => {
            const callbacks = {};
            streamKnowledgeBase("kb-123", callbacks);

            expect(MockEventSource.instances[0].url).toContain("/knowledge-bases/kb-123/stream");
            expect(MockEventSource.instances[0].url).toContain("token=test-token");
            expect(MockEventSource.instances[0].url).toContain("workspaceId=workspace-123");
            expect(MockEventSource.instances[0].withCredentials).toBe(true);
        });
    });

    // ===== Generation Chat Stream Additional Tests =====
    describe("generation chat stream additional tests", () => {
        it("handles connection error", () => {
            const callbacks = { onError: vi.fn() };
            streamGenerationChatResponse("gen-123", callbacks);

            MockEventSource.instances[0].triggerError();

            expect(callbacks.onError).toHaveBeenCalledWith("Connection lost");
            expect(MockEventSource.instances[0].readyState).toBe(MockEventSource.CLOSED);
        });

        it("cleanup function closes generation stream", () => {
            const callbacks = {};
            const cleanup = streamGenerationChatResponse("gen-123", callbacks);

            cleanup();

            expect(MockEventSource.instances[0].readyState).toBe(MockEventSource.CLOSED);
        });

        it("works without auth token (token is optional)", () => {
            vi.mocked(getAuthToken).mockReturnValueOnce(null);
            const callbacks = { onToken: vi.fn() };

            streamGenerationChatResponse("gen-123", callbacks);

            // Should still create EventSource, just without token param
            expect(MockEventSource.instances).toHaveLength(1);
            expect(MockEventSource.instances[0].url).not.toContain("token=");
        });

        it("includes token in URL when available", () => {
            const callbacks = {};
            streamGenerationChatResponse("gen-123", callbacks);

            expect(MockEventSource.instances[0].url).toContain("token=test-token");
        });
    });

    // ===== Cleanup Function Behavior =====
    describe("cleanup function behavior", () => {
        it("agent stream cleanup prevents subsequent error callbacks", () => {
            const callbacks = { onError: vi.fn() };
            const cleanup = streamAgentExecution("agent-123", "exec-456", callbacks);

            cleanup();
            MockEventSource.instances[0].triggerError();

            expect(callbacks.onError).not.toHaveBeenCalled();
        });

        it("workflow stream cleanup prevents subsequent error callbacks", () => {
            const callbacks = { onError: vi.fn() };
            const cleanup = streamWorkflowExecution("exec-789", callbacks);

            cleanup();
            MockEventSource.instances[0].triggerError();

            expect(callbacks.onError).not.toHaveBeenCalled();
        });

        it("chat stream cleanup closes connection", () => {
            const callbacks = {
                onToken: vi.fn(),
                onComplete: vi.fn(),
                onError: vi.fn()
            };
            const cleanup = streamChatResponse("exec-123", callbacks);

            cleanup();

            expect(MockEventSource.instances[0].readyState).toBe(MockEventSource.CLOSED);
        });

        it("no-op cleanup returned when auth fails", () => {
            vi.mocked(getAuthToken).mockReturnValueOnce(null);
            const callbacks = { onError: vi.fn() };

            const cleanup = streamAgentExecution("agent-123", "exec-456", callbacks);

            // Should not throw when called
            expect(() => cleanup()).not.toThrow();
        });
    });
});
