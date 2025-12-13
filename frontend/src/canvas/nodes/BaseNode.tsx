import { LucideIcon, GripHorizontal } from "lucide-react";
import { ReactNode, useState, useEffect } from "react";
import { Handle, Position, useNodeId, useStore } from "reactflow";
import type { NodeCategory, NodeSubcategory } from "@flowmaestro/shared";
import { NodeExecutionPopover } from "../../components/execution/NodeExecutionPopover";
import { cn } from "../../lib/utils";
import {
    useWorkflowStore,
    INITIAL_NODE_WIDTH,
    INITIAL_NODE_HEIGHT
} from "../../stores/workflowStore";

export type NodeStatus = "idle" | "pending" | "running" | "success" | "error";

interface BaseNodeProps {
    icon: LucideIcon;
    label: string;
    status?: NodeStatus;
    category?: NodeCategory;
    subcategory?: NodeSubcategory;
    children?: ReactNode;
    selected?: boolean;
    hasInputHandle?: boolean;
    hasOutputHandle?: boolean;
    customHandles?: ReactNode;
    onStatusClick?: () => void;
}

const statusConfig: Record<NodeStatus, { color: string; label: string }> = {
    idle: { color: "bg-gray-300 dark:bg-gray-600", label: "Idle" },
    pending: { color: "bg-yellow-400 dark:bg-yellow-500", label: "Pending" },
    running: { color: "bg-blue-500 animate-pulse", label: "Running" },
    success: { color: "bg-green-500", label: "Success" },
    error: { color: "bg-red-500", label: "Error" }
};

const categoryConfig: Partial<
    Record<
        NodeCategory,
        { borderColor: string; iconBg: string; iconColor: string; ringColor: string }
    >
> = {
    ai: {
        borderColor: "border-l-blue-500",
        iconBg: "bg-blue-500/10 dark:bg-blue-400/20",
        iconColor: "text-blue-600 dark:text-blue-400",
        ringColor: "ring-blue-500"
    },
    knowledge: {
        borderColor: "border-l-indigo-500",
        iconBg: "bg-indigo-500/10 dark:bg-indigo-400/20",
        iconColor: "text-indigo-600 dark:text-indigo-400",
        ringColor: "ring-indigo-500"
    },
    automation: {
        borderColor: "border-l-amber-500",
        iconBg: "bg-amber-500/10 dark:bg-amber-400/20",
        iconColor: "text-amber-600 dark:text-amber-400",
        ringColor: "ring-amber-500"
    },
    tools: {
        borderColor: "border-l-slate-500",
        iconBg: "bg-slate-500/10 dark:bg-slate-400/20",
        iconColor: "text-slate-600 dark:text-slate-400",
        ringColor: "ring-slate-500"
    },
    integration: {
        borderColor: "border-l-orange-500",
        iconBg: "bg-orange-500/10 dark:bg-orange-400/20",
        iconColor: "text-orange-600 dark:text-orange-400",
        ringColor: "ring-orange-500"
    },
    custom: {
        borderColor: "border-l-pink-500",
        iconBg: "bg-pink-500/10 dark:bg-pink-400/20",
        iconColor: "text-pink-600 dark:text-pink-400",
        ringColor: "ring-pink-500"
    },
    subflow: {
        borderColor: "border-l-emerald-500",
        iconBg: "bg-emerald-500/10 dark:bg-emerald-400/20",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        ringColor: "ring-emerald-500"
    }
};

export function BaseNode({
    icon: Icon,
    label,
    status: providedStatus,
    category = "tools",
    children,
    selected = false,
    hasInputHandle = true,
    hasOutputHandle = true,
    customHandles,
    onStatusClick
}: BaseNodeProps) {
    const nodeId = useNodeId();
    const { currentExecution, selectedNode } = useWorkflowStore();
    const categoryStyle = categoryConfig[category] || categoryConfig.tools!;
    const [showPopover, setShowPopover] = useState(false);

    const updateNodeStyle = useWorkflowStore((s) => s.updateNodeStyle);

    // Resize State Management (width + height)
    const [isResizing, setIsResizing] = useState(false);
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
    const [startWidth, setStartWidth] = useState<number | null>(null);
    const [startHeight, setStartHeight] = useState<number | null>(null);
    const [showResizeTip, setShowResizeTip] = useState(false);
    const [didResize, setDidResize] = useState(false);

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
    const status: NodeStatus = executionState
        ? (executionState.status as NodeStatus)
        : providedStatus || "idle";

    // Build tooltip text
    const getTooltipText = () => {
        if (!executionState) return statusConfig[status].label;

        const parts = [statusConfig[status].label];

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
                "h-full flex flex-col bg-card rounded-lg transition-all duration-200 min-w-[260px] overflow-hidden",
                "border-2 border-border",
                categoryStyle.borderColor,
                `node-${category}-category`,
                selected ? "shadow-node-hover" : "shadow-node hover:shadow-node-hover"
            )}
            style={{
                borderLeftWidth: "4px"
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2.5">
                    <div className={cn("p-1.5 rounded-md", categoryStyle.iconBg)}>
                        <Icon className={cn("w-3.5 h-3.5", categoryStyle.iconColor)} />
                    </div>
                    <span className="font-medium text-sm text-foreground">{label}</span>
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
                                statusConfig[status].color
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
                            statusConfig[status].color
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
                            position={Position.Top}
                            id="input"
                            className="!w-2.5 !h-2.5 !bg-white !border-2 !border-border !shadow-sm"
                        />
                    )}
                    {hasOutputHandle && (
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            id="output"
                            className="!w-2.5 !h-2.5 !bg-white !border-2 !border-border !shadow-sm"
                        />
                    )}
                </>
            )}
        </div>
    );
}
