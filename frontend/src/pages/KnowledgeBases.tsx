import { Plus, Trash2, FolderInput, FolderMinus, Search } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type {
    FolderWithCounts,
    KnowledgeBaseSummary,
    FolderResourceType
} from "@flowmaestro/shared";
import { KnowledgeBaseCard } from "../components/cards";
import { Alert } from "../components/common/Alert";
import { Button } from "../components/common/Button";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { ContextMenu, type ContextMenuItem } from "../components/common/ContextMenu";
import { ExpandableSearch } from "../components/common/ExpandableSearch";
import { FolderDropdown } from "../components/common/FolderDropdown";
import { PageHeader } from "../components/common/PageHeader";
import { SkeletonGrid } from "../components/common/SkeletonGrid";
import { EmptyStateWithGhostCards } from "../components/empty-states";
import {
    CreateFolderDialog,
    MoveToFolderDialog,
    FolderBreadcrumb,
    FolderGridSection
} from "../components/folders";
import { DuplicateItemWarningDialog } from "../components/folders/dialogs/DuplicateItemWarningDialog";
import { CreateKnowledgeBaseModal } from "../components/knowledge-bases";
import { KnowledgeBaseCardSkeleton } from "../components/skeletons";
import { useFolderManagement } from "../hooks/useFolderManagement";
import { useSearch } from "../hooks/useSearch";
import { KnowledgeBaseEvents } from "../lib/analytics";
import { getKnowledgeBaseStats, type KnowledgeBaseStats, type KnowledgeBase } from "../lib/api";
import { getFolderCountIncludingSubfolders } from "../lib/folderUtils";
import { logger } from "../lib/logger";
import { createDragPreview } from "../lib/utils";
import { useFolderStore } from "../stores/folderStore";
import { useKnowledgeBaseStore } from "../stores/knowledgeBaseStore";

// Convert KnowledgeBase + stats to KnowledgeBaseSummary for card components
function toKnowledgeBaseSummary(
    kb: KnowledgeBase,
    stats?: KnowledgeBaseStats
): KnowledgeBaseSummary {
    return {
        id: kb.id,
        name: kb.name,
        description: kb.description ?? null,
        category: kb.category ?? null,
        documentCount: stats?.document_count ?? 0,
        chunkCount: stats?.chunk_count,
        totalSizeBytes: stats?.total_size_bytes,
        embeddingModel: kb.config?.embeddingModel,
        createdAt: new Date(kb.created_at),
        updatedAt: new Date(kb.updated_at)
    };
}

export function KnowledgeBases() {
    const navigate = useNavigate();

    const { moveItemsToFolder: moveItemsToFolderStore, folderTree: storeFolderTree } =
        useFolderStore();
    const { knowledgeBases, loading, error, fetchKnowledgeBases, createKB, deleteKB } =
        useKnowledgeBaseStore();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [kbToDelete, setKbToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [kbStats, setKbStats] = useState<Record<string, KnowledgeBaseStats>>({});
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        type: "kb" | "folder";
    }>({ isOpen: false, position: { x: 0, y: 0 }, type: "kb" });
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
    const hasTrackedPageView = useRef(false);

    // Use folder management hook
    const {
        folders,
        currentFolder,
        currentFolderId,
        isLoadingFolders,
        selectedFolderIds,
        setSelectedFolderIds,
        isCreateFolderDialogOpen,
        setIsCreateFolderDialogOpen,
        folderToEdit,
        setFolderToEdit,
        folderToDelete,
        setFolderToDelete,
        isBatchDeleting: isBatchDeletingFolders,
        showFoldersSection,
        setShowFoldersSection,
        expandedFolderIds,
        rootFolders,
        canShowFoldersSection,
        duplicateItemWarning,
        setDuplicateItemWarning,
        handleCreateFolder,
        handleEditFolder,
        handleDeleteFolder,
        handleFolderClick,
        handleFolderContextMenu,
        handleBatchDeleteFolders,
        handleNavigateToRoot,
        handleRemoveFromFolder,
        handleDropOnFolder,
        handleToggleFolderExpand,
        getFolderChildren
    } = useFolderManagement({
        itemType: "knowledge-base",
        onReloadItems: async () => {
            await fetchKnowledgeBases({ folderId: currentFolderId || undefined });
        },
        sourceItemType: "knowledge-base",
        getItemNames: (itemIds: string[]) => {
            return itemIds.map((id) => {
                const kb = knowledgeBases.find((k) => k.id === id);
                return kb?.name || "Unknown";
            });
        },
        onClearSelection: () => setSelectedIds(new Set())
    });

    // Search functionality
    const {
        searchQuery,
        setSearchQuery,
        filteredItems: filteredKnowledgeBases,
        isSearchActive
    } = useSearch({
        items: knowledgeBases,
        searchFields: ["name", "description"]
    });

    // Track page view
    useEffect(() => {
        if (!hasTrackedPageView.current) {
            KnowledgeBaseEvents.listViewed();
            hasTrackedPageView.current = true;
        }
    }, []);

    // Track search with debounce
    useEffect(() => {
        if (!searchQuery) return;
        const timer = setTimeout(() => {
            KnowledgeBaseEvents.searched({ query: searchQuery });
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Load knowledge bases when folder changes
    useEffect(() => {
        const folderId = currentFolderId || undefined;
        fetchKnowledgeBases({ folderId });
    }, [fetchKnowledgeBases, currentFolderId]);

    // Fetch stats for all knowledge bases
    useEffect(() => {
        const fetchAllStats = async () => {
            const statsPromises = knowledgeBases.map(async (kb) => {
                try {
                    const response = await getKnowledgeBaseStats(kb.id);
                    if (response.success && response.data) {
                        return { id: kb.id, stats: response.data };
                    }
                } catch (err) {
                    logger.error("Failed to fetch stats for KB", err, { kbId: kb.id });
                }
                return null;
            });

            const results = await Promise.all(statsPromises);
            const newStats: Record<string, KnowledgeBaseStats> = {};
            results.forEach((result) => {
                if (result) {
                    newStats[result.id] = result.stats;
                }
            });
            setKbStats(newStats);
        };

        if (knowledgeBases.length > 0) {
            fetchAllStats();
        }
    }, [knowledgeBases]);

    const handleCreate = async (name: string, description?: string, category?: string) => {
        try {
            const kb = await createKB({
                name,
                description,
                category
            });
            setShowCreateModal(false);
            navigate(`/knowledge-bases/${kb.id}`);
        } catch (error) {
            logger.error("Failed to create knowledge base", error);
        }
    };

    const handleDelete = async () => {
        if (!kbToDelete) return;

        setIsDeleting(true);
        try {
            await deleteKB(kbToDelete.id);
            KnowledgeBaseEvents.deleted({ kbId: kbToDelete.id });
            const folderId = currentFolderId || undefined;
            await fetchKnowledgeBases({ folderId });
            setKbToDelete(null);
        } catch (error) {
            logger.error("Failed to delete knowledge base", error);
        } finally {
            setIsDeleting(false);
        }
    };

    // Override handleFolderContextMenu to also set context menu state
    const handleFolderContextMenuWithState = useCallback(
        (e: React.MouseEvent, folder: FolderWithCounts) => {
            handleFolderContextMenu(e, folder);
            setContextMenu({
                isOpen: true,
                position: { x: e.clientX, y: e.clientY },
                type: "folder"
            });
        },
        [handleFolderContextMenu]
    );

    // Override handleBatchDeleteFolders to also clear context menu
    const handleBatchDeleteFoldersWithState = useCallback(async () => {
        await handleBatchDeleteFolders();
        setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: "kb" });
    }, [handleBatchDeleteFolders]);

    const handleMoveToFolder = async (folderId: string | null) => {
        if (!folderId) {
            throw new Error("Folder ID is required");
        }
        await moveItemsToFolderStore(folderId, Array.from(selectedIds), "knowledge-base");
        await fetchKnowledgeBases({ folderId: currentFolderId || undefined });
        setSelectedIds(new Set());
    };

    // Selection handlers for batch operations
    const handleCardClick = useCallback(
        (e: React.MouseEvent, kb: KnowledgeBase) => {
            if (e.shiftKey) {
                e.preventDefault();
                setSelectedIds((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(kb.id)) {
                        newSet.delete(kb.id);
                    } else {
                        newSet.add(kb.id);
                    }
                    return newSet;
                });
            } else if (selectedIds.size === 0) {
                navigate(`/knowledge-bases/${kb.id}`);
            } else {
                // Clear selection on normal click when items are selected
                setSelectedIds(new Set());
            }
        },
        [navigate, selectedIds.size]
    );

    const handleContextMenu = useCallback(
        (e: React.MouseEvent, kb: KnowledgeBase) => {
            e.preventDefault();
            // If right-clicking on an unselected item, select only that item
            if (!selectedIds.has(kb.id)) {
                setSelectedIds(new Set([kb.id]));
            }
            setContextMenu({
                isOpen: true,
                position: { x: e.clientX, y: e.clientY },
                type: "kb"
            });
        },
        [selectedIds]
    );

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;

        setIsBatchDeleting(true);
        try {
            const idsToDelete = Array.from(selectedIds);
            // Delete all selected knowledge bases
            const deletePromises = idsToDelete.map((id) => deleteKB(id));
            await Promise.all(deletePromises);

            KnowledgeBaseEvents.batchDeleted({ kbIds: idsToDelete, count: idsToDelete.length });

            // Refresh the list and clear selection
            const folderId = currentFolderId || undefined;
            await fetchKnowledgeBases({ folderId });
            setSelectedIds(new Set());
            setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: "kb" });
        } catch (error) {
            logger.error("Failed to delete knowledge bases", error);
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const closeContextMenu = useCallback(() => {
        setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: "kb" });
    }, []);

    // Drag and drop handlers
    const handleDragStart = useCallback(
        (e: React.DragEvent, kb: KnowledgeBase) => {
            // If the dragged item is not selected, select only it
            const itemIds = selectedIds.has(kb.id) ? Array.from(selectedIds) : [kb.id];

            e.dataTransfer.setData(
                "application/json",
                JSON.stringify({ itemIds, itemType: "knowledge-base" })
            );
            e.dataTransfer.effectAllowed = "move";

            // Create custom drag preview
            createDragPreview(e, itemIds.length, "knowledge base");
        },
        [selectedIds]
    );

    const kbContextMenuItems: ContextMenuItem[] = [
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
            label: `Delete ${selectedIds.size} knowledge base${selectedIds.size !== 1 ? "s" : ""}`,
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
            onClick: handleBatchDeleteFoldersWithState,
            variant: "danger",
            disabled: isBatchDeletingFolders
        }
    ];

    // Folders to show
    // Filter folders to show only root folders (depth 0) when at root
    // Helper to calculate total count for a folder including all subfolders recursively
    const getFolderCountIncludingSubfoldersMemo = useCallback(
        (folder: FolderWithCounts, itemType: FolderResourceType): number => {
            return getFolderCountIncludingSubfolders(folder, itemType, getFolderChildren);
        },
        [getFolderChildren]
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
            <PageHeader
                title="Knowledge Bases"
                description={
                    selectedFolderIds.size > 0
                        ? `${selectedFolderIds.size} folder${selectedFolderIds.size !== 1 ? "s" : ""} selected`
                        : selectedIds.size > 0
                          ? `${selectedIds.size} selected`
                          : isSearchActive
                            ? `${filteredKnowledgeBases.length} result${filteredKnowledgeBases.length !== 1 ? "s" : ""} for "${searchQuery}"`
                            : currentFolder
                              ? `${knowledgeBases.length} knowledge base${knowledgeBases.length !== 1 ? "s" : ""} in ${currentFolder.name}`
                              : "Manage your document collections for RAG workflows"
                }
                action={
                    selectedFolderIds.size > 0 ? (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => setSelectedFolderIds(new Set())}>
                                Clear selection
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleBatchDeleteFoldersWithState}
                                disabled={isBatchDeletingFolders}
                                loading={isBatchDeletingFolders}
                            >
                                {!isBatchDeletingFolders && <Trash2 className="w-4 h-4" />}
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
                        <div className="flex items-center gap-1 flex-wrap">
                            <ExpandableSearch
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search knowledge bases..."
                            />
                            <FolderDropdown
                                onCreateFolder={() => setIsCreateFolderDialogOpen(true)}
                                showFoldersSection={showFoldersSection}
                                onToggleFoldersSection={() =>
                                    setShowFoldersSection(!showFoldersSection)
                                }
                            />
                            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                                <Plus className="w-4 h-4" />
                                <span className="hidden md:inline">New Knowledge Base</span>
                            </Button>
                        </div>
                    )
                }
            />

            {/* Breadcrumb when inside a folder */}
            {currentFolder && (
                <>
                    <FolderBreadcrumb
                        baseName="Knowledge Bases"
                        folder={currentFolder}
                        onNavigateToRoot={handleNavigateToRoot}
                        className="mb-4"
                    />
                    <div className="border-t border-border my-6" />
                </>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-4">
                    <Alert variant="error">{error}</Alert>
                </div>
            )}

            {/* Loading State */}
            {loading || isLoadingFolders ? (
                <SkeletonGrid count={6} CardSkeleton={KnowledgeBaseCardSkeleton} />
            ) : (
                <>
                    {/* Folders Section */}
                    <FolderGridSection
                        showFoldersSection={showFoldersSection}
                        canShowFoldersSection={canShowFoldersSection}
                        rootFolders={rootFolders}
                        expandedFolderIds={expandedFolderIds}
                        selectedFolderIds={selectedFolderIds}
                        displayItemType="knowledge-base"
                        itemsLabel="Knowledge Bases"
                        onFolderClick={handleFolderClick}
                        onFolderEdit={setFolderToEdit}
                        onFolderDelete={setFolderToDelete}
                        onFolderContextMenu={handleFolderContextMenuWithState}
                        onDropOnFolder={handleDropOnFolder}
                        onToggleFolderExpand={handleToggleFolderExpand}
                        getFolderChildren={getFolderChildren}
                        getFolderCountIncludingSubfolders={getFolderCountIncludingSubfoldersMemo}
                    />

                    {/* Knowledge Bases Grid */}
                    {filteredKnowledgeBases.length === 0 && isSearchActive ? (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-card">
                            <Search className="w-12 h-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                No results found
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                                No knowledge bases match "{searchQuery}". Try a different search
                                term.
                            </p>
                            <Button variant="secondary" onClick={() => setSearchQuery("")}>
                                Clear search
                            </Button>
                        </div>
                    ) : knowledgeBases.length === 0 ? (
                        <EmptyStateWithGhostCards
                            entityType="knowledge-base"
                            onCreateClick={() => setShowCreateModal(true)}
                            isInFolder={!!currentFolder}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredKnowledgeBases.map((kb) => (
                                <KnowledgeBaseCard
                                    key={kb.id}
                                    knowledgeBase={toKnowledgeBaseSummary(kb, kbStats[kb.id])}
                                    isSelected={selectedIds.has(kb.id)}
                                    onClick={(e) => handleCardClick(e, kb)}
                                    onContextMenu={(e) => handleContextMenu(e, kb)}
                                    onDragStart={(e) => handleDragStart(e, kb)}
                                    onEdit={() => navigate(`/knowledge-bases/${kb.id}`)}
                                    onMoveToFolder={() => {
                                        setSelectedIds(new Set([kb.id]));
                                        setIsMoveDialogOpen(true);
                                    }}
                                    onRemoveFromFolder={
                                        currentFolderId
                                            ? () => handleRemoveFromFolder(kb.id)
                                            : undefined
                                    }
                                    onDelete={() => setKbToDelete({ id: kb.id, name: kb.name })}
                                    currentFolderId={currentFolderId}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Create Modal */}
            <CreateKnowledgeBaseModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreate}
            />

            {/* Delete Confirmation Dialog */}
            {kbToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-card rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            Delete Knowledge Base
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Are you sure you want to delete "{kbToDelete.name}"? This action cannot
                            be undone.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setKbToDelete(null)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                loading={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Context Menu for batch operations */}
            <ContextMenu
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                items={contextMenu.type === "folder" ? folderContextMenuItems : kbContextMenuItems}
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
                folderTree={storeFolderTree}
                isLoadingFolders={isLoadingFolders}
                selectedItemCount={selectedIds.size}
                itemType="knowledge-base"
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

            {/* Duplicate Item Warning Dialog */}
            <DuplicateItemWarningDialog
                warning={duplicateItemWarning}
                onClose={() => setDuplicateItemWarning(null)}
            />
        </div>
    );
}
