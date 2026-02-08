/**
 * useResizablePanel Hook
 *
 * Handles panel resize logic with mouse drag.
 * Used by slide-out chat panels for consistent resize behavior.
 */

import { useState, useRef, useEffect, useCallback } from "react";

interface UseResizablePanelOptions {
    /**
     * Initial width of the panel
     */
    initialWidth: number;
    /**
     * Minimum allowed width
     * @default 400
     */
    minWidth?: number;
    /**
     * Maximum allowed width
     * @default 800
     */
    maxWidth?: number;
    /**
     * Direction of resize ('left' means dragging left edge, 'right' means dragging right edge)
     * @default 'left'
     */
    direction?: "left" | "right";
    /**
     * Callback when width changes
     */
    onWidthChange?: (width: number) => void;
}

interface UseResizablePanelReturn {
    /**
     * Current panel width
     */
    width: number;
    /**
     * Whether panel is currently being resized
     */
    isResizing: boolean;
    /**
     * Props to spread on the resize handle element
     */
    resizeHandleProps: {
        onMouseDown: (e: React.MouseEvent) => void;
    };
    /**
     * Set width directly
     */
    setWidth: (width: number) => void;
}

/**
 * Hook that manages resizable panel behavior.
 *
 * @example
 * ```tsx
 * const { width, isResizing, resizeHandleProps } = useResizablePanel({
 *   initialWidth: 500,
 *   minWidth: 400,
 *   maxWidth: 800,
 *   onWidthChange: (w) => store.setWidth(w)
 * });
 *
 * return (
 *   <div style={{ width }}>
 *     <div
 *       className={cn("resize-handle", isResizing && "active")}
 *       {...resizeHandleProps}
 *     />
 *     // Panel content
 *   </div>
 * );
 * ```
 */
export function useResizablePanel(options: UseResizablePanelOptions): UseResizablePanelReturn {
    const {
        initialWidth,
        minWidth = 400,
        maxWidth = 800,
        direction = "left",
        onWidthChange
    } = options;

    const [width, setWidthState] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);
    const resizeStartX = useRef(0);
    const resizeStartWidth = useRef(initialWidth);

    const setWidth = useCallback(
        (newWidth: number) => {
            const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            setWidthState(clampedWidth);
            onWidthChange?.(clampedWidth);
        },
        [minWidth, maxWidth, onWidthChange]
    );

    const handleResizeStart = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setIsResizing(true);
            resizeStartX.current = e.clientX;
            resizeStartWidth.current = width;
        },
        [width]
    );

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            // Calculate delta based on direction
            // For right-side panels, dragging left increases width
            const deltaX =
                direction === "left"
                    ? resizeStartX.current - e.clientX
                    : e.clientX - resizeStartX.current;

            const newWidth = resizeStartWidth.current + deltaX;
            setWidth(newWidth);
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
    }, [isResizing, direction, setWidth]);

    return {
        width,
        isResizing,
        resizeHandleProps: {
            onMouseDown: handleResizeStart
        },
        setWidth
    };
}
