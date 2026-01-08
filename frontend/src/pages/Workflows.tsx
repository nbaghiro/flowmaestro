import {
    Plus,
    FileText,
    Calendar,
    Sparkles,
    Trash2,
    MoreVertical,
    Copy,
    FolderPlus,
    FolderInput,
    GripVertical,
    ChevronDown
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { WorkflowNode, Folder, FolderWithCounts } from "@flowmaestro/shared";
import { AIGenerateDialog } from "../components/AIGenerateDialog";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { ContextMenu, type ContextMenuItem } from "../components/common/ContextMenu";
import { ErrorDialog } from "../components/common/ErrorDialog";
import { PageHeader } from "../components/common/PageHeader";
import { ProviderIconList } from "../components/common/ProviderIconList";
import { LoadingState } from "../components/common/Spinner";
import { CreateWorkflowDialog } from "../components/CreateWorkflowDialog";
import {
    FolderCard,
    CreateFolderDialog,
    MoveToFolderDialog,
    FolderBreadcrumb
} from "../components/folders";
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
    type WorkflowDefinition
} from "../lib/api";
import { logger } from "../lib/logger";
import { convertToReactFlowFormat } from "../lib/workflowLayout";
import { extractProvidersFromNodes } from "../lib/workflowUtils";

interface Workflow {
    id: string;
    name: string;
    description?: string;
    folder_id?: string | null;
    definition?: {
        nodes?: Record<
            string,
            { type: string; config?: { provider?: string; providerId?: string } }
        >;
    };
    created_at: string;
    updated_at: string;
}

export function Workflows() {
    const [searchParams, setSearchParams] = useSearchParams();
    const currentFolderId = searchParams.get("folder");

    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [folders, setFolders] = useState<FolderWithCounts[]>([]);
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
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [error, setError] = useState<{ title: string; message: string } | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
        type: "workflow" | "folder";
    }>({ isOpen: false, position: { x: 0, y: 0 }, type: "workflow" });
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

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
            navigate(`/builder/${workflowId}`);
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
                navigate(`/builder/${workflowId}`);
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
            setOpenMenuId(null);

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
            const createData = await createWorkflow(newName, workflow.description, newDefinition);

            if (createData.success && createData.data) {
                // Refresh the workflow list
                await loadWorkflows();

                // Navigate to the new workflow
                navigate(`/builder/${createData.data.id}`);
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
                setSearchParams({ folder: folder.id });
            } else {
                // Clear selection on normal click when folders are selected
                setSelectedFolderIds(new Set());
            }
        },
        [setSearchParams, selectedFolderIds.size]
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
        await moveItemsToFolder({
            itemIds: Array.from(selectedIds),
            itemType: "workflow",
            folderId
        });
        await loadWorkflows();
        await loadFolders();
        setSelectedIds(new Set());
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
                navigate(`/builder/${workflow.id}`);
            } else {
                // Clear selection on normal click when items are selected
                setSelectedIds(new Set());
            }
        },
        [navigate, selectedIds.size]
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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    };

    // Filter folders to show only those with workflows when at root
    const foldersToShow = currentFolderId ? [] : folders;
    const showFoldersSection = !currentFolderId && foldersToShow.length > 0;

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Workflows"
                description={
                    selectedFolderIds.size > 0
                        ? `${selectedFolderIds.size} folder${selectedFolderIds.size !== 1 ? "s" : ""} selected`
                        : selectedIds.size > 0
                          ? `${selectedIds.size} selected`
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
                            <Button
                                variant="secondary"
                                onClick={() => setIsAIDialogOpen(true)}
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
                                            displayItemType="workflow"
                                        />
                                    ))}
                                </div>
                            )}
                            <div className="border-t border-border my-6" />
                            <div className="mb-4">
                                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                    Workflows
                                </h2>
                            </div>
                        </>
                    )}

                    {/* Workflows Grid */}
                    {workflows.length === 0 ? (
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
                            {workflows.map((workflow) => (
                                <div
                                    key={workflow.id}
                                    className={`bg-card border rounded-lg p-5 hover:shadow-md transition-all group relative cursor-pointer select-none flex flex-col h-full ${
                                        selectedIds.has(workflow.id)
                                            ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                                            : "border-border hover:border-primary"
                                    }`}
                                    onClick={(e) => handleCardClick(e, workflow)}
                                    onContextMenu={(e) => handleContextMenu(e, workflow)}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, workflow)}
                                >
                                    {/* Drag Handle - visible on hover */}
                                    <div
                                        className="absolute bottom-2 right-2 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        <GripVertical className="w-4 h-4" />
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-3">
                                            <FileText className="w-5 h-5 text-primary" />
                                            <div className="flex items-center gap-1">
                                                <Badge variant="default" size="sm">
                                                    Workflow
                                                </Badge>

                                                {/* Menu Button */}
                                                <div
                                                    className="relative"
                                                    ref={
                                                        openMenuId === workflow.id ? menuRef : null
                                                    }
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(
                                                                openMenuId === workflow.id
                                                                    ? null
                                                                    : workflow.id
                                                            );
                                                        }}
                                                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                                        title="More options"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>

                                                    {/* Dropdown Menu */}
                                                    {openMenuId === workflow.id && (
                                                        <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-10">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDuplicateWorkflow(
                                                                        workflow
                                                                    );
                                                                }}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                                Duplicate
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenMenuId(null);
                                                                    setSelectedIds(
                                                                        new Set([workflow.id])
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
                                                                    setWorkflowToDelete(workflow);
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
                                            {workflow.name}
                                        </h3>

                                        {workflow.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {workflow.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Footer - always at bottom */}
                                    <div className="mt-auto pt-4">
                                        <ProviderIconList
                                            providers={extractProvidersFromNodes(
                                                workflow.definition?.nodes
                                            )}
                                            maxVisible={5}
                                            iconSize="sm"
                                            className="mb-3"
                                        />

                                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>
                                                    Created {formatDate(workflow.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
        </div>
    );
}
