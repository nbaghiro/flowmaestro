import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { cn } from "../../../lib/utils";
import { useAgentBuilderLayoutStore } from "../../../stores/agentBuilderLayoutStore";

import type { PanelId } from "../../../stores/agentBuilderLayoutStore";
import type { LucideIcon } from "lucide-react";

export interface PanelProps {
    id: PanelId;
    children: React.ReactNode;
    /** Content to show when panel is collapsed (icons, badges, etc.) */
    collapsedContent?: React.ReactNode;
    /** Content to show when panel is minimized (tiny strip with expand button) */
    minimizedIcon?: LucideIcon;
    minimizedLabel?: string;
    /** Enable resize handle */
    resizable?: boolean;
    /** Which side to place resize handle */
    resizePosition?: "left" | "right";
    /** Additional class names */
    className?: string;
    /** Whether this panel takes remaining space (flex-1) */
    flexGrow?: boolean;
    /** Collapsed width override (default: minWidth from store) */
    collapsedWidth?: number;
}

export interface PanelHeaderProps {
    title: string;
    icon?: LucideIcon;
    badge?: string | number;
    panelId: PanelId;
    showCollapseButton?: boolean;
    className?: string;
    children?: React.ReactNode;
}

export function PanelHeader({
    title,
    icon: Icon,
    badge,
    panelId,
    showCollapseButton = true,
    className,
    children
}: PanelHeaderProps) {
    const { panels, togglePanel } = useAgentBuilderLayoutStore();
    const panel = panels[panelId];
    const isCollapsed = panel.state === "collapsed";

    return (
        <div
            className={cn(
                "flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20",
                className
            )}
        >
            <div className="flex items-center gap-2 min-w-0">
                {Icon && <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                {!isCollapsed && (
                    <>
                        <span className="font-medium text-sm truncate">{title}</span>
                        {badge !== undefined && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                {badge}
                            </span>
                        )}
                    </>
                )}
            </div>
            <div className="flex items-center gap-2">
                {children}
                {showCollapseButton && (
                    <button
                        onClick={() => togglePanel(panelId)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        title={isCollapsed ? "Expand panel" : "Collapse panel"}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                        ) : (
                            <ChevronLeft className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

const MINIMIZED_WIDTH = 32;
const COLLAPSED_WIDTH = 48;

export function Panel({
    id,
    children,
    collapsedContent,
    minimizedIcon: MinimizedIcon,
    minimizedLabel,
    resizable = false,
    resizePosition = "right",
    className,
    flexGrow = false,
    collapsedWidth
}: PanelProps) {
    const { panels, setPanelWidth, setPanelState } = useAgentBuilderLayoutStore();
    const panel = panels[id];
    const isCollapsed = panel.state === "collapsed";
    const isMinimized = panel.state === "minimized";
    const isExpanded = panel.state === "expanded";

    const [isResizing, setIsResizing] = useState(false);
    const resizeStartX = useRef(0);
    const resizeStartWidth = useRef(panel.width);

    // Handle resize start
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        resizeStartX.current = e.clientX;
        resizeStartWidth.current = panel.width;
    };

    // Handle resize with mouse events
    useEffect(() => {
        const handleResize = (e: MouseEvent) => {
            if (!isResizing) return;

            // Calculate delta based on resize position
            const deltaX =
                resizePosition === "right"
                    ? e.clientX - resizeStartX.current
                    : resizeStartX.current - e.clientX;

            const newWidth = resizeStartWidth.current + deltaX;
            setPanelWidth(id, newWidth);
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
    }, [isResizing, id, setPanelWidth, resizePosition]);

    // Check if the chat panel (flexGrow panel) is expanded
    const chatPanel = panels["chat"];
    const chatExpanded = chatPanel?.state === "expanded";

    // Calculate width based on state
    const effectiveCollapsedWidth = collapsedWidth ?? COLLAPSED_WIDTH;
    const getWidth = () => {
        if (isMinimized) return MINIMIZED_WIDTH;
        if (isCollapsed) return effectiveCollapsedWidth;
        return panel.width;
    };
    const width = getWidth();

    // This panel should grow if:
    // 1. It has flexGrow and is expanded, OR
    // 2. It's the config panel and expanded, and the chat panel is not expanded
    const shouldGrow = (flexGrow && isExpanded) || (id === "config" && isExpanded && !chatExpanded);

    // Resize handle component
    const ResizeHandle = resizable && isExpanded && (
        <div
            onMouseDown={handleResizeStart}
            className={cn(
                "absolute top-0 bottom-0 w-1 cursor-ew-resize z-10",
                "hover:bg-primary/30 transition-colors",
                isResizing && "bg-primary/50",
                resizePosition === "right" ? "right-0" : "left-0"
            )}
        />
    );

    // Minimized content - thin strip with expand button
    const minimizedContent = (
        <button
            onClick={() => setPanelState(id, "expanded")}
            className="h-full w-full flex flex-col items-center justify-center gap-1 hover:bg-muted/50 transition-colors group"
            title={`Expand ${minimizedLabel || id}`}
        >
            {MinimizedIcon && (
                <MinimizedIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
            {resizePosition === "right" ? (
                <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
            ) : (
                <ChevronLeft className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
            )}
        </button>
    );

    // Determine what content to show
    const renderContent = () => {
        if (isMinimized) return minimizedContent;
        if (isCollapsed) return collapsedContent;
        return children;
    };

    return (
        <div
            className={cn(
                "relative h-full bg-card border-border flex flex-col transition-all duration-300",
                resizePosition === "right" ? "border-r" : "border-l",
                shouldGrow && "flex-1",
                isResizing && "select-none",
                isMinimized && "bg-muted/30",
                className
            )}
            style={{
                width: shouldGrow ? undefined : width,
                minWidth: shouldGrow ? panel.minWidth : undefined
            }}
        >
            {ResizeHandle}
            {renderContent()}
        </div>
    );
}

// Barrel export for convenience
export { PanelHeader as Header };
