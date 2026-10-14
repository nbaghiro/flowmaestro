import React, { useCallback } from "react";
import { cn } from "../../lib/utils";

/** Tracks the pointer so the tile's hover glow follows it. */
export function useTileGlow(): React.MouseEventHandler<HTMLElement> {
    return useCallback((event: React.MouseEvent<HTMLElement>) => {
        const el = event.currentTarget;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        el.style.setProperty("--my", `${event.clientY - rect.top}px`);
    }, []);
}

interface TileProps {
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
}

/** A bento tile with the gradient border and the pointer-following glow. */
export const Tile: React.FC<TileProps> = ({ className, style, children }) => {
    const onMouseMove = useTileGlow();
    return (
        <article className={cn("tile", className)} style={style} onMouseMove={onMouseMove}>
            {children}
        </article>
    );
};
