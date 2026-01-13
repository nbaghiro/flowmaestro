/**
 * useFolderManagement Hook
 *
 * Shared hook for folder management across item list pages.
 * Eliminates duplication of folder-related state and handlers.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Folder, FolderWithCounts, FolderResourceType } from "@flowmaestro/shared";
import { getFolders, updateFolder, removeItemsFromFolder } from "../lib/api";
import { logger } from "../lib/logger";
import { buildFolderTree, useFolderStore } from "../stores/folderStore";
import { useUIPreferencesStore } from "../stores/uiPreferencesStore";

export interface UseFolderManagementOptions {
    /** The item type this folder management is for */
    itemType: FolderResourceType;
    /** Callback to reload items after folder operations */
    onReloadItems: () => Promise<void>;
    /** Source item type for folder navigation state */
    sourceItemType?: string;
}

export interface UseFolderManagementReturn {
    // State
    folders: FolderWithCounts[];
    folderTree: FolderWithCounts[];
    currentFolder: Folder | null;
    currentFolderId: string | null;
    isLoadingFolders: boolean;
    selectedFolderIds: Set<string>;
    isCreateFolderDialogOpen: boolean;
    isMoveDialogOpen: boolean;
    folderToEdit: Folder | null;
    folderToDelete: FolderWithCounts | null;
    isBatchDeleting: boolean;
    showFoldersSection: boolean;
    expandedFolderIds: Set<string>;
    rootFolders: FolderWithCounts[];
    canShowFoldersSection: boolean;

    // Setters
    setSelectedFolderIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setIsCreateFolderDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsMoveDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setFolderToEdit: React.Dispatch<React.SetStateAction<Folder | null>>;
    setFolderToDelete: React.Dispatch<React.SetStateAction<FolderWithCounts | null>>;
    setShowFoldersSection: (show: boolean) => void;

    // Handlers
    loadFolders: () => Promise<void>;
    handleCreateFolder: (name: string, color: string) => Promise<void>;
    handleEditFolder: (name: string, color: string) => Promise<void>;
    handleDeleteFolder: () => Promise<void>;
    handleFolderClick: (e: React.MouseEvent, folder: FolderWithCounts) => void;
    handleFolderContextMenu: (e: React.MouseEvent, folder: FolderWithCounts) => void;
    handleBatchDeleteFolders: () => Promise<void>;
    handleNavigateToRoot: () => void;
    handleMoveToFolder: (folderId: string | null) => Promise<void>;
    handleRemoveFromFolder: (itemIds: string | string[]) => Promise<void>;
    handleDropOnFolder: (folderId: string, itemIds: string[], itemType: string) => Promise<void>;
    handleToggleFolderExpand: (folderId: string) => void;
    getFolderChildren: (folderId: string) => FolderWithCounts[];

    // For context menu
    openFolderContextMenu: (position: { x: number; y: number }) => void;
}

export function useFolderManagement({
    itemType,
    onReloadItems,
    sourceItemType
}: UseFolderManagementOptions): UseFolderManagementReturn {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentFolderId = searchParams.get("folder");

    // Folder store
    const {
        createFolder: createFolderStore,
        moveItemsToFolder: moveItemsToFolderStore,
        deleteFolder: deleteFolderStore,
        folders: storeFolders
    } = useFolderStore();

    // State
    const [folders, setFolders] = useState<FolderWithCounts[]>([]);
    const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
    const [isLoadingFolders, setIsLoadingFolders] = useState(true);
    const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
    const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
    const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
    const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<FolderWithCounts | null>(null);
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const { showFoldersSection, setShowFoldersSection } = useUIPreferencesStore();
    const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
    const [_folderContextMenuOpen, setFolderContextMenuOpen] = useState(false);

    // Computed values
    const rootFolders = currentFolderId ? [] : folders.filter((f) => f.depth === 0);
    const canShowFoldersSection = !currentFolderId && rootFolders.length > 0;

    // Load folders
    const loadFolders = useCallback(async () => {
        setIsLoadingFolders(true);
        try {
            const response = await getFolders();
            if (response.success && response.data) {
                setFolders(response.data);
            }
        } catch (err) {
            logger.error("Failed to load folders", err);
        } finally {
            setIsLoadingFolders(false);
        }
    }, []);

    // Load folders on mount
    useEffect(() => {
        loadFolders();
    }, [loadFolders]);

    // Sync folders when store folders change
    useEffect(() => {
        if (storeFolders.length > 0 && folders.length !== storeFolders.length) {
            loadFolders();
        }
    }, [storeFolders, folders.length, loadFolders]);

    // Update current folder when folderId changes
    useEffect(() => {
        if (currentFolderId) {
            const folder = folders.find((f) => f.id === currentFolderId);
            setCurrentFolder(folder || null);
        } else {
            setCurrentFolder(null);
        }
    }, [currentFolderId, folders]);

    // Helper to get children of a folder from the tree
    const getFolderChildren = useCallback(
        (folderId: string): FolderWithCounts[] => {
            const findInTree = (nodes: typeof folderTree): FolderWithCounts[] => {
                for (const node of nodes) {
                    if (node.id === folderId) {
                        return node.children;
                    }
                    const found = findInTree(node.children);
                    if (found.length > 0) return found;
                }
                return [];
            };
            return findInTree(folderTree);
        },
        [folderTree]
    );

    // Toggle folder expansion
    const handleToggleFolderExpand = useCallback((folderId: string) => {
        setExpandedFolderIds((prev) => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    }, []);

    // Folder handlers
    const handleCreateFolder = useCallback(
        async (name: string, color: string) => {
            await createFolderStore({ name, color });
            await loadFolders();
        },
        [createFolderStore, loadFolders]
    );

    const handleEditFolder = useCallback(
        async (name: string, color: string) => {
            if (!folderToEdit) return;
            await updateFolder(folderToEdit.id, { name, color });
            await loadFolders();
            setFolderToEdit(null);
        },
        [folderToEdit, loadFolders]
    );

    const handleDeleteFolder = useCallback(async () => {
        if (!folderToDelete) return;
        try {
            await deleteFolderStore(folderToDelete.id);
            await loadFolders();
            await onReloadItems();
            setFolderToDelete(null);
            // If we were viewing the deleted folder, go back to root
            if (currentFolderId === folderToDelete.id) {
                setSearchParams({});
            }
        } catch (err) {
            logger.error("Failed to delete folder", err);
            throw err;
        }
    }, [
        folderToDelete,
        deleteFolderStore,
        loadFolders,
        onReloadItems,
        currentFolderId,
        setSearchParams
    ]);

    const handleFolderClick = useCallback(
        (e: React.MouseEvent, folder: FolderWithCounts) => {
            if (e.shiftKey) {
                e.preventDefault();
                setSelectedFolderIds((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(folder.id)) {
                        newSet.delete(folder.id);
                    } else {
                        newSet.add(folder.id);
                    }
                    return newSet;
                });
            } else if (selectedFolderIds.size === 0) {
                // Navigate to unified folder contents page with source type for auto-collapse
                navigate(`/folders/${folder.id}`, {
                    state: { sourceItemType: sourceItemType || itemType }
                });
            } else {
                // Clear selection on normal click when folders are selected
                setSelectedFolderIds(new Set());
            }
        },
        [navigate, selectedFolderIds.size, sourceItemType, itemType]
    );

    const handleFolderContextMenu = useCallback(
        (e: React.MouseEvent, folder: FolderWithCounts) => {
            e.preventDefault();
            // If right-clicking on an unselected folder, select only that folder
            if (!selectedFolderIds.has(folder.id)) {
                setSelectedFolderIds(new Set([folder.id]));
            }
            setFolderContextMenuOpen(true);
        },
        [selectedFolderIds]
    );

    const openFolderContextMenu = useCallback((_position: { x: number; y: number }) => {
        setFolderContextMenuOpen(true);
    }, []);

    const handleBatchDeleteFolders = useCallback(async () => {
        if (selectedFolderIds.size === 0) return;

        setIsBatchDeleting(true);
        try {
            const deletePromises = Array.from(selectedFolderIds).map((id) => deleteFolderStore(id));
            await Promise.all(deletePromises);

            await loadFolders();
            await onReloadItems();
            setSelectedFolderIds(new Set());
        } catch (err) {
            logger.error("Failed to delete folders", err);
            throw err;
        } finally {
            setIsBatchDeleting(false);
        }
    }, [selectedFolderIds, deleteFolderStore, loadFolders, onReloadItems]);

    const handleNavigateToRoot = useCallback(() => {
        setSearchParams({});
    }, [setSearchParams]);

    const handleMoveToFolder = useCallback(async (folderId: string | null) => {
        if (!folderId) {
            throw new Error("Folder ID is required");
        }
        // Note: selectedIds should be passed from the parent component
        // This is a placeholder - the actual implementation will get itemIds from params
    }, []);

    const handleRemoveFromFolder = useCallback(
        async (itemIds: string | string[]) => {
            if (!currentFolderId) return;
            const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
            if (ids.length === 0) return;
            try {
                await removeItemsFromFolder({
                    itemIds: ids,
                    itemType,
                    folderId: currentFolderId
                });
                await onReloadItems();
                await loadFolders();
            } catch (err) {
                logger.error(`Failed to remove ${itemType} from folder`, err);
            }
        },
        [currentFolderId, itemType, onReloadItems, loadFolders]
    );

    const handleDropOnFolder = useCallback(
        async (folderId: string, itemIds: string[], droppedItemType: string) => {
            if (droppedItemType !== itemType) return;
            try {
                await moveItemsToFolderStore(
                    folderId,
                    itemIds,
                    droppedItemType as FolderResourceType
                );
                await onReloadItems();
                await loadFolders();
            } catch (err) {
                logger.error("Failed to move items to folder", err);
            }
        },
        [itemType, moveItemsToFolderStore, onReloadItems, loadFolders]
    );

    return {
        // State
        folders,
        folderTree,
        currentFolder,
        currentFolderId,
        isLoadingFolders,
        selectedFolderIds,
        isCreateFolderDialogOpen,
        isMoveDialogOpen,
        folderToEdit,
        folderToDelete,
        isBatchDeleting,
        showFoldersSection,
        expandedFolderIds,
        rootFolders,
        canShowFoldersSection,

        // Setters
        setSelectedFolderIds,
        setIsCreateFolderDialogOpen,
        setIsMoveDialogOpen,
        setFolderToEdit,
        setFolderToDelete,
        setShowFoldersSection,

        // Handlers
        loadFolders,
        handleCreateFolder,
        handleEditFolder,
        handleDeleteFolder,
        handleFolderClick,
        handleFolderContextMenu,
        handleBatchDeleteFolders,
        handleNavigateToRoot,
        handleMoveToFolder,
        handleRemoveFromFolder,
        handleDropOnFolder,
        handleToggleFolderExpand,
        getFolderChildren,
        openFolderContextMenu
    };
}
