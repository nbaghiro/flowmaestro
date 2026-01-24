/**
 * useFolderManagement Hook
 *
 * Shared hook for folder management across item list pages.
 * Eliminates duplication of folder-related state and handlers.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import type { Folder, FolderWithCounts, FolderResourceType } from "@flowmaestro/shared";
import { getFolders, updateFolder, removeItemsFromFolder } from "../lib/api";
import { checkItemsInFolder } from "../lib/folderUtils";
import { logger } from "../lib/logger";
import { buildFolderTree, useFolderStore } from "../stores/folderStore";
import { useUIPreferencesStore } from "../stores/uiPreferencesStore";
import type { DuplicateItemWarning } from "../components/folders/dialogs/DuplicateItemWarningDialog";

export interface UseFolderManagementOptions {
    /** The item type this folder management is for */
    itemType: FolderResourceType;
    /** Callback to reload items after folder operations */
    onReloadItems: () => Promise<void>;
    /** Source item type for folder navigation state */
    sourceItemType?: string;
    /** Callback to get item names from item IDs for duplicate warning dialog */
    getItemNames?: (itemIds: string[]) => string[];
    /** Optional callback to clear selected items after drop (e.g., clear selection) */
    onClearSelection?: () => void;
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
    duplicateItemWarning: DuplicateItemWarning | null;

    // Setters
    setSelectedFolderIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setIsCreateFolderDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsMoveDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setFolderToEdit: React.Dispatch<React.SetStateAction<Folder | null>>;
    setFolderToDelete: React.Dispatch<React.SetStateAction<FolderWithCounts | null>>;
    setShowFoldersSection: (show: boolean) => void;
    setDuplicateItemWarning: React.Dispatch<React.SetStateAction<DuplicateItemWarning | null>>;

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
    sourceItemType,
    getItemNames,
    onClearSelection
}: UseFolderManagementOptions): UseFolderManagementReturn {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();
    // Get current folder ID from either URL path (/folders/:folderId) or search params (?folder=id)
    const currentFolderIdFromPath = location.pathname.startsWith("/folders/")
        ? location.pathname.split("/folders/")[1]?.split("/")[0] || null
        : null;
    const currentFolderIdFromParams = searchParams.get("folder");
    const currentFolderId = currentFolderIdFromPath || currentFolderIdFromParams;

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
    const [duplicateItemWarning, setDuplicateItemWarning] = useState<DuplicateItemWarning | null>(
        null
    );

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
            queryClient.invalidateQueries({ queryKey: ["folderContents"] });
        },
        [createFolderStore, loadFolders, queryClient]
    );

    const handleEditFolder = useCallback(
        async (name: string, color: string) => {
            if (!folderToEdit) return;
            await updateFolder(folderToEdit.id, { name, color });
            await loadFolders();
            queryClient.invalidateQueries({ queryKey: ["folderContents", folderToEdit.id] });
            setFolderToEdit(null);
        },
        [folderToEdit, loadFolders, queryClient]
    );

    const handleDeleteFolder = useCallback(async () => {
        if (!folderToDelete) return;
        try {
            await deleteFolderStore(folderToDelete.id);
            await loadFolders();
            await onReloadItems();
            queryClient.invalidateQueries({ queryKey: ["folderContents", folderToDelete.id] });
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
        setSearchParams,
        queryClient
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
            // Invalidate queries for all deleted folders
            selectedFolderIds.forEach((id) => {
                queryClient.invalidateQueries({ queryKey: ["folderContents", id] });
            });
            setSelectedFolderIds(new Set());
        } catch (err) {
            logger.error("Failed to delete folders", err);
            throw err;
        } finally {
            setIsBatchDeleting(false);
        }
    }, [selectedFolderIds, deleteFolderStore, loadFolders, onReloadItems, queryClient]);

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
                // Invalidate folder contents queries after mutation
                queryClient.invalidateQueries({ queryKey: ["folderContents", currentFolderId] });
                await onReloadItems();
                await loadFolders();
            } catch (err) {
                logger.error(`Failed to remove ${itemType} from folder`, err);
            }
        },
        [currentFolderId, itemType, onReloadItems, loadFolders]
    );

    // Internal function to perform the actual drop operation
    const performDrop = useCallback(
        async (folderId: string, itemIds: string[], droppedItemType: FolderResourceType) => {
            await moveItemsToFolderStore(folderId, itemIds, droppedItemType);
            await onReloadItems();
            await loadFolders();
            queryClient.invalidateQueries({ queryKey: ["folderContents", folderId] });
            if (onClearSelection) {
                onClearSelection();
            }
        },
        [moveItemsToFolderStore, onReloadItems, loadFolders, queryClient, onClearSelection]
    );

    const handleDropOnFolder = useCallback(
        async (folderId: string, itemIds: string[], droppedItemType: string) => {
            if (droppedItemType !== itemType) return;

            // Check if items are already in the target folder BEFORE moving
            const {
                found,
                folderName,
                folderId: duplicateFolderId,
                isInMainFolder
            } = await checkItemsInFolder(folderId, itemIds, itemType);

            if (found) {
                // Check if item is in the same folder (same folder or same subfolder)
                const isSameFolder = duplicateFolderId === folderId;

                // If moving from main folder to subfolder while inside a folder page, automatically move without dialog
                // This allows users to organize items from the main folder into subfolders without confirmation
                // Conditions:
                // 1. We're inside a folder page (currentFolderId exists)
                // 2. Item is in the folder we're viewing (duplicateFolderId matches currentFolderId)
                // 3. Moving to a different folder (not the same folder)
                // 4. Item is in the main folder (isInMainFolder is true)
                const hasCurrentFolder = Boolean(currentFolderId);
                const itemInCurrentFolder = Boolean(
                    duplicateFolderId &&
                        currentFolderId &&
                        String(duplicateFolderId).trim() === String(currentFolderId).trim()
                );
                const movingToDifferentFolder = !isSameFolder && folderId !== duplicateFolderId;
                const itemInMainFolder = isInMainFolder === true;

                const shouldAutoMove =
                    hasCurrentFolder &&
                    itemInCurrentFolder &&
                    movingToDifferentFolder &&
                    itemInMainFolder;

                if (shouldAutoMove) {
                    try {
                        // Remove items from the main folder (source)
                        await removeItemsFromFolder({
                            itemIds,
                            itemType,
                            folderId: duplicateFolderId!
                        });
                        // Invalidate folder contents queries after mutation
                        queryClient.invalidateQueries({
                            queryKey: ["folderContents", duplicateFolderId]
                        });

                        // Proceed with move to target subfolder
                        await performDrop(folderId, itemIds, itemType);
                    } catch (err) {
                        logger.error(
                            "Failed to automatically move items from main to subfolder",
                            err
                        );
                    }
                    // Return early - move completed automatically
                    return;
                }

                // Get item names - use callback if provided, otherwise use generic names
                const itemNames = getItemNames ? getItemNames(itemIds) : itemIds.map(() => "item");

                // Show duplicate warning dialog for other cases (same folder or subfolder to subfolder)
                setDuplicateItemWarning({
                    folderId,
                    itemIds,
                    itemNames,
                    itemType,
                    folderName,
                    sourceFolderId: duplicateFolderId,
                    isInMainFolder: isSameFolder ? true : isInMainFolder, // If same folder, treat as "in main folder" for dialog display
                    onConfirm: async () => {
                        // If item is in the same folder, just close (no move)
                        if (isSameFolder) {
                            return;
                        }

                        // Remove items from the source folder before moving to target folder
                        if (duplicateFolderId && duplicateFolderId !== folderId) {
                            try {
                                await removeItemsFromFolder({
                                    itemIds,
                                    itemType,
                                    folderId: duplicateFolderId
                                });
                                // Invalidate folder contents queries after mutation
                                queryClient.invalidateQueries({
                                    queryKey: ["folderContents", duplicateFolderId]
                                });
                            } catch (err) {
                                logger.error("Failed to remove items from source folder", err);
                            }
                        }

                        // Proceed with move to target folder
                        try {
                            await performDrop(folderId, itemIds, itemType);
                        } catch (err) {
                            logger.error("Failed to move items to folder", err);
                        }
                    }
                });
                // Return early to prevent move
                return;
            }

            // No items found, proceed with move
            try {
                await performDrop(folderId, itemIds, itemType);
            } catch (err) {
                logger.error("Failed to move items to folder", err);
            }
        },
        [
            itemType,
            getItemNames,
            performDrop,
            currentFolderId,
            checkItemsInFolder,
            removeItemsFromFolder,
            setDuplicateItemWarning,
            queryClient
        ]
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
        duplicateItemWarning,

        // Setters
        setSelectedFolderIds,
        setIsCreateFolderDialogOpen,
        setIsMoveDialogOpen,
        setFolderToEdit,
        setFolderToDelete,
        setShowFoldersSection,
        setDuplicateItemWarning,

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
