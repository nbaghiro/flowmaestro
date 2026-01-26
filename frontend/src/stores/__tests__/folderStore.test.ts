/**
 * Folder Store Tests
 *
 * Tests for folder state management including CRUD operations,
 * folder tree building, folder contents, and UI state.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the API module
vi.mock("../../lib/api", () => ({
    getFolders: vi.fn(),
    getFolderTree: vi.fn(),
    getFolderContents: vi.fn(),
    createFolder: vi.fn(),
    updateFolder: vi.fn(),
    deleteFolder: vi.fn(),
    moveItemsToFolder: vi.fn(),
    moveFolder: vi.fn()
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
import { useFolderStore, buildFolderTree } from "../folderStore";

// Mock folder data
function createMockFolder(overrides?: Record<string, unknown>) {
    return {
        id: "folder-123",
        userId: "user-123",
        name: "Test Folder",
        color: "#6366f1",
        parentId: null,
        position: 0,
        depth: 0,
        path: "/",
        itemCounts: {
            workflows: 0,
            agents: 0,
            formInterfaces: 0,
            chatInterfaces: 0,
            knowledgeBases: 0,
            total: 0
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides
    };
}

function createMockFolderContents() {
    const folder = createMockFolder();
    return {
        folder: {
            ...folder,
            ancestors: [] // FolderWithAncestors requires ancestors array
        },
        items: {
            workflows: [],
            agents: [],
            formInterfaces: [],
            chatInterfaces: [],
            knowledgeBases: []
        },
        itemCounts: {
            workflows: 0,
            agents: 0,
            formInterfaces: 0,
            chatInterfaces: 0,
            knowledgeBases: 0,
            total: 0
        },
        subfolders: []
    };
}

// Reset store before each test
function resetStore() {
    useFolderStore.setState({
        folders: [],
        folderTree: [],
        isLoadingFolders: false,
        foldersError: null,
        currentFolderContents: null,
        isLoadingContents: false,
        contentsError: null,
        showAllFolders: false,
        expandedFolderIds: new Set()
    });
}

describe("folderStore", () => {
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
            const state = useFolderStore.getState();

            expect(state.folders).toEqual([]);
            expect(state.folderTree).toEqual([]);
            expect(state.isLoadingFolders).toBe(false);
            expect(state.foldersError).toBeNull();
            expect(state.currentFolderContents).toBeNull();
            expect(state.showAllFolders).toBe(false);
        });
    });

    // ===== Fetch Folders =====
    describe("fetchFolders", () => {
        it("fetches folders successfully", async () => {
            const mockFolders = [createMockFolder(), createMockFolder({ id: "folder-456" })];
            vi.mocked(api.getFolders).mockResolvedValueOnce({
                success: true,
                data: mockFolders
            });

            await useFolderStore.getState().fetchFolders();

            const state = useFolderStore.getState();
            expect(state.folders).toHaveLength(2);
            expect(state.isLoadingFolders).toBe(false);
            expect(state.foldersError).toBeNull();
        });

        it("skips fetch if already loading", async () => {
            useFolderStore.setState({ isLoadingFolders: true });

            await useFolderStore.getState().fetchFolders();

            expect(api.getFolders).not.toHaveBeenCalled();
        });

        it("skips fetch if folders already loaded", async () => {
            useFolderStore.setState({ folders: [createMockFolder()] });

            await useFolderStore.getState().fetchFolders();

            expect(api.getFolders).not.toHaveBeenCalled();
        });

        it("handles fetch error", async () => {
            vi.mocked(api.getFolders).mockRejectedValueOnce(new Error("Network error"));

            await useFolderStore.getState().fetchFolders();

            const state = useFolderStore.getState();
            expect(state.foldersError).toBe("Network error");
            expect(state.isLoadingFolders).toBe(false);
        });

        it("builds folder tree from flat list", async () => {
            const mockFolders = [
                createMockFolder({ id: "root-1", parentId: null, position: 0 }),
                createMockFolder({ id: "child-1", parentId: "root-1", position: 0 }),
                createMockFolder({ id: "root-2", parentId: null, position: 1 })
            ];

            vi.mocked(api.getFolders).mockResolvedValueOnce({
                success: true,
                data: mockFolders
            });

            await useFolderStore.getState().fetchFolders();

            const state = useFolderStore.getState();
            expect(state.folderTree).toHaveLength(2); // Two root folders
        });
    });

    // ===== Refresh Folders =====
    describe("refreshFolders", () => {
        it("refreshes folders ignoring cache", async () => {
            useFolderStore.setState({ folders: [createMockFolder()] });

            vi.mocked(api.getFolders).mockResolvedValueOnce({
                success: true,
                data: [createMockFolder({ id: "new-folder" })]
            });

            await useFolderStore.getState().refreshFolders();

            expect(api.getFolders).toHaveBeenCalled();

            const state = useFolderStore.getState();
            expect(state.folders[0].id).toBe("new-folder");
        });
    });

    // ===== Fetch Folder Tree =====
    describe("fetchFolderTree", () => {
        it("fetches folder tree from API", async () => {
            const mockTree = [{ ...createMockFolder(), children: [] }];

            vi.mocked(api.getFolderTree).mockResolvedValueOnce({
                success: true,
                data: mockTree
            });

            await useFolderStore.getState().fetchFolderTree();

            const state = useFolderStore.getState();
            expect(state.folderTree).toHaveLength(1);
        });
    });

    // ===== Fetch Folder Contents =====
    describe("fetchFolderContents", () => {
        it("fetches folder contents", async () => {
            const mockContents = createMockFolderContents();

            vi.mocked(api.getFolderContents).mockResolvedValueOnce({
                success: true,
                data: mockContents
            });

            await useFolderStore.getState().fetchFolderContents("folder-123");

            const state = useFolderStore.getState();
            expect(state.currentFolderContents).toEqual(mockContents);
            expect(state.isLoadingContents).toBe(false);
        });

        it("handles fetch contents error", async () => {
            vi.mocked(api.getFolderContents).mockRejectedValueOnce(new Error("Not found"));

            await useFolderStore.getState().fetchFolderContents("folder-123");

            const state = useFolderStore.getState();
            expect(state.contentsError).toBe("Not found");
            expect(state.currentFolderContents).toBeNull();
        });

        it("clears folder contents", () => {
            useFolderStore.setState({
                currentFolderContents: createMockFolderContents(),
                contentsError: "Previous error"
            });

            useFolderStore.getState().clearFolderContents();

            const state = useFolderStore.getState();
            expect(state.currentFolderContents).toBeNull();
            expect(state.contentsError).toBeNull();
        });
    });

    // ===== Create Folder =====
    describe("createFolder", () => {
        it("creates a folder", async () => {
            const mockFolder = createMockFolder();

            vi.mocked(api.createFolder).mockResolvedValueOnce({
                success: true,
                data: mockFolder
            });

            vi.mocked(api.getFolders).mockResolvedValueOnce({
                success: true,
                data: [mockFolder]
            });

            const result = await useFolderStore.getState().createFolder({
                name: "New Folder"
            });

            expect(result.id).toBe("folder-123");
            expect(api.getFolders).toHaveBeenCalled(); // Refreshes folders
        });

        it("throws error when creation fails", async () => {
            vi.mocked(api.createFolder).mockResolvedValueOnce({
                success: true,
                data: undefined
            });

            await expect(
                useFolderStore.getState().createFolder({ name: "New Folder" })
            ).rejects.toThrow("Failed to create folder: no data returned");
        });
    });

    // ===== Update Folder =====
    describe("updateFolder", () => {
        it("updates a folder", async () => {
            const originalFolder = createMockFolder();
            const updatedFolder = { ...originalFolder, name: "Updated Name" };

            useFolderStore.setState({ folders: [originalFolder] });

            vi.mocked(api.updateFolder).mockResolvedValueOnce({
                success: true,
                data: updatedFolder
            });

            vi.mocked(api.getFolders).mockResolvedValueOnce({
                success: true,
                data: [updatedFolder]
            });

            const result = await useFolderStore.getState().updateFolder("folder-123", {
                name: "Updated Name"
            });

            expect(result.name).toBe("Updated Name");
        });

        it("updates current folder contents when viewing that folder", async () => {
            const folder = createMockFolder();
            const contents = createMockFolderContents();

            useFolderStore.setState({
                folders: [folder],
                currentFolderContents: contents
            });

            vi.mocked(api.updateFolder).mockResolvedValueOnce({
                success: true,
                data: { ...folder, name: "New Name" }
            });

            vi.mocked(api.getFolders).mockResolvedValueOnce({
                success: true,
                data: [{ ...folder, name: "New Name" }]
            });

            await useFolderStore.getState().updateFolder("folder-123", { name: "New Name" });

            const state = useFolderStore.getState();
            expect(state.currentFolderContents?.folder.name).toBe("New Name");
        });
    });

    // ===== Delete Folder =====
    describe("deleteFolder", () => {
        it("deletes a folder", async () => {
            const folder = createMockFolder();
            useFolderStore.setState({ folders: [folder] });

            vi.mocked(api.deleteFolder).mockResolvedValueOnce({ success: true });
            vi.mocked(api.getFolders).mockResolvedValueOnce({
                success: true,
                data: []
            });

            await useFolderStore.getState().deleteFolder("folder-123");

            expect(api.deleteFolder).toHaveBeenCalledWith("folder-123");
        });

        it("clears contents when deleting viewed folder", async () => {
            const folder = createMockFolder();
            useFolderStore.setState({
                folders: [folder],
                currentFolderContents: createMockFolderContents()
            });

            vi.mocked(api.deleteFolder).mockResolvedValueOnce({ success: true });
            vi.mocked(api.getFolders).mockResolvedValueOnce({
                success: true,
                data: []
            });

            await useFolderStore.getState().deleteFolder("folder-123");

            const state = useFolderStore.getState();
            expect(state.currentFolderContents).toBeNull();
        });
    });

    // ===== Move Items =====
    describe("moveItemsToFolder", () => {
        it("moves items to a folder", async () => {
            vi.mocked(api.moveItemsToFolder).mockResolvedValueOnce({ success: true });
            vi.mocked(api.getFolders).mockResolvedValueOnce({
                success: true,
                data: []
            });

            await useFolderStore
                .getState()
                .moveItemsToFolder("folder-123", ["item-1", "item-2"], "workflow");

            expect(api.moveItemsToFolder).toHaveBeenCalledWith({
                folderId: "folder-123",
                itemIds: ["item-1", "item-2"],
                itemType: "workflow"
            });
        });
    });

    // ===== Move Folder =====
    describe("moveFolder", () => {
        it("moves folder to new parent", async () => {
            const folder = createMockFolder();
            const movedFolder = { ...folder, parentId: "new-parent" };

            vi.mocked(api.moveFolder).mockResolvedValueOnce({
                success: true,
                data: movedFolder
            });

            vi.mocked(api.getFolders).mockResolvedValueOnce({
                success: true,
                data: [movedFolder]
            });

            const result = await useFolderStore.getState().moveFolder("folder-123", "new-parent");

            expect(result.parentId).toBe("new-parent");
        });

        it("moves folder to root", async () => {
            const folder = createMockFolder({ parentId: "old-parent" });
            const movedFolder = { ...folder, parentId: null };

            vi.mocked(api.moveFolder).mockResolvedValueOnce({
                success: true,
                data: movedFolder
            });

            vi.mocked(api.getFolders).mockResolvedValueOnce({
                success: true,
                data: [movedFolder]
            });

            const result = await useFolderStore.getState().moveFolder("folder-123", null);

            expect(result.parentId).toBeNull();
        });
    });

    // ===== UI State =====
    describe("UI state", () => {
        it("toggles show all folders", () => {
            expect(useFolderStore.getState().showAllFolders).toBe(false);

            useFolderStore.getState().toggleShowAllFolders();
            expect(useFolderStore.getState().showAllFolders).toBe(true);

            useFolderStore.getState().toggleShowAllFolders();
            expect(useFolderStore.getState().showAllFolders).toBe(false);
        });

        it("sets show all folders explicitly", () => {
            useFolderStore.getState().setShowAllFolders(true);
            expect(useFolderStore.getState().showAllFolders).toBe(true);

            useFolderStore.getState().setShowAllFolders(false);
            expect(useFolderStore.getState().showAllFolders).toBe(false);
        });

        it("toggles folder expanded state", () => {
            expect(useFolderStore.getState().expandedFolderIds.has("folder-123")).toBe(false);

            useFolderStore.getState().toggleFolderExpanded("folder-123");
            expect(useFolderStore.getState().expandedFolderIds.has("folder-123")).toBe(true);

            useFolderStore.getState().toggleFolderExpanded("folder-123");
            expect(useFolderStore.getState().expandedFolderIds.has("folder-123")).toBe(false);
        });

        it("sets folder expanded explicitly", () => {
            useFolderStore.getState().setFolderExpanded("folder-123", true);
            expect(useFolderStore.getState().expandedFolderIds.has("folder-123")).toBe(true);

            useFolderStore.getState().setFolderExpanded("folder-123", false);
            expect(useFolderStore.getState().expandedFolderIds.has("folder-123")).toBe(false);
        });
    });

    // ===== Computed Values =====
    describe("computed values", () => {
        it("visibleFolders returns limited folders when showAllFolders is false", () => {
            const folders = Array.from({ length: 10 }, (_, i) =>
                createMockFolder({ id: `folder-${i}`, position: i })
            );
            useFolderStore.setState({ folders, showAllFolders: false });

            const visible = useFolderStore.getState().visibleFolders();
            expect(visible).toHaveLength(6); // MAX_VISIBLE_FOLDERS = 6
        });

        it("visibleFolders returns all folders when showAllFolders is true", () => {
            const folders = Array.from({ length: 10 }, (_, i) =>
                createMockFolder({ id: `folder-${i}`, position: i })
            );
            useFolderStore.setState({ folders, showAllFolders: true });

            const visible = useFolderStore.getState().visibleFolders();
            expect(visible).toHaveLength(10);
        });

        it("hasMoreFolders returns true when more than 6 folders", () => {
            const folders = Array.from({ length: 10 }, (_, i) =>
                createMockFolder({ id: `folder-${i}` })
            );
            useFolderStore.setState({ folders });

            expect(useFolderStore.getState().hasMoreFolders()).toBe(true);
        });

        it("hasMoreFolders returns false when 6 or fewer folders", () => {
            const folders = Array.from({ length: 5 }, (_, i) =>
                createMockFolder({ id: `folder-${i}` })
            );
            useFolderStore.setState({ folders });

            expect(useFolderStore.getState().hasMoreFolders()).toBe(false);
        });

        it("folderCount returns total folder count", () => {
            const folders = Array.from({ length: 5 }, (_, i) =>
                createMockFolder({ id: `folder-${i}` })
            );
            useFolderStore.setState({ folders });

            expect(useFolderStore.getState().folderCount()).toBe(5);
        });

        it("getRootFolders returns folders without parent", () => {
            const folders = [
                createMockFolder({ id: "root-1", parentId: null }),
                createMockFolder({ id: "child-1", parentId: "root-1" }),
                createMockFolder({ id: "root-2", parentId: null })
            ];
            useFolderStore.setState({ folders });

            const roots = useFolderStore.getState().getRootFolders();
            expect(roots).toHaveLength(2);
            expect(roots.map((f) => f.id)).toContain("root-1");
            expect(roots.map((f) => f.id)).toContain("root-2");
        });

        it("getChildFolders returns children of a folder", () => {
            const folders = [
                createMockFolder({ id: "root-1", parentId: null }),
                createMockFolder({ id: "child-1", parentId: "root-1" }),
                createMockFolder({ id: "child-2", parentId: "root-1" }),
                createMockFolder({ id: "child-3", parentId: "root-2" })
            ];
            useFolderStore.setState({ folders });

            const children = useFolderStore.getState().getChildFolders("root-1");
            expect(children).toHaveLength(2);
        });
    });

    // ===== Reset =====
    describe("reset", () => {
        it("resets store to initial state", () => {
            useFolderStore.setState({
                folders: [createMockFolder()],
                folderTree: [{ ...createMockFolder(), children: [] }],
                isLoadingFolders: true,
                foldersError: "Some error",
                currentFolderContents: createMockFolderContents(),
                showAllFolders: true,
                expandedFolderIds: new Set(["folder-1"])
            });

            useFolderStore.getState().reset();

            const state = useFolderStore.getState();
            expect(state.folders).toEqual([]);
            expect(state.folderTree).toEqual([]);
            expect(state.isLoadingFolders).toBe(false);
            expect(state.foldersError).toBeNull();
            expect(state.currentFolderContents).toBeNull();
            expect(state.showAllFolders).toBe(false);
            expect(state.expandedFolderIds.size).toBe(0);
        });
    });
});

// ===== buildFolderTree Helper =====
describe("buildFolderTree", () => {
    it("builds tree from flat list", () => {
        const folders = [
            createMockFolder({ id: "root-1", parentId: null, position: 0 }),
            createMockFolder({ id: "child-1", parentId: "root-1", position: 0 }),
            createMockFolder({ id: "grandchild-1", parentId: "child-1", position: 0 }),
            createMockFolder({ id: "root-2", parentId: null, position: 1 })
        ];

        const tree = buildFolderTree(folders);

        expect(tree).toHaveLength(2);
        expect(tree[0].id).toBe("root-1");
        expect(tree[0].children).toHaveLength(1);
        expect(tree[0].children[0].id).toBe("child-1");
        expect(tree[0].children[0].children).toHaveLength(1);
    });

    it("sorts children by position", () => {
        const folders = [
            createMockFolder({ id: "root", parentId: null, position: 0 }),
            createMockFolder({ id: "child-c", parentId: "root", position: 2 }),
            createMockFolder({ id: "child-a", parentId: "root", position: 0 }),
            createMockFolder({ id: "child-b", parentId: "root", position: 1 })
        ];

        const tree = buildFolderTree(folders);

        expect(tree[0].children[0].id).toBe("child-a");
        expect(tree[0].children[1].id).toBe("child-b");
        expect(tree[0].children[2].id).toBe("child-c");
    });

    it("handles orphaned folders as roots", () => {
        const folders = [
            createMockFolder({ id: "orphan", parentId: "deleted-parent", position: 0 }),
            createMockFolder({ id: "root", parentId: null, position: 1 })
        ];

        const tree = buildFolderTree(folders);

        expect(tree).toHaveLength(2);
    });

    it("handles empty folder list", () => {
        const tree = buildFolderTree([]);
        expect(tree).toEqual([]);
    });
});
