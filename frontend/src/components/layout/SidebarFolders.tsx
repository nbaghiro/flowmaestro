import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, ChevronUp, Folder, Edit2, Trash2, Plus } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import type {
    FolderWithCounts,
    Folder as FolderType,
    FolderResourceType,
    FolderTreeNode
} from "@flowmaestro/shared";
import { MAX_FOLDER_DEPTH } from "@flowmaestro/shared";
import { removeItemsFromFolder } from "../../lib/api";
import { useDuplicateItemWarning } from "../../lib/duplicateItemDialogUtils";
import { checkItemsInFolder } from "../../lib/folderUtils";
import { logger } from "../../lib/logger";
import { useFolderStore } from "../../stores/folderStore";
import { useUIPreferencesStore } from "../../stores/uiPreferencesStore";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { Tooltip } from "../common/Tooltip";
import { CreateFolderDialog } from "../folders/CreateFolderDialog";
import { SidebarFolderItem } from "./SidebarFolderItem";

interface SidebarFoldersProps {
    isCollapsed: boolean;
}

interface ContextMenuState {
    isOpen: boolean;
    position: { x: number; y: number };
    folder: FolderWithCounts | null;
}

export function SidebarFolders({ isCollapsed }: SidebarFoldersProps) {
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const {
        folders,
        folderTree,
        isLoadingFolders,
        expandedFolderIds,
        fetchFolders,
        refreshFolders,
        fetchFolderContents,
        toggleFolderExpanded,
        createFolder,
        updateFolder,
        deleteFolder,
        moveItemsToFolder
    } = useFolderStore();

    const { sidebarFoldersExpanded, toggleSidebarFoldersExpanded } = useUIPreferencesStore();

    // Get current folder ID from URL (if viewing a folder)
    const currentFolderIdFromPath = location.pathname.startsWith("/folders/")
        ? location.pathname.split("/folders/")[1]?.split("/")[0]
        : null;
    const currentFolderIdFromParams = searchParams.get("folder");
    const sourceFolderId = currentFolderIdFromPath || currentFolderIdFromParams;

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [folderToEdit, setFolderToEdit] = useState<FolderType | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<FolderWithCounts | null>(null);
    const [parentFolderForSubfolder, setParentFolderForSubfolder] =
        useState<FolderWithCounts | null>(null);

    // Global dialog for duplicate item warnings
    const { showDuplicateItemWarning } = useDuplicateItemWarning();

    // Context menu state
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
        isOpen: false,
        position: { x: 0, y: 0 },
        folder: null
    });
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Fetch folders on mount
    useEffect(() => {
        fetchFolders();
    }, [fetchFolders]);

    // Close context menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu((prev) => ({ ...prev, isOpen: false }));
            }
        };

        if (contextMenu.isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
        return undefined;
    }, [contextMenu.isOpen]);

    const handleContextMenu = (e: React.MouseEvent, folder: FolderWithCounts) => {
        e.preventDefault();
        setContextMenu({
            isOpen: true,
            position: { x: e.clientX, y: e.clientY },
            folder
        });
    };

    const handleEditFolder = () => {
        if (contextMenu.folder) {
            setFolderToEdit(contextMenu.folder);
        }
        setContextMenu((prev) => ({ ...prev, isOpen: false }));
    };

    const handleDeleteFolder = () => {
        if (contextMenu.folder) {
            setFolderToDelete(contextMenu.folder);
        }
        setContextMenu((prev) => ({ ...prev, isOpen: false }));
    };

    const handleCreateSubfolder = () => {
        if (contextMenu.folder) {
            setParentFolderForSubfolder(contextMenu.folder);
        }
        setContextMenu((prev) => ({ ...prev, isOpen: false }));
    };

    const handleCreateSubmit = async (name: string, color: string) => {
        await createFolder({ name, color });
        // Folder store's createFolder already refreshes folders, but ensure it's reflected
        setIsCreateDialogOpen(false);
    };

    const handleCreateSubfolderSubmit = async (name: string, color: string) => {
        if (parentFolderForSubfolder) {
            await createFolder({ name, color, parentId: parentFolderForSubfolder.id });
            // Folder store's createFolder already refreshes folders
            setParentFolderForSubfolder(null);
        }
    };

    const handleEditSubmit = async (name: string, color: string) => {
        if (folderToEdit) {
            await updateFolder(folderToEdit.id, { name, color });
        }
    };

    const handleDeleteConfirm = async () => {
        if (folderToDelete) {
            await deleteFolder(folderToDelete.id);
            setFolderToDelete(null);
        }
    };

    const performDrop = useCallback(
        async (folderId: string, itemIds: string[], itemType: FolderResourceType) => {
            // Move items to target folder
            await moveItemsToFolder(folderId, itemIds, itemType);

            // If dragging from within a folder, remove items from source folder
            if (sourceFolderId && sourceFolderId !== folderId) {
                try {
                    await removeItemsFromFolder({
                        itemIds,
                        itemType,
                        folderId: sourceFolderId
                    });
                    // Refresh folders to update counts and refresh current folder contents if viewing it
                    await Promise.all([
                        refreshFolders(),
                        sourceFolderId ? fetchFolderContents(sourceFolderId) : Promise.resolve()
                    ]);
                } catch (err) {
                    logger.error(
                        "Failed to remove items from source folder or refresh folders",
                        err
                    );
                }
            } else {
                // Even if not from a folder, refresh folders to update counts
                await refreshFolders();
            }
        },
        [moveItemsToFolder, sourceFolderId, refreshFolders, fetchFolderContents]
    );

    const handleDropOnFolder = useCallback(
        async (folderId: string, itemIds: string[], itemType: FolderResourceType) => {
            // Check if items are already in the target folder BEFORE moving
            const {
                found,
                folderName,
                folderId: sourceFolderId,
                isInMainFolder
            } = await checkItemsInFolder(folderId, itemIds, itemType);

            if (found) {
                // For sidebar drops, we don't have direct access to item names
                // The global dialog will handle generic "item" names appropriately
                const itemNames = itemIds.map(() => "item");

                // Show global warning dialog
                showDuplicateItemWarning({
                    folderId,
                    itemIds,
                    itemNames,
                    itemType,
                    folderName,
                    sourceFolderId,
                    isInMainFolder,
                    onConfirm: async () => {
                        // If item is in main folder, don't proceed with move
                        if (isInMainFolder) {
                            return;
                        }

                        // Remove items from the source folder before moving
                        if (sourceFolderId && sourceFolderId !== folderId) {
                            try {
                                await removeItemsFromFolder({
                                    itemIds,
                                    itemType,
                                    folderId: sourceFolderId
                                });
                            } catch (err) {
                                logger.error("Failed to remove items from source folder", err);
                            }
                        }

                        // Proceed with move to target folder
                        await performDrop(folderId, itemIds, itemType);
                    }
                });
                // Return early to prevent move - this stops the operation
                return;
            }

            // No items found, proceed with move
            await performDrop(folderId, itemIds, itemType);
        },
        [performDrop]
    );

    const handleToggleExpand = useCallback(
        (folderId: string) => {
            toggleFolderExpanded(folderId);
        },
        [toggleFolderExpanded]
    );

    // Recursive function to render folder tree nodes
    const renderFolderTree = useCallback(
        (nodes: FolderTreeNode[], depth: number = 0): React.ReactNode => {
            return nodes.map((folder) => (
                <SidebarFolderItem
                    key={folder.id}
                    folder={folder}
                    isCollapsed={false}
                    depth={depth}
                    isExpanded={expandedFolderIds.has(folder.id)}
                    onContextMenu={handleContextMenu}
                    onDrop={handleDropOnFolder}
                    onToggleExpand={handleToggleExpand}
                    renderChildren={(children, childDepth) =>
                        renderFolderTree(children, childDepth)
                    }
                />
            ));
        },
        [expandedFolderIds, handleDropOnFolder, handleToggleExpand]
    );

    const navigate = useNavigate();
    const [isCollapsedPopoverOpen, setIsCollapsedPopoverOpen] = useState(false);

    // Collapsed sidebar: show folder icon that opens popover with folder list
    if (isCollapsed) {
        return (
            <div className="px-2 py-2 border-t border-border">
                <Popover.Root
                    open={isCollapsedPopoverOpen}
                    onOpenChange={setIsCollapsedPopoverOpen}
                >
                    <Popover.Trigger asChild>
                        <button className="w-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors">
                            <Folder className="w-5 h-5 mx-auto" />
                        </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Content
                            side="right"
                            align="start"
                            sideOffset={8}
                            className="z-50 w-56 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
                        >
                            <div className="p-2 border-b border-border">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-foreground">
                                        Folders
                                    </span>
                                    <button
                                        onClick={() => {
                                            setIsCollapsedPopoverOpen(false);
                                            setIsCreateDialogOpen(true);
                                        }}
                                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {isLoadingFolders ? (
                                    <div className="px-3 py-2 text-sm text-muted-foreground">
                                        Loading...
                                    </div>
                                ) : !folders || folders.length === 0 ? (
                                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                                        No folders yet
                                    </div>
                                ) : (
                                    <div className="py-1">
                                        {folders.map((folder) => (
                                            <button
                                                key={folder.id}
                                                onClick={() => {
                                                    setIsCollapsedPopoverOpen(false);
                                                    navigate(`/folders/${folder.id}`);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                            >
                                                <div
                                                    className="w-3 h-3 rounded-sm flex-shrink-0"
                                                    style={{ backgroundColor: folder.color }}
                                                />
                                                <span className="truncate">{folder.name}</span>
                                                {folder.itemCounts.total > 0 && (
                                                    <span className="ml-auto text-xs text-muted-foreground">
                                                        {folder.itemCounts.total}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>

                {/* Create Folder Dialog */}
                <CreateFolderDialog
                    isOpen={isCreateDialogOpen}
                    onClose={() => setIsCreateDialogOpen(false)}
                    onSubmit={handleCreateSubmit}
                />
            </div>
        );
    }

    return (
        <div className="border-t border-border">
            {/* Section Header */}
            <div className="px-2">
                <div className="flex items-center justify-between px-3 py-3">
                    <button
                        onClick={toggleSidebarFoldersExpanded}
                        className="flex items-center gap-3 text-xs font-semibold text-muted-foreground tracking-wider hover:text-foreground transition-colors"
                    >
                        <Folder className="w-5 h-5" />
                        <span>Folders</span>
                        {sidebarFoldersExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </button>
                    <Tooltip content="New folder" delay={200} position="top">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCreateDialogOpen(true);
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* Folder List */}
            {sidebarFoldersExpanded && (
                <div className="px-2 pb-3">
                    {isLoadingFolders ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
                    ) : !folders || folders.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                            No folders yet
                        </div>
                    ) : (
                        <div className="max-h-64 overflow-y-auto space-y-0.5">
                            {/* Render folder tree (root level only, children are rendered recursively) */}
                            {renderFolderTree(folderTree, 0)}
                        </div>
                    )}
                </div>
            )}

            {/* Context Menu */}
            {contextMenu.isOpen && contextMenu.folder && (
                <div
                    ref={contextMenuRef}
                    className="fixed bg-card border border-border rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
                    style={{
                        left: contextMenu.position.x,
                        top: contextMenu.position.y
                    }}
                >
                    {/* Only show Create Subfolder if not at max depth */}
                    {contextMenu.folder.depth < MAX_FOLDER_DEPTH - 1 && (
                        <button
                            onClick={handleCreateSubfolder}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Create Subfolder
                        </button>
                    )}
                    <button
                        onClick={handleEditFolder}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                        <Edit2 className="w-4 h-4" />
                        Edit
                    </button>
                    <button
                        onClick={handleDeleteFolder}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                </div>
            )}

            {/* Create Folder Dialog */}
            <CreateFolderDialog
                isOpen={isCreateDialogOpen}
                onClose={() => setIsCreateDialogOpen(false)}
                onSubmit={handleCreateSubmit}
            />

            {/* Edit Folder Dialog */}
            <CreateFolderDialog
                isOpen={!!folderToEdit}
                onClose={() => setFolderToEdit(null)}
                onSubmit={handleEditSubmit}
                folder={folderToEdit}
            />

            {/* Create Subfolder Dialog */}
            <CreateFolderDialog
                isOpen={!!parentFolderForSubfolder}
                onClose={() => setParentFolderForSubfolder(null)}
                onSubmit={handleCreateSubfolderSubmit}
                parentFolderName={parentFolderForSubfolder?.name}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!folderToDelete}
                onClose={() => setFolderToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Delete Folder"
                message={`Are you sure you want to delete "${folderToDelete?.name}"? Items in this folder will be moved to the root level.`}
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
