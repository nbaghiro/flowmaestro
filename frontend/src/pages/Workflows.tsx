import { Plus, FileText, Sparkles, Trash2, FolderInput, FolderMinus, Search } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { WorkflowNode, Folder, FolderWithCounts, WorkflowSummary } from "@flowmaestro/shared";
import { AIGenerateDialog } from "../components/AIGenerateDialog";
import { WorkflowCard } from "../components/cards";
import { Button } from "../components/common/Button";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { ContextMenu, type ContextMenuItem } from "../components/common/ContextMenu";
import { ErrorDialog } from "../components/common/ErrorDialog";
import { ExpandableSearch } from "../components/common/ExpandableSearch";
import { FolderDropdown } from "../components/common/FolderDropdown";
import { PageHeader } from "../components/common/PageHeader";
import { SortDropdown } from "../components/common/SortDropdown";
import { LoadingState } from "../components/common/Spinner";
import { CreateWorkflowDialog } from "../components/CreateWorkflowDialog";
import {
    FolderCard,
    CreateFolderDialog,
    MoveToFolderDialog,
    FolderBreadcrumb
} from "../components/folders";
import { WorkflowGenerationChatPanel } from "../components/WorkflowGenerationChatPanel";
import { useSearch } from "../hooks/useSearch";
import { useSort, WORKFLOW_SORT_FIELDS } from "../hooks/useSort";
import {
    getWorkflows,
    createWorkflow,
    generateWorkflow,
    updateWorkflow,
    deleteWorkflow,
    getWorkflow,
    getFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    moveItemsToFolder,
    removeItemsFromFolder,
    type WorkflowDefinition
} from "../lib/api";
import { logger } from "../lib/logger";
import { createDragPreview } from "../lib/utils";
import { convertToReactFlowFormat } from "../lib/workflowLayout";
import { buildFolderTree } from "../stores/folderStore";
import { useWorkflowGenerationChatStore } from "../stores/workflowGenerationChatStore";

// Local workflow type that maps to API response (snake_case) and WorkflowSummary (camelCase)
interface Workflow {
    id: string;
    name: string;
    description?: string | null;
    folder_id?: string | null;
    definition?: {
        nodes?: Record<
            string,
            {
                type: string;
                name?: string;
                position?: { x: number; y: number };
                config?: { provider?: string; providerId?: string };
            }
        >;
        edges?: Array<{
            id?: string;
            source: string;
            target: string;
            sourceHandle?: string;
            targetHandle?: string;
        }>;
    };
    created_at: string;
    updated_at: string;
}

// Convert local Workflow to WorkflowSummary for card components
function toWorkflowSummary(workflow: Workflow): WorkflowSummary {
    return {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description ?? null,
        definition: workflow.definition as Record<string, unknown> | null,
        createdAt: new Date(workflow.created_at),
        updatedAt: new Date(workflow.updated_at)
    };
}

export function Workflows() {
    const [searchParams, setSearchParams] = useSearchParams();
    const currentFolderId = searchParams.get("folder");

    // Workflow generation chat panel
    const { openPanel: openGenerationPanel } = useWorkflowGenerationChatStore();

    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [folders, setFolders] = useState<FolderWithCounts[]>([]);
    const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingFolders, setIsLoadingFolders] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
    const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
    const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
    const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<FolderWithCounts | null>(null);
    const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);
    const [_isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<{ title: string; message: string } | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        type: "workflow" | "folder";
    }>({ isOpen: false, position: { x: 0, y: 0 }, type: "workflow" });
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const [showFoldersSection, setShowFoldersSection] = useState(false);
    const navigate = useNavigate();

    // Search functionality
    const {
        searchQuery,
        setSearchQuery,
        filteredItems: searchFilteredWorkflows,
        isSearchActive
    } = useSearch({
        items: workflows,
        searchFields: ["name", "description"]
    });

    // Sorting functionality
    const {
        sortState,
        setSortField,
        sortedItems: filteredWorkflows,
        availableFields
    } = useSort({
        items: searchFilteredWorkflows,
        fields: {
            name: "name",
            created: "created_at",
            modified: "updated_at"
        },
        availableFields: WORKFLOW_SORT_FIELDS
    });

    // Load folders on mount
    useEffect(() => {
        loadFolders();
    }, []);

    // Load workflows when folder changes
    useEffect(() => {
        loadWorkflows();
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

    const loadWorkflows = async () => {
        setIsLoading(true);
        try {
            // When viewing a folder, show only items in that folder
            // When at root (no folder selected), show ALL items (undefined = no filter)
            const folderId = currentFolderId || undefined;
            const response = await getWorkflows({ folderId });
            if (response.success && response.data) {
                setWorkflows(response.data.items);
            }
        } catch (err) {
            logger.error("Failed to load workflows", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateWorkflow = async (
        name: string,
        description?: string,
        definition?: WorkflowDefinition
    ) => {
        const response = await createWorkflow(name, description, definition);

        if (response.success && response.data) {
            const workflowId = response.data.id;
            navigate(`/builder/${workflowId}`, {
                state: currentFolderId ? { fromFolderId: currentFolderId } : undefined
            });
        }
    };

    const handleGenerateWorkflow = async (prompt: string, connectionId: string, model: string) => {
        // Generate workflow using AI
        const generateResponse = await generateWorkflow({ prompt, connectionId, model });

        if (generateResponse.success && generateResponse.data) {
            const { nodes, edges, metadata } = generateResponse.data;

            // Convert generated workflow to React Flow format
            const { nodes: flowNodes, edges: flowEdges } = convertToReactFlowFormat(
                nodes,
                edges,
                metadata.entryNodeId
            );

            // Create a new workflow with the generated name
            const workflowName = metadata.name || "AI Generated Workflow";
            const createResponse = await createWorkflow(workflowName, metadata.description);

            if (createResponse.success && createResponse.data) {
                const workflowId = createResponse.data.id;

                // Convert React Flow format back to backend format for saving
                const nodesMap: Record<string, Record<string, unknown>> = {};
                flowNodes.forEach((node) => {
                    const { label, onError, ...config } = (node.data || {}) as Record<
                        string,
                        unknown
                    >;
                    const nodeEntry: Record<string, unknown> = {
                        type: node.type || "default",
                        name: label || node.id,
                        config: config,
                        position: node.position
                    };
                    if (onError && typeof onError === "object") {
                        nodeEntry.onError = onError;
                    }
                    nodesMap[node.id] = nodeEntry;
                });

                // Find entry point
                const inputNode = flowNodes.find((n) => n.type === "input");
                const entryPoint = inputNode?.id || (flowNodes.length > 0 ? flowNodes[0].id : "");

                const workflowDefinition = {
                    name: workflowName,
                    nodes: nodesMap as unknown as Record<string, WorkflowNode>,
                    edges: flowEdges.map((edge) => ({
                        id: edge.id,
                        source: edge.source,
                        target: edge.target,
                        sourceHandle: edge.sourceHandle
                    })),
                    entryPoint
                };

                // Update workflow with the generated definition
                await updateWorkflow(workflowId, {
                    name: workflowName,
                    definition: workflowDefinition
                });

                // Navigate to the builder with the new workflow
                navigate(`/builder/${workflowId}`, {
                    state: currentFolderId ? { fromFolderId: currentFolderId } : undefined
                });
            } else {
                throw new Error(createResponse.error || "Failed to create workflow");
            }
        } else {
            throw new Error(generateResponse.error || "Failed to generate workflow");
        }
    };

    const handleDeleteWorkflow = async () => {
        if (!workflowToDelete) return;

        setIsDeleting(true);
        try {
            await deleteWorkflow(workflowToDelete.id);
            // Refresh the workflow list
            await loadWorkflows();
            await loadFolders(); // Refresh folder counts
            setWorkflowToDelete(null);
        } catch (err: unknown) {
            logger.error("Failed to delete workflow", err);
            const error = err as { message?: string };
            setError({
                title: "Delete Failed",
                message: error.message || "Failed to delete workflow. Please try again."
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDuplicateWorkflow = async (workflow: Workflow) => {
        try {
            // Fetch the full workflow with definition
            const response = await getWorkflow(workflow.id);
            if (!response.success || !response.data) {
                throw new Error("Failed to load workflow");
            }

            const originalWorkflow = response.data;

            // Create a new workflow with "Copy of" prefix and the full definition
            const newName = `Copy of ${workflow.name}`;

            // Prepare the definition with the new name
            const newDefinition: WorkflowDefinition = originalWorkflow.definition
                ? { ...originalWorkflow.definition, name: newName }
                : {
                      name: newName,
                      nodes: {},
                      edges: [],
                      entryPoint: ""
                  };

            // Create workflow using the centralized API function
            const createData = await createWorkflow(
                newName,
                workflow.description ?? undefined,
                newDefinition
            );

            if (createData.success && createData.data) {
                // Refresh the workflow list
                await loadWorkflows();

                // Navigate to the new workflow
                navigate(`/builder/${createData.data.id}`, {
                    state: currentFolderId ? { fromFolderId: currentFolderId } : undefined
                });
            }
        } catch (err: unknown) {
            const error = err as { message?: string };
            logger.error("Failed to duplicate workflow", err);
            setError({
                title: "Duplicate Failed",
                message: error.message || "Failed to duplicate workflow. Please try again."
            });
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
            await loadWorkflows(); // Items moved to root
            setFolderToDelete(null);
            // If we were viewing the deleted folder, go back to root
            if (currentFolderId === folderToDelete.id) {
                setSearchParams({});
            }
        } catch (err: unknown) {
            const error = err as { message?: string };
            setError({
                title: "Delete Failed",
                message: error.message || "Failed to delete folder. Please try again."
            });
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
                // Navigate to unified folder contents page
                navigate(`/folders/${folder.id}`);
            } else {
                // Clear selection on normal click when folders are selected
                setSelectedFolderIds(new Set());
            }
        },
        [navigate, selectedFolderIds.size]
    );

    const handleFolderContextMenu = useCallback(
        (e: React.MouseEvent, folder: FolderWithCounts) => {
            e.preventDefault();
            // If right-clicking on an unselected folder, select only that folder
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
            await loadWorkflows();
            setSelectedFolderIds(new Set());
            setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: "workflow" });
        } catch (err: unknown) {
            logger.error("Failed to delete folders", err);
            const error = err as { message?: string };
            setError({
                title: "Delete Failed",
                message: error.message || "Failed to delete some folders. Please try again."
            });
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
            itemType: "workflow",
            folderId
        });
        await loadWorkflows();
        await loadFolders();
        setSelectedIds(new Set());
    };

    const handleRemoveFromFolder = async (workflowIds: string | string[]) => {
        if (!currentFolderId) return; // Can only remove when viewing inside a folder
        const ids = Array.isArray(workflowIds) ? workflowIds : [workflowIds];
        if (ids.length === 0) return;
        try {
            await removeItemsFromFolder({
                itemIds: ids,
                itemType: "workflow",
                folderId: currentFolderId
            });
            await loadWorkflows();
            await loadFolders();
        } catch (err) {
            logger.error("Failed to remove workflow from folder", err);
        }
    };

    // Drag and drop handlers
    const handleDragStart = useCallback(
        (e: React.DragEvent, workflow: Workflow) => {
            // If the dragged item is not selected, select only it
            const itemIds = selectedIds.has(workflow.id) ? Array.from(selectedIds) : [workflow.id];

            e.dataTransfer.setData(
                "application/json",
                JSON.stringify({ itemIds, itemType: "workflow" })
            );
            e.dataTransfer.effectAllowed = "move";

            // Create custom drag preview
            createDragPreview(e, itemIds.length, "workflow");
        },
        [selectedIds]
    );

    const handleDropOnFolder = useCallback(
        async (folderId: string, itemIds: string[], itemType: string) => {
            if (itemType !== "workflow") return;
            try {
                await moveItemsToFolder({ itemIds, itemType, folderId });
                await loadWorkflows();
                await loadFolders();
                setSelectedIds(new Set());
            } catch (err) {
                logger.error("Failed to move items to folder", err);
            }
        },
        []
    );

    // Selection handlers for batch operations
    const handleCardClick = useCallback(
        (e: React.MouseEvent, workflow: Workflow) => {
            if (e.shiftKey) {
                e.preventDefault();
                setSelectedIds((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(workflow.id)) {
                        newSet.delete(workflow.id);
                    } else {
                        newSet.add(workflow.id);
                    }
                    return newSet;
                });
            } else if (selectedIds.size === 0) {
                navigate(`/builder/${workflow.id}`, {
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
        (e: React.MouseEvent, workflow: Workflow) => {
            e.preventDefault();
            // If right-clicking on an unselected item, select only that item
            if (!selectedIds.has(workflow.id)) {
                setSelectedIds(new Set([workflow.id]));
            }
            setContextMenu({
                isOpen: true,
                position: { x: e.clientX, y: e.clientY },
                type: "workflow"
            });
        },
        [selectedIds]
    );

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;

        setIsBatchDeleting(true);
        try {
            // Delete all selected workflows
            const deletePromises = Array.from(selectedIds).map((id) => deleteWorkflow(id));
            await Promise.all(deletePromises);

            // Refresh the workflow list and clear selection
            await loadWorkflows();
            await loadFolders();
            setSelectedIds(new Set());
            setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: "workflow" });
        } catch (err: unknown) {
            logger.error("Failed to delete workflows", err);
            const error = err as { message?: string };
            setError({
                title: "Delete Failed",
                message: error.message || "Failed to delete some workflows. Please try again."
            });
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const closeContextMenu = useCallback(() => {
        setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: "workflow" });
    }, []);

    const workflowContextMenuItems: ContextMenuItem[] = [
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
            label: `Delete ${selectedIds.size} workflow${selectedIds.size !== 1 ? "s" : ""}`,
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

    // Filter folders to show only those with workflows when at root
    const foldersToShow = currentFolderId ? [] : folders;
    const canShowFoldersSection = !currentFolderId && foldersToShow.length > 0;

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Workflows"
                description={
                    selectedFolderIds.size > 0
                        ? `${selectedFolderIds.size} folder${selectedFolderIds.size !== 1 ? "s" : ""} selected`
                        : selectedIds.size > 0
                          ? `${selectedIds.size} selected`
                          : isSearchActive
                            ? `${filteredWorkflows.length} result${filteredWorkflows.length !== 1 ? "s" : ""} for "${searchQuery}"`
                            : currentFolder
                              ? `${workflows.length} workflow${workflows.length !== 1 ? "s" : ""} in ${currentFolder.name}`
                              : `${workflows.length} ${workflows.length === 1 ? "workflow" : "workflows"}`
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
                                placeholder="Search workflows..."
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
                                variant="secondary"
                                onClick={openGenerationPanel}
                                title="Generate workflow with AI"
                            >
                                <Sparkles className="w-4 h-4" />
                                Generate with AI
                            </Button>
                            <Button variant="primary" onClick={() => setIsDialogOpen(true)}>
                                <Plus className="w-4 h-4" />
                                New Workflow
                            </Button>
                        </div>
                    )
                }
            />

            {/* Breadcrumb when inside a folder */}
            {currentFolder && (
                <FolderBreadcrumb
                    baseName="Workflows"
                    folder={currentFolder}
                    onNavigateToRoot={handleNavigateToRoot}
                    className="mb-6"
                />
            )}

            {/* Loading State */}
            {isLoading || isLoadingFolders ? (
                <LoadingState message="Loading workflows..." />
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
                                        displayItemType="workflow"
                                    />
                                ))}
                            </div>
                            <div className="border-t border-border my-6" />
                            <div className="mb-4">
                                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                    Workflows
                                </h2>
                            </div>
                        </>
                    )}

                    {/* Workflows Grid */}
                    {filteredWorkflows.length === 0 && isSearchActive ? (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-card">
                            <Search className="w-12 h-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                No results found
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                                No workflows match "{searchQuery}". Try a different search term.
                            </p>
                            <Button variant="secondary" onClick={() => setSearchQuery("")}>
                                Clear search
                            </Button>
                        </div>
                    ) : workflows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-card">
                            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                {currentFolder ? "No workflows in this folder" : "No workflows yet"}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                                {currentFolder
                                    ? "Move workflows here or create a new one."
                                    : "Get started by creating your first workflow. Build complex AI-powered workflows with our drag-and-drop canvas."}
                            </p>
                            <Button
                                variant="primary"
                                onClick={() => setIsDialogOpen(true)}
                                size="lg"
                            >
                                <Plus className="w-4 h-4" />
                                {currentFolder ? "Create Workflow" : "Create Your First Workflow"}
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredWorkflows.map((workflow) => (
                                <WorkflowCard
                                    key={workflow.id}
                                    workflow={toWorkflowSummary(workflow)}
                                    isSelected={selectedIds.has(workflow.id)}
                                    onClick={(e) => handleCardClick(e, workflow)}
                                    onContextMenu={(e) => handleContextMenu(e, workflow)}
                                    onDragStart={(e) => handleDragStart(e, workflow)}
                                    onDuplicate={() => handleDuplicateWorkflow(workflow)}
                                    onMoveToFolder={() => {
                                        setSelectedIds(new Set([workflow.id]));
                                        setIsMoveDialogOpen(true);
                                    }}
                                    onRemoveFromFolder={
                                        currentFolderId
                                            ? () => handleRemoveFromFolder(workflow.id)
                                            : undefined
                                    }
                                    onDelete={() => setWorkflowToDelete(workflow)}
                                    currentFolderId={currentFolderId}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Create Workflow Dialog */}
            <CreateWorkflowDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onCreate={handleCreateWorkflow}
            />

            {/* AI Generate Dialog */}
            <AIGenerateDialog
                open={isAIDialogOpen}
                onOpenChange={setIsAIDialogOpen}
                onGenerate={handleGenerateWorkflow}
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
                itemType="workflow"
                currentFolderId={currentFolderId}
                onMove={handleMoveToFolder}
                onCreateFolder={() => {
                    setIsMoveDialogOpen(false);
                    setIsCreateFolderDialogOpen(true);
                }}
            />

            {/* Delete Workflow Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!workflowToDelete}
                onClose={() => setWorkflowToDelete(null)}
                onConfirm={handleDeleteWorkflow}
                title="Delete Workflow"
                message={`Are you sure you want to delete "${workflowToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
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

            {/* Error Dialog */}
            <ErrorDialog
                isOpen={error !== null}
                title={error?.title || "Error"}
                message={error?.message || "An error occurred"}
                onClose={() => setError(null)}
            />

            {/* Context Menu for batch operations */}
            <ContextMenu
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                items={
                    contextMenu.type === "folder"
                        ? folderContextMenuItems
                        : workflowContextMenuItems
                }
                onClose={closeContextMenu}
            />

            {/* Workflow Generation Chat Panel */}
            <WorkflowGenerationChatPanel />
        </div>
    );
}
