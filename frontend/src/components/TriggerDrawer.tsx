/**
 * Trigger Drawer Component
 * Resizable right side panel for workflow trigger management
 */

import { ChevronLeft, ChevronRight, X, Zap } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { cn } from "../lib/utils";
import { useTriggerStore } from "../stores/triggerStore";
import { useWorkflowStore } from "../stores/workflowStore";

interface TriggerDrawerProps {
    children?: React.ReactNode;
    renderButtonOnly?: boolean;
    renderPanelOnly?: boolean;
}

const MIN_WIDTH = 400;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 500;

export function TriggerDrawer({ children, renderButtonOnly, renderPanelOnly }: TriggerDrawerProps) {
    const { isDrawerOpen, drawerWidth, setDrawerOpen, setDrawerWidth, triggers } =
        useTriggerStore();

    const { selectNode } = useWorkflowStore();

    const [isResizing, setIsResizing] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);
    const resizeStartX = useRef(0);
    const resizeStartWidth = useRef(DEFAULT_WIDTH);

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

    // Toggle drawer and deselect node when opening
    const toggleDrawer = () => {
        const newOpenState = !isDrawerOpen;
        setDrawerOpen(newOpenState);

        // Deselect node when opening trigger panel
        if (newOpenState) {
            selectNode(null);
        }
    };

    // Get enabled trigger count
    const enabledCount = triggers.filter((t) => t.enabled).length;

    // Render only button
    if (renderButtonOnly) {
        return (
            <button
                onClick={toggleDrawer}
                className={cn(
                    "px-4 py-2 border rounded-lg shadow-lg transition-colors",
                    isDrawerOpen
                        ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                        : "bg-card border-border hover:bg-muted"
                )}
            >
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span className="text-sm font-medium">Triggers</span>
                    {enabledCount > 0 && (
                        <span
                            className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                isDrawerOpen
                                    ? "bg-primary-foreground/20 text-primary-foreground"
                                    : "bg-primary/10 text-primary"
                            )}
                        >
                            {enabledCount}
                        </span>
                    )}
                    {isDrawerOpen ? (
                        <ChevronRight className="w-4 h-4 opacity-70" />
                    ) : (
                        <ChevronLeft className="w-4 h-4 opacity-50" />
                    )}
                </div>
            </button>
        );
    }

    // Render only panel
    if (renderPanelOnly) {
        return isDrawerOpen ? (
            <div className="fixed top-0 right-0 bottom-0 z-50">
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
                            <h3 className="text-sm font-semibold">Workflow Triggers</h3>
                            {triggers.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                    ({enabledCount}/{triggers.length} active)
                                </span>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleDrawer}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                title="Collapse"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setDrawerOpen(false)}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                title="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden">{children}</div>
                </div>
            </div>
        ) : null;
    }

    // Render both button and panel (default behavior)
    return (
        <>
            {/* Bottom Button - Always Visible */}
            <div>
                <button
                    onClick={toggleDrawer}
                    className={cn(
                        "px-4 py-2 border rounded-lg shadow-lg transition-colors",
                        isDrawerOpen
                            ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                            : "bg-card border-border hover:bg-muted"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm font-medium">Triggers</span>
                        {enabledCount > 0 && (
                            <span
                                className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    isDrawerOpen
                                        ? "bg-primary-foreground/20 text-primary-foreground"
                                        : "bg-primary/10 text-primary"
                                )}
                            >
                                {enabledCount}
                            </span>
                        )}
                        {isDrawerOpen ? (
                            <ChevronRight className="w-4 h-4 opacity-70" />
                        ) : (
                            <ChevronLeft className="w-4 h-4 opacity-50" />
                        )}
                    </div>
                </button>
            </div>

            {/* Drawer Panel */}
            {isDrawerOpen && (
                <div className="fixed top-0 right-0 bottom-0 z-50">
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
                                <h3 className="text-sm font-semibold">Workflow Triggers</h3>
                                {triggers.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        ({enabledCount}/{triggers.length} active)
                                    </span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleDrawer}
                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                    title="Collapse"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setDrawerOpen(false)}
                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                    title="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden">{children}</div>
                    </div>
                </div>
            )}
        </>
    );
}
