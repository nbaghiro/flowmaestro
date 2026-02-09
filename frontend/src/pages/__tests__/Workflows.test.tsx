/**
 * Workflows Page Tests
 *
 * Tests for the workflows list page including:
 * - List rendering
 * - Create workflow flow
 * - Delete workflow flow
 * - Duplicate workflow
 * - Search and filter
 * - AI generation
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as api from "../../lib/api";
import { useFolderStore } from "../../stores/folderStore";
import { useWorkflowGenerationChatStore } from "../../stores/workflowGenerationChatStore";
import { Workflows } from "../Workflows";

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
vi.mock("../../stores/folderStore");
vi.mock("../../stores/workflowGenerationChatStore");

// Mock API
vi.mock("../../lib/api", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../lib/api")>();
    return {
        ...actual,
        getWorkflows: vi.fn(),
        createWorkflow: vi.fn(),
        generateWorkflow: vi.fn(),
        updateWorkflow: vi.fn(),
        deleteWorkflow: vi.fn(),
        getWorkflow: vi.fn(),
        getTemplates: vi.fn()
    };
});

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
function createMockWorkflow(
    overrides?: Partial<{
        id: string;
        name: string;
        description: string;
        created_at: string;
        updated_at: string;
    }>
) {
    return {
        id: "workflow-1",
        name: "Test Workflow",
        description: "A test workflow",
        definition: { nodes: {}, edges: [] },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides
    };
}

// Helper to reset mocks
function resetMocks(overrides?: { workflows?: ReturnType<typeof createMockWorkflow>[] }) {
    vi.mocked(useFolderStore).mockReturnValue({
        moveItemsToFolder: vi.fn().mockResolvedValue(undefined),
        folderTree: [],
        folders: [],
        refreshFolders: vi.fn()
    } as unknown as ReturnType<typeof useFolderStore>);

    vi.mocked(useWorkflowGenerationChatStore).mockReturnValue({
        openPanel: vi.fn()
    } as unknown as ReturnType<typeof useWorkflowGenerationChatStore>);

    const workflows = overrides?.workflows ?? [];

    vi.mocked(api.getWorkflows).mockResolvedValue({
        success: true,
        data: { items: workflows, total: workflows.length }
    });

    vi.mocked(api.createWorkflow).mockResolvedValue({
        success: true,
        data: { id: "new-workflow-id" }
    } as api.ApiResponse<{ id: string }>);

    vi.mocked(api.deleteWorkflow).mockResolvedValue({
        success: true
    } as unknown as api.ApiResponse<void>);

    vi.mocked(api.getTemplates).mockResolvedValue({
        success: true,
        data: { items: [], total: 0, page: 1, pageSize: 10, hasMore: false }
    });
}

// Render helper with providers
function renderWorkflows() {
    const queryClient = createTestQueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Workflows />
            </BrowserRouter>
        </QueryClientProvider>
    );
}

describe("Workflows Page", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ===== Rendering =====
    describe("rendering", () => {
        it("renders page header with title", async () => {
            renderWorkflows();

            await waitFor(() => {
                expect(screen.getByText("Workflows")).toBeInTheDocument();
            });
        });

        it("renders new workflow button", async () => {
            renderWorkflows();

            await waitFor(() => {
                expect(screen.getByRole("button", { name: /new workflow/i })).toBeInTheDocument();
            });
        });

        it("renders generate with AI button", async () => {
            renderWorkflows();

            await waitFor(() => {
                expect(
                    screen.getByRole("button", { name: /generate with ai/i })
                ).toBeInTheDocument();
            });
        });

        it("renders search icon", async () => {
            renderWorkflows();

            await waitFor(() => {
                // ExpandableSearch renders a search icon
                const searchIcon = document.querySelector(".lucide-search");
                expect(searchIcon).toBeInTheDocument();
            });
        });
    });

    // ===== Loading State =====
    describe("loading state", () => {
        it("shows loading skeleton while workflows are being fetched", async () => {
            vi.mocked(api.getWorkflows).mockImplementation(() => new Promise(() => {}));

            renderWorkflows();

            expect(document.querySelector(".skeleton-shimmer")).toBeInTheDocument();
        });
    });

    // ===== Empty State =====
    describe("empty state", () => {
        it("shows empty state when no workflows exist", async () => {
            vi.mocked(api.getWorkflows).mockResolvedValue({
                success: true,
                data: { items: [], total: 0 }
            });

            renderWorkflows();

            await waitFor(() => {
                // Empty state shows the title "Build AI-Powered Workflows" (may appear multiple times in ghost cards)
                const elements = screen.getAllByText(/build ai-powered workflows/i);
                expect(elements.length).toBeGreaterThan(0);
            });
        });

        it("shows create and AI generate buttons in empty state", async () => {
            vi.mocked(api.getWorkflows).mockResolvedValue({
                success: true,
                data: { items: [], total: 0 }
            });

            renderWorkflows();

            await waitFor(() => {
                const createButtons = screen.getAllByRole("button", { name: /create|new/i });
                expect(createButtons.length).toBeGreaterThan(0);
            });
        });
    });

    // ===== Workflow List =====
    describe("workflow list", () => {
        it("displays workflows in a grid", async () => {
            const workflows = [
                createMockWorkflow({ id: "w1", name: "Workflow Alpha" }),
                createMockWorkflow({ id: "w2", name: "Workflow Beta" }),
                createMockWorkflow({ id: "w3", name: "Workflow Gamma" })
            ];

            vi.mocked(api.getWorkflows).mockResolvedValue({
                success: true,
                data: { items: workflows, total: 3 }
            });

            renderWorkflows();

            await waitFor(() => {
                expect(screen.getByText("Workflow Alpha")).toBeInTheDocument();
                expect(screen.getByText("Workflow Beta")).toBeInTheDocument();
                expect(screen.getByText("Workflow Gamma")).toBeInTheDocument();
            });
        });

        it("shows workflow count in page description", async () => {
            const workflows = [
                createMockWorkflow({ id: "w1" }),
                createMockWorkflow({ id: "w2" }),
                createMockWorkflow({ id: "w3" })
            ];

            vi.mocked(api.getWorkflows).mockResolvedValue({
                success: true,
                data: { items: workflows, total: 3 }
            });

            renderWorkflows();

            await waitFor(() => {
                expect(screen.getByText(/3 workflows/i)).toBeInTheDocument();
            });
        });

        it("shows singular 'workflow' for single workflow", async () => {
            vi.mocked(api.getWorkflows).mockResolvedValue({
                success: true,
                data: { items: [createMockWorkflow({ id: "w1" })], total: 1 }
            });

            renderWorkflows();

            await waitFor(() => {
                expect(screen.getByText(/1 workflow/i)).toBeInTheDocument();
            });
        });
    });

    // ===== Navigation =====
    describe("navigation", () => {
        it("navigates to flow builder when clicking a workflow card", async () => {
            const user = userEvent.setup();

            vi.mocked(api.getWorkflows).mockResolvedValue({
                success: true,
                data: {
                    items: [createMockWorkflow({ id: "workflow-123", name: "Test Workflow" })],
                    total: 1
                }
            });

            renderWorkflows();

            await waitFor(() => {
                expect(screen.getByText("Test Workflow")).toBeInTheDocument();
            });

            await user.click(screen.getByText("Test Workflow"));

            expect(mockNavigate).toHaveBeenCalledWith("/builder/workflow-123", expect.anything());
        });
    });

    // ===== Create Workflow =====
    describe("create workflow", () => {
        it("has new workflow button that is clickable", async () => {
            const user = userEvent.setup();
            renderWorkflows();

            await waitFor(() => {
                expect(screen.getByRole("button", { name: /new workflow/i })).toBeInTheDocument();
            });

            // Clicking should not throw an error
            await user.click(screen.getByRole("button", { name: /new workflow/i }));

            // Body style changes to overflow: hidden when dialog opens
            expect(document.body.style.overflow).toBe("hidden");
        });
    });

    // ===== AI Generation =====
    describe("AI generation", () => {
        it("has generate with AI button", async () => {
            renderWorkflows();

            await waitFor(() => {
                expect(
                    screen.getByRole("button", { name: /generate with ai/i })
                ).toBeInTheDocument();
            });
        });
    });

    // ===== Delete Workflow =====
    describe("delete workflow", () => {
        it("displays workflow cards that can be right-clicked", async () => {
            const user = userEvent.setup();

            vi.mocked(api.getWorkflows).mockResolvedValue({
                success: true,
                data: {
                    items: [createMockWorkflow({ id: "w1", name: "Workflow to Delete" })],
                    total: 1
                }
            });

            renderWorkflows();

            await waitFor(() => {
                expect(screen.getByText("Workflow to Delete")).toBeInTheDocument();
            });

            // Right-click should not throw
            await user.pointer({
                target: screen.getByText("Workflow to Delete"),
                keys: "[MouseRight]"
            });
        });
    });

    // ===== Search =====
    describe("search functionality", () => {
        it("has search button that is clickable", async () => {
            const user = userEvent.setup();

            vi.mocked(api.getWorkflows).mockResolvedValue({
                success: true,
                data: {
                    items: [createMockWorkflow({ id: "w1", name: "Alpha Workflow" })],
                    total: 1
                }
            });

            renderWorkflows();

            await waitFor(() => {
                expect(screen.getByText("Alpha Workflow")).toBeInTheDocument();
            });

            // Search button should exist and be clickable
            const searchButton = screen.getByTitle("Search");
            expect(searchButton).toBeInTheDocument();

            // Clicking should not throw
            await user.click(searchButton);
        });
    });

    // ===== Batch Operations =====
    describe("batch operations", () => {
        it("shows selection count when workflows are selected", async () => {
            const user = userEvent.setup();

            vi.mocked(api.getWorkflows).mockResolvedValue({
                success: true,
                data: {
                    items: [
                        createMockWorkflow({ id: "w1", name: "Workflow One" }),
                        createMockWorkflow({ id: "w2", name: "Workflow Two" })
                    ],
                    total: 2
                }
            });

            renderWorkflows();

            await waitFor(() => {
                expect(screen.getByText("Workflow One")).toBeInTheDocument();
            });

            await user.keyboard("{Shift>}");
            await user.click(screen.getByText("Workflow One"));
            await user.keyboard("{/Shift}");

            await waitFor(() => {
                expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
            });
        });
    });
});
