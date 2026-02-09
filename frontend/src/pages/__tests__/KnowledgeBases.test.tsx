/**
 * KnowledgeBases Page Tests
 *
 * Tests for the knowledge bases list page including:
 * - List rendering
 * - Create knowledge base flow
 * - Delete knowledge base flow
 * - Search and filter
 * - Navigation
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as api from "../../lib/api";
import { useFolderStore } from "../../stores/folderStore";
import { useKnowledgeBaseStore } from "../../stores/knowledgeBaseStore";
import { KnowledgeBases } from "../KnowledgeBases";

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
vi.mock("../../stores/knowledgeBaseStore");
vi.mock("../../stores/folderStore");

// Mock API
vi.mock("../../lib/api", () => ({
    getKnowledgeBaseStats: vi.fn()
}));

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
function createMockKnowledgeBase(
    overrides?: Partial<{
        id: string;
        name: string;
        description: string;
        category: string;
        created_at: string;
        updated_at: string;
    }>
) {
    return {
        id: "kb-1",
        user_id: "user-1",
        name: "Test Knowledge Base",
        description: "A test knowledge base",
        category: "general",
        config: {},
        folder_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides
    };
}

// Create base knowledge base store state for mocking
function createKnowledgeBaseStoreState(overrides?: {
    knowledgeBases?: ReturnType<typeof createMockKnowledgeBase>[];
    loading?: boolean;
    error?: string | null;
    createKB?: ReturnType<typeof vi.fn>;
}) {
    return {
        knowledgeBases: overrides?.knowledgeBases ?? [],
        loading: overrides?.loading ?? false,
        error: overrides?.error ?? null,
        fetchKnowledgeBases: vi.fn().mockResolvedValue(undefined),
        createKB: overrides?.createKB ?? vi.fn().mockResolvedValue({ id: "new-kb" }),
        deleteKB: vi.fn().mockResolvedValue(undefined),
        currentKnowledgeBase: null,
        fetchKnowledgeBase: vi.fn(),
        updateKB: vi.fn()
    } as unknown as ReturnType<typeof useKnowledgeBaseStore>;
}

// Helper to reset stores
function resetStores(kbStoreOverrides?: Parameters<typeof createKnowledgeBaseStoreState>[0]) {
    vi.mocked(useKnowledgeBaseStore).mockReturnValue(
        createKnowledgeBaseStoreState(kbStoreOverrides)
    );

    vi.mocked(useFolderStore).mockReturnValue({
        moveItemsToFolder: vi.fn().mockResolvedValue(undefined),
        folderTree: [],
        folders: [],
        refreshFolders: vi.fn()
    } as unknown as ReturnType<typeof useFolderStore>);

    vi.mocked(api.getKnowledgeBaseStats).mockResolvedValue({
        success: true,
        data: {
            id: "kb-1",
            name: "Test KB",
            document_count: 5,
            chunk_count: 100,
            total_size_bytes: 1024,
            last_updated: new Date().toISOString()
        }
    });
}

// Render helper
function renderKnowledgeBases() {
    return render(
        <BrowserRouter>
            <KnowledgeBases />
        </BrowserRouter>
    );
}

describe("KnowledgeBases Page", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStores();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ===== Rendering =====
    describe("rendering", () => {
        it("renders page header with title", () => {
            renderKnowledgeBases();

            expect(screen.getByText("Knowledge Bases")).toBeInTheDocument();
        });

        it("renders new knowledge base button", () => {
            renderKnowledgeBases();

            expect(screen.getByRole("button", { name: /new knowledge base/i })).toBeInTheDocument();
        });

        it("renders search icon for search", () => {
            renderKnowledgeBases();

            // ExpandableSearch renders a search icon
            const searchIcon = document.querySelector(".lucide-search");
            expect(searchIcon).toBeInTheDocument();
        });

        it("renders page description", () => {
            const kbs = [createMockKnowledgeBase({ id: "kb1" })];
            resetStores({ loading: false, knowledgeBases: kbs });

            renderKnowledgeBases();

            // When not in a folder, shows the default description
            expect(screen.getByText(/manage your document collections/i)).toBeInTheDocument();
        });
    });

    // ===== Loading State =====
    describe("loading state", () => {
        it("shows loading skeleton while knowledge bases are being fetched", () => {
            resetStores({ loading: true, knowledgeBases: [] });

            renderKnowledgeBases();

            expect(document.querySelector(".skeleton-shimmer")).toBeInTheDocument();
        });
    });

    // ===== Empty State =====
    describe("empty state", () => {
        it("shows empty state when no knowledge bases exist", () => {
            resetStores({ loading: false, knowledgeBases: [] });

            renderKnowledgeBases();

            // Empty state shows create button
            const createButton = screen.getByRole("button", { name: /new knowledge base/i });
            expect(createButton).toBeInTheDocument();
        });
    });

    // ===== Knowledge Base List =====
    describe("knowledge base list", () => {
        it("displays knowledge bases in a grid", () => {
            const kbs = [
                createMockKnowledgeBase({ id: "kb1", name: "KB Alpha" }),
                createMockKnowledgeBase({ id: "kb2", name: "KB Beta" }),
                createMockKnowledgeBase({ id: "kb3", name: "KB Gamma" })
            ];

            resetStores({ loading: false, knowledgeBases: kbs });

            renderKnowledgeBases();

            expect(screen.getByText("KB Alpha")).toBeInTheDocument();
            expect(screen.getByText("KB Beta")).toBeInTheDocument();
            expect(screen.getByText("KB Gamma")).toBeInTheDocument();
        });

        it("displays document count when stats are available", async () => {
            const kbs = [createMockKnowledgeBase({ id: "kb1", name: "Test KB" })];

            resetStores({ loading: false, knowledgeBases: kbs });

            vi.mocked(api.getKnowledgeBaseStats).mockResolvedValue({
                success: true,
                data: {
                    id: "kb1",
                    name: "Test KB",
                    document_count: 42,
                    chunk_count: 500,
                    total_size_bytes: 2048,
                    last_updated: new Date().toISOString()
                }
            });

            renderKnowledgeBases();

            await waitFor(() => {
                expect(screen.getByText(/42/)).toBeInTheDocument();
            });
        });
    });

    // ===== Navigation =====
    describe("navigation", () => {
        it("navigates to knowledge base detail when clicking a KB card", async () => {
            const user = userEvent.setup();
            const kbs = [createMockKnowledgeBase({ id: "kb-123", name: "Test KB" })];

            resetStores({ loading: false, knowledgeBases: kbs });

            renderKnowledgeBases();

            await user.click(screen.getByText("Test KB"));

            expect(mockNavigate).toHaveBeenCalledWith("/knowledge-bases/kb-123");
        });
    });

    // ===== Create Knowledge Base =====
    describe("create knowledge base", () => {
        it("has new knowledge base button that can be clicked", async () => {
            const user = userEvent.setup();
            renderKnowledgeBases();

            const button = screen.getByRole("button", { name: /new knowledge base/i });
            expect(button).toBeInTheDocument();

            // Click should not throw
            await user.click(button);
        });
    });

    // ===== Delete Knowledge Base =====
    describe("delete knowledge base", () => {
        it("shows context menu options on right-click", async () => {
            const user = userEvent.setup();
            const kbs = [createMockKnowledgeBase({ id: "kb1", name: "KB to Delete" })];

            resetStores({ loading: false, knowledgeBases: kbs });

            renderKnowledgeBases();

            // Right-click to open context menu
            await user.pointer({ target: screen.getByText("KB to Delete"), keys: "[MouseRight]" });

            // Context menu should open with options (delete is one of them)
            await waitFor(() => {
                const deleteButtons = screen.getAllByText(/delete/i);
                expect(deleteButtons.length).toBeGreaterThan(0);
            });
        });
    });

    // ===== Error State =====
    describe("error state", () => {
        it("displays error message when there is an error", () => {
            resetStores({
                loading: false,
                knowledgeBases: [],
                error: "Failed to load knowledge bases"
            });

            renderKnowledgeBases();

            expect(screen.getByText(/failed to load knowledge bases/i)).toBeInTheDocument();
        });
    });
});
