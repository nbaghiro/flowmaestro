/**
 * Node Execution Popover Component
 * Compact inline overlay showing execution state for a node
 * Uses Radix UI Popover for automatic positioning and collision avoidance
 */

import * as Popover from "@radix-ui/react-popover";
import { X, CheckCircle2, XCircle, Clock, AlertCircle, GripHorizontal } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "../../lib/utils";
import { NodeExecutionState } from "../../stores/workflowStore";

interface NodeExecutionPopoverProps {
    nodeId: string;
    nodeName: string;
    executionState: NodeExecutionState;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode; // Trigger element (status indicator)
}

export function NodeExecutionPopover({
    nodeId: _nodeId,
    nodeName,
    executionState,
    open,
    onOpenChange,
    children
}: NodeExecutionPopoverProps) {
    const [size, setSize] = useState({ width: 350, height: 300 });
    const [isResizing, setIsResizing] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

    // Reset size when popover closes
    useEffect(() => {
        if (!open) {
            setSize({ width: 350, height: 300 });
        }
    }, [open]);

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        startPosRef.current = {
            x: e.clientX,
            y: e.clientY,
            width: size.width,
            height: size.height
        };
    };

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - startPosRef.current.x;
            const deltaY = e.clientY - startPosRef.current.y;

            const newWidth = Math.max(300, Math.min(800, startPosRef.current.width + deltaX));
            const newHeight = Math.max(200, Math.min(600, startPosRef.current.height + deltaY));

            setSize({ width: newWidth, height: newHeight });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing]);
    // Get status info
    const getStatusInfo = () => {
        switch (executionState.status) {
            case "pending":
                return {
                    icon: <Clock className="w-4 h-4" />,
                    color: "text-yellow-600",
                    bg: "bg-yellow-50 dark:bg-yellow-900/20",
                    label: "Pending"
                };
            case "running":
                return {
                    icon: <Clock className="w-4 h-4 animate-spin" />,
                    color: "text-blue-600",
                    bg: "bg-blue-50 dark:bg-blue-900/20",
                    label: "Running"
                };
            case "success":
                return {
                    icon: <CheckCircle2 className="w-4 h-4" />,
                    color: "text-green-600",
                    bg: "bg-green-50 dark:bg-green-900/20",
                    label: "Success"
                };
            case "error":
                return {
                    icon: <XCircle className="w-4 h-4" />,
                    color: "text-red-600",
                    bg: "bg-red-50 dark:bg-red-900/20",
                    label: "Error"
                };
            default:
                return {
                    icon: <AlertCircle className="w-4 h-4" />,
                    color: "text-gray-600",
                    bg: "bg-muted/30 dark:bg-gray-900/20",
                    label: "Idle"
                };
        }
    };

    const statusInfo = getStatusInfo();

    // Format duration
    const formatDuration = (ms: number | null) => {
        if (ms === null) return "N/A";
        if (ms < 1000) return `${ms}ms`;
        const seconds = Math.floor(ms / 1000);
        const remainingMs = ms % 1000;
        if (seconds < 60) {
            return `${seconds}.${Math.floor(remainingMs / 100)}s`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    return (
        <Popover.Root open={open} onOpenChange={onOpenChange}>
            <Popover.Trigger asChild>{children}</Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    ref={contentRef}
                    side="right"
                    sideOffset={32}
                    align="center"
                    collisionPadding={20}
                    avoidCollisions={true}
                    style={{
                        width: `${size.width}px`,
                        height: `${size.height}px`
                    }}
                    className={cn(
                        "z-50 rounded-lg border border-border bg-background shadow-xl relative",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                        "data-[side=bottom]:slide-in-from-top-2",
                        "data-[side=left]:slide-in-from-right-2",
                        "data-[side=right]:slide-in-from-left-2",
                        "data-[side=top]:slide-in-from-bottom-2",
                        "flex flex-col"
                    )}
                >
                    {/* Header */}
                    <div className={cn("px-3 py-2 border-b border-border", statusInfo.bg)}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={statusInfo.color}>{statusInfo.icon}</div>
                                <div>
                                    <h3 className="font-semibold text-sm">{nodeName}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        {statusInfo.label} •{" "}
                                        {formatDuration(executionState.duration)}
                                    </p>
                                </div>
                            </div>
                            <Popover.Close
                                className="p-1 hover:bg-muted rounded transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-3.5 h-3.5" />
                            </Popover.Close>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Started At */}
                        {executionState.startedAt && (
                            <div className="px-3 py-2 border-b border-border/50">
                                <p className="text-xs text-muted-foreground">
                                    Started at {executionState.startedAt.toLocaleTimeString()}
                                </p>
                            </div>
                        )}

                        {/* Error */}
                        {executionState.error && (
                            <div className="px-3 py-2 border-b border-border/50">
                                <h5 className="font-medium text-xs text-red-700 dark:text-red-400 mb-1 flex items-center gap-1">
                                    <XCircle className="w-3 h-3" />
                                    Error
                                </h5>
                                <pre className="text-xs text-red-600 dark:text-red-300 whitespace-pre-wrap font-mono bg-red-50 dark:bg-red-900/10 p-2 rounded">
                                    {executionState.error}
                                </pre>
                            </div>
                        )}

                        {/* Output */}
                        {executionState.output && Object.keys(executionState.output).length > 0 && (
                            <div className="px-3 py-2 border-b border-border/50">
                                <h5 className="font-medium text-xs mb-1.5">Output</h5>
                                <div className="bg-muted/50 rounded p-2 overflow-y-auto">
                                    <pre className="text-xs font-mono whitespace-pre-wrap">
                                        {JSON.stringify(executionState.output, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Input */}
                        {executionState.input && Object.keys(executionState.input).length > 0 && (
                            <div className="px-3 py-2 border-b border-border/50">
                                <h5 className="font-medium text-xs mb-1.5">Input</h5>
                                <div className="bg-muted/50 rounded p-2 overflow-y-auto">
                                    <pre className="text-xs font-mono whitespace-pre-wrap">
                                        {JSON.stringify(executionState.input, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Metadata */}
                        {executionState.metadata &&
                            Object.keys(executionState.metadata).length > 0 && (
                                <div className="px-3 py-2">
                                    <h5 className="font-medium text-xs mb-1.5">Metadata</h5>
                                    <div className="space-y-1">
                                        {Object.entries(executionState.metadata).map(
                                            ([key, value]) => (
                                                <div key={key} className="flex gap-2 text-xs">
                                                    <span className="font-mono text-primary font-medium">
                                                        {key}:
                                                    </span>
                                                    <span className="font-mono text-muted-foreground truncate">
                                                        {typeof value === "object"
                                                            ? JSON.stringify(value)
                                                            : String(value)}
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                        {/* No data message */}
                        {!executionState.error &&
                            (!executionState.input ||
                                Object.keys(executionState.input).length === 0) &&
                            (!executionState.output ||
                                Object.keys(executionState.output).length === 0) &&
                            (!executionState.metadata ||
                                Object.keys(executionState.metadata).length === 0) && (
                                <div className="px-3 py-8 text-center text-muted-foreground">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-xs">No execution data available</p>
                                </div>
                            )}
                    </div>

                    {/* Bottom spacer for resize handle */}
                    <div className="h-6 flex-shrink-0 relative">
                        {/* Resize Handle */}
                        <div
                            className={cn(
                                "absolute bottom-0 right-0 w-6 h-6 cursor-se-resize",
                                "flex items-center justify-center",
                                "hover:bg-muted/50 transition-colors rounded-bl-lg",
                                "group"
                            )}
                            onMouseDown={handleResizeStart}
                            title="Drag to resize"
                        >
                            <GripHorizontal className="w-3 h-3 text-muted-foreground rotate-45 group-hover:text-foreground" />
                        </div>
                    </div>

                    {/* Arrow */}
                    <Popover.Arrow className="fill-background stroke-border stroke-1" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
