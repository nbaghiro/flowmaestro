import { Loader2, Save, LayoutGrid } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ReactFlowProvider, useReactFlow, Node } from "reactflow";
import { autoLayoutWorkflow, ALL_PROVIDERS } from "@flowmaestro/shared";
import { NodeInspector } from "../canvas/panels/NodeInspector";
import { NodeLibrary } from "../canvas/panels/NodeLibrary";
import { WorkflowCanvas } from "../canvas/WorkflowCanvas";
import { AIAskButton } from "../components/AIAskButton";
import { AIChatPanel } from "../components/AIChatPanel";
import { BuilderHeader } from "../components/BuilderHeader";
import { CheckpointPanel } from "../components/CheckpointPanel";
import { Button } from "../components/common/Button";
import { Dialog } from "../components/common/Dialog";
import { MobileBuilderGuard } from "../components/common/MobileBuilderGuard";
import { Tooltip } from "../components/common/Tooltip";
import { ExecutionSSEManager } from "../components/execution/ExecutionSSEManager";
import { ExecutionPanel } from "../components/ExecutionPanel";
import { CreateFormInterfaceDialog } from "../components/forms/CreateFormInterfaceDialog";
import { ValidationPanel } from "../components/validation/ValidationPanel";
import { WorkflowSettingsDialog } from "../components/WorkflowSettingsDialog";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import {
    getWorkflow,
    updateWorkflow,
    createCheckpoint,
    deleteCheckpoint,
    listCheckpoints,
    restoreCheckpoint,
    renameCheckpoint
} from "../lib/api";
import { logger } from "../lib/logger";
import { generateId } from "../lib/utils";
import {
    createWorkflowSnapshot,
    transformNodesToBackendMap,
    transformEdgesToBackend,
    findEntryPoint,
    compareWorkflowSnapshots
} from "../lib/workflowTransformers";
import { useChatStore } from "../stores/chatStore";
import { useConnectionStore } from "../stores/connectionStore";
import { useHistoryStore, initializeHistoryTracking } from "../stores/historyStore";
import { useTriggerStore } from "../stores/triggerStore";
import { useWorkflowStore } from "../stores/workflowStore";

const NODE_DUPLICATE_OFFSET = 20;
const SAVE_SUCCESS_TIMEOUT = 2000;
const SAVE_ERROR_TIMEOUT = 3000;
const FIT_VIEW_PADDING = 0.2;

type SaveStatus = "idle" | "saving" | "saved" | "error";

// Right panel types - only one can be open at a time
type RightPanelType = "execution" | "chat" | "checkpoint" | "validation" | null;

interface CopiedNode {
    type: string;
    data: Record<string, unknown>;
    style?: React.CSSProperties;
    position: { x: number; y: number };
}

interface Checkpoint {
    id: string;
    name: string | null;
    createdAt: string;
    snapshot: Record<string, unknown>;
    formatted?: string;
}

export function FlowBuilder() {
    const { workflowId } = useParams<{ workflowId: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // Get the folder ID if navigated from a folder page
    const fromFolderId = (location.state as { fromFolderId?: string } | null)?.fromFolderId;

    // Determine where to navigate back to
    const getBackUrl = useCallback(() => {
        if (fromFolderId) {
            return `/folders/${fromFolderId}`;
        }
        return "/";
    }, [fromFolderId]);

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [isSidebarPinned, setIsSidebarPinned] = useState(false);
    const [workflowName, setWorkflowName] = useState("Untitled Workflow");
    const [workflowDescription, setWorkflowDescription] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const [lastSavedState, setLastSavedState] = useState<string>("");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [copiedNode, setCopiedNode] = useState<CopiedNode | null>(null);
    const reactFlowInstanceRef = useRef<ReturnType<typeof useReactFlow> | null>(null);
    const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
    const [showMinorChangesDialog, setShowMinorChangesDialog] = useState(false);
    const [isFormInterfaceDialogOpen, setIsFormInterfaceDialogOpen] = useState(false);

    // Unified right panel state - only one can be open at a time
    const [activeRightPanel, setActiveRightPanel] = useState<RightPanelType>(null);

    const {
        selectedNode,
        nodes,
        edges,
        aiGenerated,
        aiPrompt,
        setAIMetadata,
        resetWorkflow,
        deleteNode,
        addNode,
        selectNode,
        setNodes,
        autoFillMissingConnections,
        setCurrentWorkflowId
    } = useWorkflowStore();

    const { undo, redo, canUndo, canRedo, clear } = useHistoryStore();

    const { closePanel: closeChatPanel, openPanel: openChatPanel } = useChatStore();

    const { connections, fetchConnections } = useConnectionStore();

    const { setDrawerOpen } = useTriggerStore();

    // Fetch connections on mount
    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    // Auto-fill missing connectionIds whenever conditions are met
    // The function is idempotent - it only updates nodes that need updating
    useEffect(() => {
        if (!isLoading && connections.length > 0 && nodes.length > 0) {
            autoFillMissingConnections(connections);
        }
    }, [isLoading, connections, nodes, autoFillMissingConnections]);

    // Helper to open a right panel (closes any other open panel first)
    const openRightPanel = useCallback(
        (panel: RightPanelType) => {
            // Close previous panel in its respective store if needed
            if (activeRightPanel === "chat") {
                closeChatPanel();
            } else if (activeRightPanel === "execution") {
                setDrawerOpen(false);
            }

            // Open new panel
            setActiveRightPanel(panel);

            // Sync with stores
            if (panel === "chat") {
                openChatPanel();
            } else if (panel === "execution") {
                setDrawerOpen(true);
            }

            // Deselect node when opening any panel
            if (panel) {
                selectNode(null);
            }
        },
        [activeRightPanel, closeChatPanel, openChatPanel, setDrawerOpen, selectNode]
    );

    // Helper to close all right panels
    const closeRightPanel = useCallback(() => {
        if (activeRightPanel === "chat") {
            closeChatPanel();
        } else if (activeRightPanel === "execution") {
            setDrawerOpen(false);
        }
        setActiveRightPanel(null);
    }, [activeRightPanel, closeChatPanel, setDrawerOpen]);

    // Toggle a right panel (open if closed, close if open)
    const toggleRightPanel = useCallback(
        (panel: RightPanelType) => {
            if (activeRightPanel === panel) {
                closeRightPanel();
            } else {
                openRightPanel(panel);
            }
        },
        [activeRightPanel, closeRightPanel, openRightPanel]
    );

    useEffect(() => {
        if (workflowId) {
            listCheckpoints(workflowId).then((cp) => {
                const sorted = cp.sort(
                    (a: Checkpoint, b: Checkpoint) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                setCheckpoints(sorted);
            });
        }
    }, [workflowId]);

    // Close all right panels when a node is selected
    useEffect(() => {
        if (selectedNode && activeRightPanel) {
            closeRightPanel();
        }
        // eslint-disable-next-line
    }, [selectedNode]);

    // Click-outside detection for right panels
    // Uses mousedown to capture before other click handlers fire
    useEffect(() => {
        if (!activeRightPanel) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Don't close if clicking inside a right panel
            if (target.closest("[data-right-panel]")) return;

            // Don't close if clicking a React Flow node (will open node config)
            if (target.closest(".react-flow__node")) return;

            // Don't close if clicking elements that open panels (buttons, etc.)
            if (target.closest("[data-opens-panel]")) return;

            // Don't close if clicking inside the overflow menu
            if (target.closest("[role='menu']")) return;

            closeRightPanel();
        };

        // Use capture phase to run before other handlers
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [activeRightPanel, closeRightPanel]);

    useEffect(() => {
        const unsubscribe = initializeHistoryTracking();
        return () => {
            unsubscribe();
            clear();
        };
    }, [clear]);

    // Set current workflow ID in store (loads persisted UI state like validation toggle)
    useEffect(() => {
        setCurrentWorkflowId(workflowId ?? null);
        return () => setCurrentWorkflowId(null);
    }, [workflowId, setCurrentWorkflowId]);

    useEffect(() => {
        if (workflowId) {
            loadWorkflow();
        }
    }, [workflowId]);

    useEffect(() => {
        if (!isLoading && lastSavedState !== "") {
            const currentState = createWorkflowSnapshot(workflowName, nodes, edges);
            setHasUnsavedChanges(currentState !== lastSavedState);
        }
    }, [nodes, edges, workflowName, isLoading, lastSavedState]);

    useEffect(() => {
        if (
            !isLoading &&
            lastSavedState === "" &&
            (nodes.length > 0 || workflowName !== "Untitled Workflow")
        ) {
            const initialState = createWorkflowSnapshot(workflowName, nodes, edges);
            setLastSavedState(initialState);
        }
    }, [isLoading, nodes, edges, workflowName]);

    const loadWorkflow = async () => {
        if (!workflowId) return;

        try {
            const response = await getWorkflow(workflowId);
            logger.debug("Loaded workflow definition", { definition: response.data.definition });

            const cp = await listCheckpoints(workflowId);
            resetWorkflow();

            if (response.success && response.data) {
                setWorkflowName(response.data.name);
                setWorkflowDescription(response.data.description || "");
                setAIMetadata(response.data.ai_generated || false, response.data.ai_prompt || null);

                if (response.data.definition) {
                    const definition = response.data.definition;

                    if (definition.nodes && Object.keys(definition.nodes).length > 0) {
                        const nodesObj = definition.nodes as Record<string, unknown>;
                        const flowNodes = Object.entries(nodesObj).map(
                            ([id, node]: [string, unknown]) => {
                                const nodeData = node as Record<string, unknown>;
                                const config = nodeData.config as Record<string, unknown>;

                                // Look up provider logoUrl if node has a provider in config
                                const providerId = config?.provider as string | undefined;
                                const providerInfo = providerId
                                    ? ALL_PROVIDERS.find((p) => p.provider === providerId)
                                    : undefined;

                                const flowNode: {
                                    id: string;
                                    type: string;
                                    position: { x: number; y: number };
                                    data: Record<string, unknown>;
                                    style?: React.CSSProperties;
                                } = {
                                    id,
                                    type: (nodeData.type as string) || "default",
                                    position: (nodeData.position as { x: number; y: number }) || {
                                        x: 0,
                                        y: 0
                                    },
                                    data: {
                                        label: nodeData.name,
                                        ...config,
                                        // Add logoUrl if provider has one
                                        ...(providerInfo?.logoUrl && {
                                            logoUrl: providerInfo.logoUrl
                                        }),
                                        onError: nodeData.onError
                                    }
                                };

                                if (nodeData.style) {
                                    flowNode.style = nodeData.style as React.CSSProperties;
                                }

                                return flowNode;
                            }
                        );

                        useWorkflowStore.getState().setNodes(flowNodes);
                    }

                    if (definition.edges && definition.edges.length > 0) {
                        useWorkflowStore.getState().setEdges(definition.edges);
                    }
                }
            }
            setCheckpoints(cp);
        } catch (error) {
            logger.error("Failed to load workflow", error);
        } finally {
            setIsLoading(false);
            clear();
        }
    };

    // Warn user about unsaved changes when closing/refreshing browser
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleBack = useCallback(() => {
        if (hasUnsavedChanges) {
            setShowUnsavedDialog(true);
        } else {
            // Use browser back if no specific folder, otherwise go to folder
            if (fromFolderId) {
                navigate(`/folders/${fromFolderId}`);
            } else {
                navigate(-1);
            }
        }
    }, [hasUnsavedChanges, navigate, fromFolderId]);

    const handleDiscardChanges = useCallback(() => {
        setShowUnsavedDialog(false);
        resetWorkflow();
        // Use browser back if no specific folder, otherwise go to folder
        if (fromFolderId) {
            navigate(`/folders/${fromFolderId}`);
        } else {
            navigate(-1);
        }
    }, [navigate, resetWorkflow, fromFolderId]);

    const handleSave = useCallback(async () => {
        if (!workflowId) return;

        setSaveStatus("saving");

        try {
            const nodesMap = transformNodesToBackendMap(nodes);
            const backendEdges = transformEdgesToBackend(edges);
            const entryPoint = findEntryPoint(nodes);

            const workflowDefinition = {
                name: workflowName,
                nodes: nodesMap,
                edges: backendEdges,
                ...(entryPoint && { entryPoint })
            };

            const updatePayload: {
                name: string;
                description?: string;
                definition: unknown;
                aiGenerated?: boolean;
                aiPrompt?: string | null;
            } = {
                name: workflowName,
                definition: workflowDefinition
            };

            if (workflowDescription) {
                updatePayload.description = workflowDescription;
            }
            if (aiGenerated !== undefined) {
                updatePayload.aiGenerated = aiGenerated;
            }
            if (aiPrompt) {
                updatePayload.aiPrompt = aiPrompt;
            }

            await updateWorkflow(workflowId, updatePayload as Parameters<typeof updateWorkflow>[1]);

            setSaveStatus("saved");
            setLastSavedState(createWorkflowSnapshot(workflowName, nodes, edges));

            setTimeout(() => setSaveStatus("idle"), SAVE_SUCCESS_TIMEOUT);
        } catch (error: unknown) {
            logger.error("Failed to save workflow", error);
            setSaveStatus("error");
            setTimeout(() => setSaveStatus("idle"), SAVE_ERROR_TIMEOUT);
        }
    }, [workflowId, nodes, edges, workflowName, workflowDescription, aiGenerated, aiPrompt]);

    const handleSaveAndLeave = useCallback(async () => {
        if (!workflowId) return;

        setSaveStatus("saving");

        try {
            const nodesMap = transformNodesToBackendMap(nodes);
            const backendEdges = transformEdgesToBackend(edges);
            const entryPoint = findEntryPoint(nodes);

            const workflowDefinition = {
                name: workflowName,
                nodes: nodesMap,
                edges: backendEdges,
                ...(entryPoint && { entryPoint })
            };

            const updatePayload: {
                name: string;
                definition: unknown;
            } = {
                name: workflowName,
                definition: workflowDefinition
            };

            await updateWorkflow(workflowId, updatePayload as Parameters<typeof updateWorkflow>[1]);

            setShowUnsavedDialog(false);
            // Use browser back if no specific folder, otherwise go to folder
            if (fromFolderId) {
                navigate(`/folders/${fromFolderId}`);
            } else {
                navigate(-1);
            }
        } catch (error: unknown) {
            logger.error("Failed to save workflow", error);
            setSaveStatus("error");
            setTimeout(() => setSaveStatus("idle"), SAVE_ERROR_TIMEOUT);
        }
    }, [workflowId, nodes, edges, workflowName, navigate, fromFolderId]);

    const handleDuplicateNode = useCallback(() => {
        if (!selectedNode) return;

        const node = nodes.find((n) => n.id === selectedNode);
        if (!node) return;

        const newNode: Node = {
            id: generateId(),
            type: node.type,
            position: {
                x: node.position.x + NODE_DUPLICATE_OFFSET,
                y: node.position.y + NODE_DUPLICATE_OFFSET
            },
            data: { ...node.data },
            style: node.style ? { ...node.style } : undefined
        };

        addNode(newNode);
        selectNode(newNode.id);
    }, [selectedNode, nodes, addNode, selectNode]);

    const handleCopyNode = useCallback(() => {
        if (!selectedNode) return;

        const node = nodes.find((n) => n.id === selectedNode);
        if (!node) return;

        setCopiedNode({
            type: node.type || "default",
            data: { ...node.data },
            style: node.style ? { ...node.style } : undefined,
            position: node.position
        });
    }, [selectedNode, nodes]);

    const handlePasteNode = useCallback(() => {
        if (!copiedNode) return;

        const newNode: Node = {
            id: generateId(),
            type: copiedNode.type,
            position: {
                x: copiedNode.position.x + NODE_DUPLICATE_OFFSET,
                y: copiedNode.position.y + NODE_DUPLICATE_OFFSET
            },
            data: { ...copiedNode.data },
            style: copiedNode.style
        };

        addNode(newNode);
        selectNode(newNode.id);
    }, [copiedNode, addNode, selectNode]);

    const handleDeleteNode = useCallback(() => {
        if (!selectedNode) return;
        deleteNode(selectedNode);
    }, [selectedNode, deleteNode]);

    const handleSelectAll = useCallback(() => {
        const updatedNodes = nodes.map((node) => ({
            ...node,
            selected: true
        }));
        setNodes(updatedNodes);
    }, [nodes, setNodes]);

    const handleDeselectAll = useCallback(() => {
        selectNode(null);
    }, [selectNode]);

    const handleFitView = useCallback(() => {
        if (reactFlowInstanceRef.current) {
            reactFlowInstanceRef.current.fitView({ padding: FIT_VIEW_PADDING });
        }
    }, []);

    const handleAutoLayout = useCallback(() => {
        if (nodes.length === 0) return;

        const newPositions = autoLayoutWorkflow(nodes, edges);
        const updatedNodes = nodes.map((node) => ({
            ...node,
            position: newPositions.get(node.id) || node.position
        }));

        setNodes(updatedNodes);

        // Fit view after layout with slight delay for positions to update
        setTimeout(() => {
            if (reactFlowInstanceRef.current) {
                reactFlowInstanceRef.current.fitView({ padding: FIT_VIEW_PADDING, duration: 300 });
            }
        }, 50);
    }, [nodes, edges, setNodes]);

    const handleRunWorkflow = useCallback(() => {
        const runButton = document.querySelector('[data-action="run"]') as HTMLButtonElement;
        if (runButton) runButton.click();
    }, []);

    const handleNameChange = (name: string) => {
        setWorkflowName(name);
    };

    const handleSettingsSave = async (name: string, description: string) => {
        if (!workflowId) return;

        try {
            await updateWorkflow(workflowId, { name, description });
            setWorkflowName(name);
            setWorkflowDescription(description);
        } catch (error) {
            logger.error("Failed to save workflow settings", error);
            throw error;
        }
    };

    const handleDeleteCheckpoint = async (id: string) => {
        const updated = await deleteCheckpoint(id, workflowId!);
        setCheckpoints(updated);
    };

    const handleRestoreCheckpoint = async (id: string) => {
        await restoreCheckpoint(id);
        await loadWorkflow();

        const updated: Checkpoint[] = (await listCheckpoints(workflowId!)).sort(
            (a: Checkpoint, b: Checkpoint) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setCheckpoints(updated);
    };

    /**
     * Check if there are significant changes compared to the latest checkpoint.
     * Returns true if there are significant changes (or no checkpoints exist).
     */
    const checkForSignificantChanges = (): boolean => {
        if (checkpoints.length === 0) return true;

        const latestCheckpoint = checkpoints[0];
        const currentNodesMap = transformNodesToBackendMap(nodes);
        const currentEdgesBackend = transformEdgesToBackend(edges);

        const comparison = compareWorkflowSnapshots(
            currentNodesMap as Parameters<typeof compareWorkflowSnapshots>[0],
            currentEdgesBackend as Parameters<typeof compareWorkflowSnapshots>[1],
            latestCheckpoint.snapshot as unknown as Parameters<typeof compareWorkflowSnapshots>[2]
        );

        return comparison.hasSignificantChanges;
    };

    const handleCreateCheckpoint = async (name?: string) => {
        // Save the workflow first to ensure checkpoint captures persisted state
        await handleSave();

        await createCheckpoint(workflowId!, name);

        const updated: Checkpoint[] = (await listCheckpoints(workflowId!)).sort(
            (a: Checkpoint, b: Checkpoint) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setCheckpoints(updated);
    };

    const handleRenameCheckpoint = async (id: string, newName: string) => {
        await renameCheckpoint(id, newName);

        const updated = await listCheckpoints(workflowId!);
        setCheckpoints(updated);
    };

    const handleCreateComment = useCallback(() => {
        const instance = reactFlowInstanceRef.current;
        if (!instance) return;

        const { x, y, zoom } = instance.getViewport();
        const centerX = (-x + window.innerWidth / 2) / zoom;
        const centerY = (-y + window.innerHeight / 2) / zoom;

        addNode({
            id: generateId(),
            type: "comment",
            position: { x: centerX - 100, y: centerY - 75 },
            data: {
                label: "Comment",
                content: "",
                backgroundColor: "#FEF3C7",
                textColor: "#1F2937"
            },
            style: {
                width: 200,
                height: 150
            }
        });
    }, [addNode]);

    useKeyboardShortcuts({
        onSave: handleSave,
        onRun: handleRunWorkflow,
        onOpenSettings: () => setIsSettingsOpen(true),
        onOpenCheckpoints: () => toggleRightPanel("checkpoint"),
        onUndo: undo,
        onRedo: redo,
        onDelete: handleDeleteNode,
        onDuplicate: handleDuplicateNode,
        onCopy: handleCopyNode,
        onPaste: handlePasteNode,
        onSelectAll: handleSelectAll,
        onDeselectAll: handleDeselectAll,
        onFitView: handleFitView,
        onAutoLayout: handleAutoLayout,
        canUndo,
        canRedo,
        onCreateComment: handleCreateComment
    });

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading workflow...</p>
                </div>
            </div>
        );
    }

    const selectedNodeObj = nodes.find((n) => n.id === selectedNode);
    const selectedNodeType = selectedNodeObj?.type;
    return (
        <MobileBuilderGuard
            title="Workflow Builder"
            description="The visual workflow builder requires a larger screen. Please continue on a desktop or laptop computer to design your workflows."
            backUrl={getBackUrl()}
        >
            <ReactFlowProvider>
                <div className="h-screen flex flex-col bg-background">
                    <BuilderHeader
                        workflowId={workflowId}
                        workflowName={workflowName}
                        hasUnsavedChanges={hasUnsavedChanges}
                        saveStatus={saveStatus}
                        onSave={handleSave}
                        onNameChange={handleNameChange}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                        onOpenCheckpoints={() => toggleRightPanel("checkpoint")}
                        onOpenFormInterface={() => setIsFormInterfaceDialogOpen(true)}
                        onOpenValidation={() => toggleRightPanel("validation")}
                        onBack={handleBack}
                        onOpenExecution={() => openRightPanel("execution")}
                    />

                    <WorkflowSettingsDialog
                        open={isSettingsOpen}
                        onOpenChange={setIsSettingsOpen}
                        workflowName={workflowName}
                        workflowDescription={workflowDescription}
                        aiGenerated={aiGenerated}
                        aiPrompt={aiPrompt}
                        onSave={handleSettingsSave}
                    />

                    <div className="flex-1 flex overflow-hidden relative">
                        <NodeLibrary
                            isCollapsed={isSidebarCollapsed}
                            onExpand={() => setIsSidebarCollapsed(false)}
                            onCollapse={() => setIsSidebarCollapsed(true)}
                            isPinned={isSidebarPinned}
                            onPinToggle={() => setIsSidebarPinned(!isSidebarPinned)}
                        />
                        <div className="flex-1">
                            <WorkflowCanvas
                                onInit={(instance) => (reactFlowInstanceRef.current = instance)}
                                onPaneClick={closeRightPanel}
                            />
                        </div>
                        {selectedNode && selectedNodeType !== "comment" && <NodeInspector />}

                        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
                            <div className="flex items-center gap-2">
                                <AIAskButton
                                    isActive={activeRightPanel === "chat"}
                                    onClick={() => toggleRightPanel("chat")}
                                />
                                <Tooltip content="Auto-layout nodes (Shift+L)" position="top">
                                    <button
                                        onClick={handleAutoLayout}
                                        className="px-4 py-2 border rounded-lg shadow-lg transition-colors bg-card border-border hover:bg-muted"
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                    </button>
                                </Tooltip>
                                {workflowId && (
                                    <ExecutionPanel
                                        workflowId={workflowId}
                                        renderButtonOnly
                                        isActive={activeRightPanel === "execution"}
                                        onToggle={() => toggleRightPanel("execution")}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Right panels - only one visible at a time */}
                        {workflowId && activeRightPanel === "execution" && (
                            <ExecutionPanel
                                workflowId={workflowId}
                                renderPanelOnly
                                onClose={closeRightPanel}
                            />
                        )}
                        {/* SSE manager for workflow executions - always mounted to maintain connection */}
                        <ExecutionSSEManager />
                        {activeRightPanel === "chat" && (
                            <AIChatPanel workflowId={workflowId} onClose={closeRightPanel} />
                        )}
                        <CheckpointPanel
                            open={activeRightPanel === "checkpoint"}
                            onClose={closeRightPanel}
                            checkpoints={checkpoints}
                            onRestore={handleRestoreCheckpoint}
                            onDelete={handleDeleteCheckpoint}
                            onRename={handleRenameCheckpoint}
                            onCreate={handleCreateCheckpoint}
                            onCheckChanges={checkForSignificantChanges}
                            showMinorChangesDialog={showMinorChangesDialog}
                            onShowMinorChangesDialog={() => setShowMinorChangesDialog(true)}
                            onCloseMinorChangesDialog={() => setShowMinorChangesDialog(false)}
                        />
                        <CreateFormInterfaceDialog
                            isOpen={isFormInterfaceDialogOpen}
                            onClose={() => setIsFormInterfaceDialogOpen(false)}
                            onCreated={(formInterface) => {
                                setIsFormInterfaceDialogOpen(false);
                                navigate(`/form-interfaces/${formInterface.id}/edit`);
                            }}
                            initialWorkflowId={workflowId}
                        />
                        <ValidationPanel
                            isOpen={activeRightPanel === "validation"}
                            onClose={closeRightPanel}
                            onNodeClick={(nodeId) => {
                                selectNode(nodeId);
                                closeRightPanel();
                            }}
                        />
                    </div>

                    {/* Unsaved Changes Dialog */}
                    <Dialog
                        isOpen={showUnsavedDialog}
                        onClose={() => setShowUnsavedDialog(false)}
                        title="Unsaved Changes"
                    >
                        <p className="text-muted-foreground mb-6">
                            You have unsaved changes. Would you like to save them before leaving?
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setShowUnsavedDialog(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleDiscardChanges}>
                                Discard Changes
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSaveAndLeave}
                                disabled={saveStatus === "saving"}
                            >
                                {saveStatus === "saving" ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save & Leave
                                    </>
                                )}
                            </Button>
                        </div>
                    </Dialog>
                </div>
            </ReactFlowProvider>
        </MobileBuilderGuard>
    );
}
