import {
    Plus,
    Bot,
    Trash2,
    MoreVertical,
    Calendar,
    Edit2,
    FolderPlus,
    FolderInput,
    GripVertical,
    ChevronDown,
    Search
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Folder, FolderWithCounts } from "@flowmaestro/shared";
import { AgentToolIconList } from "../components/common/AgentToolIconList";
import { Alert } from "../components/common/Alert";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { ContextMenu, type ContextMenuItem } from "../components/common/ContextMenu";
import { ExpandableSearch } from "../components/common/ExpandableSearch";
import { PageHeader } from "../components/common/PageHeader";
import { LoadingState } from "../components/common/Spinner";
import { CreateAgentDialog } from "../components/CreateAgentDialog";
import {
    FolderCard,
    CreateFolderDialog,
    MoveToFolderDialog,
    FolderBreadcrumb
} from "../components/folders";
import { useSearch } from "../hooks/useSearch";
import {
    getFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    moveItemsToFolder
} from "../lib/api";
import { logger } from "../lib/logger";
import { useAgentStore } from "../stores/agentStore";
import type { Agent } from "../lib/api";

export function Agents() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentFolderId = searchParams.get("folder");

    const { agents, isLoading, error, fetchAgents, deleteAgent } = useAgentStore();
    const [folders, setFolders] = useState<FolderWithCounts[]>([]);
    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
    const [isLoadingFolders, setIsLoadingFolders] = useState(true);
    const [agentToDelete, setAgentToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        type: "agent" | "folder";
    }>({ isOpen: false, position: { x: 0, y: 0 }, type: "agent" });
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
    const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
    const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<FolderWithCounts | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Search functionality
    const {
        searchQuery,
        setSearchQuery,
        filteredItems: filteredAgents,
        isSearchActive
    } = useSearch({
        items: agents,
        searchFields: ["name", "description"]
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

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };

        if (openMenuId) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
        return undefined;
    }, [openMenuId]);

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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    };

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
                navigate(`/agents/${agent.id}`);
            } else {
                // Clear selection on normal click when items are selected
                setSelectedIds(new Set());
            }
        },
        [navigate, selectedIds.size]
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
    const showFoldersSection = !currentFolderId && foldersToShow.length > 0;

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
                            <Button
                                variant="ghost"
                                onClick={() => setIsCreateFolderDialogOpen(true)}
                                title="Create folder"
                            >
                                <FolderPlus className="w-4 h-4" />
                            </Button>
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
                                            onContextMenu={(e) =>
                                                handleFolderContextMenu(e, folder)
                                            }
                                            onDrop={(itemIds, itemType) =>
                                                handleDropOnFolder(folder.id, itemIds, itemType)
                                            }
                                            displayItemType="agent"
                                        />
                                    ))}
                                </div>
                            )}
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
                                <div
                                    key={agent.id}
                                    className={`bg-card border rounded-lg p-5 hover:shadow-md transition-all group relative cursor-pointer select-none flex flex-col ${
                                        selectedIds.has(agent.id)
                                            ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                                            : "border-border hover:border-primary"
                                    }`}
                                    onClick={(e) => handleCardClick(e, agent)}
                                    onContextMenu={(e) => handleContextMenu(e, agent)}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, agent)}
                                >
                                    {/* Drag Handle - visible on hover */}
                                    <div
                                        className="absolute bottom-2 right-2 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        <GripVertical className="w-4 h-4" />
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-3">
                                            <Bot className="w-5 h-5 text-primary" />
                                            <div className="flex items-center gap-1">
                                                <Badge variant="default" size="sm">
                                                    {agent.provider}
                                                </Badge>
                                                <Badge variant="default" size="sm">
                                                    {agent.model}
                                                </Badge>

                                                {/* Menu Button */}
                                                <div
                                                    className="relative"
                                                    ref={openMenuId === agent.id ? menuRef : null}
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(
                                                                openMenuId === agent.id
                                                                    ? null
                                                                    : agent.id
                                                            );
                                                        }}
                                                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                                        title="More options"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>

                                                    {/* Dropdown Menu */}
                                                    {openMenuId === agent.id && (
                                                        <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenMenuId(null);
                                                                    navigate(`/agents/${agent.id}`);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenMenuId(null);
                                                                    setSelectedIds(
                                                                        new Set([agent.id])
                                                                    );
                                                                    setIsMoveDialogOpen(true);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                            >
                                                                <FolderInput className="w-4 h-4" />
                                                                Move to folder
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenMenuId(null);
                                                                    setAgentToDelete(agent);
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
                                        </div>

                                        <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                                            {agent.name}
                                        </h3>

                                        {agent.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {agent.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Footer - Always at bottom */}
                                    <div className="mt-auto pt-3">
                                        {/* Tool Icons Row */}
                                        <AgentToolIconList
                                            tools={agent.available_tools}
                                            maxVisible={5}
                                            iconSize="sm"
                                            className="mb-3"
                                        />

                                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>Created {formatDate(agent.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
                    navigate("/agents/new", { state: { patternData } });
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
