import { create } from "zustand";
import * as api from "../lib/api";
import { logger } from "../lib/logger";
import type {
    Agent,
    CreateAgentRequest,
    UpdateAgentRequest,
    AgentExecution,
    ThreadMessage,
    AddToolRequest,
    AddToolsBatchResponse,
    Thread
} from "../lib/api";

interface AgentStore {
    // State
    agents: Agent[];
    currentAgent: Agent | null;
    currentThread: Thread | null;
    threads: Thread[];
    isLoading: boolean;
    error: string | null;
    selectedConnectionId: string | null;
    selectedModel: string | null;

    // Per-thread message storage (keyed by threadId)
    threadMessages: Record<string, ThreadMessage[]>;

    // Current execution tracking (minimal - just for SSE streaming)
    currentExecutionId: string | null;
    currentExecutionThreadId: string | null; // Thread ID for the current execution
    currentExecutionStatus: AgentExecution["status"] | null;

    // Actions
    fetchAgents: (params?: { folderId?: string }) => Promise<void>;
    fetchAgent: (agentId: string) => Promise<void>;
    createAgent: (data: CreateAgentRequest) => Promise<Agent>;
    updateAgent: (agentId: string, data: UpdateAgentRequest) => Promise<void>;
    deleteAgent: (agentId: string) => Promise<void>;
    setCurrentAgent: (agent: Agent | null) => void;
    resetAgentState: () => void;
    clearError: () => void;
    setConnection: (connectionId: string, model?: string) => void;

    // Tool management actions
    addTool: (agentId: string, data: AddToolRequest) => Promise<void>;
    addToolsBatch: (agentId: string, tools: AddToolRequest[]) => Promise<AddToolsBatchResponse>;
    removeTool: (agentId: string, toolId: string) => Promise<void>;

    // Thread actions
    fetchThreads: (agentId?: string) => Promise<void>;
    setCurrentThread: (thread: Thread | null) => void;
    createNewThread: (agentId: string) => Promise<void>;
    updateThreadTitle: (threadId: string, title: string) => Promise<void>;
    archiveThread: (threadId: string) => Promise<void>;
    deleteThread: (threadId: string) => Promise<void>;

    // Thread message actions
    fetchThreadMessages: (threadId: string) => Promise<void>;
    setThreadMessages: (threadId: string, messages: ThreadMessage[]) => void;
    addMessageToThread: (threadId: string, message: ThreadMessage) => void;
    updateThreadMessage: (threadId: string, messageId: string, content: string) => void;
    clearThreadMessages: (threadId: string) => void;

    // Execution actions (simplified - messages go to thread)
    executeAgent: (
        agentId: string,
        message: string,
        threadId?: string,
        connectionId?: string,
        model?: string
    ) => Promise<{ executionId: string; threadId: string }>;
    sendMessage: (message: string) => Promise<void>;
    setExecutionStatus: (
        executionId: string | null,
        threadId: string | null,
        status: AgentExecution["status"] | null
    ) => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
    // Initial state
    agents: [],
    currentAgent: null,
    currentThread: null,
    threads: [],
    isLoading: false,
    error: null,
    selectedConnectionId: null,
    selectedModel: null,
    threadMessages: {},
    currentExecutionId: null,
    currentExecutionThreadId: null,
    currentExecutionStatus: null,

    // Fetch all agents
    fetchAgents: async (params?: { folderId?: string }) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.getAgents({ folderId: params?.folderId });
            set({ agents: response.data.agents, isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to fetch agents",
                isLoading: false,
                agents: []
            });
        }
    },

    // Fetch a specific agent
    fetchAgent: async (agentId: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.getAgent(agentId);
            set({ currentAgent: response.data, isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to fetch agent",
                isLoading: false
            });
        }
    },

    // Create a new agent
    createAgent: async (data: CreateAgentRequest) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.createAgent(data);
            const newAgent = response.data;
            set((state) => ({
                agents: [...state.agents, newAgent],
                currentAgent: newAgent,
                isLoading: false
            }));
            return newAgent;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to create agent",
                isLoading: false
            });
            throw error;
        }
    },

    // Update an agent
    updateAgent: async (agentId: string, data: UpdateAgentRequest) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.updateAgent(agentId, data);
            const updatedAgent = response.data;
            set((state) => ({
                agents: state.agents.map((a) => (a.id === agentId ? updatedAgent : a)),
                currentAgent:
                    state.currentAgent?.id === agentId ? updatedAgent : state.currentAgent,
                isLoading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to update agent",
                isLoading: false
            });
            throw error;
        }
    },

    // Delete an agent
    deleteAgent: async (agentId: string) => {
        set({ isLoading: true, error: null });
        try {
            await api.deleteAgent(agentId);
            set((state) => ({
                agents: state.agents.filter((a) => a.id !== agentId),
                currentAgent: state.currentAgent?.id === agentId ? null : state.currentAgent,
                isLoading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to delete agent",
                isLoading: false
            });
            throw error;
        }
    },

    // Set current agent
    setCurrentAgent: (agent: Agent | null) => {
        set({ currentAgent: agent });
    },

    // Reset all agent-specific state when switching agents
    resetAgentState: () => {
        set({
            currentAgent: null,
            currentThread: null,
            threads: [],
            threadMessages: {},
            currentExecutionId: null,
            currentExecutionThreadId: null,
            currentExecutionStatus: null,
            error: null,
            selectedConnectionId: null,
            selectedModel: null
        });
    },

    // Clear error
    clearError: () => {
        set({ error: null });
    },

    // Set connection and model for agent chat
    setConnection: (connectionId: string, model?: string) => {
        set({
            selectedConnectionId: connectionId,
            selectedModel: model || null
        });
    },

    // Add a tool to an agent
    addTool: async (agentId: string, data: AddToolRequest) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.addAgentTool(agentId, data);
            const updatedAgent = response.data.agent;

            set((state) => ({
                agents: state.agents.map((a) => (a.id === agentId ? updatedAgent : a)),
                currentAgent:
                    state.currentAgent?.id === agentId ? updatedAgent : state.currentAgent,
                isLoading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to add tool",
                isLoading: false
            });
            throw error;
        }
    },

    // Add multiple tools to an agent in a single atomic operation
    addToolsBatch: async (agentId: string, tools: AddToolRequest[]) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.addAgentToolsBatch(agentId, tools);
            const updatedAgent = response.data.agent;

            set((state) => ({
                agents: state.agents.map((a) => (a.id === agentId ? updatedAgent : a)),
                currentAgent:
                    state.currentAgent?.id === agentId ? updatedAgent : state.currentAgent,
                isLoading: false
            }));

            return response;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to add tools",
                isLoading: false
            });
            throw error;
        }
    },

    // Remove a tool from an agent
    removeTool: async (agentId: string, toolId: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.removeAgentTool(agentId, toolId);
            const updatedAgent = response.data.agent;

            set((state) => ({
                agents: state.agents.map((a) => (a.id === agentId ? updatedAgent : a)),
                currentAgent:
                    state.currentAgent?.id === agentId ? updatedAgent : state.currentAgent,
                isLoading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to remove tool",
                isLoading: false
            });
            throw error;
        }
    },

    // Thread actions
    fetchThreads: async (agentId?: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.getThreads({
                agent_id: agentId,
                status: "active"
            });
            set({ threads: response.data.threads, isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to fetch threads",
                isLoading: false
            });
        }
    },

    setCurrentThread: (thread: Thread | null) => {
        set({ currentThread: thread });
    },

    createNewThread: async (agentId: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.createThread({
                agent_id: agentId,
                title: new Date().toLocaleString("en-US"),
                status: "active"
            });
            const newThread = response.data;

            set((state) => ({
                threads: [newThread, ...state.threads],
                currentThread: newThread,
                currentExecutionId: null,
                currentExecutionThreadId: null,
                currentExecutionStatus: null,
                isLoading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to create thread",
                isLoading: false
            });
            throw error;
        }
    },

    updateThreadTitle: async (threadId: string, title: string) => {
        try {
            const response = await api.updateThread(threadId, { title });
            const updatedThread = response.data;

            set((state) => ({
                threads: state.threads.map((t) => (t.id === threadId ? updatedThread : t)),
                currentThread:
                    state.currentThread?.id === threadId ? updatedThread : state.currentThread
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to update thread title"
            });
            throw error;
        }
    },

    archiveThread: async (threadId: string) => {
        try {
            await api.archiveThread(threadId);

            set((state) => {
                // Remove thread messages
                const { [threadId]: _, ...remainingMessages } = state.threadMessages;
                return {
                    threads: state.threads.filter((t) => t.id !== threadId),
                    currentThread:
                        state.currentThread?.id === threadId ? null : state.currentThread,
                    threadMessages: remainingMessages,
                    currentExecutionId: null,
                    currentExecutionThreadId: null,
                    currentExecutionStatus: null
                };
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to archive thread"
            });
            throw error;
        }
    },

    deleteThread: async (threadId: string) => {
        try {
            await api.deleteThread(threadId);

            set((state) => {
                // Remove thread messages
                const { [threadId]: _, ...remainingMessages } = state.threadMessages;
                return {
                    threads: state.threads.filter((t) => t.id !== threadId),
                    currentThread:
                        state.currentThread?.id === threadId ? null : state.currentThread,
                    threadMessages: remainingMessages,
                    currentExecutionId: null,
                    currentExecutionThreadId: null,
                    currentExecutionStatus: null
                };
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to delete thread"
            });
            throw error;
        }
    },

    // Thread message actions
    fetchThreadMessages: async (threadId: string) => {
        try {
            const response = await api.getThreadMessages(threadId);
            const messages = response.data?.messages || [];
            set((state) => ({
                threadMessages: {
                    ...state.threadMessages,
                    [threadId]: messages
                }
            }));
        } catch (error) {
            logger.error("Failed to fetch thread messages", error);
        }
    },

    setThreadMessages: (threadId: string, messages: ThreadMessage[]) => {
        set((state) => ({
            threadMessages: {
                ...state.threadMessages,
                [threadId]: messages
            }
        }));
    },

    addMessageToThread: (threadId: string, message: ThreadMessage) => {
        set((state) => {
            const existing = state.threadMessages[threadId] || [];
            // Avoid duplicates by checking message ID
            if (existing.some((m) => m.id === message.id)) {
                return state;
            }
            return {
                threadMessages: {
                    ...state.threadMessages,
                    [threadId]: [...existing, message]
                }
            };
        });
    },

    updateThreadMessage: (threadId: string, messageId: string, content: string) => {
        set((state) => {
            const existing = state.threadMessages[threadId] || [];
            return {
                threadMessages: {
                    ...state.threadMessages,
                    [threadId]: existing.map((m) => (m.id === messageId ? { ...m, content } : m))
                }
            };
        });
    },

    clearThreadMessages: (threadId: string) => {
        set((state) => {
            const { [threadId]: _, ...remainingMessages } = state.threadMessages;
            return { threadMessages: remainingMessages };
        });
    },

    // Execute an agent with initial message (thread-aware)
    executeAgent: async (
        agentId: string,
        message: string,
        threadId?: string,
        connectionId?: string,
        model?: string
    ) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.executeAgent(
                agentId,
                message,
                threadId,
                connectionId,
                model
            );
            const { executionId, threadId: returnedThreadId } = response.data;

            // If we got a new thread, format its title using frontend's local timezone
            if (!threadId && returnedThreadId) {
                const threadResponse = await api.getThread(returnedThreadId);
                const newThread = threadResponse.data as Thread;

                // Format title using frontend's local timezone if thread doesn't have one
                if (!newThread.title) {
                    const formattedTitle = new Date(newThread.created_at).toLocaleString("en-US", {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true
                    });

                    // Update the thread title with formatted date
                    await api.updateThread(newThread.id, { title: formattedTitle });
                    newThread.title = formattedTitle;
                }

                set((state) => ({
                    currentThread: newThread,
                    threads: [newThread, ...state.threads]
                }));
            }

            // Create user message and add to thread
            const userMessage: ThreadMessage = {
                id: `user-${Date.now()}`,
                role: "user",
                content: message,
                timestamp: new Date().toISOString()
            };

            // Add user message to thread messages
            set((state) => {
                const existing = state.threadMessages[returnedThreadId] || [];
                return {
                    threadMessages: {
                        ...state.threadMessages,
                        [returnedThreadId]: [...existing, userMessage]
                    },
                    currentExecutionId: executionId,
                    currentExecutionThreadId: returnedThreadId,
                    currentExecutionStatus: "running",
                    isLoading: false
                };
            });

            return { executionId, threadId: returnedThreadId };
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to execute agent",
                isLoading: false
            });
            throw error;
        }
    },

    // Send a message to the running agent
    sendMessage: async (message: string) => {
        const { currentAgent, currentExecutionId, currentThread } = get();
        if (!currentAgent || !currentExecutionId || !currentThread) {
            throw new Error("No active agent execution");
        }

        set({ isLoading: true, error: null });
        try {
            await api.sendAgentMessage(currentAgent.id, currentExecutionId, message);

            // Add user message to thread
            const userMessage: ThreadMessage = {
                id: `user-${Date.now()}`,
                role: "user",
                content: message,
                timestamp: new Date().toISOString()
            };

            set((state) => {
                const existing = state.threadMessages[currentThread.id] || [];
                return {
                    threadMessages: {
                        ...state.threadMessages,
                        [currentThread.id]: [...existing, userMessage]
                    },
                    isLoading: false
                };
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to send message",
                isLoading: false
            });
            throw error;
        }
    },

    // Set execution status
    setExecutionStatus: (
        executionId: string | null,
        threadId: string | null,
        status: AgentExecution["status"] | null
    ) => {
        set({
            currentExecutionId: executionId,
            currentExecutionThreadId: threadId,
            currentExecutionStatus: status
        });
    }
}));
