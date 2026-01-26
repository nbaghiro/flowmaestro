/**
 * Agent Store Tests
 *
 * Tests for agent state management including CRUD operations,
 * thread management, tool management, and execution tracking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the API module
vi.mock("../../lib/api", () => ({
    getAgents: vi.fn(),
    getAgent: vi.fn(),
    createAgent: vi.fn(),
    updateAgent: vi.fn(),
    deleteAgent: vi.fn(),
    addAgentTool: vi.fn(),
    addAgentToolsBatch: vi.fn(),
    removeAgentTool: vi.fn(),
    getThreads: vi.fn(),
    createThread: vi.fn(),
    getThread: vi.fn(),
    updateThread: vi.fn(),
    archiveThread: vi.fn(),
    deleteThread: vi.fn(),
    getThreadMessages: vi.fn(),
    executeAgent: vi.fn(),
    sendAgentMessage: vi.fn()
}));

// Mock the logger
vi.mock("../../lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));

import * as api from "../../lib/api";
import { useAgentStore } from "../agentStore";
import type { Agent, Thread, ThreadMessage, Tool } from "../../lib/api";

// Mock agent data
function createMockAgent(overrides?: Partial<Agent>): Agent {
    return {
        id: "agent-123",
        user_id: "user-123",
        name: "Test Agent",
        description: "A test agent",
        model: "gpt-4",
        provider: "openai",
        connection_id: null,
        system_prompt: "You are a helpful assistant",
        temperature: 0.7,
        max_tokens: 1000,
        max_iterations: 10,
        available_tools: [],
        memory_config: { type: "buffer", max_messages: 100 },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        ...overrides
    };
}

function createMockThread(overrides?: Partial<Thread>): Thread {
    return {
        id: "thread-123",
        user_id: "user-123",
        agent_id: "agent-123",
        title: "Test Thread",
        status: "active",
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: null,
        archived_at: null,
        deleted_at: null,
        ...overrides
    };
}

function createMockMessage(overrides?: Partial<ThreadMessage>): ThreadMessage {
    return {
        id: "msg-123",
        role: "user",
        content: "Hello",
        timestamp: new Date().toISOString(),
        ...overrides
    };
}

function createMockTool(overrides?: Partial<Tool>): Tool {
    return {
        id: "tool-123",
        name: "Test Tool",
        description: "A test tool",
        type: "workflow",
        schema: {},
        config: { workflowId: "wf-123" },
        ...overrides
    };
}

// Reset store before each test
function resetStore() {
    useAgentStore.setState({
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
        currentExecutionStatus: null
    });
}

describe("agentStore", () => {
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
            const state = useAgentStore.getState();

            expect(state.agents).toEqual([]);
            expect(state.currentAgent).toBeNull();
            expect(state.currentThread).toBeNull();
            expect(state.threads).toEqual([]);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
            expect(state.threadMessages).toEqual({});
        });
    });

    // ===== Fetch Agents =====
    describe("fetchAgents", () => {
        it("fetches agents successfully", async () => {
            const mockAgents = [createMockAgent(), createMockAgent({ id: "agent-456" })];
            vi.mocked(api.getAgents).mockResolvedValueOnce({
                success: true,
                data: { agents: mockAgents, total: 2 }
            });

            await useAgentStore.getState().fetchAgents();

            const state = useAgentStore.getState();
            expect(state.agents).toHaveLength(2);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
        });

        it("fetches agents with folder filter", async () => {
            vi.mocked(api.getAgents).mockResolvedValueOnce({
                success: true,
                data: { agents: [], total: 0 }
            });

            await useAgentStore.getState().fetchAgents({ folderId: "folder-123" });

            expect(api.getAgents).toHaveBeenCalledWith({ folderId: "folder-123" });
        });

        it("handles fetch error", async () => {
            vi.mocked(api.getAgents).mockRejectedValueOnce(new Error("Network error"));

            await useAgentStore.getState().fetchAgents();

            const state = useAgentStore.getState();
            expect(state.error).toBe("Network error");
            expect(state.isLoading).toBe(false);
            expect(state.agents).toEqual([]);
        });
    });

    // ===== Fetch Agent =====
    describe("fetchAgent", () => {
        it("fetches a specific agent", async () => {
            const mockAgent = createMockAgent();
            vi.mocked(api.getAgent).mockResolvedValueOnce({
                success: true,
                data: mockAgent
            });

            await useAgentStore.getState().fetchAgent("agent-123");

            const state = useAgentStore.getState();
            expect(state.currentAgent?.id).toBe("agent-123");
            expect(state.isLoading).toBe(false);
        });

        it("handles fetch error", async () => {
            vi.mocked(api.getAgent).mockRejectedValueOnce(new Error("Agent not found"));

            await useAgentStore.getState().fetchAgent("agent-123");

            const state = useAgentStore.getState();
            expect(state.error).toBe("Agent not found");
        });
    });

    // ===== Create Agent =====
    describe("createAgent", () => {
        it("creates a new agent", async () => {
            const mockAgent = createMockAgent();
            vi.mocked(api.createAgent).mockResolvedValueOnce({
                success: true,
                data: mockAgent
            });

            const result = await useAgentStore.getState().createAgent({
                name: "Test Agent",
                model: "gpt-4",
                provider: "openai",
                system_prompt: "You are helpful"
            });

            expect(result.id).toBe("agent-123");

            const state = useAgentStore.getState();
            expect(state.agents).toContainEqual(mockAgent);
            expect(state.currentAgent?.id).toBe("agent-123");
        });

        it("handles creation error", async () => {
            vi.mocked(api.createAgent).mockRejectedValueOnce(new Error("Validation error"));

            await expect(
                useAgentStore.getState().createAgent({
                    name: "",
                    model: "gpt-4",
                    provider: "openai",
                    system_prompt: ""
                })
            ).rejects.toThrow("Validation error");

            const state = useAgentStore.getState();
            expect(state.error).toBe("Validation error");
        });
    });

    // ===== Update Agent =====
    describe("updateAgent", () => {
        it("updates an existing agent", async () => {
            const originalAgent = createMockAgent();
            const updatedAgent = { ...originalAgent, name: "Updated Agent" };

            useAgentStore.setState({ agents: [originalAgent], currentAgent: originalAgent });

            vi.mocked(api.updateAgent).mockResolvedValueOnce({
                success: true,
                data: updatedAgent
            });

            await useAgentStore.getState().updateAgent("agent-123", { name: "Updated Agent" });

            const state = useAgentStore.getState();
            expect(state.agents[0].name).toBe("Updated Agent");
            expect(state.currentAgent?.name).toBe("Updated Agent");
        });

        it("handles update error", async () => {
            vi.mocked(api.updateAgent).mockRejectedValueOnce(new Error("Update failed"));

            await expect(
                useAgentStore.getState().updateAgent("agent-123", { name: "New Name" })
            ).rejects.toThrow("Update failed");
        });
    });

    // ===== Delete Agent =====
    describe("deleteAgent", () => {
        it("deletes an agent", async () => {
            const agent = createMockAgent();
            useAgentStore.setState({ agents: [agent], currentAgent: agent });

            vi.mocked(api.deleteAgent).mockResolvedValueOnce({ success: true });

            await useAgentStore.getState().deleteAgent("agent-123");

            const state = useAgentStore.getState();
            expect(state.agents).toHaveLength(0);
            expect(state.currentAgent).toBeNull();
        });

        it("preserves other agents when deleting", async () => {
            const agent1 = createMockAgent({ id: "agent-1" });
            const agent2 = createMockAgent({ id: "agent-2" });
            useAgentStore.setState({ agents: [agent1, agent2], currentAgent: agent1 });

            vi.mocked(api.deleteAgent).mockResolvedValueOnce({ success: true });

            await useAgentStore.getState().deleteAgent("agent-1");

            const state = useAgentStore.getState();
            expect(state.agents).toHaveLength(1);
            expect(state.agents[0].id).toBe("agent-2");
        });
    });

    // ===== Tool Management =====
    describe("tool management", () => {
        it("adds a tool to an agent", async () => {
            const agent = createMockAgent();
            const newTool = createMockTool({ id: "tool-1", name: "Calculator" });
            const updatedAgent = {
                ...agent,
                available_tools: [newTool]
            };

            useAgentStore.setState({ agents: [agent], currentAgent: agent });

            vi.mocked(api.addAgentTool).mockResolvedValueOnce({
                success: true,
                data: { agent: updatedAgent, tool: newTool }
            });

            await useAgentStore.getState().addTool("agent-123", {
                type: "workflow",
                name: "Calculator",
                description: "A calculator tool",
                schema: {},
                config: { workflowId: "wf-123" }
            });

            const state = useAgentStore.getState();
            expect(state.currentAgent?.available_tools).toHaveLength(1);
        });

        it("adds multiple tools in batch", async () => {
            const agent = createMockAgent();
            const tool1 = createMockTool({ id: "tool-1", name: "Tool 1" });
            const tool2 = createMockTool({ id: "tool-2", name: "Tool 2" });
            const updatedAgent = {
                ...agent,
                available_tools: [tool1, tool2]
            };

            useAgentStore.setState({ agents: [agent], currentAgent: agent });

            vi.mocked(api.addAgentToolsBatch).mockResolvedValueOnce({
                success: true,
                data: { agent: updatedAgent, added: [tool1, tool2], skipped: [] }
            });

            const result = await useAgentStore.getState().addToolsBatch("agent-123", [
                {
                    type: "workflow",
                    name: "Tool 1",
                    description: "First tool",
                    schema: {},
                    config: { workflowId: "wf-1" }
                },
                {
                    type: "workflow",
                    name: "Tool 2",
                    description: "Second tool",
                    schema: {},
                    config: { workflowId: "wf-2" }
                }
            ]);

            expect(result.data.added).toHaveLength(2);
        });

        it("removes a tool from an agent", async () => {
            const existingTool = createMockTool({ id: "tool-1" });
            const agent = createMockAgent({ available_tools: [existingTool] });
            const updatedAgent = { ...agent, available_tools: [] };

            useAgentStore.setState({ agents: [agent], currentAgent: agent });

            vi.mocked(api.removeAgentTool).mockResolvedValueOnce({
                success: true,
                data: { agent: updatedAgent }
            });

            await useAgentStore.getState().removeTool("agent-123", "tool-1");

            const state = useAgentStore.getState();
            expect(state.currentAgent?.available_tools).toHaveLength(0);
        });
    });

    // ===== Thread Management =====
    describe("thread management", () => {
        it("fetches threads for an agent", async () => {
            const mockThreads = [createMockThread(), createMockThread({ id: "thread-456" })];
            vi.mocked(api.getThreads).mockResolvedValueOnce({
                success: true,
                data: { threads: mockThreads, total: 2 }
            });

            await useAgentStore.getState().fetchThreads("agent-123");

            const state = useAgentStore.getState();
            expect(state.threads).toHaveLength(2);
        });

        it("creates a new thread", async () => {
            const mockThread = createMockThread();
            vi.mocked(api.createThread).mockResolvedValueOnce({
                success: true,
                data: mockThread
            });

            await useAgentStore.getState().createNewThread("agent-123");

            const state = useAgentStore.getState();
            expect(state.threads).toContainEqual(mockThread);
            expect(state.currentThread?.id).toBe("thread-123");
        });

        it("updates thread title", async () => {
            const thread = createMockThread();
            const updatedThread = { ...thread, title: "New Title" };

            useAgentStore.setState({ threads: [thread], currentThread: thread });

            vi.mocked(api.updateThread).mockResolvedValueOnce({
                success: true,
                data: updatedThread
            });

            await useAgentStore.getState().updateThreadTitle("thread-123", "New Title");

            const state = useAgentStore.getState();
            expect(state.threads[0].title).toBe("New Title");
            expect(state.currentThread?.title).toBe("New Title");
        });

        it("archives a thread", async () => {
            const thread = createMockThread();
            const archivedThread = { ...thread, status: "archived" as const };
            useAgentStore.setState({ threads: [thread], currentThread: thread });

            vi.mocked(api.archiveThread).mockResolvedValueOnce({
                success: true,
                data: archivedThread
            });

            await useAgentStore.getState().archiveThread("thread-123");

            const state = useAgentStore.getState();
            expect(state.threads).toHaveLength(0);
            expect(state.currentThread).toBeNull();
        });

        it("deletes a thread", async () => {
            const thread = createMockThread();
            useAgentStore.setState({ threads: [thread], currentThread: thread });

            vi.mocked(api.deleteThread).mockResolvedValueOnce({ success: true });

            await useAgentStore.getState().deleteThread("thread-123");

            const state = useAgentStore.getState();
            expect(state.threads).toHaveLength(0);
            expect(state.currentThread).toBeNull();
        });

        it("sets current thread", () => {
            const thread = createMockThread();

            useAgentStore.getState().setCurrentThread(thread);

            expect(useAgentStore.getState().currentThread?.id).toBe("thread-123");
        });
    });

    // ===== Thread Messages =====
    describe("thread messages", () => {
        it("fetches thread messages", async () => {
            const mockMessages = [createMockMessage(), createMockMessage({ id: "msg-456" })];
            vi.mocked(api.getThreadMessages).mockResolvedValueOnce({
                success: true,
                data: { messages: mockMessages }
            });

            await useAgentStore.getState().fetchThreadMessages("thread-123");

            const state = useAgentStore.getState();
            expect(state.threadMessages["thread-123"]).toHaveLength(2);
        });

        it("sets thread messages", () => {
            const messages = [createMockMessage()];

            useAgentStore.getState().setThreadMessages("thread-123", messages);

            const state = useAgentStore.getState();
            expect(state.threadMessages["thread-123"]).toEqual(messages);
        });

        it("adds a message to thread without duplicates", () => {
            const existingMessage = createMockMessage();
            useAgentStore.setState({
                threadMessages: { "thread-123": [existingMessage] }
            });

            // Try to add duplicate
            useAgentStore.getState().addMessageToThread("thread-123", existingMessage);

            const state = useAgentStore.getState();
            expect(state.threadMessages["thread-123"]).toHaveLength(1);

            // Add new message
            const newMessage = createMockMessage({ id: "msg-new" });
            useAgentStore.getState().addMessageToThread("thread-123", newMessage);

            const newState = useAgentStore.getState();
            expect(newState.threadMessages["thread-123"]).toHaveLength(2);
        });

        it("updates a thread message", () => {
            const message = createMockMessage();
            useAgentStore.setState({
                threadMessages: { "thread-123": [message] }
            });

            useAgentStore
                .getState()
                .updateThreadMessage("thread-123", "msg-123", "Updated content");

            const state = useAgentStore.getState();
            expect(state.threadMessages["thread-123"][0].content).toBe("Updated content");
        });

        it("clears thread messages", () => {
            useAgentStore.setState({
                threadMessages: {
                    "thread-123": [createMockMessage()],
                    "thread-456": [createMockMessage()]
                }
            });

            useAgentStore.getState().clearThreadMessages("thread-123");

            const state = useAgentStore.getState();
            expect(state.threadMessages["thread-123"]).toBeUndefined();
            expect(state.threadMessages["thread-456"]).toBeDefined();
        });
    });

    // ===== Execution =====
    describe("execution", () => {
        it("executes an agent", async () => {
            const agent = createMockAgent();
            const thread = createMockThread();

            useAgentStore.setState({ currentAgent: agent });

            vi.mocked(api.executeAgent).mockResolvedValueOnce({
                success: true,
                data: {
                    executionId: "exec-123",
                    threadId: "thread-123",
                    agentId: "agent-123",
                    status: "running"
                }
            });

            vi.mocked(api.getThread).mockResolvedValueOnce({
                success: true,
                data: thread
            });

            const result = await useAgentStore
                .getState()
                .executeAgent("agent-123", "Hello, agent!");

            expect(result.executionId).toBe("exec-123");
            expect(result.threadId).toBe("thread-123");

            const state = useAgentStore.getState();
            expect(state.currentExecutionId).toBe("exec-123");
            expect(state.currentExecutionStatus).toBe("running");
        });

        it("sends a message during execution", async () => {
            const agent = createMockAgent();
            const thread = createMockThread();

            useAgentStore.setState({
                currentAgent: agent,
                currentThread: thread,
                currentExecutionId: "exec-123"
            });

            vi.mocked(api.sendAgentMessage).mockResolvedValueOnce({ success: true });

            await useAgentStore.getState().sendMessage("Follow-up message");

            expect(api.sendAgentMessage).toHaveBeenCalledWith(
                "agent-123",
                "exec-123",
                "Follow-up message"
            );
        });

        it("throws error when sending message without active execution", async () => {
            await expect(useAgentStore.getState().sendMessage("Message")).rejects.toThrow(
                "No active agent execution"
            );
        });

        it("sets execution status", () => {
            useAgentStore.getState().setExecutionStatus("exec-123", "thread-123", "completed");

            const state = useAgentStore.getState();
            expect(state.currentExecutionId).toBe("exec-123");
            expect(state.currentExecutionThreadId).toBe("thread-123");
            expect(state.currentExecutionStatus).toBe("completed");
        });
    });

    // ===== State Management =====
    describe("state management", () => {
        it("sets current agent", () => {
            const agent = createMockAgent();

            useAgentStore.getState().setCurrentAgent(agent);

            expect(useAgentStore.getState().currentAgent?.id).toBe("agent-123");
        });

        it("clears current agent", () => {
            useAgentStore.setState({ currentAgent: createMockAgent() });

            useAgentStore.getState().setCurrentAgent(null);

            expect(useAgentStore.getState().currentAgent).toBeNull();
        });

        it("resets agent state", () => {
            useAgentStore.setState({
                currentAgent: createMockAgent(),
                currentThread: createMockThread(),
                threads: [createMockThread()],
                threadMessages: { "thread-123": [createMockMessage()] },
                currentExecutionId: "exec-123",
                error: "Some error",
                selectedConnectionId: "conn-123"
            });

            useAgentStore.getState().resetAgentState();

            const state = useAgentStore.getState();
            expect(state.currentAgent).toBeNull();
            expect(state.currentThread).toBeNull();
            expect(state.threads).toEqual([]);
            expect(state.threadMessages).toEqual({});
            expect(state.currentExecutionId).toBeNull();
            expect(state.error).toBeNull();
            expect(state.selectedConnectionId).toBeNull();
        });

        it("clears error", () => {
            useAgentStore.setState({ error: "Some error" });

            useAgentStore.getState().clearError();

            expect(useAgentStore.getState().error).toBeNull();
        });

        it("sets connection", () => {
            useAgentStore.getState().setConnection("conn-123", "gpt-4");

            const state = useAgentStore.getState();
            expect(state.selectedConnectionId).toBe("conn-123");
            expect(state.selectedModel).toBe("gpt-4");
        });

        it("sets connection without model", () => {
            useAgentStore.getState().setConnection("conn-123");

            const state = useAgentStore.getState();
            expect(state.selectedConnectionId).toBe("conn-123");
            expect(state.selectedModel).toBeNull();
        });
    });
});
