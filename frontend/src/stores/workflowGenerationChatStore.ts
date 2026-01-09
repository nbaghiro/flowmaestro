/**
 * Workflow Generation Chat Store
 *
 * Zustand store for managing the workflow generation chat panel state,
 * including messages, thinking content, and workflow plans.
 */

import { create } from "zustand";
import type { GenerationChatMessage, WorkflowPlan } from "@flowmaestro/shared";

const MIN_WIDTH = 400;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 500;
const DEFAULT_THINKING_BUDGET = 4096;

// ============================================================================
// TYPES
// ============================================================================

export interface GenerationMessage extends GenerationChatMessage {
    /** Whether thinking block is being streamed */
    isThinkingStreaming?: boolean;
    /** Whether response is being streamed */
    isResponseStreaming?: boolean;
}

interface WorkflowGenerationChatStore {
    // Panel state
    isPanelOpen: boolean;
    panelWidth: number;

    // Chat state
    messages: GenerationMessage[];
    isStreaming: boolean;
    isThinking: boolean;
    currentThinkingContent: string;

    // Connection settings
    selectedConnectionId: string | null;
    selectedModel: string | null;
    enableThinking: boolean;
    thinkingBudget: number;

    // Workflow plan
    currentPlan: WorkflowPlan | null;
    isCreatingWorkflow: boolean;

    // Actions - Panel
    openPanel: () => void;
    closePanel: () => void;
    togglePanel: () => void;
    setPanelWidth: (width: number) => void;

    // Actions - Chat
    addUserMessage: (content: string) => string;
    startAssistantMessage: () => string;
    appendToThinking: (token: string) => void;
    completeThinking: (content: string) => void;
    appendToResponse: (token: string) => void;
    completeAssistantMessage: (content: string, thinking?: string, plan?: WorkflowPlan) => void;
    setMessageError: (messageId: string, error: string) => void;
    toggleThinkingExpanded: (messageId: string) => void;

    // Actions - Streaming state
    setStreaming: (isStreaming: boolean) => void;
    setThinking: (isThinking: boolean) => void;

    // Actions - Connection
    setConnection: (connectionId: string, model?: string) => void;
    setEnableThinking: (enabled: boolean) => void;
    setThinkingBudget: (budget: number) => void;

    // Actions - Plan
    setPlan: (plan: WorkflowPlan | null) => void;
    setCreatingWorkflow: (isCreating: boolean) => void;

    // Actions - Reset
    clearChat: () => void;
    reset: () => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useWorkflowGenerationChatStore = create<WorkflowGenerationChatStore>((set) => ({
    // Initial state
    isPanelOpen: false,
    panelWidth: DEFAULT_WIDTH,
    messages: [],
    isStreaming: false,
    isThinking: false,
    currentThinkingContent: "",
    selectedConnectionId: null,
    selectedModel: null,
    enableThinking: true,
    thinkingBudget: DEFAULT_THINKING_BUDGET,
    currentPlan: null,
    isCreatingWorkflow: false,

    // Panel actions
    openPanel: () => set({ isPanelOpen: true }),
    closePanel: () => set({ isPanelOpen: false }),
    togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

    setPanelWidth: (width: number) => {
        const constrainedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
        set({ panelWidth: constrainedWidth });
    },

    // Chat actions
    addUserMessage: (content: string) => {
        const id = crypto.randomUUID();
        const message: GenerationMessage = {
            id,
            role: "user",
            content,
            timestamp: new Date().toISOString()
        };
        set((state) => ({
            messages: [...state.messages, message]
        }));
        return id;
    },

    startAssistantMessage: () => {
        const id = crypto.randomUUID();
        const message: GenerationMessage = {
            id,
            role: "assistant",
            content: "",
            timestamp: new Date().toISOString(),
            isResponseStreaming: true
        };
        set((state) => ({
            messages: [...state.messages, message],
            isStreaming: true,
            currentThinkingContent: ""
        }));
        return id;
    },

    appendToThinking: (token: string) => {
        set((state) => {
            const messages = [...state.messages];
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
                lastMessage.thinking = (lastMessage.thinking || "") + token;
                lastMessage.isThinkingStreaming = true;
                lastMessage.thinkingExpanded = true; // Auto-expand while streaming
            }
            return {
                messages,
                currentThinkingContent: state.currentThinkingContent + token,
                isThinking: true
            };
        });
    },

    completeThinking: (content: string) => {
        set((state) => {
            const messages = [...state.messages];
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
                lastMessage.thinking = content;
                lastMessage.isThinkingStreaming = false;
                lastMessage.thinkingExpanded = false; // Collapse by default
            }
            return {
                messages,
                currentThinkingContent: content,
                isThinking: false
            };
        });
    },

    appendToResponse: (token: string) => {
        set((state) => {
            const messages = [...state.messages];
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
                lastMessage.content += token;
            }
            return { messages };
        });
    },

    completeAssistantMessage: (content: string, thinking?: string, plan?: WorkflowPlan) => {
        set((state) => {
            const messages = [...state.messages];
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
                lastMessage.content = content;
                lastMessage.thinking = thinking;
                lastMessage.workflowPlan = plan;
                lastMessage.isResponseStreaming = false;
                lastMessage.isThinkingStreaming = false;
            }
            return {
                messages,
                isStreaming: false,
                isThinking: false,
                currentPlan: plan || state.currentPlan
            };
        });
    },

    setMessageError: (messageId: string, error: string) => {
        set((state) => {
            const messages = state.messages.map((msg) => {
                if (msg.id === messageId) {
                    return {
                        ...msg,
                        content: `Error: ${error}`,
                        isResponseStreaming: false,
                        isThinkingStreaming: false
                    };
                }
                return msg;
            });
            return {
                messages,
                isStreaming: false,
                isThinking: false
            };
        });
    },

    toggleThinkingExpanded: (messageId: string) => {
        set((state) => {
            const messages = state.messages.map((msg) => {
                if (msg.id === messageId && msg.thinking) {
                    return { ...msg, thinkingExpanded: !msg.thinkingExpanded };
                }
                return msg;
            });
            return { messages };
        });
    },

    // Streaming state actions
    setStreaming: (isStreaming: boolean) => set({ isStreaming }),
    setThinking: (isThinking: boolean) => set({ isThinking }),

    // Connection actions
    setConnection: (connectionId: string, model?: string) => {
        set({
            selectedConnectionId: connectionId,
            selectedModel: model || null
        });
    },

    setEnableThinking: (enabled: boolean) => set({ enableThinking: enabled }),

    setThinkingBudget: (budget: number) => {
        const constrainedBudget = Math.max(1024, Math.min(32768, budget));
        set({ thinkingBudget: constrainedBudget });
    },

    // Plan actions
    setPlan: (plan: WorkflowPlan | null) => set({ currentPlan: plan }),
    setCreatingWorkflow: (isCreating: boolean) => set({ isCreatingWorkflow: isCreating }),

    // Reset actions
    clearChat: () =>
        set({
            messages: [],
            currentPlan: null,
            currentThinkingContent: "",
            isStreaming: false,
            isThinking: false
        }),

    reset: () =>
        set({
            isPanelOpen: false,
            messages: [],
            isStreaming: false,
            isThinking: false,
            currentThinkingContent: "",
            currentPlan: null,
            isCreatingWorkflow: false
        })
}));
