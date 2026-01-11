import { ChevronDown, ChevronUp, FolderPlus, Folder, Edit2, Trash2, Plus } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import type {
    FolderWithCounts,
    Folder as FolderType,
    FolderResourceType,
    FolderTreeNode
} from "@flowmaestro/shared";
import { MAX_FOLDER_DEPTH } from "@flowmaestro/shared";
import { useFolderStore } from "../../stores/folderStore";
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
    const {
        folders,
        folderTree,
        isLoadingFolders,
        isFoldersSectionExpanded,
        expandedFolderIds,
        fetchFolders,
        refreshFolders,
        toggleFoldersSection,
        toggleFolderExpanded,
        createFolder,
        updateFolder,
        deleteFolder,
        moveItemsToFolder
    } = useFolderStore();

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [folderToEdit, setFolderToEdit] = useState<FolderType | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<FolderWithCounts | null>(null);
    const [parentFolderForSubfolder, setParentFolderForSubfolder] =
        useState<FolderWithCounts | null>(null);

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
    };

    const handleCreateSubfolderSubmit = async (name: string, color: string) => {
        if (parentFolderForSubfolder) {
            await createFolder({ name, color, parentId: parentFolderForSubfolder.id });
            // Refresh folders to update the tree structure
            await refreshFolders();
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

    const handleDropOnFolder = useCallback(
        async (folderId: string, itemIds: string[], itemType: FolderResourceType) => {
            await moveItemsToFolder(folderId, itemIds, itemType);
        },
        [moveItemsToFolder]
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

    // Collapsed sidebar: show folder icon that opens popover
    if (isCollapsed) {
        return (
            <div className="px-2 py-2">
                <Tooltip content="Folders" delay={200} position="right">
                    <button
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="w-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
                    >
                        <Folder className="w-5 h-5 mx-auto" />
                    </button>
                </Tooltip>

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
        <div>
            {/* Section Header */}
            <div className="px-2">
                <button
                    onClick={toggleFoldersSection}
                    className="w-full flex items-center justify-between px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Folder className="w-5 h-5" />
                        <span>Folders</span>
                    </div>
                    {isFoldersSectionExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Folder List */}
            {isFoldersSectionExpanded && (
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

                    {/* New Folder Button */}
                    <button
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors mt-1"
                    >
                        <FolderPlus className="w-4 h-4" />
                        <span>New Folder</span>
                    </button>
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
