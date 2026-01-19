/**
 * useFolderManagement Hook Tests
 *
 * Tests for folder management logic - URL parsing, tree building,
 * selection behavior, and drag-drop conflict detection.
 */

import { describe, it, expect } from "vitest";
import type { FolderWithCounts } from "@flowmaestro/shared";

// ===== URL Parsing Logic =====
describe("folder ID extraction from URL", () => {
    const extractFolderIdFromPath = (pathname: string): string | null => {
        if (pathname.startsWith("/folders/")) {
            return pathname.split("/folders/")[1]?.split("/")[0] || null;
        }
        return null;
    };

    it("extracts folder ID from /folders/:id path", () => {
        expect(extractFolderIdFromPath("/folders/abc-123")).toBe("abc-123");
    });

    it("extracts folder ID from /folders/:id/items path", () => {
        expect(extractFolderIdFromPath("/folders/abc-123/items")).toBe("abc-123");
    });

    it("returns null for non-folder paths", () => {
        expect(extractFolderIdFromPath("/workflows")).toBeNull();
        expect(extractFolderIdFromPath("/agents")).toBeNull();
        expect(extractFolderIdFromPath("/")).toBeNull();
    });

    it("handles edge case of /folders/ with no ID", () => {
        expect(extractFolderIdFromPath("/folders/")).toBeNull();
    });
});

// ===== Folder Tree Building =====
describe("folder tree building", () => {
    const buildFolderTree = (folders: FolderWithCounts[]): FolderWithCounts[] => {
        const folderMap = new Map<string, FolderWithCounts>();
        const rootFolders: FolderWithCounts[] = [];

        // First pass: create map and initialize children
        folders.forEach((folder) => {
            folderMap.set(folder.id, { ...folder, children: [] });
        });

        // Second pass: build tree structure
        folders.forEach((folder) => {
            const node = folderMap.get(folder.id)!;
            if (folder.parentId && folderMap.has(folder.parentId)) {
                folderMap.get(folder.parentId)!.children.push(node);
            } else if (folder.depth === 0) {
                rootFolders.push(node);
            }
        });

        return rootFolders;
    };

    const createFolder = (
        id: string,
        name: string,
        depth: number,
        parentId: string | null = null
    ): FolderWithCounts => ({
        id,
        name,
        color: "#000",
        depth,
        parentId,
        createdAt: "",
        updatedAt: "",
        workspaceId: "ws-1",
        children: [],
        itemCounts: {
            workflows: 0,
            agents: 0,
            chatInterfaces: 0,
            formInterfaces: 0,
            knowledgeBases: 0
        }
    });

    it("builds flat list of root folders correctly", () => {
        const folders = [
            createFolder("1", "Marketing", 0),
            createFolder("2", "Sales", 0),
            createFolder("3", "Engineering", 0)
        ];

        const tree = buildFolderTree(folders);
        expect(tree).toHaveLength(3);
        expect(tree.every((f) => f.children.length === 0)).toBe(true);
    });

    it("nests children under parent folders", () => {
        const folders = [
            createFolder("1", "Marketing", 0),
            createFolder("2", "Campaigns", 1, "1"),
            createFolder("3", "Social", 1, "1")
        ];

        const tree = buildFolderTree(folders);
        expect(tree).toHaveLength(1);
        expect(tree[0].children).toHaveLength(2);
        expect(tree[0].children.map((c) => c.name)).toContain("Campaigns");
        expect(tree[0].children.map((c) => c.name)).toContain("Social");
    });

    it("handles deeply nested folders", () => {
        const folders = [
            createFolder("1", "Root", 0),
            createFolder("2", "Level1", 1, "1"),
            createFolder("3", "Level2", 2, "2")
        ];

        const tree = buildFolderTree(folders);
        expect(tree[0].children[0].children[0].name).toBe("Level2");
    });

    it("handles orphaned folders (parent not found)", () => {
        const folders = [
            createFolder("1", "Root", 0),
            createFolder("2", "Orphan", 1, "non-existent")
        ];

        const tree = buildFolderTree(folders);
        expect(tree).toHaveLength(1);
        expect(tree[0].name).toBe("Root");
    });
});

// ===== Selection Logic =====
describe("folder selection logic", () => {
    const toggleSelection = (currentSelection: Set<string>, folderId: string): Set<string> => {
        const newSet = new Set(currentSelection);
        if (newSet.has(folderId)) {
            newSet.delete(folderId);
        } else {
            newSet.add(folderId);
        }
        return newSet;
    };

    it("adds folder to empty selection", () => {
        const result = toggleSelection(new Set(), "folder-1");
        expect(result.has("folder-1")).toBe(true);
        expect(result.size).toBe(1);
    });

    it("removes folder from selection when already selected", () => {
        const result = toggleSelection(new Set(["folder-1"]), "folder-1");
        expect(result.has("folder-1")).toBe(false);
        expect(result.size).toBe(0);
    });

    it("supports multi-selection", () => {
        let selection = new Set<string>();
        selection = toggleSelection(selection, "folder-1");
        selection = toggleSelection(selection, "folder-2");
        selection = toggleSelection(selection, "folder-3");

        expect(selection.size).toBe(3);
        expect(selection.has("folder-1")).toBe(true);
        expect(selection.has("folder-2")).toBe(true);
        expect(selection.has("folder-3")).toBe(true);
    });

    it("removes only clicked folder from multi-selection", () => {
        const selection = toggleSelection(
            new Set(["folder-1", "folder-2", "folder-3"]),
            "folder-2"
        );
        expect(selection.size).toBe(2);
        expect(selection.has("folder-2")).toBe(false);
        expect(selection.has("folder-1")).toBe(true);
        expect(selection.has("folder-3")).toBe(true);
    });
});

// ===== Drag-Drop Auto-Move Logic =====
describe("drag-drop auto-move decision", () => {
    interface DropContext {
        currentFolderId: string | null;
        sourceFolderId: string | null;
        targetFolderId: string;
        isInMainFolder: boolean;
    }

    const shouldAutoMove = (ctx: DropContext): boolean => {
        const hasCurrentFolder = Boolean(ctx.currentFolderId);
        const itemInCurrentFolder =
            ctx.sourceFolderId != null &&
            ctx.currentFolderId != null &&
            ctx.sourceFolderId === ctx.currentFolderId;
        const movingToDifferentFolder = ctx.targetFolderId !== ctx.sourceFolderId;
        const itemInMainFolder = ctx.isInMainFolder === true;

        return (
            hasCurrentFolder && itemInCurrentFolder && movingToDifferentFolder && itemInMainFolder
        );
    };

    it("auto-moves when moving from main folder to subfolder within same view", () => {
        const result = shouldAutoMove({
            currentFolderId: "parent",
            sourceFolderId: "parent",
            targetFolderId: "subfolder",
            isInMainFolder: true
        });
        expect(result).toBe(true);
    });

    it("does not auto-move when not inside a folder view", () => {
        const result = shouldAutoMove({
            currentFolderId: null,
            sourceFolderId: "parent",
            targetFolderId: "subfolder",
            isInMainFolder: true
        });
        expect(result).toBe(false);
    });

    it("does not auto-move when item is in a different folder", () => {
        const result = shouldAutoMove({
            currentFolderId: "folder-a",
            sourceFolderId: "folder-b",
            targetFolderId: "subfolder",
            isInMainFolder: true
        });
        expect(result).toBe(false);
    });

    it("does not auto-move when dropping on same folder", () => {
        const result = shouldAutoMove({
            currentFolderId: "parent",
            sourceFolderId: "parent",
            targetFolderId: "parent",
            isInMainFolder: true
        });
        expect(result).toBe(false);
    });

    it("does not auto-move when item is in subfolder (not main)", () => {
        const result = shouldAutoMove({
            currentFolderId: "parent",
            sourceFolderId: "parent",
            targetFolderId: "other-subfolder",
            isInMainFolder: false
        });
        expect(result).toBe(false);
    });
});

// ===== Computed Values =====
describe("computed folder values", () => {
    const createFolder = (id: string, depth: number): FolderWithCounts => ({
        id,
        name: `Folder ${id}`,
        color: "#000",
        depth,
        parentId: null,
        createdAt: "",
        updatedAt: "",
        workspaceId: "ws-1",
        children: [],
        itemCounts: {
            workflows: 0,
            agents: 0,
            chatInterfaces: 0,
            formInterfaces: 0,
            knowledgeBases: 0
        }
    });

    it("rootFolders filters to depth 0 only", () => {
        const folders = [
            createFolder("1", 0),
            createFolder("2", 0),
            createFolder("3", 1),
            createFolder("4", 2)
        ];

        const rootFolders = folders.filter((f) => f.depth === 0);
        expect(rootFolders).toHaveLength(2);
    });

    it("canShowFoldersSection is true when not in folder and has folders", () => {
        const currentFolderId: string | null = null;
        const rootFolders = [createFolder("1", 0)];

        const canShow = !currentFolderId && rootFolders.length > 0;
        expect(canShow).toBe(true);
    });

    it("canShowFoldersSection is false when inside a folder", () => {
        const currentFolderId: string | null = "folder-1";
        const rootFolders = [createFolder("1", 0)];

        const canShow = !currentFolderId && rootFolders.length > 0;
        expect(canShow).toBe(false);
    });

    it("canShowFoldersSection is false when no folders exist", () => {
        const currentFolderId: string | null = null;
        const rootFolders: FolderWithCounts[] = [];

        const canShow = !currentFolderId && rootFolders.length > 0;
        expect(canShow).toBe(false);
    });
});

// ===== Expand/Collapse Logic =====
describe("folder expand/collapse", () => {
    const toggleExpand = (expandedIds: Set<string>, folderId: string): Set<string> => {
        const next = new Set(expandedIds);
        if (next.has(folderId)) {
            next.delete(folderId);
        } else {
            next.add(folderId);
        }
        return next;
    };

    it("expands collapsed folder", () => {
        const result = toggleExpand(new Set(), "folder-1");
        expect(result.has("folder-1")).toBe(true);
    });

    it("collapses expanded folder", () => {
        const result = toggleExpand(new Set(["folder-1"]), "folder-1");
        expect(result.has("folder-1")).toBe(false);
    });

    it("can have multiple folders expanded", () => {
        let expanded = new Set<string>();
        expanded = toggleExpand(expanded, "folder-1");
        expanded = toggleExpand(expanded, "folder-2");

        expect(expanded.has("folder-1")).toBe(true);
        expect(expanded.has("folder-2")).toBe(true);
    });
});
