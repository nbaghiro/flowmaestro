import { create } from "zustand";
import type { JsonObject } from "@flowmaestro/shared";
import type { Node, Edge } from "reactflow";

const MIN_WIDTH = 400;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 500;

// Only node modification operations need explicit action type
// null = conversational mode (no structured changes)
export type ActionType = "add" | "modify" | "remove" | null;

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    action?: ActionType;
    proposedChanges?: NodeChange[];
    // Thinking support
    thinking?: string;
    thinkingExpanded?: boolean;
    isThinkingStreaming?: boolean;
}

export interface NodeChange {
    type: "add" | "modify" | "remove";
    nodeId?: string;
    nodeType?: string;
    nodeLabel?: string;
    config?: JsonObject;
    position?: { x: number; y: number };
    connectTo?: string;
    updates?: JsonObject;
}

export interface WorkflowSnapshot {
    nodes: Node[];
    edges: Edge[];
    selectedNodeId: string | null;
}

interface ChatStore {
    // Panel state
    isPanelOpen: boolean;
    panelWidth: number;

    // Chat state
    messages: ChatMessage[];
    isStreaming: boolean;
    isThinking: boolean;
    currentAction: ActionType | null;

    // LLM Connection settings
    selectedConnectionId: string | null;
    selectedModel: string | null;

    // Thinking settings
    enableThinking: boolean;
    thinkingBudget: number;

    // Workflow context
    workflowContext: WorkflowSnapshot | null;
    contextTimestamp: Date | null;

    // Proposed changes (preview)
    proposedChanges: NodeChange[] | null;

    // Actions
    openPanel: () => void;
    closePanel: () => void;
    togglePanel: () => void;
    setPanelWidth: (width: number) => void;
    addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
    updateLastMessage: (contentOrUpdater: string | ((current: string) => string)) => void;
    setStreaming: (isStreaming: boolean) => void;
    setThinking: (isThinking: boolean) => void;
    setCurrentAction: (action: ActionType | null) => void;
    setConnection: (connectionId: string, model?: string) => void;
    setEnableThinking: (enabled: boolean) => void;
    setThinkingBudget: (budget: number) => void;
    setWorkflowContext: (context: WorkflowSnapshot) => void;
    setProposedChanges: (changes: NodeChange[] | null) => void;
    appendToThinking: (token: string) => void;
    completeThinking: (content: string) => void;
    toggleThinkingExpanded: (messageId: string) => void;
    clearChat: () => void;
    clearProposedChanges: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
    // Initial state
    isPanelOpen: false,
    panelWidth: DEFAULT_WIDTH,
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
    proposedChanges: null,

    // Actions
    openPanel: () => set({ isPanelOpen: true }),

    closePanel: () => set({ isPanelOpen: false }),

    togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

    setPanelWidth: (width: number) => {
        const constrainedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
        set({ panelWidth: constrainedWidth });
    },

    addMessage: (message) => {
        const newMessage: ChatMessage = {
            ...message,
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date()
        };

        set((state) => ({
            messages: [...state.messages, newMessage]
        }));
    },

    updateLastMessage: (contentOrUpdater: string | ((current: string) => string)) => {
        set((state) => {
            const messages = [...state.messages];
            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                const newContent =
                    typeof contentOrUpdater === "function"
                        ? contentOrUpdater(lastMessage.content)
                        : contentOrUpdater;

                messages[messages.length - 1] = {
                    ...lastMessage,
                    content: newContent
                };
            }
            return { messages };
        });
    },

    setStreaming: (isStreaming: boolean) => set({ isStreaming }),

    setThinking: (isThinking: boolean) => set({ isThinking }),

    setCurrentAction: (action: ActionType | null) => set({ currentAction: action }),

    setConnection: (connectionId: string, model?: string) =>
        set({
            selectedConnectionId: connectionId,
            selectedModel: model || null
        }),

    setEnableThinking: (enabled: boolean) => set({ enableThinking: enabled }),

    setThinkingBudget: (budget: number) => set({ thinkingBudget: budget }),

    setWorkflowContext: (context: WorkflowSnapshot) =>
        set({
            workflowContext: context,
            contextTimestamp: new Date()
        }),

    setProposedChanges: (changes: NodeChange[] | null) => set({ proposedChanges: changes }),

    appendToThinking: (token: string) => {
        set((state) => {
            const messages = [...state.messages];
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
                lastMessage.thinking = (lastMessage.thinking || "") + token;
                lastMessage.isThinkingStreaming = true;
                lastMessage.thinkingExpanded = true; // Auto-expand while streaming
            }
            return { messages, isThinking: true };
        });
    },

    completeThinking: (content: string) => {
        set((state) => {
            const messages = [...state.messages];
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
                lastMessage.thinking = content || lastMessage.thinking;
                lastMessage.isThinkingStreaming = false;
                lastMessage.thinkingExpanded = false; // Auto-collapse when done
            }
            return { messages, isThinking: false };
        });
    },

    toggleThinkingExpanded: (messageId: string) => {
        set((state) => {
            const messages = state.messages.map((msg) =>
                msg.id === messageId ? { ...msg, thinkingExpanded: !msg.thinkingExpanded } : msg
            );
            return { messages };
        });
    },

    clearChat: () =>
        set({
            messages: [],
            isStreaming: false,
            isThinking: false,
            currentAction: null,
            proposedChanges: null
        }),

    clearProposedChanges: () => set({ proposedChanges: null })
}));
