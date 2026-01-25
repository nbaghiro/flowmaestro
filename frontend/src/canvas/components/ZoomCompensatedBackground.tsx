import { useState, useEffect } from "react";
import { useViewport, Background, BackgroundVariant } from "reactflow";
import { useThemeStore } from "../../stores/themeStore";

interface ZoomCompensatedBackgroundProps {
    baseSize?: number;
    baseGap?: number;
    minSize?: number;
    maxSize?: number;
}

/**
 * A zoom-compensated background that keeps dots visible at any zoom level.
 *
 * When zoomed out (e.g., 10%), the dots are scaled up inversely to remain visible.
 * When zoomed in, the dots are clamped to prevent them from becoming too large.
 *
 * The dot color is automatically read from the CSS variable --canvas-dots
 * (defined in App.css) and updates when the theme changes.
 *
 * Must be used inside a ReactFlowProvider (i.e., as a child of <Flow> or <ReactFlow>).
 */
export function ZoomCompensatedBackground({
    baseSize = 1,
    baseGap = 12,
    minSize = 0.5,
    maxSize = 15
}: ZoomCompensatedBackgroundProps) {
    const { zoom } = useViewport();
    const effectiveTheme = useThemeStore((state) => state.effectiveTheme);
    const [dotColor, setDotColor] = useState("#71717a"); // fallback

    // Read dot color from CSS variable, updating when theme changes
    useEffect(() => {
        const color = getComputedStyle(document.documentElement)
            .getPropertyValue("--canvas-dots")
            .trim();
        if (color) {
            setDotColor(color);
        }
    }, [effectiveTheme]);

    // Compensate inversely with zoom, clamped to bounds
    // At zoom=1: size=baseSize (1px dots)
    // At zoom=0.1: size=baseSize/0.1=10 (10px dots in flow coords = 1px on screen)
    // At zoom=0.05: size=baseSize/0.05=20 (clamped to 15 = 0.75px on screen)
    const compensatedSize = Math.max(minSize, Math.min(baseSize / zoom, maxSize));
    const compensatedGap = baseGap / zoom;

    return (
        <Background
            variant={BackgroundVariant.Dots}
            size={compensatedSize}
            gap={compensatedGap}
            color={dotColor}
        />
    );
}
