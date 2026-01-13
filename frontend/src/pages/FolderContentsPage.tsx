import {
    ArrowLeft,
    Edit2,
    Trash2,
    Folder,
    FolderPlus,
    ChevronRight,
    Home,
    Check,
    MoreVertical,
    FolderInput,
    FolderMinus
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import type { FolderResourceType, Folder as FolderType } from "@flowmaestro/shared";
import { MAX_FOLDER_DEPTH } from "@flowmaestro/shared";
import { Button } from "../components/common/Button";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { ContextMenu, type ContextMenuItem } from "../components/common/ContextMenu";
import { LoadingState } from "../components/common/Spinner";
import { CreateFolderDialog, FolderItemSection, MoveToFolderDialog } from "../components/folders";
import { removeItemsFromFolder } from "../lib/api";
import { cn } from "../lib/utils";
import { useFolderStore } from "../stores/folderStore";

export function FolderContentsPage() {
    const { folderId } = useParams<{ folderId: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // Get source item type from navigation state for auto-collapse
    const sourceItemType = (location.state as { sourceItemType?: FolderResourceType } | null)
        ?.sourceItemType;

    const {
        currentFolderContents,
        isLoadingContents,
        contentsError,
        fetchFolderContents,
        clearFolderContents,
        updateFolder,
        deleteFolder,
        createFolder,
        refreshFolders,
        moveItemsToFolder,
        folders,
        folderTree,
        isLoadingFolders
    } = useFolderStore();

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCreateSubfolderDialogOpen, setIsCreateSubfolderDialogOpen] = useState(false);
    const [showSubfolders, setShowSubfolders] = useState(false);
    const [isSubfolderDropdownOpen, setIsSubfolderDropdownOpen] = useState(false);
    const subfolderDropdownRef = useRef<HTMLDivElement>(null);
    const [subfolderToEdit, setSubfolderToEdit] = useState<FolderType | null>(null);
    const [subfolderToDelete, setSubfolderToDelete] = useState<FolderType | null>(null);
    const [isDeletingSubfolder, setIsDeletingSubfolder] = useState(false);
    const [openSubfolderMenuId, setOpenSubfolderMenuId] = useState<string | null>(null);
    const subfolderMenuRefs = useRef<Record<string, HTMLDivElement>>({});
    const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
    const [movingItemId, setMovingItemId] = useState<string | null>(null);
    const [movingItemType, setMovingItemType] = useState<FolderResourceType | null>(null);

    // Multi-select state for each item type
    const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<Set<string>>(new Set());
    const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
    const [selectedFormInterfaceIds, setSelectedFormInterfaceIds] = useState<Set<string>>(
        new Set()
    );
    const [selectedChatInterfaceIds, setSelectedChatInterfaceIds] = useState<Set<string>>(
        new Set()
    );
    const [selectedKnowledgeBaseIds, setSelectedKnowledgeBaseIds] = useState<Set<string>>(
        new Set()
    );

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        itemType: FolderResourceType;
    }>({ isOpen: false, position: { x: 0, y: 0 }, itemType: "workflow" });

    // Fetch folder contents on mount or when folderId changes
    useEffect(() => {
        if (folderId) {
            fetchFolderContents(folderId);
        }

        return () => {
            clearFolderContents();
        };
    }, [folderId, fetchFolderContents, clearFolderContents]);

    // Close subfolder dropdown and menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Close subfolder dropdown if clicking outside
            if (
                isSubfolderDropdownOpen &&
                subfolderDropdownRef.current &&
                !subfolderDropdownRef.current.contains(event.target as Node)
            ) {
                setIsSubfolderDropdownOpen(false);
            }

            // Close subfolder menu if clicking outside
            if (openSubfolderMenuId) {
                const menuRef = subfolderMenuRefs.current[openSubfolderMenuId];
                if (menuRef && !menuRef.contains(event.target as Node)) {
                    setOpenSubfolderMenuId(null);
                }
            }
        };

        if (isSubfolderDropdownOpen || openSubfolderMenuId) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
        return undefined;
    }, [isSubfolderDropdownOpen, openSubfolderMenuId]);

    // Map sourceItemType to the correct route
    const getRootRoute = (): string => {
        switch (sourceItemType) {
            case "workflow":
                return "/";
            case "agent":
                return "/agents";
            case "form-interface":
                return "/form-interfaces";
            case "chat-interface":
                return "/chat-interfaces";
            case "knowledge-base":
                return "/knowledge-bases";
            default:
                return "/"; // Default to workflows
        }
    };

    const handleBack = () => {
        const rootRoute = getRootRoute();
        navigate(rootRoute);
    };

    const handleEditSubmit = async (name: string, color: string) => {
        if (folderId) {
            await updateFolder(folderId, { name, color });
            // Refresh contents to get updated folder info
            await fetchFolderContents(folderId);
        }
    };

    const handleDeleteConfirm = async () => {
        if (folderId) {
            setIsDeleting(true);
            try {
                await deleteFolder(folderId);
                navigate("/"); // Navigate to home after deletion
            } catch (_error) {
                // Error is logged in store
            } finally {
                setIsDeleting(false);
                setIsDeleteDialogOpen(false);
            }
        }
    };

    const handleRemoveFromFolder = async (itemId: string, itemType: FolderResourceType) => {
        if (!folderId) return;
        try {
            await removeItemsFromFolder({
                itemIds: [itemId],
                itemType,
                folderId
            });
            // Refresh folder contents and sidebar counts
            await Promise.all([fetchFolderContents(folderId), refreshFolders()]);
        } catch (_error) {
            // Error logged in API call
        }
    };

    const handleMoveToFolder = async (targetFolderId: string | null) => {
        if (!folderId || !targetFolderId) {
            throw new Error("Missing required information for move operation");
        }

        // Check if we're doing a batch move or single move
        if (movingItemId && movingItemType) {
            // Single item move
            await moveItemsToFolder(targetFolderId, [movingItemId], movingItemType);
            await removeItemsFromFolder({
                itemIds: [movingItemId],
                itemType: movingItemType,
                folderId
            });
        } else {
            // Batch move - handle all selected types
            const { selectedTypes } = getTotalSelectedCount();
            if (selectedTypes.length === 0) {
                throw new Error("No items selected for move operation");
            }

            // Move items of each type separately
            for (const itemType of selectedTypes) {
                const selected = getSelectedIds(itemType);
                if (selected.size > 0) {
                    const itemIds = Array.from(selected);
                    // Move items to target folder
                    await moveItemsToFolder(targetFolderId, itemIds, itemType);
                    // Explicitly remove from current folder
                    await removeItemsFromFolder({
                        itemIds,
                        itemType,
                        folderId
                    });
                    // Clear selection for this type
                    setSelectedIds(itemType, new Set());
                }
            }
        }

        // Refresh folder contents and sidebar counts
        await Promise.all([fetchFolderContents(folderId), refreshFolders()]);

        // Reset state
        setMovingItemId(null);
        setMovingItemType(null);
    };

    const handleMoveToFolderClick = (itemId: string, itemType: FolderResourceType) => {
        setMovingItemId(itemId);
        setMovingItemType(itemType);
        setIsMoveDialogOpen(true);
    };

    // Get selected items for a given type
    const getSelectedIds = (itemType: FolderResourceType): Set<string> => {
        switch (itemType) {
            case "workflow":
                return selectedWorkflowIds;
            case "agent":
                return selectedAgentIds;
            case "form-interface":
                return selectedFormInterfaceIds;
            case "chat-interface":
                return selectedChatInterfaceIds;
            case "knowledge-base":
                return selectedKnowledgeBaseIds;
        }
    };

    // Set selected items for a given type
    const setSelectedIds = (itemType: FolderResourceType, ids: Set<string>) => {
        switch (itemType) {
            case "workflow":
                setSelectedWorkflowIds(ids);
                break;
            case "agent":
                setSelectedAgentIds(ids);
                break;
            case "form-interface":
                setSelectedFormInterfaceIds(ids);
                break;
            case "chat-interface":
                setSelectedChatInterfaceIds(ids);
                break;
            case "knowledge-base":
                setSelectedKnowledgeBaseIds(ids);
                break;
        }
    };

    // Get navigation path based on item type
    const getItemPath = useCallback((itemType: FolderResourceType, itemId: string): string => {
        switch (itemType) {
            case "workflow":
                return `/builder/${itemId}`;
            case "agent":
                return `/agents/${itemId}`;
            case "form-interface":
                return `/form-interfaces/${itemId}/edit`;
            case "chat-interface":
                return `/chat-interfaces/${itemId}/edit`;
            case "knowledge-base":
                return `/knowledge-bases/${itemId}`;
        }
    }, []);

    // Handle item click with multi-select support
    const handleItemClick = useCallback(
        (e: React.MouseEvent, itemId: string, itemType: FolderResourceType) => {
            if (e.shiftKey) {
                e.preventDefault();
                // Use functional update to ensure we get the latest state
                switch (itemType) {
                    case "workflow":
                        setSelectedWorkflowIds((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(itemId)) {
                                newSet.delete(itemId);
                            } else {
                                newSet.add(itemId);
                            }
                            return newSet;
                        });
                        break;
                    case "agent":
                        setSelectedAgentIds((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(itemId)) {
                                newSet.delete(itemId);
                            } else {
                                newSet.add(itemId);
                            }
                            return newSet;
                        });
                        break;
                    case "form-interface":
                        setSelectedFormInterfaceIds((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(itemId)) {
                                newSet.delete(itemId);
                            } else {
                                newSet.add(itemId);
                            }
                            return newSet;
                        });
                        break;
                    case "chat-interface":
                        setSelectedChatInterfaceIds((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(itemId)) {
                                newSet.delete(itemId);
                            } else {
                                newSet.add(itemId);
                            }
                            return newSet;
                        });
                        break;
                    case "knowledge-base":
                        setSelectedKnowledgeBaseIds((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(itemId)) {
                                newSet.delete(itemId);
                            } else {
                                newSet.add(itemId);
                            }
                            return newSet;
                        });
                        break;
                }
            } else {
                const selected = getSelectedIds(itemType);
                if (selected.size === 0) {
                    // Navigate to item when no items are selected
                    navigate(getItemPath(itemType, itemId), {
                        state: { fromFolderId: folderId }
                    });
                } else {
                    // Clear selection on normal click when items are selected
                    e.preventDefault();
                    setSelectedIds(itemType, new Set());
                }
            }
        },
        [navigate, folderId, getItemPath, getSelectedIds, setSelectedIds]
    );

    // Handle item context menu
    const handleItemContextMenu = useCallback(
        (e: React.MouseEvent, itemId: string, itemType: FolderResourceType) => {
            e.preventDefault();
            const selected = getSelectedIds(itemType);
            // If right-clicking on an unselected item, select only that item
            if (!selected.has(itemId)) {
                setSelectedIds(itemType, new Set([itemId]));
            }
            setContextMenu({
                isOpen: true,
                position: { x: e.clientX, y: e.clientY },
                itemType
            });
        },
        []
    );

    // Close context menu
    const closeContextMenu = useCallback(() => {
        setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, itemType: "workflow" });
    }, []);

    // Get total selected count and all selected types
    const getTotalSelectedCount = useCallback(() => {
        const counts = {
            workflow: selectedWorkflowIds.size,
            agent: selectedAgentIds.size,
            "form-interface": selectedFormInterfaceIds.size,
            "chat-interface": selectedChatInterfaceIds.size,
            "knowledge-base": selectedKnowledgeBaseIds.size
        };
        const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
        const selectedTypes = Object.entries(counts)
            .filter(([_, count]) => count > 0)
            .map(([type]) => type as FolderResourceType);
        const selectedType = selectedTypes.length === 1 ? selectedTypes[0] : undefined;
        return { total, selectedType, selectedTypes };
    }, [
        selectedWorkflowIds.size,
        selectedAgentIds.size,
        selectedFormInterfaceIds.size,
        selectedChatInterfaceIds.size,
        selectedKnowledgeBaseIds.size
    ]);

    // Clear all selections
    const clearAllSelections = useCallback(() => {
        setSelectedWorkflowIds(new Set());
        setSelectedAgentIds(new Set());
        setSelectedFormInterfaceIds(new Set());
        setSelectedChatInterfaceIds(new Set());
        setSelectedKnowledgeBaseIds(new Set());
    }, []);

    // Handle batch move from header
    const handleBatchMoveFromHeader = useCallback(() => {
        const { total } = getTotalSelectedCount();
        if (total > 0) {
            setMovingItemId(null);
            setMovingItemType(null); // null means mixed types
            setIsMoveDialogOpen(true);
        }
    }, [getTotalSelectedCount]);

    // Handle batch remove from header
    const handleBatchRemoveFromHeader = useCallback(async () => {
        const { selectedTypes, total } = getTotalSelectedCount();
        if (!folderId || selectedTypes.length === 0 || total === 0) return;

        // Remove items of each type separately
        for (const itemType of selectedTypes) {
            const selected = getSelectedIds(itemType);
            if (selected.size > 0) {
                const itemIds = Array.from(selected);
                await removeItemsFromFolder({
                    itemIds,
                    itemType,
                    folderId
                });
                // Clear selection for this type
                setSelectedIds(itemType, new Set());
            }
        }

        // Refresh folder contents and sidebar counts
        await Promise.all([fetchFolderContents(folderId), refreshFolders()]);
    }, [folderId, getTotalSelectedCount, getSelectedIds, fetchFolderContents, refreshFolders]);

    // Batch remove handler
    const handleBatchRemoveFromFolder = useCallback(async () => {
        if (!folderId) return;
        const selected = getSelectedIds(contextMenu.itemType);
        if (selected.size === 0) return;

        const itemIds = Array.from(selected);
        await removeItemsFromFolder({
            itemIds,
            itemType: contextMenu.itemType,
            folderId
        });
        // Refresh folder contents and sidebar counts
        await Promise.all([fetchFolderContents(folderId), refreshFolders()]);
        // Clear selection
        setSelectedIds(contextMenu.itemType, new Set());
        closeContextMenu();
    }, [folderId, contextMenu.itemType, fetchFolderContents, refreshFolders]);

    // Context menu items
    const getContextMenuItems = (): ContextMenuItem[] => {
        const selected = getSelectedIds(contextMenu.itemType);
        const count = selected.size;
        if (count === 0) return [];

        return [
            {
                label: `Move ${count} item${count > 1 ? "s" : ""} to folder`,
                icon: <FolderInput className="w-4 h-4" />,
                onClick: () => {
                    closeContextMenu();
                    setMovingItemId(null);
                    setMovingItemType(contextMenu.itemType);
                    setIsMoveDialogOpen(true);
                }
            },
            {
                label: `Remove ${count} item${count > 1 ? "s" : ""} from folder`,
                icon: <FolderMinus className="w-4 h-4" />,
                onClick: handleBatchRemoveFromFolder
            }
        ];
    };

    const handleCreateSubfolder = async (name: string, color: string) => {
        if (!folderId) return;
        await createFolder({ name, color, parentId: folderId });
        // Refresh folder contents to show new subfolder and update sidebar
        await Promise.all([fetchFolderContents(folderId), refreshFolders()]);
        // Automatically show subfolders section so the newly created subfolder is visible
        setShowSubfolders(true);
    };

    const handleSubfolderClick = (subfolderId: string) => {
        navigate(`/folders/${subfolderId}`);
    };

    const handleEditSubfolder = async (name: string, color: string) => {
        if (!subfolderToEdit) return;
        await updateFolder(subfolderToEdit.id, { name, color });
        // Refresh folder contents to show updated subfolder
        if (folderId) {
            await Promise.all([fetchFolderContents(folderId), refreshFolders()]);
        }
        setSubfolderToEdit(null);
    };

    const handleDeleteSubfolder = async () => {
        if (!subfolderToDelete) return;
        setIsDeletingSubfolder(true);
        try {
            await deleteFolder(subfolderToDelete.id);
            // Refresh folder contents and sidebar
            if (folderId) {
                await Promise.all([fetchFolderContents(folderId), refreshFolders()]);
            }
            setSubfolderToDelete(null);
        } catch (_error) {
            // Error is logged in store
        } finally {
            setIsDeletingSubfolder(false);
        }
    };

    // Loading state
    if (isLoadingContents) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-8">
                <LoadingState message="Loading folder contents..." />
            </div>
        );
    }

    // Error state
    if (contentsError) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="text-center py-12">
                    <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        Failed to load folder
                    </h3>
                    <p className="text-muted-foreground mb-4">{contentsError}</p>
                    <Button variant="secondary" onClick={handleBack}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    // No folder found
    if (!currentFolderContents) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="text-center py-12">
                    <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Folder not found</h3>
                    <p className="text-muted-foreground mb-4">
                        This folder may have been deleted or you don't have access to it.
                    </p>
                    <Button variant="secondary" onClick={handleBack}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    const { folder, items, itemCounts, subfolders = [] } = currentFolderContents;
    const ancestors = "ancestors" in folder ? folder.ancestors : [];
    const totalItems = itemCounts.total;
    const canCreateSubfolder = folder.depth < MAX_FOLDER_DEPTH - 1;

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-1.5 text-sm mb-6">
                <Link
                    to={getRootRoute()}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                </Link>
                {ancestors.map((ancestor: FolderType) => (
                    <div key={ancestor.id} className="flex items-center gap-1.5">
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <Link
                            to={`/folders/${ancestor.id}`}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: ancestor.color }}
                            />
                            <span>{ancestor.name}</span>
                        </Link>
                    </div>
                ))}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-1.5 text-foreground font-medium">
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: folder.color }}
                    />
                    <span>{folder.name}</span>
                </div>
            </nav>

            {/* Header */}
            <div className="mb-8">
                {/* Folder info and actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Folder color indicator - vertical bar style */}
                        <div
                            className="w-1 h-8 rounded-full"
                            style={{ backgroundColor: folder.color }}
                        />
                        <h1 className="text-2xl font-bold text-foreground">{folder.name}</h1>
                        <span className="text-sm text-muted-foreground">
                            {(() => {
                                const { total } = getTotalSelectedCount();
                                if (total > 0) {
                                    return `${total} selected`;
                                }
                                return totalItems === 0 && subfolders.length === 0
                                    ? "(empty)"
                                    : `(${totalItems} items${subfolders.length > 0 ? `, ${subfolders.length} subfolders` : ""})`;
                            })()}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {(() => {
                            const { total } = getTotalSelectedCount();
                            if (total > 0) {
                                // Show batch operations menu when items are selected
                                return (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearAllSelections}
                                        >
                                            Clear selection
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleBatchMoveFromHeader}
                                        >
                                            <FolderInput className="w-4 h-4 mr-1" />
                                            Move to folder
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleBatchRemoveFromHeader}
                                        >
                                            <FolderMinus className="w-4 h-4 mr-1" />
                                            Remove from folder
                                        </Button>
                                    </>
                                );
                            }
                            // Show original folder actions when no items are selected
                            return (
                                <>
                                    {/* Subfolder dropdown */}
                                    {(canCreateSubfolder || subfolders.length > 0) && (
                                        <div ref={subfolderDropdownRef} className="relative">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setIsSubfolderDropdownOpen(
                                                        !isSubfolderDropdownOpen
                                                    )
                                                }
                                                title="Subfolder options"
                                            >
                                                <FolderPlus className="w-4 h-4" />
                                            </Button>

                                            {isSubfolderDropdownOpen && (
                                                <div className="absolute right-0 mt-1 w-52 bg-card border border-border rounded-lg shadow-lg py-1 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                                                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                        Subfolders
                                                    </div>
                                                    {canCreateSubfolder && (
                                                        <button
                                                            onClick={() => {
                                                                setIsCreateSubfolderDialogOpen(
                                                                    true
                                                                );
                                                                setIsSubfolderDropdownOpen(false);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                        >
                                                            <FolderPlus className="w-4 h-4" />
                                                            <span>Create subfolder</span>
                                                        </button>
                                                    )}
                                                    {subfolders.length > 0 && (
                                                        <button
                                                            onClick={() =>
                                                                setShowSubfolders(!showSubfolders)
                                                            }
                                                            className={cn(
                                                                "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                                                                showSubfolders
                                                                    ? "text-primary bg-primary/5"
                                                                    : "text-foreground hover:bg-muted"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Folder className="w-4 h-4" />
                                                                <span>Show subfolders</span>
                                                            </div>
                                                            {showSubfolders && (
                                                                <Check className="w-3.5 h-3.5 text-primary" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEditDialogOpen(true)}
                                    >
                                        <Edit2 className="w-4 h-4 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsDeleteDialogOpen(true)}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Delete
                                    </Button>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* Subfolders Section */}
            {subfolders.length > 0 && showSubfolders && (
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                        Subfolders
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {subfolders.map((subfolder) => (
                            <div
                                key={subfolder.id}
                                className={cn(
                                    "relative flex items-center gap-3 p-3 rounded-lg border border-border",
                                    "bg-card hover:shadow-md hover:border-primary transition-all group cursor-pointer"
                                )}
                            >
                                <button
                                    onClick={() => handleSubfolderClick(subfolder.id)}
                                    className={cn(
                                        "flex items-center gap-3 flex-1 text-left min-w-0",
                                        "focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
                                    )}
                                >
                                    <div
                                        className="w-0.5 h-6 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: subfolder.color }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                            {subfolder.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {subfolder.itemCounts.total} items
                                        </div>
                                    </div>
                                </button>
                                {/* Option Menu */}
                                <div
                                    className="relative flex-shrink-0"
                                    ref={(el) => {
                                        if (el) {
                                            subfolderMenuRefs.current[subfolder.id] = el;
                                        }
                                    }}
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenSubfolderMenuId(
                                                openSubfolderMenuId === subfolder.id
                                                    ? null
                                                    : subfolder.id
                                            );
                                        }}
                                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
                                        title="More options"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {openSubfolderMenuId === subfolder.id && (
                                        <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSubfolderToEdit(subfolder);
                                                    setOpenSubfolderMenuId(null);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSubfolderToDelete(subfolder);
                                                    setOpenSubfolderMenuId(null);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Content */}
            {totalItems === 0 && subfolders.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-lg">
                    <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        This folder is empty
                    </h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Add items to this folder from the Workflows, Agents, or other pages.
                        {canCreateSubfolder &&
                            " You can also create subfolders to organize your content."}
                    </p>
                    {canCreateSubfolder && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="mt-4"
                            onClick={() => setIsCreateSubfolderDialogOpen(true)}
                        >
                            <FolderPlus className="w-4 h-4 mr-1" />
                            Create Subfolder
                        </Button>
                    )}
                </div>
            ) : totalItems > 0 ? (
                <div>
                    <FolderItemSection
                        title="Workflows"
                        itemType="workflow"
                        items={items.workflows}
                        folderId={folder.id}
                        onRemoveFromFolder={handleRemoveFromFolder}
                        onMoveToFolder={handleMoveToFolderClick}
                        selectedIds={selectedWorkflowIds}
                        onItemClick={handleItemClick}
                        onItemContextMenu={handleItemContextMenu}
                        defaultCollapsed={
                            sourceItemType !== undefined && sourceItemType !== "workflow"
                        }
                    />

                    <FolderItemSection
                        title="Agents"
                        itemType="agent"
                        items={items.agents}
                        folderId={folder.id}
                        onRemoveFromFolder={handleRemoveFromFolder}
                        onMoveToFolder={handleMoveToFolderClick}
                        selectedIds={selectedAgentIds}
                        onItemClick={handleItemClick}
                        onItemContextMenu={handleItemContextMenu}
                        defaultCollapsed={
                            sourceItemType !== undefined && sourceItemType !== "agent"
                        }
                    />

                    <FolderItemSection
                        title="Form Interfaces"
                        itemType="form-interface"
                        items={items.formInterfaces}
                        folderId={folder.id}
                        onRemoveFromFolder={handleRemoveFromFolder}
                        onMoveToFolder={handleMoveToFolderClick}
                        selectedIds={selectedFormInterfaceIds}
                        onItemClick={handleItemClick}
                        onItemContextMenu={handleItemContextMenu}
                        defaultCollapsed={
                            sourceItemType !== undefined && sourceItemType !== "form-interface"
                        }
                    />

                    <FolderItemSection
                        title="Chat Interfaces"
                        itemType="chat-interface"
                        items={items.chatInterfaces}
                        folderId={folder.id}
                        onRemoveFromFolder={handleRemoveFromFolder}
                        onMoveToFolder={handleMoveToFolderClick}
                        selectedIds={selectedChatInterfaceIds}
                        onItemClick={handleItemClick}
                        onItemContextMenu={handleItemContextMenu}
                        defaultCollapsed={
                            sourceItemType !== undefined && sourceItemType !== "chat-interface"
                        }
                    />

                    <FolderItemSection
                        title="Knowledge Bases"
                        itemType="knowledge-base"
                        items={items.knowledgeBases}
                        folderId={folder.id}
                        onRemoveFromFolder={handleRemoveFromFolder}
                        onMoveToFolder={handleMoveToFolderClick}
                        selectedIds={selectedKnowledgeBaseIds}
                        onItemClick={handleItemClick}
                        onItemContextMenu={handleItemContextMenu}
                        defaultCollapsed={
                            sourceItemType !== undefined && sourceItemType !== "knowledge-base"
                        }
                    />
                </div>
            ) : null}

            {/* Edit Folder Dialog */}
            <CreateFolderDialog
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                onSubmit={handleEditSubmit}
                folder={folder}
            />

            {/* Create Subfolder Dialog */}
            <CreateFolderDialog
                isOpen={isCreateSubfolderDialogOpen}
                onClose={() => setIsCreateSubfolderDialogOpen(false)}
                onSubmit={handleCreateSubfolder}
                parentFolderName={folder.name}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Folder"
                message={`Are you sure you want to delete "${folder.name}"? ${subfolders.length > 0 ? "Subfolders will be promoted to the parent level. " : ""}Items in this folder will be moved to the root level, not deleted.`}
                confirmText={isDeleting ? "Deleting..." : "Delete"}
                variant="danger"
            />

            {/* Edit Subfolder Dialog */}
            <CreateFolderDialog
                isOpen={!!subfolderToEdit}
                onClose={() => setSubfolderToEdit(null)}
                onSubmit={handleEditSubfolder}
                folder={subfolderToEdit}
            />

            {/* Delete Subfolder Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!subfolderToDelete}
                onClose={() => setSubfolderToDelete(null)}
                onConfirm={handleDeleteSubfolder}
                title="Delete Subfolder"
                message={`Are you sure you want to delete "${subfolderToDelete?.name}"? Items in this subfolder will be moved to the parent folder, not deleted.`}
                confirmText={isDeletingSubfolder ? "Deleting..." : "Delete"}
                variant="danger"
            />

            {/* Move to Folder Dialog */}
            <MoveToFolderDialog
                isOpen={isMoveDialogOpen}
                onClose={() => {
                    setIsMoveDialogOpen(false);
                    setMovingItemId(null);
                    setMovingItemType(null);
                }}
                folders={folders}
                folderTree={folderTree}
                isLoadingFolders={isLoadingFolders}
                selectedItemCount={
                    movingItemId
                        ? 1
                        : (() => {
                              const { total, selectedType } = getTotalSelectedCount();
                              if (selectedType) {
                                  return getSelectedIds(selectedType).size;
                              }
                              return total;
                          })()
                }
                itemType={
                    movingItemType ||
                    (() => {
                        const { selectedType, selectedTypes } = getTotalSelectedCount();
                        // If multiple types selected, use workflow as fallback (dialog will show "items" in description)
                        if (selectedTypes.length > 1) {
                            return "workflow"; // Fallback, but count will be correct
                        }
                        return selectedType || contextMenu.itemType || "workflow";
                    })()
                }
                currentFolderId={folderId || null}
                onMove={handleMoveToFolder}
                onCreateFolder={() => {
                    setIsMoveDialogOpen(false);
                    setIsCreateSubfolderDialogOpen(true);
                }}
                showTotalCounts={
                    !movingItemId &&
                    (() => {
                        const { selectedTypes } = getTotalSelectedCount();
                        return selectedTypes.length > 1;
                    })()
                }
            />

            {/* Context Menu for batch operations */}
            <ContextMenu
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                items={getContextMenuItems()}
                onClose={closeContextMenu}
            />
        </div>
    );
}
