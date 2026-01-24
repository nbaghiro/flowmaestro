/**
 * Execution Panel Component
 * Resizable right side panel for workflow triggers and execution management
 */

import {
    ChevronLeft,
    ChevronRight,
    X,
    Zap,
    Play,
    History as HistoryIcon,
    Plus
} from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { cn } from "../lib/utils";
import { useTriggerStore } from "../stores/triggerStore";
import { useWorkflowStore } from "../stores/workflowStore";
import { ExecutionPanelContent } from "./execution/panels/ExecutionPanelContent";

interface ExecutionPanelProps {
    workflowId: string;
    renderButtonOnly?: boolean;
    renderPanelOnly?: boolean;
    /** External control: whether the panel/button is active */
    isActive?: boolean;
    /** External control: toggle the panel */
    onToggle?: () => void;
    /** External control: close the panel */
    onClose?: () => void;
}

const MIN_WIDTH = 400;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 500;

type TabType = "triggers" | "execution" | "history";

export function ExecutionPanel({
    workflowId,
    renderButtonOnly,
    renderPanelOnly,
    isActive,
    onToggle,
    onClose
}: ExecutionPanelProps) {
    const { drawerWidth, setDrawerWidth, triggers, clearTriggers } = useTriggerStore();

    const { currentExecution, clearExecution } = useWorkflowStore();

    const [isResizing, setIsResizing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("triggers");
    const drawerRef = useRef<HTMLDivElement>(null);
    const resizeStartX = useRef(0);
    const resizeStartWidth = useRef(DEFAULT_WIDTH);

    // Clear execution and triggers when workflow changes
    useEffect(() => {
        clearExecution();
        clearTriggers();
        setActiveTab("triggers"); // Reset to triggers tab
    }, [workflowId, clearExecution, clearTriggers]);

    // Auto-switch to execution tab when an execution starts
    useEffect(() => {
        if (currentExecution && activeTab === "triggers") {
            setActiveTab("execution");
        }
    }, [currentExecution?.id, activeTab]);

    // Handle resize start
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        resizeStartX.current = e.clientX;
        resizeStartWidth.current = drawerWidth;
    };

    // Handle resize
    useEffect(() => {
        const handleResize = (e: MouseEvent) => {
            if (!isResizing) return;

            const deltaX = resizeStartX.current - e.clientX;
            const newWidth = Math.max(
                MIN_WIDTH,
                Math.min(MAX_WIDTH, resizeStartWidth.current + deltaX)
            );

            setDrawerWidth(newWidth);
        };

        const handleResizeEnd = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener("mousemove", handleResize);
            document.addEventListener("mouseup", handleResizeEnd);

            return () => {
                document.removeEventListener("mousemove", handleResize);
                document.removeEventListener("mouseup", handleResizeEnd);
            };
        }

        return undefined;
    }, [isResizing, setDrawerWidth, drawerWidth]);

    // Handle close - use external handler if provided
    const handleClose = () => {
        if (onClose) {
            onClose();
        }
    };

    // Handle toggle - use external handler if provided
    const handleToggle = () => {
        if (onToggle) {
            onToggle();
        }
    };

    // Get enabled trigger count
    const enabledCount = triggers.filter((t) => t.enabled).length;

    // Render tabs
    const renderTabs = () => (
        <div className="flex items-center justify-between gap-1 px-4 py-2 border-b border-border bg-muted/20">
            <div className="flex items-center gap-1">
                <button
                    onClick={() => setActiveTab("triggers")}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        activeTab === "triggers"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                >
                    <Zap className="w-4 h-4" />
                    Triggers
                    {enabledCount > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            {enabledCount}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab("execution")}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        activeTab === "execution"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                >
                    <Play className="w-4 h-4" />
                    Execution
                </button>

                <button
                    onClick={() => setActiveTab("history")}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        activeTab === "history"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                >
                    <HistoryIcon className="w-4 h-4" />
                    History
                </button>
            </div>

            {activeTab === "triggers" && (
                <button
                    onClick={() => {
                        // Trigger add new trigger action
                        window.dispatchEvent(new CustomEvent("trigger:create"));
                    }}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background rounded transition-colors"
                    title="Add trigger"
                >
                    <Plus className="w-4 h-4" />
                </button>
            )}
        </div>
    );

    // Render only button
    if (renderButtonOnly) {
        return (
            <button
                onClick={handleToggle}
                data-opens-panel
                className={cn(
                    "px-4 py-2 border rounded-lg shadow-lg transition-colors",
                    isActive
                        ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                        : "bg-card border-border hover:bg-muted"
                )}
            >
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span className="text-sm font-medium">Execution</span>
                    {enabledCount > 0 && (
                        <span
                            className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                isActive
                                    ? "bg-primary-foreground/20 text-primary-foreground"
                                    : "bg-primary/10 text-primary"
                            )}
                        >
                            {enabledCount}
                        </span>
                    )}
                    {isActive ? (
                        <ChevronRight className="w-4 h-4 opacity-70" />
                    ) : (
                        <ChevronLeft className="w-4 h-4 opacity-50" />
                    )}
                </div>
            </button>
        );
    }

    // Render only panel (visibility controlled externally)
    if (renderPanelOnly) {
        return (
            <div className="fixed top-0 right-0 bottom-0 z-50" data-right-panel>
                <div
                    ref={drawerRef}
                    className="h-full bg-card border-l border-border shadow-2xl flex flex-col"
                    style={{ width: drawerWidth }}
                >
                    {/* Resize Handle */}
                    <div
                        className={cn(
                            "absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors",
                            isResizing && "bg-primary/30"
                        )}
                        onMouseDown={handleResizeStart}
                    >
                        <div className="absolute top-0 left-0 bottom-0 w-3 -translate-x-1/2" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-primary" />
                            <h3 className="text-sm font-semibold">Execution & Triggers</h3>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleClose}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                title="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    {renderTabs()}

                    {/* Content */}
                    <div className="flex-1 overflow-hidden">
                        <ExecutionPanelContent workflowId={workflowId} activeTab={activeTab} />
                    </div>
                </div>
            </div>
        );
    }

    // Default: return null (use renderButtonOnly or renderPanelOnly)
    return null;
}
