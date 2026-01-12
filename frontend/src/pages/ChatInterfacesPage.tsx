import { MessageSquare, Plus, Trash2, FolderInput, FolderMinus, Search } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type {
    ChatInterface,
    Folder,
    FolderWithCounts,
    ChatInterfaceSummary
} from "@flowmaestro/shared";
import { ChatInterfaceCard } from "../components/cards";
import { CreateChatInterfaceDialog } from "../components/chat/builder/CreateChatInterfaceDialog";
import { Button } from "../components/common/Button";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { ContextMenu, type ContextMenuItem } from "../components/common/ContextMenu";
import { Dialog } from "../components/common/Dialog";
import { ExpandableSearch } from "../components/common/ExpandableSearch";
import { FolderDropdown } from "../components/common/FolderDropdown";
import { PageHeader } from "../components/common/PageHeader";
import { SortDropdown } from "../components/common/SortDropdown";
import { LoadingState } from "../components/common/Spinner";
import {
    FolderCard,
    CreateFolderDialog,
    MoveToFolderDialog,
    FolderBreadcrumb
} from "../components/folders";
import { useSearch } from "../hooks/useSearch";
import { useSort, CHAT_INTERFACE_SORT_FIELDS } from "../hooks/useSort";
import {
    getChatInterfaces,
    deleteChatInterface,
    duplicateChatInterface,
    getFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    moveItemsToFolder,
    removeItemsFromFolder
} from "../lib/api";
import { logger } from "../lib/logger";
import { createDragPreview } from "../lib/utils";
import { buildFolderTree } from "../stores/folderStore";
import { useUIPreferencesStore } from "../stores/uiPreferencesStore";

// Convert ChatInterface to ChatInterfaceSummary for card components
function toChatInterfaceSummary(ci: ChatInterface): ChatInterfaceSummary {
    return {
        id: ci.id,
        name: ci.name,
        title: ci.title,
        description: ci.description ?? undefined,
        status: ci.status,
        coverType: ci.coverType,
        coverValue: ci.coverValue,
        iconUrl: ci.iconUrl,
        sessionCount: ci.sessionCount,
        messageCount: ci.messageCount,
        slug: ci.slug,
        createdAt: ci.createdAt,
        updatedAt: ci.updatedAt
    };
}

export function ChatInterfacesPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentFolderId = searchParams.get("folder");

    // State
    const [chatInterfaces, setChatInterfaces] = useState<ChatInterface[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<{ title: string; message: string } | null>(null);

    // Folder state
    const [folders, setFolders] = useState<FolderWithCounts[]>([]);
    const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
    const [isLoadingFolders, setIsLoadingFolders] = useState(true);
    const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
    const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
    const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
    const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<FolderWithCounts | null>(null);

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ChatInterface | null>(null);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const { showFoldersSection, setShowFoldersSection } = useUIPreferencesStore();
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        type: "chat" | "folder";
    }>({ isOpen: false, position: { x: 0, y: 0 }, type: "chat" });

    // Search functionality
    const {
        searchQuery,
        setSearchQuery,
        filteredItems: searchFilteredChatInterfaces,
        isSearchActive
    } = useSearch({
        items: chatInterfaces,
        searchFields: ["title", "description"]
    });

    // Sorting functionality
    const {
        sortState,
        setSortField,
        sortedItems: filteredChatInterfaces,
        availableFields
    } = useSort({
        items: searchFilteredChatInterfaces,
        fields: {
            name: "title",
            created: "createdAt",
            modified: "updatedAt",
            sessions: "sessionCount",
            status: "status"
        },
        availableFields: CHAT_INTERFACE_SORT_FIELDS
    });

    // Load folders on mount
    useEffect(() => {
        loadFolders();
    }, []);

    // Load chat interfaces when folder changes
    useEffect(() => {
        const folderId = currentFolderId || undefined;
        loadChatInterfaces(folderId);
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

    const loadChatInterfaces = async (folderId?: string) => {
        setIsLoading(true);
        try {
            const response = await getChatInterfaces({ folderId });
            if (response.success && response.data) {
                setChatInterfaces(response.data.items);
            }
        } catch (err) {
            logger.error("Failed to load chat interfaces", err);
            setError({
                title: "Failed to load",
                message: err instanceof Error ? err.message : "Unknown error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        try {
            await deleteChatInterface(deleteTarget.id);
            setChatInterfaces((prev) => prev.filter((ci) => ci.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            logger.error("Failed to delete chat interface", err);
            setError({
                title: "Delete failed",
                message: err instanceof Error ? err.message : "Failed to delete"
            });
        }
    };

    const handleDuplicate = async (chatInterface: ChatInterface) => {
        try {
            const response = await duplicateChatInterface(chatInterface.id);
            if (response.success && response.data) {
                setChatInterfaces((prev) => [response.data, ...prev]);
            }
        } catch (err) {
            logger.error("Failed to duplicate chat interface", err);
            setError({
                title: "Duplicate failed",
                message: err instanceof Error ? err.message : "Failed to duplicate"
            });
        }
    };

    const handleCreated = (newChatInterface: { id: string; title: string }) => {
        // Reload the list to get the full chat interface data
        const folderId = currentFolderId || undefined;
        loadChatInterfaces(folderId);
        // Navigate to edit the newly created chat interface
        navigate(`/chat-interfaces/${newChatInterface.id}/edit`, {
            state: currentFolderId ? { fromFolderId: currentFolderId } : undefined
        });
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
            await loadChatInterfaces(folderId);
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
                // Navigate to unified folder contents page with source type for auto-collapse
                navigate(`/folders/${folder.id}`, {
                    state: { sourceItemType: "chat-interface" }
                });
            } else {
                setSelectedFolderIds(new Set());
            }
        },
        [navigate, selectedFolderIds.size]
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
            await loadChatInterfaces(folderId);
            setSelectedFolderIds(new Set());
            setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: "chat" });
        } catch (err) {
            logger.error("Failed to delete folders", err);
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const handleNavigateToRoot = () => {
        setSearchParams({});
    };

    // Drag and drop handlers
    const handleDragStart = useCallback(
        (e: React.DragEvent, ci: ChatInterface) => {
            // If the dragged item is not selected, select only it
            const itemIds = selectedIds.has(ci.id) ? Array.from(selectedIds) : [ci.id];

            e.dataTransfer.setData(
                "application/json",
                JSON.stringify({ itemIds, itemType: "chat-interface" })
            );
            e.dataTransfer.effectAllowed = "move";

            // Create custom drag preview
            createDragPreview(e, itemIds.length, "chat");
        },
        [selectedIds]
    );

    const handleDropOnFolder = useCallback(
        async (folderId: string, itemIds: string[], itemType: string) => {
            if (itemType !== "chat-interface") return;
            try {
                await moveItemsToFolder({ itemIds, itemType, folderId });
                const currentFolderIdParam = currentFolderId || undefined;
                await loadChatInterfaces(currentFolderIdParam);
                await loadFolders();
                setSelectedIds(new Set());
            } catch (err) {
                logger.error("Failed to move items to folder", err);
            }
        },
        [currentFolderId]
    );

    const handleMoveToFolder = async (folderId: string | null) => {
        if (!folderId) {
            throw new Error("Folder ID is required");
        }
        await moveItemsToFolder({
            itemIds: Array.from(selectedIds),
            itemType: "chat-interface",
            folderId
        });
        const currentFolderIdParam = currentFolderId || undefined;
        await loadChatInterfaces(currentFolderIdParam);
        await loadFolders();
        setSelectedIds(new Set());
    };

    const handleRemoveFromFolder = async (chatIds: string | string[]) => {
        if (!currentFolderId) return; // Can only remove when viewing inside a folder
        const ids = Array.isArray(chatIds) ? chatIds : [chatIds];
        if (ids.length === 0) return;

        try {
            await removeItemsFromFolder({
                itemIds: ids,
                itemType: "chat-interface",
                folderId: currentFolderId
            });
            const currentFolderIdParam = currentFolderId || undefined;
            await loadChatInterfaces(currentFolderIdParam);
            await loadFolders();
        } catch (err) {
            logger.error("Failed to remove chat interface from folder", err);
        }
    };

    // Selection handlers for batch operations
    const handleCardClick = useCallback(
        (e: React.MouseEvent, ci: ChatInterface) => {
            if (e.shiftKey) {
                e.preventDefault();
                setSelectedIds((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(ci.id)) {
                        newSet.delete(ci.id);
                    } else {
                        newSet.add(ci.id);
                    }
                    return newSet;
                });
            } else if (selectedIds.size === 0) {
                navigate(`/chat-interfaces/${ci.id}/edit`, {
                    state: currentFolderId ? { fromFolderId: currentFolderId } : undefined
                });
            } else {
                // Clear selection on normal click when items are selected
                setSelectedIds(new Set());
            }
        },
        [navigate, selectedIds.size, currentFolderId]
    );

    const handleContextMenu = useCallback(
        (e: React.MouseEvent, ci: ChatInterface) => {
            e.preventDefault();
            // If right-clicking on an unselected item, select only that item
            if (!selectedIds.has(ci.id)) {
                setSelectedIds(new Set([ci.id]));
            }
            setContextMenu({
                isOpen: true,
                position: { x: e.clientX, y: e.clientY },
                type: "chat"
            });
        },
        [selectedIds]
    );

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;

        setIsBatchDeleting(true);
        try {
            // Delete all selected chat interfaces
            const deletePromises = Array.from(selectedIds).map((id) => deleteChatInterface(id));
            await Promise.all(deletePromises);

            // Refresh the list and clear selection
            const folderId = currentFolderId || undefined;
            await loadChatInterfaces(folderId);
            await loadFolders();
            setSelectedIds(new Set());
            setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: "chat" });
        } catch (err) {
            logger.error("Failed to delete chat interfaces", err);
            setError({
                title: "Delete Failed",
                message:
                    err instanceof Error
                        ? err.message
                        : "Failed to delete some chat interfaces. Please try again."
            });
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const closeContextMenu = useCallback(() => {
        setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: "chat" });
    }, []);

    const chatContextMenuItems: ContextMenuItem[] = [
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
            label: `Delete ${selectedIds.size} chat${selectedIds.size !== 1 ? "s" : ""}`,
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
    const canShowFoldersSection = !currentFolderId && foldersToShow.length > 0;

    if (isLoading || isLoadingFolders) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-8">
                <LoadingState message="Loading chat interfaces..." />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Chat Interfaces"
                description={
                    selectedFolderIds.size > 0
                        ? `${selectedFolderIds.size} folder${selectedFolderIds.size !== 1 ? "s" : ""} selected`
                        : selectedIds.size > 0
                          ? `${selectedIds.size} selected`
                          : isSearchActive
                            ? `${filteredChatInterfaces.length} result${filteredChatInterfaces.length !== 1 ? "s" : ""} for "${searchQuery}"`
                            : currentFolder
                              ? `${chatInterfaces.length} chat interface${chatInterfaces.length !== 1 ? "s" : ""} in ${currentFolder.name}`
                              : "Create embeddable chat interfaces that connect to your agents"
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
                        <div className="flex items-center gap-1">
                            <ExpandableSearch
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search chat interfaces..."
                            />
                            <SortDropdown
                                value={sortState}
                                onChange={setSortField}
                                fields={availableFields}
                            />
                            <FolderDropdown
                                onCreateFolder={() => setIsCreateFolderDialogOpen(true)}
                                showFoldersSection={showFoldersSection}
                                onToggleFoldersSection={() =>
                                    setShowFoldersSection(!showFoldersSection)
                                }
                            />
                            <Button variant="primary" onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Chat Interface
                            </Button>
                        </div>
                    )
                }
            />

            {/* Breadcrumb when inside a folder */}
            {currentFolder && (
                <>
                    <FolderBreadcrumb
                        baseName="Chat Interfaces"
                        folder={currentFolder}
                        onNavigateToRoot={handleNavigateToRoot}
                        className="mb-4"
                    />
                    <div className="border-t border-border my-6" />
                </>
            )}

            {/* Folders Section */}
            {showFoldersSection && canShowFoldersSection && (
                <>
                    <div className="mb-4">
                        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Folders
                        </h2>
                    </div>
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
                                displayItemType="chat-interface"
                            />
                        ))}
                    </div>
                    <div className="border-t border-border my-6" />
                    <div className="mb-4">
                        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Chat Interfaces
                        </h2>
                    </div>
                </>
            )}

            {filteredChatInterfaces.length === 0 && isSearchActive ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-card">
                    <Search className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                        No chat interfaces match "{searchQuery}". Try a different search term.
                    </p>
                    <Button variant="secondary" onClick={() => setSearchQuery("")}>
                        Clear search
                    </Button>
                </div>
            ) : chatInterfaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-card">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        {currentFolder
                            ? "No chat interfaces in this folder"
                            : "No chat interfaces yet"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                        {currentFolder
                            ? "Move chat interfaces here or create a new one."
                            : "Create a chat interface to embed your agents on websites as chat widgets or full-page chat experiences."}
                    </p>
                    <Button variant="primary" onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        {currentFolder ? "Create Chat Interface" : "Create Chat Interface"}
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    {filteredChatInterfaces.map((ci) => (
                        <ChatInterfaceCard
                            key={ci.id}
                            chatInterface={toChatInterfaceSummary(ci)}
                            isSelected={selectedIds.has(ci.id)}
                            onClick={(e) => handleCardClick(e, ci)}
                            onContextMenu={(e) => handleContextMenu(e, ci)}
                            onDragStart={(e) => handleDragStart(e, ci)}
                            onEdit={() =>
                                navigate(`/chat-interfaces/${ci.id}/edit`, {
                                    state: currentFolderId
                                        ? { fromFolderId: currentFolderId }
                                        : undefined
                                })
                            }
                            onViewLive={
                                ci.status === "published" && ci.slug
                                    ? () => window.open(`/c/${ci.slug}`, "_blank")
                                    : undefined
                            }
                            onViewSessions={() => navigate(`/chat-interfaces/${ci.id}/sessions`)}
                            onDuplicate={() => handleDuplicate(ci)}
                            onMoveToFolder={() => {
                                setSelectedIds(new Set([ci.id]));
                                setIsMoveDialogOpen(true);
                            }}
                            onRemoveFromFolder={
                                currentFolderId ? () => handleRemoveFromFolder(ci.id) : undefined
                            }
                            onDelete={() => setDeleteTarget(ci)}
                            currentFolderId={currentFolderId}
                        />
                    ))}
                </div>
            )}

            {/* Create Dialog */}
            <CreateChatInterfaceDialog
                isOpen={isCreateDialogOpen}
                onClose={() => setIsCreateDialogOpen(false)}
                onCreated={handleCreated}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Delete Chat Interface"
                message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone and all sessions will be lost.`}
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
                    contextMenu.type === "folder" ? folderContextMenuItems : chatContextMenuItems
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
                folderTree={folderTree}
                isLoadingFolders={isLoadingFolders}
                selectedItemCount={selectedIds.size}
                itemType="chat-interface"
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
