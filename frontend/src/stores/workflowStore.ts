import { Node, Edge, NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges } from "reactflow";
import { create } from "zustand";
import {
    type JsonValue,
    type JsonObject,
    type ValidationResult,
    type WorkflowValidationResult,
    type WorkflowValidationContext,
    type WorkflowValidationIssue,
    type NodeExecutionStatus,
    getErrorMessage,
    validateNodeConfig,
    nodeValidationRules,
    ALL_PROVIDERS,
    convertToReactFlowFormat,
    toValidatableNodes,
    toValidatableEdges,
    validateWorkflow
} from "@flowmaestro/shared";

// Set of provider IDs that should use "integration" validation rules
const INTEGRATION_PROVIDER_IDS = new Set(
    ALL_PROVIDERS.filter((p) => !p.comingSoon).map((p) => p.provider)
);

/**
 * Get the validation rule key for a node type.
 * Maps provider-specific types (like "slack", "discord") to "integration".
 */
function getValidationRuleKey(nodeType: string): string {
    // If we have explicit rules for this type, use them
    if (nodeValidationRules[nodeType]) {
        return nodeType;
    }
    // If it's a known integration provider, use "integration" rules
    if (INTEGRATION_PROVIDER_IDS.has(nodeType)) {
        return "integration";
    }
    // Otherwise return as-is (will use empty rules if not found)
    return nodeType;
}

import { executeWorkflow as executeWorkflowAPI, generateWorkflow } from "../lib/api";
import { logger } from "../lib/logger";

// Debounce timer for workflow validation
let workflowValidationTimer: ReturnType<typeof setTimeout> | null = null;
const VALIDATION_DEBOUNCE_MS = 300;

// Helper to trigger debounced workflow validation from within store actions
function debouncedWorkflowValidation(get: () => WorkflowStore): void {
    if (workflowValidationTimer) {
        clearTimeout(workflowValidationTimer);
    }

    workflowValidationTimer = setTimeout(() => {
        get().runWorkflowValidation();
        workflowValidationTimer = null;
    }, VALIDATION_DEBOUNCE_MS);
}

export const INITIAL_NODE_WIDTH = 260;
export const INITIAL_NODE_HEIGHT = 160;

export interface NodeExecutionState {
    status: NodeExecutionStatus;
    startedAt: Date | null;
    completedAt: Date | null;
    output: JsonValue;
    error: string | null;
    duration: number | null;
    input?: JsonValue;
    metadata?: JsonObject;
    retryCount?: number;
}

export interface ExecutionLog {
    id: string;
    level: "info" | "debug" | "warn" | "error" | "success" | "warning";
    message: string;
    nodeId?: string;
    timestamp: Date;
    metadata?: JsonObject;
}

export interface ExecutionPauseContextState {
    reason: string;
    nodeId: string;
    nodeName?: string;
    pausedAt: number;
    resumeTrigger?: "manual" | "timeout" | "webhook" | "signal";
    timeoutMs?: number;
    prompt?: string;
    description?: string;
    variableName: string;
    inputType: "text" | "number" | "boolean" | "json";
    placeholder?: string;
    validation?: Record<string, unknown>;
    required?: boolean;
}

export interface CurrentExecution {
    id: string;
    status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";
    nodeStates: Map<string, NodeExecutionState>;
    variables: Map<string, JsonValue>;
    logs: ExecutionLog[];
    startedAt: Date;
    completedAt: Date | null;
    duration: number | null;
    triggerId?: string;
    pauseContext?: ExecutionPauseContextState | null;
}

interface WorkflowStore {
    nodes: Node[];
    edges: Edge[];
    selectedNode: string | null;

    // Workflow metadata
    aiGenerated: boolean;
    aiPrompt: string | null;

    // Execution state (legacy)
    isExecuting: boolean;
    executionResult: JsonValue | null;
    executionError: string | null;

    // Current execution (new real-time state)
    currentExecution: CurrentExecution | null;

    // Node validation state
    nodeValidation: Record<string, ValidationResult>;

    // Workflow validation state
    workflowValidation: WorkflowValidationResult | null;
    workflowValidationContext: WorkflowValidationContext | null;

    // Current workflow ID (for persistence)
    currentWorkflowId: string | null;

    // UI state for hiding validation indicators on nodes (persisted per workflow)
    hideNodeValidationIndicators: boolean;

    // Actions
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    addNode: (node: Node) => void;
    updateNode: (nodeId: string, data: JsonObject) => void;
    updateNodeStyle: (nodeId: string, style: React.CSSProperties) => void;
    deleteNode: (nodeId: string) => void;
    selectNode: (nodeId: string | null) => void;
    setAIMetadata: (aiGenerated: boolean, aiPrompt: string | null) => void;
    executeWorkflow: (inputs?: JsonObject) => Promise<void>;
    generateWorkflowFromAI: (prompt: string, connectionId: string, model: string) => Promise<void>;

    // Execution state management
    startExecution: (executionId: string, triggerId?: string) => void;
    updateExecutionStatus: (status: CurrentExecution["status"]) => void;
    updateNodeState: (nodeId: string, state: Partial<NodeExecutionState>) => void;
    addExecutionLog: (log: Omit<ExecutionLog, "id" | "timestamp">) => void;
    updateVariable: (key: string, value: JsonValue) => void;
    setPauseContext: (pauseContext: ExecutionPauseContextState | null) => void;
    clearExecution: () => void;
    resetWorkflow: () => void;

    // Validation actions
    validateNode: (nodeId: string) => void;
    validateAllNodes: () => void;
    runWorkflowValidation: (context?: WorkflowValidationContext) => void;
    setWorkflowValidationContext: (context: WorkflowValidationContext) => void;
    getNodeWorkflowIssues: (nodeId: string) => WorkflowValidationIssue[];

    // UI actions
    setCurrentWorkflowId: (workflowId: string | null) => void;
    toggleNodeValidationIndicators: () => void;

    // Connection auto-fill
    autoFillMissingConnections: (
        connections: Array<{ id: string; provider: string; status: string }>
    ) => void;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
    nodes: [],
    edges: [],
    selectedNode: null,
    aiGenerated: false,
    aiPrompt: null,
    isExecuting: false,
    executionResult: null,
    executionError: null,
    currentExecution: null,
    nodeValidation: {},
    workflowValidation: null,
    workflowValidationContext: null,
    currentWorkflowId: null,
    hideNodeValidationIndicators: true,

    setNodes: (nodes) => {
        const sizedNodes = nodes.map((node) => ({
            ...node,
            style: {
                width: node?.style?.width ?? INITIAL_NODE_WIDTH,
                height: node?.style?.height ?? INITIAL_NODE_HEIGHT,
                ...(node.style || {})
            }
        }));
        set({ nodes: sizedNodes });
        // Validate all nodes after setting them
        setTimeout(() => {
            get().validateAllNodes();
            // Trigger debounced workflow validation
            debouncedWorkflowValidation(get);
        }, 0);
    },
    setEdges: (edges) => {
        set({ edges });
        // Trigger debounced workflow validation
        debouncedWorkflowValidation(get);
    },

    setAIMetadata: (aiGenerated, aiPrompt) => set({ aiGenerated, aiPrompt }),

    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes)
        });
    },

    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges)
        });
        // Trigger debounced workflow validation for edge changes
        debouncedWorkflowValidation(get);
    },

    addNode: (node) => {
        const sizedNode = {
            ...node,
            style: {
                width: node?.style?.width ?? INITIAL_NODE_WIDTH,
                height: node?.style?.height ?? INITIAL_NODE_HEIGHT,
                ...node.style
            }
        };

        set({ nodes: [...get().nodes, sizedNode] });
        // Validate the node immediately after adding
        get().validateNode(node.id);
        // Trigger debounced workflow validation
        debouncedWorkflowValidation(get);
    },

    updateNode: (nodeId, data) => {
        set({
            nodes: get().nodes.map((node) =>
                node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
            )
        });
        // Validate the node after updating
        get().validateNode(nodeId);
        // Trigger debounced workflow validation
        debouncedWorkflowValidation(get);
    },

    updateNodeStyle: (nodeId, style) => {
        set({
            nodes: get().nodes.map((node) =>
                node.id === nodeId ? { ...node, style: { ...(node.style || {}), ...style } } : node
            )
        });
    },

    deleteNode: (nodeId) => {
        const { selectedNode } = get();
        set({
            nodes: get().nodes.filter((node) => node.id !== nodeId),
            edges: get().edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
            // Clear selection if the deleted node was selected
            selectedNode: selectedNode === nodeId ? null : selectedNode
        });
        // Trigger debounced workflow validation
        debouncedWorkflowValidation(get);
    },

    selectNode: (nodeId) => set({ selectedNode: nodeId }),

    executeWorkflow: async (inputs = {}) => {
        const { nodes, edges } = get();
        const isCommentNode = (node: Node) => (node.type || "").toLowerCase() === "comment";
        // Exclude comment/note nodes and any edges touching them from execution payload.
        const runnableNodes = nodes.filter((n) => !isCommentNode(n));
        const runnableNodeIds = new Set(runnableNodes.map((n) => n.id));
        const runnableEdges = edges.filter(
            (e) => runnableNodeIds.has(e.source) && runnableNodeIds.has(e.target)
        );

        if (runnableNodes.length === 0) {
            set({ executionError: "Workflow is empty" });
            return;
        }

        set({
            isExecuting: true,
            executionResult: null,
            executionError: null
        });

        try {
            logger.info("Executing workflow", { nodeCount: runnableNodes.length });

            // Convert React Flow nodes to WorkflowNode format
            const workflowNodes = runnableNodes.map((node) => ({
                type: node.type || "default",
                name: (node.data?.label as string) || node.id,
                config: (node.data?.config as JsonObject) || {},
                position: node.position,
                ...(node.data?.onError && {
                    onError: node.data.onError as {
                        strategy: "continue" | "fallback" | "goto" | "fail";
                        fallbackValue?: JsonValue;
                        gotoNode?: string;
                    }
                })
            }));

            // Convert React Flow edges to WorkflowEdge format
            const workflowEdges = runnableEdges.map((edge) => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                ...(edge.sourceHandle && { sourceHandle: edge.sourceHandle })
            }));

            const response = await executeWorkflowAPI(workflowNodes, workflowEdges, inputs);

            if (response.success && response.data) {
                logger.info("Workflow execution completed", { result: response.data.result });
                set({
                    executionResult: response.data.result,
                    isExecuting: false
                });
            } else {
                throw new Error(response.error || "Workflow execution failed");
            }
        } catch (error: unknown) {
            logger.error("Workflow execution failed", error);
            set({
                executionError: getErrorMessage(error),
                isExecuting: false
            });
        }
    },

    generateWorkflowFromAI: async (prompt: string, connectionId: string, model: string) => {
        logger.info("Generating workflow from AI prompt", { prompt });

        try {
            const response = await generateWorkflow({ prompt, connectionId, model });

            if (response.success && response.data) {
                logger.info("AI generated workflow", { nodeCount: response.data.nodes.length });

                // Convert to React Flow format with auto-layout
                const { nodes, edges } = convertToReactFlowFormat(
                    response.data.nodes,
                    response.data.edges,
                    response.data.metadata.entryNodeId
                );

                // Replace current workflow with generated workflow
                set({
                    nodes,
                    edges,
                    selectedNode: null,
                    executionResult: null,
                    executionError: null,
                    aiGenerated: true,
                    aiPrompt: prompt
                });

                logger.info("Successfully added AI-generated workflow to canvas");
            } else {
                throw new Error(response.error || "Failed to generate workflow");
            }
        } catch (error: unknown) {
            logger.error("AI workflow generation failed", error);
            throw error; // Re-throw so dialog can show error
        }
    },

    // Execution state management methods
    startExecution: (executionId: string, triggerId?: string) => {
        logger.info("Starting execution", { executionId });
        set({
            currentExecution: {
                id: executionId,
                status: "running",
                nodeStates: new Map(),
                variables: new Map(),
                logs: [],
                startedAt: new Date(),
                completedAt: null,
                duration: null,
                triggerId
            }
        });
    },

    updateExecutionStatus: (status: CurrentExecution["status"]) => {
        const { currentExecution } = get();
        if (!currentExecution) return;

        const now = new Date();
        const completedAt = ["completed", "failed", "cancelled"].includes(status) ? now : null;
        const duration = completedAt ? now.getTime() - currentExecution.startedAt.getTime() : null;

        set({
            currentExecution: {
                ...currentExecution,
                status,
                completedAt,
                duration
            }
        });

        logger.info("Execution status updated", { status });
    },

    updateNodeState: (nodeId: string, state: Partial<NodeExecutionState>) => {
        const { currentExecution } = get();
        if (!currentExecution) return;

        const existingState = currentExecution.nodeStates.get(nodeId) || {
            status: "idle",
            startedAt: null,
            completedAt: null,
            output: null,
            error: null,
            duration: null
        };

        const updatedState: NodeExecutionState = {
            ...existingState,
            ...state
        };

        // Calculate duration if completed
        if (updatedState.completedAt && updatedState.startedAt) {
            updatedState.duration =
                updatedState.completedAt.getTime() - updatedState.startedAt.getTime();
        }

        const newNodeStates = new Map(currentExecution.nodeStates);
        newNodeStates.set(nodeId, updatedState);

        set({
            currentExecution: {
                ...currentExecution,
                nodeStates: newNodeStates
            }
        });

        logger.debug("Node state updated", { nodeId, status: updatedState.status });
    },

    addExecutionLog: (log: Omit<ExecutionLog, "id" | "timestamp">) => {
        const { currentExecution } = get();
        if (!currentExecution) return;

        const newLog: ExecutionLog = {
            ...log,
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date()
        };

        set({
            currentExecution: {
                ...currentExecution,
                logs: [...currentExecution.logs, newLog]
            }
        });
    },

    updateVariable: (key: string, value: JsonValue) => {
        const { currentExecution } = get();
        if (!currentExecution) return;

        const newVariables = new Map(currentExecution.variables);
        newVariables.set(key, value);

        set({
            currentExecution: {
                ...currentExecution,
                variables: newVariables
            }
        });

        logger.debug("Variable updated", { key });
    },

    setPauseContext: (pauseContext: ExecutionPauseContextState | null) => {
        const { currentExecution } = get();
        if (!currentExecution) return;

        set({
            currentExecution: {
                ...currentExecution,
                pauseContext,
                status: pauseContext ? "paused" : currentExecution.status
            }
        });

        if (pauseContext) {
            logger.info("Execution paused for user response", {
                nodeId: pauseContext.nodeId,
                variableName: pauseContext.variableName
            });
        } else {
            logger.info("Execution pause context cleared");
        }
    },

    clearExecution: () => {
        logger.debug("Clearing execution state");
        set({ currentExecution: null });
    },

    resetWorkflow: () => {
        logger.debug("Resetting workflow state");
        set({
            nodes: [],
            edges: [],
            selectedNode: null,
            aiGenerated: false,
            aiPrompt: null,
            isExecuting: false,
            executionResult: null,
            executionError: null,
            currentExecution: null,
            nodeValidation: {},
            workflowValidation: null,
            workflowValidationContext: null
        });
    },

    // Validation actions
    validateNode: (nodeId: string) => {
        const { nodes, nodeValidation } = get();
        const node = nodes.find((n) => n.id === nodeId);

        if (!node) {
            return;
        }

        const nodeType = node.type || "default";
        const validationRuleKey = getValidationRuleKey(nodeType);
        const config = (node.data || {}) as Record<string, unknown>;

        const result = validateNodeConfig(validationRuleKey, config, nodeValidationRules);

        // Only update if validation result changed
        const existingResult = nodeValidation[nodeId];
        const hasChanged =
            !existingResult ||
            existingResult.isValid !== result.isValid ||
            existingResult.errors.length !== result.errors.length;

        if (hasChanged) {
            set({
                nodeValidation: {
                    ...nodeValidation,
                    [nodeId]: result
                }
            });
        }
    },

    validateAllNodes: () => {
        const { nodes } = get();
        const newValidation: Record<string, ValidationResult> = {};

        for (const node of nodes) {
            const nodeType = node.type || "default";
            const validationRuleKey = getValidationRuleKey(nodeType);
            const config = (node.data || {}) as Record<string, unknown>;
            newValidation[node.id] = validateNodeConfig(
                validationRuleKey,
                config,
                nodeValidationRules
            );
        }

        set({ nodeValidation: newValidation });
    },

    runWorkflowValidation: (context?: WorkflowValidationContext) => {
        const { nodes, edges, workflowValidationContext } = get();

        // Use provided context or cached context
        const validationContext = context ||
            workflowValidationContext || {
                connectionIds: [],
                knowledgeBaseIds: [],
                inputVariables: []
            };

        // Convert to validatable format
        const validatableNodes = toValidatableNodes(nodes);
        const validatableEdges = toValidatableEdges(edges);

        // Run validation
        const result = validateWorkflow(validatableNodes, validatableEdges, validationContext);

        set({ workflowValidation: result });

        logger.debug("Workflow validation completed", {
            isValid: result.isValid,
            errorCount: result.summary.errorCount,
            warningCount: result.summary.warningCount
        });
    },

    setWorkflowValidationContext: (context: WorkflowValidationContext) => {
        set({ workflowValidationContext: context });
        // Re-run validation with new context
        get().runWorkflowValidation(context);
    },

    getNodeWorkflowIssues: (nodeId: string): WorkflowValidationIssue[] => {
        const { workflowValidation } = get();
        if (!workflowValidation) return [];
        return workflowValidation.nodeIssues.get(nodeId) || [];
    },

    setCurrentWorkflowId: (workflowId: string | null) => {
        // Load persisted state for this workflow from localStorage (default to hidden)
        let hideIndicators = true;
        if (workflowId) {
            try {
                const stored = localStorage.getItem(`workflow-hide-validation-${workflowId}`);
                // Only override default if there's a stored value
                if (stored !== null) {
                    hideIndicators = stored === "true";
                }
            } catch {
                // Ignore localStorage errors
            }
        }
        set({ currentWorkflowId: workflowId, hideNodeValidationIndicators: hideIndicators });
    },

    toggleNodeValidationIndicators: () => {
        const { currentWorkflowId, hideNodeValidationIndicators } = get();
        const newValue = !hideNodeValidationIndicators;

        // Persist to localStorage if we have a workflow ID
        if (currentWorkflowId) {
            try {
                localStorage.setItem(
                    `workflow-hide-validation-${currentWorkflowId}`,
                    String(newValue)
                );
            } catch {
                // Ignore localStorage errors
            }
        }

        set({ hideNodeValidationIndicators: newValue });
    },

    autoFillMissingConnections: (
        connections: Array<{ id: string; provider: string; status: string }>
    ) => {
        const { nodes } = get();
        if (connections.length === 0) {
            logger.debug("autoFillMissingConnections: no connections available");
            return;
        }

        // Node types that require connectionId and have a provider field
        const connectionNodeTypes = new Set([
            "llm",
            "vision",
            "embeddings",
            "router",
            "audioInput",
            "audioOutput",
            "imageGeneration",
            "videoGeneration"
        ]);

        let hasChanges = false;
        const updatedNodes = nodes.map((node) => {
            // Skip nodes that don't need connections or already have one
            if (!connectionNodeTypes.has(node.type || "")) return node;
            if (node.data?.connectionId) return node;

            const provider = node.data?.provider as string | undefined;
            if (!provider) return node;

            // Find an active connection for this provider
            const matchingConnection = connections.find(
                (conn) => conn.provider === provider && conn.status === "active"
            );

            if (matchingConnection) {
                hasChanges = true;
                logger.debug("autoFillMissingConnections: filling connection", {
                    nodeId: node.id,
                    provider,
                    connectionId: matchingConnection.id
                });
                return {
                    ...node,
                    data: {
                        ...node.data,
                        connectionId: matchingConnection.id
                    }
                };
            } else {
                logger.debug("autoFillMissingConnections: no matching connection", {
                    nodeId: node.id,
                    provider,
                    availableProviders: connections.map((c) => c.provider)
                });
            }

            return node;
        });

        if (hasChanges) {
            set({ nodes: updatedNodes });
            // Re-validate all nodes after auto-filling
            get().validateAllNodes();
            debouncedWorkflowValidation(get);
        }
    }
}));

// Debounced workflow validation trigger
export function triggerDebouncedWorkflowValidation(): void {
    if (workflowValidationTimer) {
        clearTimeout(workflowValidationTimer);
    }

    workflowValidationTimer = setTimeout(() => {
        useWorkflowStore.getState().runWorkflowValidation();
        workflowValidationTimer = null;
    }, VALIDATION_DEBOUNCE_MS);
}
