import {
    ClipboardList,
    Plus,
    MoreVertical,
    Copy,
    Trash2,
    Eye,
    Edit,
    Globe,
    FolderPlus,
    FolderInput,
    FolderMinus,
    GripVertical,
    ChevronDown
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { FormInterface, Folder, FolderWithCounts } from "@flowmaestro/shared";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { ContextMenu, type ContextMenuItem } from "../components/common/ContextMenu";
import { Dialog } from "../components/common/Dialog";
import { PageHeader } from "../components/common/PageHeader";
import { LoadingState } from "../components/common/Spinner";
import {
    FolderCard,
    CreateFolderDialog,
    MoveToFolderDialog,
    FolderBreadcrumb
} from "../components/folders";
import { CreateFormInterfaceDialog } from "../components/forms/CreateFormInterfaceDialog";
import {
    getFormInterfaces,
    deleteFormInterface,
    duplicateFormInterface,
    getFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    moveItemsToFolder,
    removeItemsFromFolder
} from "../lib/api";
import { logger } from "../lib/logger";

export function FormInterfaces() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentFolderId = searchParams.get("folder");

    // State
    const [formInterfaces, setFormInterfaces] = useState<FormInterface[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<{ title: string; message: string } | null>(null);

    // Folder state
    const [folders, setFolders] = useState<FolderWithCounts[]>([]);
    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
    const [isLoadingFolders, setIsLoadingFolders] = useState(true);

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
    const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<FormInterface | null>(null);
    const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<FolderWithCounts | null>(null);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        type: "form" | "folder";
    }>({ isOpen: false, position: { x: 0, y: 0 }, type: "form" });

    // Dropdown menu state
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Load folders on mount
    useEffect(() => {
        loadFolders();
    }, []);

    // Load form interfaces when folder changes
    useEffect(() => {
        const folderId = currentFolderId || undefined;
        loadFormInterfaces(folderId);
    }, [currentFolderId]);

    // Update current folder when folderId changes
    useEffect(() => {
        if (currentFolderId) {
            const folder = folders.find((f) => f.id === currentFolderId);
            setCurrentFolder(folder || null);
        } else {
            setCurrentFolder(null);
        }
    }, [currentFolderId, folders]);

    // Close menu on outside click
    useEffect(() => {
        if (!openMenuId) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openMenuId]);

    const loadFormInterfaces = async (folderId?: string) => {
        setIsLoading(true);
        try {
            const response = await getFormInterfaces({ folderId });
            if (response.success && response.data) {
                setFormInterfaces(response.data.items);
            }
        } catch (err) {
            logger.error("Failed to load form interfaces", err);
            setError({
                title: "Failed to load",
                message: err instanceof Error ? err.message : "Unknown error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const loadFolders = async () => {
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
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        try {
            await deleteFormInterface(deleteTarget.id);
            setFormInterfaces((prev) => prev.filter((fi) => fi.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            logger.error("Failed to delete form interface", err);
            setError({
                title: "Delete failed",
                message: err instanceof Error ? err.message : "Failed to delete"
            });
        }
    };

    const handleDuplicate = async (formInterface: FormInterface) => {
        try {
            const response = await duplicateFormInterface(formInterface.id);
            if (response.success && response.data) {
                setFormInterfaces((prev) => [response.data, ...prev]);
            }
        } catch (err) {
            logger.error("Failed to duplicate form interface", err);
            setError({
                title: "Duplicate failed",
                message: err instanceof Error ? err.message : "Failed to duplicate"
            });
        }
        setOpenMenuId(null);
    };

    const handleCreated = (newFormInterface: { id: string; title: string }) => {
        // Reload the list to get the full form interface data
        const folderId = currentFolderId || undefined;
        loadFormInterfaces(folderId);
        // Navigate to edit the newly created form
        navigate(`/form-interfaces/${newFormInterface.id}/edit`);
    };

    // Folder handlers
    const handleCreateFolder = async (name: string, color: string) => {
        await createFolder({ name, color });
        await loadFolders();
    };

    const handleEditFolder = async (name: string, color: string) => {
        if (!folderToEdit) return;
        await updateFolder(folderToEdit.id, { name, color });
        await loadFolders();
        setFolderToEdit(null);
    };

    const handleDeleteFolder = async () => {
        if (!folderToDelete) return;
        setIsBatchDeleting(true);
        try {
            await deleteFolder(folderToDelete.id);
            await loadFolders();
            const folderId = currentFolderId || undefined;
            await loadFormInterfaces(folderId);
            setFolderToDelete(null);
            if (currentFolderId === folderToDelete.id) {
                setSearchParams({});
            }
        } catch (err) {
            logger.error("Failed to delete folder", err);
        } finally {
            setIsBatchDeleting(false);
        }
    };

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
                setSearchParams({ folder: folder.id });
            } else {
                setSelectedFolderIds(new Set());
            }
        },
        [setSearchParams, selectedFolderIds.size]
    );

    const handleFolderContextMenu = useCallback(
        (e: React.MouseEvent, folder: FolderWithCounts) => {
            e.preventDefault();
            if (!selectedFolderIds.has(folder.id)) {
                setSelectedFolderIds(new Set([folder.id]));
            }
            setContextMenu({
                isOpen: true,
                position: { x: e.clientX, y: e.clientY },
                type: "folder"
            });
        },
        [selectedFolderIds]
    );

    const handleBatchDeleteFolders = async () => {
        if (selectedFolderIds.size === 0) return;

        setIsBatchDeleting(true);
        try {
            const deletePromises = Array.from(selectedFolderIds).map((id) => deleteFolder(id));
            await Promise.all(deletePromises);

            await loadFolders();
            const folderId = currentFolderId || undefined;
            await loadFormInterfaces(folderId);
            setSelectedFolderIds(new Set());
            setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: "form" });
        } catch (err) {
            logger.error("Failed to delete folders", err);
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const handleNavigateToRoot = () => {
        setSearchParams({});
    };

    const handleMoveToFolder = async (folderId: string | null) => {
        if (!folderId) {
            throw new Error("Folder ID is required");
        }
        await moveItemsToFolder({
            itemIds: Array.from(selectedIds),
            itemType: "form-interface",
            folderId
        });
        const currentFolderIdParam = currentFolderId || undefined;
        await loadFormInterfaces(currentFolderIdParam);
        await loadFolders();
        setSelectedIds(new Set());
    };

    const handleRemoveFromFolder = async (formIds: string | string[]) => {
        if (!currentFolderId) return; // Can only remove when viewing inside a folder
        const ids = Array.isArray(formIds) ? formIds : [formIds];
        if (ids.length === 0) return;

        try {
            await removeItemsFromFolder({
                itemIds: ids,
                itemType: "form-interface",
                folderId: currentFolderId
            });
            const currentFolderIdParam = currentFolderId || undefined;
            await loadFormInterfaces(currentFolderIdParam);
            await loadFolders();
        } catch (err) {
            logger.error("Failed to remove form interface from folder", err);
        }
    };

    // Drag and drop handlers
    const handleDragStart = useCallback(
        (e: React.DragEvent, fi: FormInterface) => {
            // If the dragged item is not selected, select only it
            const itemIds = selectedIds.has(fi.id) ? Array.from(selectedIds) : [fi.id];

            e.dataTransfer.setData(
                "application/json",
                JSON.stringify({ itemIds, itemType: "form-interface" })
            );
            e.dataTransfer.effectAllowed = "move";
        },
        [selectedIds]
    );

    const handleDropOnFolder = useCallback(
        async (folderId: string, itemIds: string[], itemType: string) => {
            if (itemType !== "form-interface") return;
            try {
                await moveItemsToFolder({ itemIds, itemType, folderId });
                const currentFolderIdParam = currentFolderId || undefined;
                await loadFormInterfaces(currentFolderIdParam);
                await loadFolders();
                setSelectedIds(new Set());
            } catch (err) {
                logger.error("Failed to move items to folder", err);
            }
        },
        [currentFolderId]
    );

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    };

    // Selection handlers for batch operations
    const handleCardClick = useCallback(
        (e: React.MouseEvent, fi: FormInterface) => {
            if (e.shiftKey) {
                e.preventDefault();
                setSelectedIds((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(fi.id)) {
                        newSet.delete(fi.id);
                    } else {
                        newSet.add(fi.id);
                    }
                    return newSet;
                });
            } else if (selectedIds.size === 0) {
                navigate(`/form-interfaces/${fi.id}/edit`);
            } else {
                // Clear selection on normal click when items are selected
                setSelectedIds(new Set());
            }
        },
        [navigate, selectedIds.size]
    );

    const handleContextMenu = useCallback(
        (e: React.MouseEvent, fi: FormInterface) => {
            e.preventDefault();
            // If right-clicking on an unselected item, select only that item
            if (!selectedIds.has(fi.id)) {
                setSelectedIds(new Set([fi.id]));
            }
            setContextMenu({
                isOpen: true,
                position: { x: e.clientX, y: e.clientY },
                type: "form"
            });
        },
        [selectedIds]
    );

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;

        setIsBatchDeleting(true);
        try {
            // Delete all selected form interfaces
            const deletePromises = Array.from(selectedIds).map((id) => deleteFormInterface(id));
            await Promise.all(deletePromises);

            // Refresh the list and clear selection
            const folderId = currentFolderId || undefined;
            await loadFormInterfaces(folderId);
            await loadFolders();
            setSelectedIds(new Set());
            setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: "form" });
        } catch (err) {
            logger.error("Failed to delete form interfaces", err);
            setError({
                title: "Delete Failed",
                message:
                    err instanceof Error
                        ? err.message
                        : "Failed to delete some form interfaces. Please try again."
            });
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const closeContextMenu = useCallback(() => {
        setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: "form" });
    }, []);

    const formContextMenuItems: ContextMenuItem[] = [
        {
            label: "Move to folder",
            icon: <FolderInput className="w-4 h-4" />,
            onClick: () => {
                setIsMoveDialogOpen(true);
                closeContextMenu();
            }
        },
        ...(currentFolderId
            ? [
                  {
                      label: "Remove from folder",
                      icon: <FolderMinus className="w-4 h-4" />,
                      onClick: () => {
                          if (selectedIds.size > 0 && currentFolderId) {
                              handleRemoveFromFolder(Array.from(selectedIds));
                              setSelectedIds(new Set());
                          }
                          closeContextMenu();
                      }
                  }
              ]
            : []),
        {
            label: `Delete ${selectedIds.size} form${selectedIds.size !== 1 ? "s" : ""}`,
            icon: <Trash2 className="w-4 h-4" />,
            onClick: handleBatchDelete,
            variant: "danger",
            disabled: isBatchDeleting
        }
    ];

    const folderContextMenuItems: ContextMenuItem[] = [
        {
            label: `Delete ${selectedFolderIds.size} folder${selectedFolderIds.size !== 1 ? "s" : ""}`,
            icon: <Trash2 className="w-4 h-4" />,
            onClick: handleBatchDeleteFolders,
            variant: "danger",
            disabled: isBatchDeleting
        }
    ];

    // Folders to show
    const foldersToShow = currentFolderId ? [] : folders;
    const showFoldersSection = !currentFolderId && foldersToShow.length > 0;

    if (isLoading || isLoadingFolders) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-8">
                <LoadingState message="Loading form interfaces..." />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Form Interfaces"
                description={
                    selectedFolderIds.size > 0
                        ? `${selectedFolderIds.size} folder${selectedFolderIds.size !== 1 ? "s" : ""} selected`
                        : selectedIds.size > 0
                          ? `${selectedIds.size} selected`
                          : currentFolder
                            ? `${formInterfaces.length} form${formInterfaces.length !== 1 ? "s" : ""} in ${currentFolder.name}`
                            : "Create public forms that connect to your workflows and agents"
                }
                action={
                    selectedFolderIds.size > 0 ? (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => setSelectedFolderIds(new Set())}>
                                Clear selection
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleBatchDeleteFolders}
                                disabled={isBatchDeleting}
                                loading={isBatchDeleting}
                            >
                                {!isBatchDeleting && <Trash2 className="w-4 h-4" />}
                                Delete folders
                            </Button>
                        </div>
                    ) : selectedIds.size > 0 ? (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>
                                Clear selection
                            </Button>
                            {currentFolderId && (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        if (selectedIds.size > 0 && currentFolderId) {
                                            handleRemoveFromFolder(Array.from(selectedIds));
                                            setSelectedIds(new Set());
                                        }
                                    }}
                                >
                                    <FolderMinus className="w-4 h-4" />
                                    Remove from folder
                                </Button>
                            )}
                            <Button variant="secondary" onClick={() => setIsMoveDialogOpen(true)}>
                                <FolderInput className="w-4 h-4" />
                                Move to folder
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleBatchDelete}
                                disabled={isBatchDeleting}
                                loading={isBatchDeleting}
                            >
                                {!isBatchDeleting && <Trash2 className="w-4 h-4" />}
                                Delete selected
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => setIsCreateFolderDialogOpen(true)}
                                title="Create folder"
                            >
                                <FolderPlus className="w-4 h-4" />
                            </Button>
                            <Button variant="primary" onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Form Interface
                            </Button>
                        </div>
                    )
                }
            />

            {/* Breadcrumb when inside a folder */}
            {currentFolder && (
                <>
                    <FolderBreadcrumb
                        baseName="Form Interfaces"
                        folder={currentFolder}
                        onNavigateToRoot={handleNavigateToRoot}
                        className="mb-4"
                    />
                    <div className="border-t border-border my-6" />
                </>
            )}

            {/* Folders Section */}
            {showFoldersSection && (
                <>
                    <button
                        onClick={() => setIsFoldersCollapsed(!isFoldersCollapsed)}
                        className="flex items-center gap-1.5 mb-4 group"
                    >
                        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide group-hover:text-foreground transition-colors">
                            Folders
                        </h2>
                        <ChevronDown
                            className={`w-4 h-4 text-muted-foreground group-hover:text-foreground transition-all ${
                                isFoldersCollapsed ? "-rotate-90" : ""
                            }`}
                        />
                    </button>
                    {!isFoldersCollapsed && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            {foldersToShow.map((folder) => (
                                <FolderCard
                                    key={folder.id}
                                    folder={folder}
                                    onClick={(e) => handleFolderClick(e, folder)}
                                    onEdit={() => setFolderToEdit(folder)}
                                    onDelete={() => setFolderToDelete(folder)}
                                    isSelected={selectedFolderIds.has(folder.id)}
                                    onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                                    onDrop={(itemIds, itemType) =>
                                        handleDropOnFolder(folder.id, itemIds, itemType)
                                    }
                                    displayItemType="form-interface"
                                />
                            ))}
                        </div>
                    )}
                    <div className="border-t border-border my-6" />
                    <div className="mb-4">
                        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Form Interfaces
                        </h2>
                    </div>
                </>
            )}

            {formInterfaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-card">
                    <ClipboardList className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        {currentFolder
                            ? "No form interfaces in this folder"
                            : "No form interfaces yet"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                        {currentFolder
                            ? "Move form interfaces here or create a new one."
                            : "Create a form interface to expose your workflows or agents as public forms with custom branding."}
                    </p>
                    <Button variant="primary" onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        {currentFolder ? "Create Form Interface" : "Create Form Interface"}
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    {formInterfaces.map((fi) => (
                        <div
                            key={fi.id}
                            className={`bg-card border rounded-lg transition-colors cursor-pointer select-none group relative ${
                                selectedIds.has(fi.id)
                                    ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                                    : "border-border hover:border-primary/50"
                            }`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, fi)}
                            onClick={(e) => handleCardClick(e, fi)}
                            onContextMenu={(e) => handleContextMenu(e, fi)}
                        >
                            {/* Drag Handle - visible on hover */}
                            <div
                                className="absolute bottom-2 right-2 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <GripVertical className="w-4 h-4" />
                            </div>

                            {/* Cover with icon */}
                            <div className="relative">
                                <div
                                    className="h-32 w-full overflow-hidden rounded-t-lg"
                                    style={{
                                        backgroundColor:
                                            fi.coverType === "color" ? fi.coverValue : "#6366f1",
                                        backgroundImage:
                                            fi.coverType === "image" || fi.coverType === "stock"
                                                ? `url(${fi.coverValue})`
                                                : undefined,
                                        backgroundSize: "cover",
                                        backgroundPosition: "center"
                                    }}
                                />
                                {/* Icon overlay - positioned outside cover to avoid clip */}
                                {fi.iconUrl && (
                                    <div className="absolute -bottom-6 left-4">
                                        <div className="w-12 h-12 rounded-lg bg-card border-2 border-background overflow-hidden flex items-center justify-center text-2xl">
                                            {fi.iconUrl.startsWith("http") ? (
                                                <img
                                                    src={fi.iconUrl}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                fi.iconUrl
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className={`p-4 ${fi.iconUrl ? "pt-8" : ""}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-foreground truncate">
                                            {fi.title}
                                        </h3>
                                        {fi.description && (
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                {fi.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Menu */}
                                    <div
                                        className="relative"
                                        ref={openMenuId === fi.id ? menuRef : null}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() =>
                                                setOpenMenuId(openMenuId === fi.id ? null : fi.id)
                                            }
                                            className="p-1.5 hover:bg-muted rounded-md text-muted-foreground"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>

                                        {openMenuId === fi.id && (
                                            <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                                                <button
                                                    onClick={() => {
                                                        navigate(`/form-interfaces/${fi.id}/edit`);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                    Edit
                                                </button>
                                                {fi.status === "published" && (
                                                    <button
                                                        onClick={() => {
                                                            window.open(`/i/${fi.slug}`, "_blank");
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        View Live
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        navigate(
                                                            `/form-interfaces/${fi.id}/submissions`
                                                        );
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                                >
                                                    <ClipboardList className="w-4 h-4" />
                                                    Submissions ({fi.submissionCount})
                                                </button>
                                                <button
                                                    onClick={() => handleDuplicate(fi)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                    Duplicate
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setOpenMenuId(null);
                                                        setSelectedIds(new Set([fi.id]));
                                                        setIsMoveDialogOpen(true);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                                >
                                                    <FolderInput className="w-4 h-4" />
                                                    Move to folder
                                                </button>
                                                {currentFolderId && (
                                                    <button
                                                        onClick={() => {
                                                            setOpenMenuId(null);
                                                            handleRemoveFromFolder(fi.id);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                                    >
                                                        <FolderMinus className="w-4 h-4" />
                                                        Remove from folder
                                                    </button>
                                                )}
                                                <hr className="my-1 border-border" />
                                                <button
                                                    onClick={() => {
                                                        setDeleteTarget(fi);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Status & Stats */}
                                <div className="flex items-center gap-2 mt-3">
                                    <Badge
                                        variant={fi.status === "published" ? "success" : "default"}
                                    >
                                        {fi.status === "published" ? (
                                            <>
                                                <Globe className="w-3 h-3 mr-1" />
                                                Published
                                            </>
                                        ) : (
                                            "Draft"
                                        )}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {fi.submissionCount} submissions
                                    </span>
                                </div>

                                <p className="text-xs text-muted-foreground mt-2">
                                    Updated {formatDate(fi.updatedAt)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Dialog */}
            <CreateFormInterfaceDialog
                isOpen={isCreateDialogOpen}
                onClose={() => setIsCreateDialogOpen(false)}
                onCreated={handleCreated}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Delete Form Interface"
                message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone and all submissions will be lost.`}
                confirmText="Delete"
                variant="danger"
            />

            {/* Error Dialog */}
            {error && (
                <Dialog isOpen={error !== null} onClose={() => setError(null)} title={error.title}>
                    <p className="text-muted-foreground">{error.message}</p>
                    <div className="flex justify-end mt-4">
                        <Button variant="primary" onClick={() => setError(null)}>
                            OK
                        </Button>
                    </div>
                </Dialog>
            )}

            {/* Context Menu for batch operations */}
            <ContextMenu
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                items={
                    contextMenu.type === "folder" ? folderContextMenuItems : formContextMenuItems
                }
                onClose={closeContextMenu}
            />

            {/* Create/Edit Folder Dialog */}
            <CreateFolderDialog
                isOpen={isCreateFolderDialogOpen || !!folderToEdit}
                onClose={() => {
                    setIsCreateFolderDialogOpen(false);
                    setFolderToEdit(null);
                }}
                onSubmit={folderToEdit ? handleEditFolder : handleCreateFolder}
                folder={folderToEdit}
            />

            {/* Move to Folder Dialog */}
            <MoveToFolderDialog
                isOpen={isMoveDialogOpen}
                onClose={() => setIsMoveDialogOpen(false)}
                folders={folders}
                isLoadingFolders={isLoadingFolders}
                selectedItemCount={selectedIds.size}
                itemType="form-interface"
                currentFolderId={currentFolderId}
                onMove={handleMoveToFolder}
                onCreateFolder={() => {
                    setIsMoveDialogOpen(false);
                    setIsCreateFolderDialogOpen(true);
                }}
            />

            {/* Delete Folder Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!folderToDelete}
                onClose={() => setFolderToDelete(null)}
                onConfirm={handleDeleteFolder}
                title="Delete Folder"
                message={`Are you sure you want to delete the folder "${folderToDelete?.name}"? Items in this folder will be moved to the root level.`}
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
