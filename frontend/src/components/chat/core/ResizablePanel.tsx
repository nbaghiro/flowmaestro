/**
 * ResizablePanel Component
 *
 * Slide-out panel with draggable resize handle.
 * Used for side chat panels across the application.
 */

import { X } from "lucide-react";
import { type ReactNode } from "react";
import { useResizablePanel } from "../../../hooks/useResizablePanel";
import { cn } from "../../../lib/utils";

interface ResizablePanelProps {
    /**
     * Panel content
     */
    children: ReactNode;
    /**
     * Header content (left side)
     */
    header: ReactNode;
    /**
     * Header actions (right side, before close button)
     */
    headerActions?: ReactNode;
    /**
     * Callback when close button is clicked
     */
    onClose: () => void;
    /**
     * Initial width of the panel
     * @default 500
     */
    initialWidth?: number;
    /**
     * Minimum width
     * @default 400
     */
    minWidth?: number;
    /**
     * Maximum width
     * @default 800
     */
    maxWidth?: number;
    /**
     * Controlled width value (for storing width in external state)
     */
    width?: number;
    /**
     * Callback when width changes
     */
    onWidthChange?: (width: number) => void;
    /**
     * Position of the panel
     * @default 'right'
     */
    position?: "left" | "right";
    /**
     * Whether panel is fixed position or relative
     * @default true
     */
    fixed?: boolean;
    /**
     * Additional class name for the panel
     */
    className?: string;
    /**
     * Whether panel is visible
     * @default true
     */
    isOpen?: boolean;
    /**
     * Show close button
     * @default true
     */
    showCloseButton?: boolean;
}

/**
 * Resizable slide-out panel component.
 *
 * @example
 * ```tsx
 * <ResizablePanel
 *   header={<div className="flex items-center gap-2"><Bot /> AI Assistant</div>}
 *   headerActions={<ConnectionSelector />}
 *   onClose={handleClose}
 *   width={panelWidth}
 *   onWidthChange={setPanelWidth}
 * >
 *   <ChatMessageList ... />
 *   <ChatInput ... />
 * </ResizablePanel>
 * ```
 */
export function ResizablePanel({
    children,
    header,
    headerActions,
    onClose,
    initialWidth = 500,
    minWidth = 400,
    maxWidth = 800,
    width: controlledWidth,
    onWidthChange,
    position = "right",
    fixed = true,
    className,
    isOpen = true,
    showCloseButton = true
}: ResizablePanelProps) {
    const {
        width: internalWidth,
        isResizing,
        resizeHandleProps
    } = useResizablePanel({
        initialWidth: controlledWidth ?? initialWidth,
        minWidth,
        maxWidth,
        direction: position === "right" ? "left" : "right",
        onWidthChange
    });

    const width = controlledWidth ?? internalWidth;

    if (!isOpen) {
        return null;
    }

    const positionClasses =
        position === "right" ? "top-0 right-0 bottom-0 border-l" : "top-0 left-0 bottom-0 border-r";

    const handlePosition =
        position === "right" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2";

    return (
        <div
            className={cn(fixed && "fixed z-50", !fixed && "relative", positionClasses, className)}
            style={{ width }}
            data-right-panel={position === "right" || undefined}
            data-left-panel={position === "left" || undefined}
        >
            <div
                className="h-full bg-card border-border shadow-2xl flex flex-col"
                style={{ width: "100%" }}
            >
                {/* Resize Handle */}
                <div
                    className={cn(
                        "absolute top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors z-10",
                        handlePosition,
                        isResizing && "bg-primary/30"
                    )}
                    {...resizeHandleProps}
                >
                    <div className="absolute top-0 bottom-0 w-3 -translate-x-1/2" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-2">{header}</div>
                    <div className="flex items-center gap-2">
                        {headerActions}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                title="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                {children}
            </div>
        </div>
    );
}
