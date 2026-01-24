import { Plus, Bot, Trash2, FolderInput, FolderMinus, Search } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { FolderWithCounts, AgentSummary, FolderResourceType } from "@flowmaestro/shared";
import { AgentCard } from "../components/cards";
import { Alert } from "../components/common/Alert";
import { Button } from "../components/common/Button";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { ContextMenu, type ContextMenuItem } from "../components/common/ContextMenu";
import { ExpandableSearch } from "../components/common/ExpandableSearch";
import { FolderDropdown } from "../components/common/FolderDropdown";
import { PageHeader } from "../components/common/PageHeader";
import { SortDropdown } from "../components/common/SortDropdown";
import { LoadingState } from "../components/common/Spinner";
import { CreateAgentDialog } from "../components/CreateAgentDialog";
import {
    CreateFolderDialog,
    MoveToFolderDialog,
    FolderBreadcrumb,
    FolderGridSection
} from "../components/folders";
import { DuplicateItemWarningDialog } from "../components/folders/dialogs/DuplicateItemWarningDialog";
import { useFolderManagement } from "../hooks/useFolderManagement";
import { useSearch } from "../hooks/useSearch";
import { useSort, AGENT_SORT_FIELDS } from "../hooks/useSort";
import { getFolderCountIncludingSubfolders } from "../lib/folderUtils";
import { logger } from "../lib/logger";
import { createDragPreview } from "../lib/utils";
import { useAgentStore } from "../stores/agentStore";
import { useFolderStore } from "../stores/folderStore";
import type { Agent } from "../lib/api";

// Convert local Agent to AgentSummary for card components
function toAgentSummary(agent: Agent): AgentSummary {
    return {
        id: agent.id,
        name: agent.name,
        description: agent.description ?? null,
        provider: agent.provider,
        model: agent.model,
        availableTools: agent.available_tools?.map((t) => t.id) ?? [],
        systemPrompt: agent.system_prompt?.slice(0, 200),
        temperature: agent.temperature,
        createdAt: new Date(agent.created_at),
        updatedAt: new Date(agent.updated_at)
    };
}

export function Agents() {
    const navigate = useNavigate();

    const { agents, isLoading, error, fetchAgents, deleteAgent } = useAgentStore();
    const { moveItemsToFolder: moveItemsToFolderStore, folderTree: storeFolderTree } =
        useFolderStore();
    const [agentToDelete, setAgentToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        type: "agent" | "folder";
    }>({ isOpen: false, position: { x: 0, y: 0 }, type: "agent" });
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);

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
        itemType: "agent",
        onReloadItems: async () => {
            const folderId = currentFolderId || undefined;
            await fetchAgents({ folderId });
        },
        sourceItemType: "agent",
        getItemNames: (itemIds: string[]) => {
            return itemIds.map((id) => {
                const agent = agents.find((a) => a.id === id);
                return agent?.name || "Unknown";
            });
        },
        onClearSelection: () => setSelectedIds(new Set())
    });

    // Search functionality
    const {
        searchQuery,
        setSearchQuery,
        filteredItems: searchFilteredAgents,
        isSearchActive
    } = useSearch({
        items: agents,
        searchFields: ["name", "description"]
    });

    // Sorting functionality
    const {
        sortState,
        setSortField,
        sortedItems: filteredAgents,
        availableFields
    } = useSort({
        items: searchFilteredAgents,
        fields: {
            name: "name",
            created: "created_at",
            modified: "updated_at",
            provider: "provider"
        },
        availableFields: AGENT_SORT_FIELDS
    });

    // Load agents when folder changes
    useEffect(() => {
        const folderId = currentFolderId || undefined;
        fetchAgents({ folderId });
    }, [fetchAgents, currentFolderId]);

    const handleDeleteAgent = async () => {
        if (!agentToDelete) return;

        setIsDeleting(true);
        try {
            await deleteAgent(agentToDelete.id);
            const folderId = currentFolderId || undefined;
            await fetchAgents({ folderId });
            setAgentToDelete(null);
        } catch (error) {
            logger.error("Failed to delete agent", error);
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
        setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: "agent" });
    }, [handleBatchDeleteFolders]);

    const handleMoveToFolder = async (folderId: string | null) => {
        if (!folderId) {
            throw new Error("Folder ID is required");
        }
        await moveItemsToFolderStore(folderId, Array.from(selectedIds), "agent");
        const folderIdParam = currentFolderId || undefined;
        await fetchAgents({ folderId: folderIdParam });
        setSelectedIds(new Set());
    };

    // Drag and drop handlers
    const handleDragStart = useCallback(
        (e: React.DragEvent, agent: Agent) => {
            // If the dragged item is not selected, select only it
            const itemIds = selectedIds.has(agent.id) ? Array.from(selectedIds) : [agent.id];

            e.dataTransfer.setData(
                "application/json",
                JSON.stringify({ itemIds, itemType: "agent" })
            );
            e.dataTransfer.effectAllowed = "move";

            // Create custom drag preview
            createDragPreview(e, itemIds.length, "agent");
        },
        [selectedIds]
    );

    // Selection handlers for batch operations
    const handleCardClick = useCallback(
        (e: React.MouseEvent, agent: Agent) => {
            if (e.shiftKey) {
                e.preventDefault();
                setSelectedIds((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(agent.id)) {
                        newSet.delete(agent.id);
                    } else {
                        newSet.add(agent.id);
                    }
                    return newSet;
                });
            } else if (selectedIds.size === 0) {
                navigate(`/agents/${agent.id}`, {
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
        (e: React.MouseEvent, agent: Agent) => {
            e.preventDefault();
            // If right-clicking on an unselected item, select only that item
            if (!selectedIds.has(agent.id)) {
                setSelectedIds(new Set([agent.id]));
            }
            setContextMenu({
                isOpen: true,
                position: { x: e.clientX, y: e.clientY },
                type: "agent"
            });
        },
        [selectedIds]
    );

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;

        setIsBatchDeleting(true);
        try {
            // Delete all selected agents
            const deletePromises = Array.from(selectedIds).map((id) => deleteAgent(id));
            await Promise.all(deletePromises);

            // Refresh the agent list and clear selection
            const folderId = currentFolderId || undefined;
            await fetchAgents({ folderId });
            setSelectedIds(new Set());
            setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: "agent" });
        } catch (error: unknown) {
            logger.error("Failed to delete agents", error);
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const closeContextMenu = useCallback(() => {
        setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: "agent" });
    }, []);

    const agentContextMenuItems: ContextMenuItem[] = [
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
            label: `Delete ${selectedIds.size} agent${selectedIds.size !== 1 ? "s" : ""}`,
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
                title="Agents"
                description={
                    selectedFolderIds.size > 0
                        ? `${selectedFolderIds.size} folder${selectedFolderIds.size !== 1 ? "s" : ""} selected`
                        : selectedIds.size > 0
                          ? `${selectedIds.size} selected`
                          : isSearchActive
                            ? `${filteredAgents.length} result${filteredAgents.length !== 1 ? "s" : ""} for "${searchQuery}"`
                            : currentFolder
                              ? `${agents.length} agent${agents.length !== 1 ? "s" : ""} in ${currentFolder.name}`
                              : `${agents.length} ${agents.length === 1 ? "agent" : "agents"}`
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
                                placeholder="Search agents..."
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
                            <Button
                                variant="primary"
                                onClick={() => setIsCreateDialogOpen(true)}
                                className="hidden md:flex"
                            >
                                <Plus className="w-4 h-4" />
                                New Agent
                            </Button>
                        </div>
                    )
                }
            />

            {/* Breadcrumb when inside a folder */}
            {currentFolder && (
                <FolderBreadcrumb
                    baseName="Agents"
                    folder={currentFolder}
                    onNavigateToRoot={handleNavigateToRoot}
                    className="mb-6"
                />
            )}

            {/* Error message */}
            {error && (
                <div className="mb-4">
                    <Alert variant="error">{error}</Alert>
                </div>
            )}

            {/* Loading State */}
            {isLoading || isLoadingFolders ? (
                <LoadingState message="Loading agents..." />
            ) : (
                <>
                    {/* Folders Section */}
                    <FolderGridSection
                        showFoldersSection={showFoldersSection}
                        canShowFoldersSection={canShowFoldersSection}
                        rootFolders={rootFolders}
                        expandedFolderIds={expandedFolderIds}
                        selectedFolderIds={selectedFolderIds}
                        displayItemType="agent"
                        itemsLabel="Agents"
                        onFolderClick={handleFolderClick}
                        onFolderEdit={setFolderToEdit}
                        onFolderDelete={setFolderToDelete}
                        onFolderContextMenu={handleFolderContextMenuWithState}
                        onDropOnFolder={handleDropOnFolder}
                        onToggleFolderExpand={handleToggleFolderExpand}
                        getFolderChildren={getFolderChildren}
                        getFolderCountIncludingSubfolders={getFolderCountIncludingSubfoldersMemo}
                    />

                    {/* Agents Grid */}
                    {filteredAgents.length === 0 && isSearchActive ? (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-card">
                            <Search className="w-12 h-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                No results found
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                                No agents match "{searchQuery}". Try a different search term.
                            </p>
                            <Button variant="secondary" onClick={() => setSearchQuery("")}>
                                Clear search
                            </Button>
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-card">
                            <Bot className="w-12 h-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                {currentFolder ? "No agents in this folder" : "No agents yet"}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                                {currentFolder
                                    ? "Move agents here or create a new one."
                                    : "Create your first AI agent to automate tasks, answer questions, or execute workflows."}
                            </p>
                            <Button
                                variant="primary"
                                onClick={() => setIsCreateDialogOpen(true)}
                                size="lg"
                            >
                                <Plus className="w-4 h-4" />
                                {currentFolder ? "Create Agent" : "Create Your First Agent"}
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredAgents.map((agent) => (
                                <AgentCard
                                    key={agent.id}
                                    agent={toAgentSummary(agent)}
                                    tools={agent.available_tools}
                                    isSelected={selectedIds.has(agent.id)}
                                    onClick={(e) => handleCardClick(e, agent)}
                                    onContextMenu={(e) => handleContextMenu(e, agent)}
                                    onDragStart={(e) => handleDragStart(e, agent)}
                                    onEdit={() =>
                                        navigate(`/agents/${agent.id}`, {
                                            state: currentFolderId
                                                ? { fromFolderId: currentFolderId }
                                                : undefined
                                        })
                                    }
                                    onMoveToFolder={() => {
                                        setSelectedIds(new Set([agent.id]));
                                        setIsMoveDialogOpen(true);
                                    }}
                                    onRemoveFromFolder={
                                        currentFolderId
                                            ? () => handleRemoveFromFolder(agent.id)
                                            : undefined
                                    }
                                    onDelete={() => setAgentToDelete(agent)}
                                    currentFolderId={currentFolderId}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Delete Confirmation Dialog */}
            {agentToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-card rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Delete Agent</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Are you sure you want to delete "{agentToDelete.name}"? This action
                            cannot be undone.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setAgentToDelete(null)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteAgent}
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
                items={
                    contextMenu.type === "folder" ? folderContextMenuItems : agentContextMenuItems
                }
                onClose={closeContextMenu}
            />

            {/* Create Agent Dialog */}
            <CreateAgentDialog
                isOpen={isCreateDialogOpen}
                onClose={() => setIsCreateDialogOpen(false)}
                onCreated={(agentId) => {
                    setIsCreateDialogOpen(false);
                    navigate(`/agents/${agentId}/build`, {
                        ...(currentFolderId && { state: { fromFolderId: currentFolderId } })
                    });
                }}
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
                itemType="agent"
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
