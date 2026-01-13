import { create } from "zustand";
import type {
    Folder,
    FolderWithCounts,
    FolderTreeNode,
    FolderContents,
    CreateFolderInput,
    UpdateFolderInput,
    FolderResourceType
} from "@flowmaestro/shared";
import {
    getFolders,
    getFolderTree,
    getFolderContents,
    createFolder as apiCreateFolder,
    updateFolder as apiUpdateFolder,
    deleteFolder as apiDeleteFolder,
    moveItemsToFolder as apiMoveItemsToFolder,
    moveFolder as apiMoveFolder
} from "../lib/api";
import { logger } from "../lib/logger";

// Constants
const MAX_VISIBLE_FOLDERS = 6;

interface FolderStore {
    // Folder list (for sidebar)
    folders: FolderWithCounts[];
    folderTree: FolderTreeNode[];
    isLoadingFolders: boolean;
    foldersError: string | null;

    // Current folder contents (for folder page)
    currentFolderContents: FolderContents | null;
    isLoadingContents: boolean;
    contentsError: string | null;

    // UI state
    showAllFolders: boolean;
    expandedFolderIds: Set<string>;

    // Computed
    visibleFolders: () => FolderWithCounts[];
    hasMoreFolders: () => boolean;
    folderCount: () => number;
    getRootFolders: () => FolderWithCounts[];
    getChildFolders: (parentId: string) => FolderWithCounts[];

    // Actions - folder list
    fetchFolders: () => Promise<void>;
    refreshFolders: () => Promise<void>;
    fetchFolderTree: () => Promise<void>;

    // Actions - folder contents
    fetchFolderContents: (id: string) => Promise<void>;
    clearFolderContents: () => void;

    // Actions - CRUD
    createFolder: (input: CreateFolderInput) => Promise<Folder>;
    updateFolder: (id: string, input: UpdateFolderInput) => Promise<Folder>;
    deleteFolder: (id: string) => Promise<void>;
    moveItemsToFolder: (
        folderId: string,
        itemIds: string[],
        itemType: FolderResourceType
    ) => Promise<void>;
    moveFolder: (folderId: string, newParentId: string | null) => Promise<Folder>;

    // Actions - UI state
    toggleShowAllFolders: () => void;
    setShowAllFolders: (show: boolean) => void;
    toggleFolderExpanded: (folderId: string) => void;
    setFolderExpanded: (folderId: string, expanded: boolean) => void;

    // Reset
    reset: () => void;
}

const initialState = {
    folders: [] as FolderWithCounts[],
    folderTree: [] as FolderTreeNode[],
    isLoadingFolders: false,
    foldersError: null as string | null,
    currentFolderContents: null as FolderContents | null,
    isLoadingContents: false,
    contentsError: null as string | null,
    showAllFolders: false,
    expandedFolderIds: new Set<string>()
};

// Helper function to build tree from flat folder list
export function buildFolderTree(folders: FolderWithCounts[]): FolderTreeNode[] {
    const map = new Map<string, FolderTreeNode>();
    const roots: FolderTreeNode[] = [];

    // Create nodes with empty children arrays
    for (const folder of folders) {
        map.set(folder.id, { ...folder, children: [] });
    }

    // Build tree structure
    for (const folder of folders) {
        const node = map.get(folder.id)!;
        if (folder.parentId) {
            const parent = map.get(folder.parentId);
            if (parent) {
                parent.children.push(node);
            } else {
                // Orphan becomes root (parent may have been deleted)
                roots.push(node);
            }
        } else {
            roots.push(node);
        }
    }

    // Sort children by position at each level
    const sortChildren = (nodes: FolderTreeNode[]) => {
        nodes.sort((a, b) => a.position - b.position);
        nodes.forEach((n) => sortChildren(n.children));
    };
    sortChildren(roots);

    return roots;
}

export const useFolderStore = create<FolderStore>((set, get) => ({
    ...initialState,

    // Computed getters
    visibleFolders: () => {
        const { folders, showAllFolders } = get();
        if (showAllFolders) {
            return folders;
        }
        return folders.slice(0, MAX_VISIBLE_FOLDERS);
    },

    hasMoreFolders: () => {
        const { folders } = get();
        return folders.length > MAX_VISIBLE_FOLDERS;
    },

    folderCount: () => {
        return get().folders.length;
    },

    getRootFolders: () => {
        return get().folders.filter((f) => !f.parentId);
    },

    getChildFolders: (parentId: string) => {
        return get().folders.filter((f) => f.parentId === parentId);
    },

    // Fetch all folders
    fetchFolders: async () => {
        const { isLoadingFolders, folders } = get();

        // Skip if already loading or already have data
        if (isLoadingFolders) return;
        if (folders.length > 0) return;

        set({ isLoadingFolders: true, foldersError: null });

        try {
            const response = await getFolders();
            const folderData = response.data ?? [];
            set({
                folders: folderData,
                folderTree: buildFolderTree(folderData),
                isLoadingFolders: false
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load folders";
            logger.error("Failed to fetch folders", error);
            set({ foldersError: message, isLoadingFolders: false });
        }
    },

    // Force refresh folders (ignores cache)
    refreshFolders: async () => {
        set({ isLoadingFolders: true, foldersError: null });

        try {
            const response = await getFolders();
            const folderData = response.data ?? [];
            set({
                folders: folderData,
                folderTree: buildFolderTree(folderData),
                isLoadingFolders: false
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load folders";
            logger.error("Failed to refresh folders", error);
            set({ foldersError: message, isLoadingFolders: false });
        }
    },

    // Fetch folder tree directly from API
    fetchFolderTree: async () => {
        set({ isLoadingFolders: true, foldersError: null });

        try {
            const response = await getFolderTree();
            set({
                folderTree: response.data,
                isLoadingFolders: false
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load folder tree";
            logger.error("Failed to fetch folder tree", error);
            set({ foldersError: message, isLoadingFolders: false });
        }
    },

    // Fetch folder contents
    fetchFolderContents: async (id: string) => {
        set({ isLoadingContents: true, contentsError: null });

        try {
            const response = await getFolderContents(id);
            set({ currentFolderContents: response.data, isLoadingContents: false });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to load folder contents";
            logger.error("Failed to fetch folder contents", error, { folderId: id });
            set({ contentsError: message, isLoadingContents: false, currentFolderContents: null });
        }
    },

    // Clear folder contents (when navigating away)
    clearFolderContents: () => {
        set({ currentFolderContents: null, contentsError: null });
    },

    // Create folder
    createFolder: async (input: CreateFolderInput) => {
        try {
            const response = await apiCreateFolder(input);
            const newFolder = response.data;

            if (!newFolder) {
                throw new Error("Failed to create folder: no data returned");
            }

            // Refresh folders to get accurate counts and tree structure
            const foldersResponse = await getFolders();
            const folderData = foldersResponse.data ?? [];
            set({
                folders: folderData,
                folderTree: buildFolderTree(folderData)
            });

            logger.info("Folder created", { folderId: newFolder.id, name: newFolder.name });
            return newFolder;
        } catch (error) {
            logger.error("Failed to create folder", error, { input });
            throw error;
        }
    },

    // Update folder
    updateFolder: async (id: string, input: UpdateFolderInput) => {
        try {
            const response = await apiUpdateFolder(id, input);
            const updatedFolder = response.data;

            if (!updatedFolder) {
                throw new Error("Failed to update folder: no data returned");
            }

            // Refresh folders to get accurate tree structure
            const foldersResponse = await getFolders();
            const folderData = foldersResponse.data ?? [];
            set((state) => ({
                folders: folderData,
                folderTree: buildFolderTree(folderData),
                // Also update current folder contents if viewing this folder
                currentFolderContents:
                    state.currentFolderContents?.folder.id === id
                        ? {
                              ...state.currentFolderContents,
                              folder: { ...state.currentFolderContents.folder, ...updatedFolder }
                          }
                        : state.currentFolderContents
            }));

            logger.info("Folder updated", { folderId: id, updates: input });
            return updatedFolder;
        } catch (error) {
            logger.error("Failed to update folder", error, { folderId: id, input });
            throw error;
        }
    },

    // Delete folder
    deleteFolder: async (id: string) => {
        try {
            await apiDeleteFolder(id);

            // Clear contents if viewing this folder
            set((state) => ({
                currentFolderContents:
                    state.currentFolderContents?.folder.id === id
                        ? null
                        : state.currentFolderContents
            }));

            // Refresh folders to update tree structure (handles subfolder promotion)
            const response = await getFolders();
            const folderData = response.data ?? [];
            set({
                folders: folderData,
                folderTree: buildFolderTree(folderData)
            });

            logger.info("Folder deleted", { folderId: id });
        } catch (error) {
            logger.error("Failed to delete folder", error, { folderId: id });
            throw error;
        }
    },

    // Move items to folder
    moveItemsToFolder: async (
        folderId: string,
        itemIds: string[],
        itemType: FolderResourceType
    ) => {
        try {
            await apiMoveItemsToFolder({ folderId, itemIds, itemType });

            // Refresh folders to update counts
            const response = await getFolders();
            const folderData = response.data ?? [];
            set({
                folders: folderData,
                folderTree: buildFolderTree(folderData)
            });

            logger.info("Items moved to folder", {
                folderId,
                itemCount: itemIds.length,
                itemType
            });
        } catch (error) {
            logger.error("Failed to move items to folder", error, {
                folderId,
                itemIds,
                itemType
            });
            throw error;
        }
    },

    // Move folder to a new parent
    moveFolder: async (folderId: string, newParentId: string | null) => {
        try {
            const response = await apiMoveFolder(folderId, { newParentId });
            const movedFolder = response.data;

            if (!movedFolder) {
                throw new Error("Failed to move folder: no data returned");
            }

            // Refresh folders to update tree structure
            const foldersResponse = await getFolders();
            const folderData = foldersResponse.data ?? [];
            set({
                folders: folderData,
                folderTree: buildFolderTree(folderData)
            });

            logger.info("Folder moved", { folderId, newParentId });
            return movedFolder;
        } catch (error) {
            logger.error("Failed to move folder", error, { folderId, newParentId });
            throw error;
        }
    },

    // Toggle show all folders
    toggleShowAllFolders: () => {
        set((state) => ({ showAllFolders: !state.showAllFolders }));
    },

    // Set show all folders
    setShowAllFolders: (show: boolean) => {
        set({ showAllFolders: show });
    },

    // Toggle individual folder expanded state (for tree view)
    toggleFolderExpanded: (folderId: string) => {
        set((state) => {
            const newExpandedIds = new Set(state.expandedFolderIds);
            if (newExpandedIds.has(folderId)) {
                newExpandedIds.delete(folderId);
            } else {
                newExpandedIds.add(folderId);
            }
            return { expandedFolderIds: newExpandedIds };
        });
    },

    // Set folder expanded state explicitly
    setFolderExpanded: (folderId: string, expanded: boolean) => {
        set((state) => {
            const newExpandedIds = new Set(state.expandedFolderIds);
            if (expanded) {
                newExpandedIds.add(folderId);
            } else {
                newExpandedIds.delete(folderId);
            }
            return { expandedFolderIds: newExpandedIds };
        });
    },

    // Reset store (on logout)
    reset: () => {
        set(initialState);
    }
}));

// Selector hooks for common use cases
export const useFolders = () => useFolderStore((state) => state.folders);
export const useFolderTree = () => useFolderStore((state) => state.folderTree);
export const useVisibleFolders = () => useFolderStore((state) => state.visibleFolders());
export const useFolderById = (id: string) =>
    useFolderStore((state) => state.folders.find((f) => f.id === id));
export const useCurrentFolderContents = () =>
    useFolderStore((state) => state.currentFolderContents);
export const useIsFoldersLoading = () => useFolderStore((state) => state.isLoadingFolders);
export const useExpandedFolderIds = () => useFolderStore((state) => state.expandedFolderIds);
export const useIsFolderExpanded = (id: string) =>
    useFolderStore((state) => state.expandedFolderIds.has(id));

export function getFolderCountIncludingSubfolders(
    folder: FolderWithCounts,
    itemType: FolderResourceType,
    getFolderChildren: (folderId: string) => FolderWithCounts[]
): number {
    const getCountForType = (f: FolderWithCounts): number => {
        switch (itemType) {
            case "workflow":
                return f.itemCounts.workflows;
            case "agent":
                return f.itemCounts.agents;
            case "form-interface":
                return f.itemCounts.formInterfaces;
            case "chat-interface":
                return f.itemCounts.chatInterfaces;
            case "knowledge-base":
                return f.itemCounts.knowledgeBases;
        }
    };

    let total = getCountForType(folder);

    // Recursively add counts from all subfolders
    const children = getFolderChildren(folder.id);
    for (const child of children) {
        total += getFolderCountIncludingSubfolders(child, itemType, getFolderChildren);
    }

    return total;
}
