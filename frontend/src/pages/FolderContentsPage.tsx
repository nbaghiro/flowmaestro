import {
    ArrowLeft,
    Edit2,
    Trash2,
    Folder,
    FolderPlus,
    ChevronRight,
    Home,
    Check
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import type { FolderResourceType, Folder as FolderType } from "@flowmaestro/shared";
import { MAX_FOLDER_DEPTH } from "@flowmaestro/shared";
import { Button } from "../components/common/Button";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { LoadingState } from "../components/common/Spinner";
import { CreateFolderDialog, FolderItemSection } from "../components/folders";
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
        refreshFolders
    } = useFolderStore();

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCreateSubfolderDialogOpen, setIsCreateSubfolderDialogOpen] = useState(false);
    const [showSubfolders, setShowSubfolders] = useState(false);
    const [isSubfolderDropdownOpen, setIsSubfolderDropdownOpen] = useState(false);
    const subfolderDropdownRef = useRef<HTMLDivElement>(null);

    // Fetch folder contents on mount or when folderId changes
    useEffect(() => {
        if (folderId) {
            fetchFolderContents(folderId);
        }

        return () => {
            clearFolderContents();
        };
    }, [folderId, fetchFolderContents, clearFolderContents]);

    // Close subfolder dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                subfolderDropdownRef.current &&
                !subfolderDropdownRef.current.contains(event.target as Node)
            ) {
                setIsSubfolderDropdownOpen(false);
            }
        };

        if (isSubfolderDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
        return undefined;
    }, [isSubfolderDropdownOpen]);

    const handleBack = () => {
        navigate(-1);
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
            // Refresh folder contents
            await fetchFolderContents(folderId);
        } catch (_error) {
            // Error logged in API call
        }
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
                    to="/"
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
                            {totalItems === 0 && subfolders.length === 0
                                ? "(empty)"
                                : `(${totalItems} items${subfolders.length > 0 ? `, ${subfolders.length} subfolders` : ""})`}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Subfolder dropdown */}
                        {(canCreateSubfolder || subfolders.length > 0) && (
                            <div ref={subfolderDropdownRef} className="relative">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        setIsSubfolderDropdownOpen(!isSubfolderDropdownOpen)
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
                                                    setIsCreateSubfolderDialogOpen(true);
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
                                                onClick={() => setShowSubfolders(!showSubfolders)}
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
                        <Button variant="ghost" size="sm" onClick={() => setIsEditDialogOpen(true)}>
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
                            <button
                                key={subfolder.id}
                                onClick={() => handleSubfolderClick(subfolder.id)}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border border-border",
                                    "bg-card hover:bg-muted/50 transition-colors text-left",
                                    "focus:outline-none focus:ring-2 focus:ring-primary/50"
                                )}
                            >
                                <div
                                    className="w-0.5 h-6 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: subfolder.color }}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium text-foreground truncate">
                                        {subfolder.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {subfolder.itemCounts.total} items
                                    </div>
                                </div>
                            </button>
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
        </div>
    );
}
