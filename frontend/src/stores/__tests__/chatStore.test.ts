/**
 * Chat Store Tests
 *
 * Tests for workflow chat panel state management including
 * panel state, messages, streaming, and thinking features.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useChatStore } from "../chatStore";
import type { ActionType } from "../chatStore";

// Reset store before each test
function resetStore() {
    useChatStore.setState({
        isPanelOpen: false,
        panelWidth: 500,
        messages: [],
        isStreaming: false,
        isThinking: false,
        currentAction: null,
        selectedConnectionId: null,
        selectedModel: null,
        enableThinking: true,
        thinkingBudget: 4096,
        workflowContext: null,
        contextTimestamp: null,
        proposedChanges: null
    });
}

describe("chatStore", () => {
    beforeEach(() => {
        resetStore();
        vi.clearAllMocks();
    });

    afterEach(() => {
        resetStore();
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("has correct initial state", () => {
            resetStore();
            const state = useChatStore.getState();

            expect(state.isPanelOpen).toBe(false);
            expect(state.panelWidth).toBe(500);
            expect(state.messages).toEqual([]);
            expect(state.isStreaming).toBe(false);
            expect(state.isThinking).toBe(false);
            expect(state.currentAction).toBeNull();
            expect(state.selectedConnectionId).toBeNull();
            expect(state.enableThinking).toBe(true);
            expect(state.thinkingBudget).toBe(4096);
            expect(state.workflowContext).toBeNull();
            expect(state.proposedChanges).toBeNull();
        });
    });

    // ===== Panel State =====
    describe("panel state", () => {
        it("opens panel", () => {
            useChatStore.getState().openPanel();
            expect(useChatStore.getState().isPanelOpen).toBe(true);
        });

        it("closes panel", () => {
            useChatStore.setState({ isPanelOpen: true });
            useChatStore.getState().closePanel();
            expect(useChatStore.getState().isPanelOpen).toBe(false);
        });

        it("toggles panel", () => {
            expect(useChatStore.getState().isPanelOpen).toBe(false);

            useChatStore.getState().togglePanel();
            expect(useChatStore.getState().isPanelOpen).toBe(true);

            useChatStore.getState().togglePanel();
            expect(useChatStore.getState().isPanelOpen).toBe(false);
        });

        it("sets panel width within constraints", () => {
            useChatStore.getState().setPanelWidth(600);
            expect(useChatStore.getState().panelWidth).toBe(600);
        });

        it("constrains panel width to minimum", () => {
            useChatStore.getState().setPanelWidth(200); // Below MIN_WIDTH (400)
            expect(useChatStore.getState().panelWidth).toBe(400);
        });

        it("constrains panel width to maximum", () => {
            useChatStore.getState().setPanelWidth(1000); // Above MAX_WIDTH (800)
            expect(useChatStore.getState().panelWidth).toBe(800);
        });
    });

    // ===== Message Management =====
    describe("message management", () => {
        it("adds a message with generated id and timestamp", () => {
            useChatStore.getState().addMessage({
                role: "user",
                content: "Hello!"
            });

            const state = useChatStore.getState();
            expect(state.messages).toHaveLength(1);
            expect(state.messages[0].role).toBe("user");
            expect(state.messages[0].content).toBe("Hello!");
            expect(state.messages[0].id).toMatch(/^msg-/);
            expect(state.messages[0].timestamp).toBeInstanceOf(Date);
        });

        it("adds multiple messages", () => {
            useChatStore.getState().addMessage({ role: "user", content: "Hi" });
            useChatStore.getState().addMessage({ role: "assistant", content: "Hello!" });

            const state = useChatStore.getState();
            expect(state.messages).toHaveLength(2);
            expect(state.messages[0].role).toBe("user");
            expect(state.messages[1].role).toBe("assistant");
        });

        it("adds message with action type", () => {
            useChatStore.getState().addMessage({
                role: "assistant",
                content: "Adding node",
                action: "add"
            });

            const state = useChatStore.getState();
            expect(state.messages[0].action).toBe("add");
        });

        it("adds message with proposed changes", () => {
            const changes = [{ type: "add" as const, nodeType: "llm", nodeLabel: "New LLM" }];

            useChatStore.getState().addMessage({
                role: "assistant",
                content: "Here are the changes",
                proposedChanges: changes
            });

            const state = useChatStore.getState();
            expect(state.messages[0].proposedChanges).toEqual(changes);
        });

        it("updates last message content with string", () => {
            useChatStore.getState().addMessage({ role: "assistant", content: "Hello" });
            useChatStore.getState().updateLastMessage("Hello, world!");

            const state = useChatStore.getState();
            expect(state.messages[0].content).toBe("Hello, world!");
        });

        it("updates last message content with function", () => {
            useChatStore.getState().addMessage({ role: "assistant", content: "Hello" });
            useChatStore.getState().updateLastMessage((current) => current + " world!");

            const state = useChatStore.getState();
            expect(state.messages[0].content).toBe("Hello world!");
        });

        it("does nothing when updating empty messages array", () => {
            useChatStore.getState().updateLastMessage("New content");
            expect(useChatStore.getState().messages).toHaveLength(0);
        });

        it("clears chat", () => {
            useChatStore.setState({
                messages: [{ id: "msg-1", role: "user", content: "Hi", timestamp: new Date() }],
                isStreaming: true,
                isThinking: true,
                currentAction: "add",
                proposedChanges: [{ type: "add", nodeType: "llm" }]
            });

            useChatStore.getState().clearChat();

            const state = useChatStore.getState();
            expect(state.messages).toEqual([]);
            expect(state.isStreaming).toBe(false);
            expect(state.isThinking).toBe(false);
            expect(state.currentAction).toBeNull();
            expect(state.proposedChanges).toBeNull();
        });
    });

    // ===== Streaming State =====
    describe("streaming state", () => {
        it("sets streaming state", () => {
            useChatStore.getState().setStreaming(true);
            expect(useChatStore.getState().isStreaming).toBe(true);

            useChatStore.getState().setStreaming(false);
            expect(useChatStore.getState().isStreaming).toBe(false);
        });

        it("sets thinking state", () => {
            useChatStore.getState().setThinking(true);
            expect(useChatStore.getState().isThinking).toBe(true);

            useChatStore.getState().setThinking(false);
            expect(useChatStore.getState().isThinking).toBe(false);
        });

        it("sets current action", () => {
            useChatStore.getState().setCurrentAction("add");
            expect(useChatStore.getState().currentAction).toBe("add");

            useChatStore.getState().setCurrentAction("modify");
            expect(useChatStore.getState().currentAction).toBe("modify");

            useChatStore.getState().setCurrentAction(null);
            expect(useChatStore.getState().currentAction).toBeNull();
        });
    });

    // ===== Connection Settings =====
    describe("connection settings", () => {
        it("sets connection with model", () => {
            useChatStore.getState().setConnection("conn-123", "gpt-4");

            const state = useChatStore.getState();
            expect(state.selectedConnectionId).toBe("conn-123");
            expect(state.selectedModel).toBe("gpt-4");
        });

        it("sets connection without model", () => {
            useChatStore.getState().setConnection("conn-123");

            const state = useChatStore.getState();
            expect(state.selectedConnectionId).toBe("conn-123");
            expect(state.selectedModel).toBeNull();
        });
    });

    // ===== Thinking Settings =====
    describe("thinking settings", () => {
        it("enables thinking", () => {
            useChatStore.setState({ enableThinking: false });
            useChatStore.getState().setEnableThinking(true);
            expect(useChatStore.getState().enableThinking).toBe(true);
        });

        it("disables thinking", () => {
            useChatStore.getState().setEnableThinking(false);
            expect(useChatStore.getState().enableThinking).toBe(false);
        });

        it("sets thinking budget", () => {
            useChatStore.getState().setThinkingBudget(8192);
            expect(useChatStore.getState().thinkingBudget).toBe(8192);
        });
    });

    // ===== Thinking Content =====
    describe("thinking content", () => {
        it("appends to thinking content", () => {
            useChatStore.getState().addMessage({ role: "assistant", content: "" });
            useChatStore.getState().appendToThinking("Thinking...");
            useChatStore.getState().appendToThinking(" more thoughts");

            const state = useChatStore.getState();
            expect(state.messages[0].thinking).toBe("Thinking... more thoughts");
            expect(state.messages[0].isThinkingStreaming).toBe(true);
            expect(state.messages[0].thinkingExpanded).toBe(true);
            expect(state.isThinking).toBe(true);
        });

        it("completes thinking and collapses", () => {
            useChatStore.getState().addMessage({ role: "assistant", content: "" });
            useChatStore.getState().appendToThinking("Draft thinking");
            useChatStore.getState().completeThinking("Final thinking content");

            const state = useChatStore.getState();
            expect(state.messages[0].thinking).toBe("Final thinking content");
            expect(state.messages[0].isThinkingStreaming).toBe(false);
            expect(state.messages[0].thinkingExpanded).toBe(false);
            expect(state.isThinking).toBe(false);
        });

        it("uses existing thinking if completeThinking gets empty string", () => {
            useChatStore.getState().addMessage({ role: "assistant", content: "" });
            useChatStore.getState().appendToThinking("Original thinking");
            useChatStore.getState().completeThinking("");

            const state = useChatStore.getState();
            expect(state.messages[0].thinking).toBe("Original thinking");
        });

        it("toggles thinking expanded", () => {
            useChatStore.getState().addMessage({
                role: "assistant",
                content: "Response",
                thinking: "Some thoughts",
                thinkingExpanded: false
            });

            const messageId = useChatStore.getState().messages[0].id;

            useChatStore.getState().toggleThinkingExpanded(messageId);
            expect(useChatStore.getState().messages[0].thinkingExpanded).toBe(true);

            useChatStore.getState().toggleThinkingExpanded(messageId);
            expect(useChatStore.getState().messages[0].thinkingExpanded).toBe(false);
        });
    });

    // ===== Workflow Context =====
    describe("workflow context", () => {
        it("sets workflow context", () => {
            const context = {
                nodes: [{ id: "node-1", type: "llm", position: { x: 0, y: 0 }, data: {} }],
                edges: [],
                selectedNodeId: "node-1"
            };

            useChatStore.getState().setWorkflowContext(context);

            const state = useChatStore.getState();
            expect(state.workflowContext).toEqual(context);
            expect(state.contextTimestamp).toBeInstanceOf(Date);
        });
    });

    // ===== Proposed Changes =====
    describe("proposed changes", () => {
        it("sets proposed changes", () => {
            const changes = [
                { type: "add" as const, nodeType: "llm", nodeLabel: "New Node" },
                { type: "modify" as const, nodeId: "node-1", updates: { label: "Updated" } }
            ];

            useChatStore.getState().setProposedChanges(changes);

            expect(useChatStore.getState().proposedChanges).toEqual(changes);
        });

        it("clears proposed changes", () => {
            useChatStore.setState({
                proposedChanges: [{ type: "add", nodeType: "llm" }]
            });

            useChatStore.getState().clearProposedChanges();

            expect(useChatStore.getState().proposedChanges).toBeNull();
        });

        it("sets proposed changes to null", () => {
            useChatStore.setState({
                proposedChanges: [{ type: "add", nodeType: "llm" }]
            });

            useChatStore.getState().setProposedChanges(null);

            expect(useChatStore.getState().proposedChanges).toBeNull();
        });
    });
});

// ===== Type Definitions =====
describe("chat types", () => {
    it("defines valid action types", () => {
        const validActions: (ActionType | null)[] = ["add", "modify", "remove", null];

        validActions.forEach((action) => {
            resetStore();
            useChatStore.getState().setCurrentAction(action);
            expect(useChatStore.getState().currentAction).toBe(action);
        });
    });

    it("defines valid message roles", () => {
        const validRoles = ["user", "assistant", "system"];

        validRoles.forEach((role) => {
            resetStore();
            useChatStore.getState().addMessage({
                role: role as "user" | "assistant" | "system",
                content: "Test"
            });
            expect(useChatStore.getState().messages[0].role).toBe(role);
        });
    });
});
