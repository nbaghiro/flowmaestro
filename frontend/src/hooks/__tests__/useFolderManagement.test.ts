/**
 * useFolderManagement Hook Tests
 *
 * Tests for the folder management hook used across item list pages.
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FolderWithCounts } from "@flowmaestro/shared";

// Mock navigate and router hooks
const mockNavigate = vi.fn();
const mockSetSearchParams = vi.fn();
let mockPathname = "/workflows";
let mockSearchParams = new URLSearchParams();

vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => ({ pathname: mockPathname, state: null, search: "" }),
        useSearchParams: () => [mockSearchParams, mockSetSearchParams]
    };
});

// Mock tanstack query
const mockInvalidateQueries = vi.fn();
vi.mock("@tanstack/react-query", () => ({
    useQueryClient: () => ({
        invalidateQueries: mockInvalidateQueries
    })
}));

// Mock API
const mockGetFolders = vi.fn();
const mockUpdateFolder = vi.fn();
const mockRemoveItemsFromFolder = vi.fn();

vi.mock("../../lib/api", () => ({
    getFolders: () => mockGetFolders(),
    updateFolder: (...args: unknown[]) => mockUpdateFolder(...args),
    removeItemsFromFolder: (...args: unknown[]) => mockRemoveItemsFromFolder(...args)
}));

// Mock folder utils
const mockCheckItemsInFolder = vi.fn();
vi.mock("../../lib/folderUtils", async () => {
    const actual = await vi.importActual("../../lib/folderUtils");
    return {
        ...actual,
        checkItemsInFolder: (...args: unknown[]) => mockCheckItemsInFolder(...args)
    };
});

// Mock folder store
const mockCreateFolder = vi.fn();
const mockMoveItemsToFolder = vi.fn();
const mockDeleteFolder = vi.fn();
let mockStoreFolders: FolderWithCounts[] = [];

vi.mock("../../stores/folderStore", async () => {
    const actual = await vi.importActual("../../stores/folderStore");
    return {
        ...actual,
        useFolderStore: () => ({
            createFolder: mockCreateFolder,
            moveItemsToFolder: mockMoveItemsToFolder,
            deleteFolder: mockDeleteFolder,
            folders: mockStoreFolders
        })
    };
});

// Mock UI preferences store
let mockShowFoldersSection = true;
const mockSetShowFoldersSection = vi.fn();

vi.mock("../../stores/uiPreferencesStore", () => ({
    useUIPreferencesStore: () => ({
        showFoldersSection: mockShowFoldersSection,
        setShowFoldersSection: mockSetShowFoldersSection
    })
}));

// Mock logger
vi.mock("../../lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));

// Import after mocks
import { useFolderManagement } from "../useFolderManagement";

// Test helpers
function createMockFolder(overrides?: Partial<FolderWithCounts>): FolderWithCounts {
    return {
        id: "folder-1",
        userId: "user-1",
        name: "Test Folder",
        color: "#6366f1",
        position: 0,
        depth: 0,
        path: "/folder-1",
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        itemCounts: {
            workflows: 0,
            agents: 0,
            chatInterfaces: 0,
            formInterfaces: 0,
            knowledgeBases: 0,
            total: 0
        },
        ...overrides
    };
}

function createMouseEvent(options: Partial<React.MouseEvent> = {}): React.MouseEvent {
    return {
        preventDefault: vi.fn(),
        shiftKey: false,
        ...options
    } as unknown as React.MouseEvent;
}

const defaultHookOptions = {
    itemType: "workflow" as const,
    onReloadItems: vi.fn().mockResolvedValue(undefined)
};

describe("useFolderManagement", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPathname = "/workflows";
        mockSearchParams = new URLSearchParams();
        mockStoreFolders = [];
        mockShowFoldersSection = true;
        mockGetFolders.mockResolvedValue({ success: true, data: [] });
        mockCheckItemsInFolder.mockResolvedValue({
            found: false,
            folderName: "",
            folderId: "",
            isInMainFolder: false
        });
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("starts with loading state", () => {
            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            expect(result.current.isLoadingFolders).toBe(true);
        });

        it("loads folders on mount", async () => {
            const folders = [createMockFolder()];
            mockGetFolders.mockResolvedValue({ success: true, data: folders });

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            expect(result.current.folders).toEqual(folders);
            expect(mockGetFolders).toHaveBeenCalled();
        });

        it("initializes with empty selection", () => {
            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            expect(result.current.selectedFolderIds.size).toBe(0);
        });

        it("initializes dialog states as closed", () => {
            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            expect(result.current.isCreateFolderDialogOpen).toBe(false);
            expect(result.current.isMoveDialogOpen).toBe(false);
            expect(result.current.folderToEdit).toBeNull();
            expect(result.current.folderToDelete).toBeNull();
        });
    });

    // ===== URL-based Folder ID Resolution =====
    describe("currentFolderId resolution", () => {
        it("extracts folder ID from URL path /folders/:id", async () => {
            mockPathname = "/folders/abc-123";

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            expect(result.current.currentFolderId).toBe("abc-123");
        });

        it("extracts folder ID from URL path /folders/:id/items", async () => {
            mockPathname = "/folders/abc-123/items";

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            expect(result.current.currentFolderId).toBe("abc-123");
        });

        it("returns null for non-folder paths", async () => {
            mockPathname = "/workflows";

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            expect(result.current.currentFolderId).toBeNull();
        });

        it("uses search params when path has no folder ID", async () => {
            mockPathname = "/workflows";
            mockSearchParams = new URLSearchParams("folder=param-folder-id");

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            expect(result.current.currentFolderId).toBe("param-folder-id");
        });

        it("prefers path over search params", async () => {
            mockPathname = "/folders/path-folder-id";
            mockSearchParams = new URLSearchParams("folder=param-folder-id");

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            expect(result.current.currentFolderId).toBe("path-folder-id");
        });
    });

    // ===== Computed Values =====
    describe("computed values", () => {
        it("computes rootFolders as depth 0 folders when not in a folder", async () => {
            const folders = [
                createMockFolder({ id: "root-1", depth: 0 }),
                createMockFolder({ id: "root-2", depth: 0 }),
                createMockFolder({ id: "child-1", depth: 1, parentId: "root-1" })
            ];
            mockGetFolders.mockResolvedValue({ success: true, data: folders });
            mockPathname = "/workflows";

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            expect(result.current.rootFolders).toHaveLength(2);
            expect(result.current.rootFolders.map((f) => f.id)).toEqual(["root-1", "root-2"]);
        });

        it("returns empty rootFolders when inside a folder", async () => {
            const folders = [
                createMockFolder({ id: "root-1", depth: 0 }),
                createMockFolder({ id: "child-1", depth: 1, parentId: "root-1" })
            ];
            mockGetFolders.mockResolvedValue({ success: true, data: folders });
            mockPathname = "/folders/root-1";

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            expect(result.current.rootFolders).toHaveLength(0);
        });

        it("canShowFoldersSection is true when not in folder and has folders", async () => {
            const folders = [createMockFolder({ id: "root-1", depth: 0 })];
            mockGetFolders.mockResolvedValue({ success: true, data: folders });
            mockPathname = "/workflows";

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            expect(result.current.canShowFoldersSection).toBe(true);
        });

        it("canShowFoldersSection is false when inside a folder", async () => {
            const folders = [createMockFolder({ id: "root-1", depth: 0 })];
            mockGetFolders.mockResolvedValue({ success: true, data: folders });
            mockPathname = "/folders/root-1";

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            expect(result.current.canShowFoldersSection).toBe(false);
        });

        it("canShowFoldersSection is false when no folders exist", async () => {
            mockGetFolders.mockResolvedValue({ success: true, data: [] });
            mockPathname = "/workflows";

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            expect(result.current.canShowFoldersSection).toBe(false);
        });

        it("sets currentFolder when inside a folder", async () => {
            const folder = createMockFolder({ id: "folder-123", name: "My Folder" });
            mockGetFolders.mockResolvedValue({ success: true, data: [folder] });
            mockPathname = "/folders/folder-123";

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.currentFolder).not.toBeNull();
            });

            expect(result.current.currentFolder?.id).toBe("folder-123");
            expect(result.current.currentFolder?.name).toBe("My Folder");
        });
    });

    // ===== Folder Click Behavior =====
    describe("handleFolderClick", () => {
        it("navigates to folder on normal click with no selection", async () => {
            const folder = createMockFolder({ id: "folder-1", name: "Test" });
            mockGetFolders.mockResolvedValue({ success: true, data: [folder] });

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            act(() => {
                result.current.handleFolderClick(createMouseEvent(), folder);
            });

            expect(mockNavigate).toHaveBeenCalledWith("/folders/folder-1", {
                state: { sourceItemType: "workflow" }
            });
        });

        it("toggles selection on shift+click", async () => {
            const folder = createMockFolder({ id: "folder-1" });
            mockGetFolders.mockResolvedValue({ success: true, data: [folder] });

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            // Shift+click to select
            act(() => {
                result.current.handleFolderClick(createMouseEvent({ shiftKey: true }), folder);
            });

            expect(result.current.selectedFolderIds.has("folder-1")).toBe(true);

            // Shift+click again to deselect
            act(() => {
                result.current.handleFolderClick(createMouseEvent({ shiftKey: true }), folder);
            });

            expect(result.current.selectedFolderIds.has("folder-1")).toBe(false);
        });

        it("clears selection on normal click when folders are selected", async () => {
            const folder1 = createMockFolder({ id: "folder-1" });
            const folder2 = createMockFolder({ id: "folder-2" });
            mockGetFolders.mockResolvedValue({ success: true, data: [folder1, folder2] });

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            // Select folder1 with shift+click
            act(() => {
                result.current.handleFolderClick(createMouseEvent({ shiftKey: true }), folder1);
            });

            expect(result.current.selectedFolderIds.size).toBe(1);

            // Normal click on folder2 should clear selection (not navigate)
            act(() => {
                result.current.handleFolderClick(createMouseEvent(), folder2);
            });

            expect(result.current.selectedFolderIds.size).toBe(0);
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it("supports multi-selection with shift+click", async () => {
            const folder1 = createMockFolder({ id: "folder-1" });
            const folder2 = createMockFolder({ id: "folder-2" });
            const folder3 = createMockFolder({ id: "folder-3" });
            mockGetFolders.mockResolvedValue({ success: true, data: [folder1, folder2, folder3] });

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            act(() => {
                result.current.handleFolderClick(createMouseEvent({ shiftKey: true }), folder1);
                result.current.handleFolderClick(createMouseEvent({ shiftKey: true }), folder2);
                result.current.handleFolderClick(createMouseEvent({ shiftKey: true }), folder3);
            });

            expect(result.current.selectedFolderIds.size).toBe(3);
            expect(result.current.selectedFolderIds.has("folder-1")).toBe(true);
            expect(result.current.selectedFolderIds.has("folder-2")).toBe(true);
            expect(result.current.selectedFolderIds.has("folder-3")).toBe(true);
        });
    });

    // ===== Expand/Collapse =====
    describe("handleToggleFolderExpand", () => {
        it("expands a collapsed folder", async () => {
            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            expect(result.current.expandedFolderIds.has("folder-1")).toBe(false);

            act(() => {
                result.current.handleToggleFolderExpand("folder-1");
            });

            expect(result.current.expandedFolderIds.has("folder-1")).toBe(true);
        });

        it("collapses an expanded folder", async () => {
            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            act(() => {
                result.current.handleToggleFolderExpand("folder-1");
            });

            expect(result.current.expandedFolderIds.has("folder-1")).toBe(true);

            act(() => {
                result.current.handleToggleFolderExpand("folder-1");
            });

            expect(result.current.expandedFolderIds.has("folder-1")).toBe(false);
        });

        it("supports multiple expanded folders", async () => {
            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            act(() => {
                result.current.handleToggleFolderExpand("folder-1");
                result.current.handleToggleFolderExpand("folder-2");
            });

            expect(result.current.expandedFolderIds.has("folder-1")).toBe(true);
            expect(result.current.expandedFolderIds.has("folder-2")).toBe(true);
        });
    });

    // ===== Folder CRUD Operations =====
    describe("folder operations", () => {
        it("creates folder and reloads", async () => {
            mockCreateFolder.mockResolvedValue({ id: "new-folder" });

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            await act(async () => {
                await result.current.handleCreateFolder("New Folder", "#ff0000");
            });

            expect(mockCreateFolder).toHaveBeenCalledWith({ name: "New Folder", color: "#ff0000" });
            expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["folderContents"] });
        });

        it("edits folder when folderToEdit is set", async () => {
            const folder = createMockFolder({ id: "edit-me", name: "Old Name" });
            mockGetFolders.mockResolvedValue({ success: true, data: [folder] });
            mockUpdateFolder.mockResolvedValue({ success: true });

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            act(() => {
                result.current.setFolderToEdit(folder);
            });

            await act(async () => {
                await result.current.handleEditFolder("New Name", "#00ff00");
            });

            expect(mockUpdateFolder).toHaveBeenCalledWith("edit-me", {
                name: "New Name",
                color: "#00ff00"
            });
            expect(result.current.folderToEdit).toBeNull();
        });

        it("deletes folder and navigates to root if viewing deleted folder", async () => {
            const folder = createMockFolder({ id: "delete-me" });
            mockGetFolders.mockResolvedValue({ success: true, data: [folder] });
            mockDeleteFolder.mockResolvedValue({ success: true });
            mockPathname = "/folders/delete-me";

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            act(() => {
                result.current.setFolderToDelete(folder);
            });

            await act(async () => {
                await result.current.handleDeleteFolder();
            });

            expect(mockDeleteFolder).toHaveBeenCalledWith("delete-me");
            expect(mockSetSearchParams).toHaveBeenCalledWith({});
            expect(result.current.folderToDelete).toBeNull();
        });
    });

    // ===== Batch Delete =====
    describe("handleBatchDeleteFolders", () => {
        it("deletes all selected folders", async () => {
            const folder1 = createMockFolder({ id: "folder-1" });
            const folder2 = createMockFolder({ id: "folder-2" });
            mockGetFolders.mockResolvedValue({ success: true, data: [folder1, folder2] });
            mockDeleteFolder.mockResolvedValue({ success: true });

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            // Select both folders
            act(() => {
                result.current.handleFolderClick(createMouseEvent({ shiftKey: true }), folder1);
                result.current.handleFolderClick(createMouseEvent({ shiftKey: true }), folder2);
            });

            expect(result.current.selectedFolderIds.size).toBe(2);

            await act(async () => {
                await result.current.handleBatchDeleteFolders();
            });

            expect(mockDeleteFolder).toHaveBeenCalledTimes(2);
            expect(result.current.selectedFolderIds.size).toBe(0);
        });

        it("does nothing when no folders are selected", async () => {
            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await act(async () => {
                await result.current.handleBatchDeleteFolders();
            });

            expect(mockDeleteFolder).not.toHaveBeenCalled();
        });

        it("sets isBatchDeleting during operation", async () => {
            const folder = createMockFolder({ id: "folder-1" });
            mockGetFolders.mockResolvedValue({ success: true, data: [folder] });

            let resolveFn: () => void;
            mockDeleteFolder.mockReturnValue(
                new Promise((resolve) => {
                    resolveFn = () => resolve({ success: true });
                })
            );

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            act(() => {
                result.current.handleFolderClick(createMouseEvent({ shiftKey: true }), folder);
            });

            let batchDeletePromise: Promise<void>;
            act(() => {
                batchDeletePromise = result.current.handleBatchDeleteFolders();
            });

            expect(result.current.isBatchDeleting).toBe(true);

            await act(async () => {
                resolveFn!();
                await batchDeletePromise;
            });

            expect(result.current.isBatchDeleting).toBe(false);
        });
    });

    // ===== Context Menu =====
    describe("handleFolderContextMenu", () => {
        it("selects folder if not already selected", async () => {
            const folder = createMockFolder({ id: "folder-1" });
            mockGetFolders.mockResolvedValue({ success: true, data: [folder] });

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            act(() => {
                result.current.handleFolderContextMenu(createMouseEvent(), folder);
            });

            expect(result.current.selectedFolderIds.has("folder-1")).toBe(true);
            expect(result.current.selectedFolderIds.size).toBe(1);
        });

        it("keeps existing selection if folder already selected", async () => {
            const folder1 = createMockFolder({ id: "folder-1" });
            const folder2 = createMockFolder({ id: "folder-2" });
            mockGetFolders.mockResolvedValue({ success: true, data: [folder1, folder2] });

            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            await waitFor(() => {
                expect(result.current.isLoadingFolders).toBe(false);
            });

            // Select both folders
            act(() => {
                result.current.handleFolderClick(createMouseEvent({ shiftKey: true }), folder1);
                result.current.handleFolderClick(createMouseEvent({ shiftKey: true }), folder2);
            });

            // Right-click on already selected folder
            act(() => {
                result.current.handleFolderContextMenu(createMouseEvent(), folder1);
            });

            // Should keep both selected
            expect(result.current.selectedFolderIds.size).toBe(2);
        });
    });

    // ===== Navigation =====
    describe("handleNavigateToRoot", () => {
        it("clears search params", async () => {
            const { result } = renderHook(() => useFolderManagement(defaultHookOptions));

            act(() => {
                result.current.handleNavigateToRoot();
            });

            expect(mockSetSearchParams).toHaveBeenCalledWith({});
        });
    });
});
