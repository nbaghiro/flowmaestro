import { Plus, Bot, Trash2, FolderInput, FolderMinus, Search } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Folder, FolderWithCounts, AgentSummary } from "@flowmaestro/shared";
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
    FolderCard,
    CreateFolderDialog,
    MoveToFolderDialog,
    FolderBreadcrumb
} from "../components/folders";
import { useSearch } from "../hooks/useSearch";
import { useSort, AGENT_SORT_FIELDS } from "../hooks/useSort";
import {
    getFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    moveItemsToFolder,
    removeItemsFromFolder
} from "../lib/api";
import { logger } from "../lib/logger";
import { createDragPreview } from "../lib/utils";
import { useAgentStore } from "../stores/agentStore";
import { buildFolderTree } from "../stores/folderStore";
import { useUIPreferencesStore } from "../stores/uiPreferencesStore";
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
        createdAt: new Date(agent.created_at),
        updatedAt: new Date(agent.updated_at)
    };
}

export function Agents() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentFolderId = searchParams.get("folder");

    const { agents, isLoading, error, fetchAgents, deleteAgent } = useAgentStore();
    const [folders, setFolders] = useState<FolderWithCounts[]>([]);
    const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
    const [isLoadingFolders, setIsLoadingFolders] = useState(true);
    const [agentToDelete, setAgentToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        type: "agent" | "folder";
    }>({ isOpen: false, position: { x: 0, y: 0 }, type: "agent" });
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const { showFoldersSection, setShowFoldersSection } = useUIPreferencesStore();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
    const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
    const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<FolderWithCounts | null>(null);

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

    // Load folders on mount
    useEffect(() => {
        loadFolders();
    }, []);

    // Load agents when folder changes
    useEffect(() => {
        const folderId = currentFolderId || undefined;
        fetchAgents({ folderId });
    }, [fetchAgents, currentFolderId]);

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

    const handleDeleteAgent = async () => {
        if (!agentToDelete) return;

        setIsDeleting(true);
        try {
            await deleteAgent(agentToDelete.id);
            const folderId = currentFolderId || undefined;
            await fetchAgents({ folderId });
            await loadFolders();
            setAgentToDelete(null);
        } catch (error) {
            logger.error("Failed to delete agent", error);
        } finally {
            setIsDeleting(false);
        }
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
        setIsDeleting(true);
        try {
            await deleteFolder(folderToDelete.id);
            await loadFolders();
            const folderId = currentFolderId || undefined;
            await fetchAgents({ folderId });
            setFolderToDelete(null);
            if (currentFolderId === folderToDelete.id) {
                setSearchParams({});
            }
        } catch (err) {
            logger.error("Failed to delete folder", err);
        } finally {
            setIsDeleting(false);
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
                    state: { sourceItemType: "agent" }
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
            await fetchAgents({ folderId });
            setSelectedFolderIds(new Set());
            setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: "agent" });
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
            itemType: "agent",
            folderId
        });
        const currentFolderIdParam = currentFolderId || undefined;
        await fetchAgents({ folderId: currentFolderIdParam });
        await loadFolders();
        setSelectedIds(new Set());
    };

    const handleRemoveFromFolder = async (agentIds: string | string[]) => {
        if (!currentFolderId) return; // Can only remove when viewing inside a folder
        const ids = Array.isArray(agentIds) ? agentIds : [agentIds];
        if (ids.length === 0) return;

        try {
            await removeItemsFromFolder({
                itemIds: ids,
                itemType: "agent",
                folderId: currentFolderId
            });
            const currentFolderIdParam = currentFolderId || undefined;
            await fetchAgents({ folderId: currentFolderIdParam });
            await loadFolders();
        } catch (err) {
            logger.error("Failed to remove agent from folder", err);
        }
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

    const handleDropOnFolder = useCallback(
        async (folderId: string, itemIds: string[], itemType: string) => {
            if (itemType !== "agent") return;
            try {
                await moveItemsToFolder({ itemIds, itemType, folderId });
                const currentFolderIdParam = currentFolderId || undefined;
                await fetchAgents({ folderId: currentFolderIdParam });
                await loadFolders();
                setSelectedIds(new Set());
            } catch (err) {
                logger.error("Failed to move items to folder", err);
            }
        },
        [currentFolderId, fetchAgents]
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
            await loadFolders();
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
            onClick: handleBatchDeleteFolders,
            variant: "danger",
            disabled: isBatchDeleting
        }
    ];

    // Folders to show
    const foldersToShow = currentFolderId ? [] : folders;
    const canShowFoldersSection = !currentFolderId && foldersToShow.length > 0;

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
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
                            <Button variant="primary" onClick={() => setIsCreateDialogOpen(true)}>
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
                                        displayItemType="agent"
                                    />
                                ))}
                            </div>
                            <div className="border-t border-border my-6" />
                            <div className="mb-4">
                                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                    Agents
                                </h2>
                            </div>
                        </>
                    )}

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
                onCreate={(patternData) => {
                    setIsCreateDialogOpen(false);
                    navigate("/agents/new", {
                        state: {
                            patternData,
                            ...(currentFolderId && { fromFolderId: currentFolderId })
                        }
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
                folderTree={folderTree}
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
        </div>
    );
}
