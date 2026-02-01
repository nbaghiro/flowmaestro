import { LucideIcon, GripHorizontal, ArrowLeftRight } from "lucide-react";
import { ReactNode, useState, useEffect, useMemo } from "react";
import { Handle, Position, useNodeId, useStore, useUpdateNodeInternals } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { NodeExecutionPopover } from "../../components/execution/modals/NodeExecutionPopover";
import {
    NodeValidationBadge,
    getNodeValidationBorderStyle
} from "../../components/validation/NodeValidationBadge";
import { cn } from "../../lib/utils";
import {
    useWorkflowStore,
    INITIAL_NODE_WIDTH,
    INITIAL_NODE_HEIGHT
} from "../../stores/workflowStore";

export type ConnectorLayout = "vertical" | "horizontal";

interface BaseNodeProps {
    icon: LucideIcon;
    logoUrl?: string;
    label: string;
    status?: NodeExecutionStatus;
    category?:
        | "ai"
        | "logic"
        | "interaction"
        | "data"
        | "connect"
        | "voice"
        | "inputs"
        | "outputs"
        | "integrations"
        | "utils";
    children?: ReactNode;
    selected?: boolean;
    hasInputHandle?: boolean;
    hasOutputHandle?: boolean;
    customHandles?: ReactNode;
    onStatusClick?: () => void;
    connectorLayout?: ConnectorLayout;
}

// Status display config using canonical NodeExecutionStatus values
const statusConfig: Record<NodeExecutionStatus, { color: string; label: string }> = {
    idle: { color: "bg-gray-300 dark:bg-gray-600", label: "Idle" },
    pending: { color: "bg-yellow-400 dark:bg-yellow-500", label: "Pending" },
    ready: { color: "bg-yellow-400 dark:bg-yellow-500", label: "Ready" },
    executing: { color: "bg-blue-500 animate-pulse", label: "Running" },
    completed: { color: "bg-green-500", label: "Completed" },
    failed: { color: "bg-red-500", label: "Failed" },
    skipped: { color: "bg-gray-300 dark:bg-gray-600", label: "Skipped" }
};

// Safe accessor for status config - always returns a valid config
function getStatusConfig(status: NodeExecutionStatus): { color: string; label: string } {
    return statusConfig[status] ?? statusConfig.idle;
}

// Category styles reference CSS classes defined in App.css (single source of truth for colors)
const categoryConfig: Record<
    string,
    { borderColor: string; iconBg: string; iconColor: string; ringColor: string }
> = {
    inputs: {
        borderColor: "category-inputs-border",
        iconBg: "category-inputs-icon-bg",
        iconColor: "category-inputs-icon-text",
        ringColor: "category-inputs-ring"
    },
    outputs: {
        borderColor: "category-outputs-border",
        iconBg: "category-outputs-icon-bg",
        iconColor: "category-outputs-icon-text",
        ringColor: "category-outputs-ring"
    },
    ai: {
        borderColor: "category-ai-border",
        iconBg: "category-ai-icon-bg",
        iconColor: "category-ai-icon-text",
        ringColor: "category-ai-ring"
    },
    integrations: {
        borderColor: "category-integrations-border",
        iconBg: "category-integrations-icon-bg",
        iconColor: "category-integrations-icon-text",
        ringColor: "category-integrations-ring"
    },
    logic: {
        borderColor: "category-logic-border",
        iconBg: "category-logic-icon-bg",
        iconColor: "category-logic-icon-text",
        ringColor: "category-logic-ring"
    },
    utils: {
        borderColor: "category-utils-border",
        iconBg: "category-utils-icon-bg",
        iconColor: "category-utils-icon-text",
        ringColor: "category-utils-ring"
    },
    // Legacy categories (for backwards compatibility)
    interaction: {
        borderColor: "category-interaction-border",
        iconBg: "category-interaction-icon-bg",
        iconColor: "category-interaction-icon-text",
        ringColor: "category-interaction-ring"
    },
    data: {
        borderColor: "category-data-border",
        iconBg: "category-data-icon-bg",
        iconColor: "category-data-icon-text",
        ringColor: "category-data-ring"
    },
    connect: {
        borderColor: "category-connect-border",
        iconBg: "category-connect-icon-bg",
        iconColor: "category-connect-icon-text",
        ringColor: "category-connect-ring"
    }
};

export function BaseNode({
    icon: Icon,
    logoUrl,
    label,
    status: providedStatus,
    category = "data",
    children,
    selected = false,
    hasInputHandle = true,
    hasOutputHandle = true,
    customHandles,
    onStatusClick,
    connectorLayout: connectorLayoutProp = "horizontal"
}: BaseNodeProps) {
    const [logoError, setLogoError] = useState(false);
    const nodeId = useNodeId();
    const {
        currentExecution,
        selectedNode,
        nodeValidation,
        workflowValidation,
        hideNodeValidationIndicators
    } = useWorkflowStore();
    const categoryStyle = categoryConfig[category];
    const [showPopover, setShowPopover] = useState(false);

    // Get validation state for this node (both node-level and workflow-level)
    const validation = nodeId ? nodeValidation[nodeId] : undefined;
    const validationErrors = validation?.errors ?? [];

    // Compute border style based on combined validation state
    const {
        hasIssues: hasValidationIssues,
        borderClass: validationBorderClass,
        leftBorderColor
    } = useMemo(() => {
        if (!nodeId) {
            return { hasIssues: false, borderClass: "", leftBorderColor: undefined };
        }
        return getNodeValidationBorderStyle(
            nodeId,
            validationErrors,
            workflowValidation,
            hideNodeValidationIndicators
        );
    }, [nodeId, validationErrors, workflowValidation, hideNodeValidationIndicators]);

    const connectorLayout =
        useWorkflowStore((s) => {
            if (!nodeId) return undefined;
            const node = s.nodes.find((item) => item.id === nodeId);
            return node?.data?.connectorLayout as ConnectorLayout | undefined;
        }) ?? connectorLayoutProp;

    const updateNode = useWorkflowStore((s) => s.updateNode);
    const updateNodeStyle = useWorkflowStore((s) => s.updateNodeStyle);

    const toggleConnectorLayout = () => {
        if (!nodeId) return;

        updateNode(nodeId, {
            connectorLayout: connectorLayout === "vertical" ? "horizontal" : "vertical"
        });
    };

    const updateNodeInternals = useUpdateNodeInternals();

    // Resize State Management (width + height)
    const [isResizing, setIsResizing] = useState(false);
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
    const [startWidth, setStartWidth] = useState<number | null>(null);
    const [startHeight, setStartHeight] = useState<number | null>(null);
    const [showResizeTip, setShowResizeTip] = useState(false);
    const [showConnectorLayout, setShowConnectorLayout] = useState(false);
    const [didResize, setDidResize] = useState(false);

    const inputHandlePosition = connectorLayout === "horizontal" ? Position.Left : Position.Top;
    const outputHandlePosition =
        connectorLayout === "horizontal" ? Position.Right : Position.Bottom;

    useEffect(() => {
        if (nodeId) {
            updateNodeInternals(nodeId);
        }
    }, [connectorLayout, nodeId, updateNodeInternals]);

    useEffect(() => {
        if (!nodeId) return;

        const el = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement | null;
        if (!el) return;

        if (!el.style.width) {
            el.style.width = `${INITIAL_NODE_WIDTH}px`;
            updateNodeStyle(nodeId, { width: INITIAL_NODE_WIDTH });
        }

        if (!el.style.height) {
            el.style.height = `${INITIAL_NODE_HEIGHT}px`;
            updateNodeStyle(nodeId, { height: INITIAL_NODE_HEIGHT });
        }
    }, [nodeId, updateNodeStyle]);

    // Begin resize: capture starting mouse position and initial node size
    const onResizeMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const nodeEl = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement;
        const styletWidth = parseFloat(nodeEl?.style.width || "240");
        const styleHeight = parseFloat(nodeEl?.style.height || "120");

        setIsResizing(true);
        setDidResize(false); // Reset drag flag
        setStartPos({ x: e.clientX, y: e.clientY });
        setStartWidth(styletWidth);
        setStartHeight(styleHeight);
    };

    // Live DOM resizing for smooth drag (updates wrapper directly, no re-render)
    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing || !startPos || startWidth == null || startHeight == null || !nodeId)
            return;

        const alphaX = e.clientX - startPos.x;
        const alphaY = e.clientY - startPos.y;

        // If mouse moved more than 3 pixels, consider it a drag
        if (Math.abs(alphaX) > 3 || Math.abs(alphaY) > 3) {
            setDidResize(true);
        }

        const newWidth = Math.max(260, startWidth + alphaX);
        const newHeight = Math.max(120, startHeight + alphaY);

        const el = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement;
        if (el) {
            el.style.width = `${newWidth}px`;
            el.style.height = `${newHeight}px`;
        }
    };

    // Finish resizing: persist final width/height into store so ReactFlow saves it
    const mouseUp = () => {
        setIsResizing(false);

        if (startWidth != null && startHeight != null && nodeId) {
            const nodeEl = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement;
            const finalWidth = parseFloat(nodeEl.style.width);
            const finalHeight = parseFloat(nodeEl.style.height);

            updateNodeStyle(nodeId, { width: finalWidth, height: finalHeight });
        }

        setStartPos(null);
        setStartWidth(null);
        setStartHeight(null);
    };

    // Attach global listeners during resize, clean up afterward
    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", mouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", mouseUp);
        };
    }, [isResizing, startPos, startWidth, nodeId]);

    // Track viewport changes (zoom/pan) to auto-close popover
    const viewport = useStore((state) => state.transform);

    // Get execution status for this node
    const executionState =
        nodeId && currentExecution ? currentExecution.nodeStates.get(nodeId) : null;

    // Close popover when another node is selected
    useEffect(() => {
        if (selectedNode && selectedNode !== nodeId && showPopover) {
            setShowPopover(false);
        }
    }, [selectedNode, nodeId, showPopover]);

    // Close popover when viewport changes (zoom or pan)
    useEffect(() => {
        if (showPopover) {
            setShowPopover(false);
        }
    }, [viewport]);

    // Use execution status if available, otherwise use provided status
    const status: NodeExecutionStatus = executionState?.status ?? providedStatus ?? "idle";

    // Build tooltip text
    const getTooltipText = () => {
        if (!executionState) return getStatusConfig(status).label;

        const parts = [getStatusConfig(status).label];

        if (executionState.duration) {
            parts.push(`${executionState.duration}ms`);
        }

        if (executionState.error) {
            parts.push(`Error: ${executionState.error}`);
        }

        return parts.join(" • ");
    };

    return (
        <div
            className={cn(
                "group h-full flex flex-col bg-card rounded-lg transition-all duration-200 min-w-[260px] overflow-hidden",
                "border-2 border-border",
                hasValidationIssues ? validationBorderClass : categoryStyle.borderColor,
                `node-${category}-category`,
                selected ? "shadow-node-hover" : "shadow-node hover:shadow-node-hover"
            )}
            style={{
                borderLeftWidth: "4px",
                borderLeftColor: leftBorderColor
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2.5">
                    <div
                        className={cn(
                            "p-1.5 rounded-md flex items-center justify-center",
                            logoUrl && !logoError
                                ? "bg-zinc-700 dark:bg-zinc-700"
                                : categoryStyle.iconBg
                        )}
                    >
                        {logoUrl && !logoError ? (
                            <>
                                <img
                                    src={logoUrl}
                                    alt={label}
                                    className="w-4 h-4 object-contain"
                                    onError={() => setLogoError(true)}
                                />
                            </>
                        ) : (
                            <Icon className={cn("w-3.5 h-3.5", categoryStyle.iconColor)} />
                        )}
                    </div>
                    <span className="font-medium text-sm text-foreground">{label}</span>
                    {nodeId && (
                        <NodeValidationBadge
                            nodeId={nodeId}
                            nodeValidationErrors={validationErrors}
                        />
                    )}
                </div>
                {executionState && nodeId ? (
                    <NodeExecutionPopover
                        nodeId={nodeId}
                        nodeName={label}
                        executionState={executionState}
                        open={showPopover}
                        onOpenChange={setShowPopover}
                    >
                        <div
                            className={cn(
                                "w-2 h-2 rounded-full transition-all cursor-pointer hover:scale-125",
                                getStatusConfig(status).color
                            )}
                            title={getTooltipText()}
                            onMouseEnter={() => {
                                if (!showPopover) {
                                    setShowPopover(true);
                                }
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onStatusClick) {
                                    onStatusClick();
                                } else {
                                    setShowPopover(!showPopover);
                                }
                            }}
                        />
                    </NodeExecutionPopover>
                ) : (
                    <div
                        className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            getStatusConfig(status).color
                        )}
                        title={getTooltipText()}
                    />
                )}
            </div>

            {/* Content */}
            {children && (
                <div className="flex-1 pl-3 pr-6 py-2.5 text-sm bg-card break-words whitespace-pre-wrap overflow-auto">
                    {children}
                </div>
            )}

            {/* Connector Layout Toggle + Tooltip */}
            <div
                className="nodrag absolute bottom-1 right-6 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                onMouseEnter={() => setShowConnectorLayout(true)}
                onMouseLeave={() => setShowConnectorLayout(false)}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleConnectorLayout();
                    }}
                    className="
                        w-4 h-4
                        flex items-center justify-center
                        text-gray-400 hover:text-foreground
                        mb-[2px]
                    "
                >
                    <ArrowLeftRight className="w-3 h-3" />
                </button>

                {showConnectorLayout && (
                    <div
                        className="
                            pointer-events-none
                            absolute top-full left-1/2 -translate-x-1/2 mt-[10px]
                            px-2 py-1
                            text-xs text-white
                            bg-black/90 rounded
                            shadow-md
                            whitespace-nowrap
                            z-40
                        "
                    >
                        {connectorLayout === "vertical"
                            ? "Switch to horizontal connectors"
                            : "Switch to vertical connectors"}
                    </div>
                )}
            </div>

            {/* Resize Handle */}
            <div
                onMouseEnter={() => !isResizing && setShowResizeTip(true)}
                onMouseLeave={() => !isResizing && setShowResizeTip(false)}
                onMouseDown={(e) => {
                    onResizeMouseDown(e);
                    setShowResizeTip(false);
                }}
                onClick={(e) => {
                    // Prevent node selection if user just resized
                    if (didResize) {
                        e.stopPropagation();
                        setDidResize(false);
                    }
                }}
                className="
                    nodrag
                    absolute bottom-1 right-1
                    w-4 h-4
                    cursor-se-resize z-20
                    rotate-45
                    text-gray-400
                    opacity-0 group-hover:opacity-100 transition-opacity
                "
            >
                {/* Tooltip */}
                {showResizeTip && (
                    <div
                        className="
                            absolute 1 mb-1
                            px-2 py-1
                            text-xs text-white
                            bg-black/90 rounded
                            shadow-md
                            whitespace-nowrap
                            z-40
                            -rotate-45
                        "
                    >
                        Drag to resize
                    </div>
                )}
                <GripHorizontal className="w-3 h-3" />
            </div>

            {/* Handles */}
            {customHandles || (
                <>
                    {hasInputHandle && (
                        <Handle
                            type="target"
                            position={inputHandlePosition}
                            id="input"
                            className="!w-2.5 !h-2.5 !bg-white !border-2 !border-border !shadow-sm"
                        />
                    )}
                    {hasOutputHandle && (
                        <Handle
                            type="source"
                            position={outputHandlePosition}
                            id="output"
                            className="!w-2.5 !h-2.5 !bg-white !border-2 !border-border !shadow-sm"
                        />
                    )}
                </>
            )}
        </div>
    );
}
