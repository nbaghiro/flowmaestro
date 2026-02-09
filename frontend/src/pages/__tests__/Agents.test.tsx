/**
 * Agents Page Tests
 *
 * Tests for the agents list page including:
 * - List rendering
 * - Create agent flow
 * - Delete agent flow
 * - Search and filter
 * - Batch operations
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAgentStore } from "../../stores/agentStore";
import { useFolderStore } from "../../stores/folderStore";
import { Agents } from "../Agents";
import type { Agent } from "../../lib/api";

// Helper to create a query client for each test
function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false
            }
        }
    });
}

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [new URLSearchParams(), vi.fn()]
    };
});

// Mock stores
vi.mock("../../stores/agentStore");
vi.mock("../../stores/folderStore");

// Mock hooks
vi.mock("../../hooks/useFolderManagement", () => ({
    useFolderManagement: () => ({
        folders: [],
        currentFolder: null,
        currentFolderId: null,
        isLoadingFolders: false,
        selectedFolderIds: new Set(),
        setSelectedFolderIds: vi.fn(),
        isCreateFolderDialogOpen: false,
        setIsCreateFolderDialogOpen: vi.fn(),
        folderToEdit: null,
        setFolderToEdit: vi.fn(),
        folderToDelete: null,
        setFolderToDelete: vi.fn(),
        isBatchDeleting: false,
        showFoldersSection: false,
        setShowFoldersSection: vi.fn(),
        expandedFolderIds: new Set(),
        rootFolders: [],
        canShowFoldersSection: false,
        duplicateItemWarning: null,
        setDuplicateItemWarning: vi.fn(),
        handleCreateFolder: vi.fn(),
        handleEditFolder: vi.fn(),
        handleDeleteFolder: vi.fn(),
        handleFolderClick: vi.fn(),
        handleFolderContextMenu: vi.fn(),
        handleBatchDeleteFolders: vi.fn(),
        handleNavigateToRoot: vi.fn(),
        handleRemoveFromFolder: vi.fn(),
        handleDropOnFolder: vi.fn(),
        handleToggleFolderExpand: vi.fn(),
        getFolderChildren: vi.fn(() => [])
    })
}));

// Mock data factory
function createMockAgent(overrides?: Partial<Agent>): Agent {
    return {
        id: "agent-1",
        user_id: "user-1",
        name: "Test Agent",
        description: "A test agent",
        provider: "openai",
        model: "gpt-4",
        connection_id: null,
        system_prompt: "You are a helpful assistant",
        temperature: 0.7,
        max_tokens: 4096,
        available_tools: [],
        folder_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides
    } as Agent;
}

// Helper to reset mocks
function resetMocks(overrides?: { agents?: Agent[]; isLoading?: boolean; error?: string | null }) {
    const agents = overrides?.agents ?? [];

    vi.mocked(useAgentStore).mockReturnValue({
        agents,
        isLoading: overrides?.isLoading ?? false,
        error: overrides?.error ?? null,
        fetchAgents: vi.fn().mockResolvedValue(undefined),
        deleteAgent: vi.fn().mockResolvedValue(undefined),
        currentAgent: null,
        createAgent: vi.fn(),
        updateAgent: vi.fn(),
        fetchAgent: vi.fn(),
        setCurrentAgent: vi.fn(),
        resetAgentState: vi.fn(),
        clearError: vi.fn()
    } as unknown as ReturnType<typeof useAgentStore>);

    vi.mocked(useFolderStore).mockReturnValue({
        moveItemsToFolder: vi.fn().mockResolvedValue(undefined),
        folderTree: [],
        folders: [],
        refreshFolders: vi.fn()
    } as unknown as ReturnType<typeof useFolderStore>);
}

// Render helper with providers
function renderAgents() {
    const queryClient = createTestQueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Agents />
            </BrowserRouter>
        </QueryClientProvider>
    );
}

describe("Agents Page", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ===== Rendering =====
    describe("rendering", () => {
        it("renders page header with title", () => {
            renderAgents();

            expect(screen.getByText("Agents")).toBeInTheDocument();
        });

        it("renders new agent button", () => {
            renderAgents();

            expect(screen.getByRole("button", { name: /new agent/i })).toBeInTheDocument();
        });

        it("renders search icon", () => {
            renderAgents();

            // ExpandableSearch renders a search icon
            const searchIcon = document.querySelector(".lucide-search");
            expect(searchIcon).toBeInTheDocument();
        });
    });

    // ===== Loading State =====
    describe("loading state", () => {
        it("shows loading skeleton while agents are being fetched", () => {
            resetMocks({ isLoading: true });

            renderAgents();

            expect(document.querySelector(".skeleton-shimmer")).toBeInTheDocument();
        });
    });

    // ===== Empty State =====
    describe("empty state", () => {
        it("shows empty state when no agents exist", () => {
            resetMocks({ agents: [] });

            renderAgents();

            // Should show empty state or create button
            const createButtons = screen.getAllByRole("button", { name: /new agent/i });
            expect(createButtons.length).toBeGreaterThan(0);
        });

        it("shows create button in empty state", () => {
            resetMocks({ agents: [] });

            renderAgents();

            const createButtons = screen.getAllByRole("button", { name: /create|new/i });
            expect(createButtons.length).toBeGreaterThan(0);
        });
    });

    // ===== Agent List =====
    describe("agent list", () => {
        it("displays agents in a grid", () => {
            const agents = [
                createMockAgent({ id: "a1", name: "Agent Alpha" }),
                createMockAgent({ id: "a2", name: "Agent Beta" }),
                createMockAgent({ id: "a3", name: "Agent Gamma" })
            ];
            resetMocks({ agents });

            renderAgents();

            expect(screen.getByText("Agent Alpha")).toBeInTheDocument();
            expect(screen.getByText("Agent Beta")).toBeInTheDocument();
            expect(screen.getByText("Agent Gamma")).toBeInTheDocument();
        });

        it("shows agent count in page description", () => {
            const agents = [
                createMockAgent({ id: "a1" }),
                createMockAgent({ id: "a2" }),
                createMockAgent({ id: "a3" })
            ];
            resetMocks({ agents });

            renderAgents();

            expect(screen.getByText(/3 agents/i)).toBeInTheDocument();
        });

        it("shows singular 'agent' for single agent", () => {
            resetMocks({ agents: [createMockAgent({ id: "a1" })] });

            renderAgents();

            expect(screen.getByText(/1 agent/i)).toBeInTheDocument();
        });
    });

    // ===== Navigation =====
    describe("navigation", () => {
        it("navigates to agent builder when clicking an agent card", async () => {
            const user = userEvent.setup();
            resetMocks({ agents: [createMockAgent({ id: "agent-123", name: "Test Agent" })] });

            renderAgents();

            await user.click(screen.getByText("Test Agent"));

            expect(mockNavigate).toHaveBeenCalledWith("/agents/agent-123", expect.anything());
        });
    });

    // ===== Create Agent =====
    describe("create agent", () => {
        it("has new agent button that is clickable", async () => {
            const user = userEvent.setup();
            renderAgents();

            const button = screen.getByRole("button", { name: /new agent/i });
            expect(button).toBeInTheDocument();

            // Clicking should not throw an error and body style changes
            await user.click(button);
            expect(document.body.style.overflow).toBe("hidden");
        });
    });

    // ===== Delete Agent =====
    describe("delete agent", () => {
        it("displays agent cards that can be right-clicked", async () => {
            const user = userEvent.setup();
            resetMocks({ agents: [createMockAgent({ id: "a1", name: "Agent to Delete" })] });

            renderAgents();

            expect(screen.getByText("Agent to Delete")).toBeInTheDocument();

            // Right-click should not throw
            await user.pointer({
                target: screen.getByText("Agent to Delete"),
                keys: "[MouseRight]"
            });
        });
    });

    // ===== Error State =====
    describe("error state", () => {
        it("displays error message when there is an error", () => {
            resetMocks({ error: "Failed to load agents" });

            renderAgents();

            expect(screen.getByText(/failed to load agents/i)).toBeInTheDocument();
        });
    });

    // ===== Selection =====
    describe("selection", () => {
        it("allows clicking on agent card", async () => {
            const user = userEvent.setup();
            const agents = [
                createMockAgent({ id: "a1", name: "Agent One" }),
                createMockAgent({ id: "a2", name: "Agent Two" })
            ];
            resetMocks({ agents });

            renderAgents();

            // Click on agent card should navigate
            await user.click(screen.getByText("Agent One"));

            expect(mockNavigate).toHaveBeenCalled();
        });
    });
});
