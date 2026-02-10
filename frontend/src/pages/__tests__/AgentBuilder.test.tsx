/**
 * AgentBuilder Page Tests
 *
 * Tests for the agent builder page including:
 * - Agent configuration form
 * - Model/provider selection
 * - Tool management
 * - Tab navigation
 * - Save agent flow
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAgentStore } from "../../stores/agentStore";
import { useConnectionStore } from "../../stores/connectionStore";
import { AgentBuilder } from "../AgentBuilder";
import type { Agent, Connection } from "../../lib/api";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ agentId: "agent-123" }),
        useLocation: () => ({
            pathname: "/agents/agent-123/build",
            state: null
        })
    };
});

// Mock stores
vi.mock("../../stores/agentStore");
vi.mock("../../stores/connectionStore");

// Mock data factory
function createMockAgent(overrides?: Partial<Agent>): Agent {
    return {
        id: "agent-123",
        user_id: "user-1",
        name: "Test Agent",
        description: "A test agent",
        provider: "openai",
        model: "gpt-4",
        system_prompt: "You are a helpful AI assistant.",
        temperature: 0.7,
        max_tokens: 4096,
        connection_id: "conn-1",
        available_tools: [],
        folder_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides
    } as Agent;
}

function createMockConnection(overrides?: Partial<Connection>): Connection {
    return {
        id: "conn-1",
        user_id: "user-1",
        provider: "openai",
        name: "OpenAI Connection",
        connection_method: "api_key",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides
    } as Connection;
}

// Thread type for mocked agent store
interface MockThread {
    id: string;
    title: string;
    agent_id: string;
    created_at: string;
    updated_at: string;
}

// Interface for mocked agent store - explicit to avoid type inference issues with vi.mock
interface MockAgentStore {
    currentAgent: Agent | null;
    fetchAgent: ReturnType<typeof vi.fn>;
    updateAgent: ReturnType<typeof vi.fn>;
    resetAgentState: ReturnType<typeof vi.fn>;
    addTool: ReturnType<typeof vi.fn>;
    addToolsBatch: ReturnType<typeof vi.fn>;
    removeTool: ReturnType<typeof vi.fn>;
    threads: MockThread[];
    currentThread: MockThread | null;
    fetchThreads: ReturnType<typeof vi.fn>;
    setCurrentThread: ReturnType<typeof vi.fn>;
    createNewThread: ReturnType<typeof vi.fn>;
    updateThreadTitle: ReturnType<typeof vi.fn>;
    archiveThread: ReturnType<typeof vi.fn>;
    deleteThread: ReturnType<typeof vi.fn>;
    agents: Agent[];
    isLoading: boolean;
    error: string | null;
    fetchAgents: ReturnType<typeof vi.fn>;
    deleteAgent: ReturnType<typeof vi.fn>;
    createAgent: ReturnType<typeof vi.fn>;
}

interface MockConnectionStore {
    connections: Connection[];
    fetchConnections: ReturnType<typeof vi.fn>;
    isLoading: boolean;
    error: string | null;
}

// Create base agent store state for mocking
function createAgentStoreState(overrides?: {
    currentAgent?: Agent | null;
    threads?: MockThread[];
    currentThread?: MockThread | null;
    fetchAgent?: ReturnType<typeof vi.fn>;
    updateAgent?: ReturnType<typeof vi.fn>;
    fetchThreads?: ReturnType<typeof vi.fn>;
    setCurrentThread?: ReturnType<typeof vi.fn>;
}): MockAgentStore {
    return {
        currentAgent: overrides?.currentAgent ?? createMockAgent(),
        fetchAgent: overrides?.fetchAgent ?? vi.fn().mockResolvedValue(undefined),
        updateAgent: overrides?.updateAgent ?? vi.fn().mockResolvedValue(undefined),
        resetAgentState: vi.fn(),
        addTool: vi.fn().mockResolvedValue(undefined),
        addToolsBatch: vi.fn(),
        removeTool: vi.fn().mockResolvedValue(undefined),
        threads: overrides?.threads ?? [],
        currentThread: overrides?.currentThread ?? null,
        fetchThreads: overrides?.fetchThreads ?? vi.fn().mockResolvedValue(undefined),
        setCurrentThread: overrides?.setCurrentThread ?? vi.fn(),
        createNewThread: vi.fn(),
        updateThreadTitle: vi.fn(),
        archiveThread: vi.fn(),
        deleteThread: vi.fn(),
        agents: [],
        isLoading: false,
        error: null,
        fetchAgents: vi.fn(),
        deleteAgent: vi.fn(),
        createAgent: vi.fn()
    };
}

function createConnectionStoreState(overrides?: {
    connections?: Connection[];
}): MockConnectionStore {
    return {
        connections: overrides?.connections ?? [createMockConnection()],
        fetchConnections: vi.fn().mockResolvedValue(undefined),
        isLoading: false,
        error: null
    };
}

// Helper to reset stores
function resetStores(
    agentStoreOverrides?: Parameters<typeof createAgentStoreState>[0],
    connectionStoreOverrides?: Parameters<typeof createConnectionStoreState>[0]
) {
    const agentState = createAgentStoreState(agentStoreOverrides);
    const connectionState = createConnectionStoreState(connectionStoreOverrides);

    vi.mocked(useAgentStore).mockReturnValue(
        agentState as unknown as ReturnType<typeof useAgentStore>
    );
    vi.mocked(useConnectionStore).mockReturnValue(
        connectionState as unknown as ReturnType<typeof useConnectionStore>
    );

    // Mock getState for async callbacks
    (useAgentStore as unknown as { getState: () => unknown }).getState = () => agentState;

    return {
        mockFetchAgent: agentState.fetchAgent,
        mockUpdateAgent: agentState.updateAgent,
        mockFetchThreads: agentState.fetchThreads,
        mockSetCurrentThread: agentState.setCurrentThread
    };
}

// Render helper
function renderAgentBuilder() {
    return render(
        <BrowserRouter>
            <Routes>
                <Route path="*" element={<AgentBuilder />} />
            </Routes>
        </BrowserRouter>
    );
}

describe("AgentBuilder Page", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStores();

        // Mock localStorage
        const storage: Record<string, string> = {};
        vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => storage[key] || null);
        vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
            storage[key] = value;
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    // ===== Rendering =====
    describe("rendering", () => {
        it("renders agent name in header", async () => {
            resetStores({ currentAgent: createMockAgent({ name: "My Custom Agent" }) });

            renderAgentBuilder();

            await waitFor(() => {
                expect(screen.getByText("My Custom Agent")).toBeInTheDocument();
            });
        });

        it("renders back button", async () => {
            renderAgentBuilder();

            await waitFor(() => {
                // Back button has arrow-left icon
                const backButton = document
                    .querySelector("button svg.lucide-arrow-left")
                    ?.closest("button");
                expect(backButton).toBeInTheDocument();
            });
        });

        it("renders save button", async () => {
            renderAgentBuilder();

            await waitFor(() => {
                expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
            });
        });

        it("loads agent data on mount", async () => {
            const { mockFetchAgent } = resetStores();
            renderAgentBuilder();

            await waitFor(() => {
                expect(mockFetchAgent).toHaveBeenCalledWith("agent-123");
            });
        });

        it("loads connections on mount", async () => {
            const connectionStore = createConnectionStoreState();
            vi.mocked(useConnectionStore).mockReturnValue(
                connectionStore as unknown as ReturnType<typeof useConnectionStore>
            );

            renderAgentBuilder();

            await waitFor(() => {
                expect(connectionStore.fetchConnections).toHaveBeenCalled();
            });
        });
    });

    // ===== Agent Configuration =====
    describe("agent configuration", () => {
        it("displays config panel with sections", async () => {
            renderAgentBuilder();

            await waitFor(() => {
                // Look for the config panel content - any textarea or input
                const inputs = document.querySelectorAll("textarea, input");
                expect(inputs.length).toBeGreaterThan(0);
            });
        });

        it("displays agent form elements", async () => {
            resetStores({
                currentAgent: createMockAgent({ system_prompt: "You are a coding assistant." })
            });

            renderAgentBuilder();

            await waitFor(() => {
                // Agent form should have textareas for system prompt
                const textareas = document.querySelectorAll("textarea");
                expect(textareas.length).toBeGreaterThan(0);
            });
        });
    });

    // ===== Tab Navigation =====
    describe("tab navigation", () => {
        it("renders navigation area", async () => {
            renderAgentBuilder();

            // The navigation should render some tabs/buttons
            await waitFor(() => {
                // Check for navigation icons (wrench for Build, message for Threads)
                const wrenchIcon = document.querySelector(".lucide-wrench");
                const messagesIcon = document.querySelector(".lucide-message-square");
                expect(wrenchIcon || messagesIcon).toBeInTheDocument();
            });
        });
    });

    // ===== Save Agent =====
    describe("save agent", () => {
        it("calls updateAgent when clicking save", async () => {
            const user = userEvent.setup();
            const { mockUpdateAgent } = resetStores();
            renderAgentBuilder();

            await waitFor(() => {
                expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
            });

            await user.click(screen.getByRole("button", { name: /save/i }));

            await waitFor(() => {
                expect(mockUpdateAgent).toHaveBeenCalled();
            });
        });

        it("shows loading state while saving", async () => {
            const user = userEvent.setup();
            const mockUpdateAgent = vi.fn().mockImplementation(() => new Promise(() => {}));
            resetStores({ updateAgent: mockUpdateAgent });

            renderAgentBuilder();

            await waitFor(() => {
                expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
            });

            await user.click(screen.getByRole("button", { name: /save/i }));

            await waitFor(() => {
                expect(screen.getByText(/saving/i)).toBeInTheDocument();
            });
        });
    });

    // ===== Thread Management =====
    describe("thread management", () => {
        it("loads threads on mount", async () => {
            const { mockFetchThreads } = resetStores();
            renderAgentBuilder();

            await waitFor(() => {
                expect(mockFetchThreads).toHaveBeenCalledWith("agent-123");
            });
        });
    });

    // ===== Error Handling =====
    describe("error handling", () => {
        it("handles save error gracefully", async () => {
            const user = userEvent.setup();
            const mockUpdateAgent = vi.fn().mockRejectedValue(new Error("Save failed"));

            resetStores({
                currentAgent: createMockAgent(),
                updateAgent: mockUpdateAgent
            });

            renderAgentBuilder();

            await waitFor(() => {
                expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
            });

            await user.click(screen.getByRole("button", { name: /save/i }));

            // Error should be caught - button returns to normal
            await waitFor(() => {
                expect(mockUpdateAgent).toHaveBeenCalled();
            });
        });
    });

    // ===== Null Agent State =====
    describe("null agent state", () => {
        it("handles null agent gracefully", async () => {
            resetStores({ currentAgent: null });

            renderAgentBuilder();

            // Should not crash - component handles null state
            await waitFor(() => {
                expect(document.body).toBeInTheDocument();
            });
        });
    });
});
