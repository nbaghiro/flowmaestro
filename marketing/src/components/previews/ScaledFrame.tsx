import React, { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

interface ScaledFrameProps {
    /** What a screen reader hears instead of the mock UI inside. */
    label: string;
    className?: string;
    children: React.ReactNode;
}

const FRAME_WIDTH = 1440;

/**
 * Shows a 1440 by 810 product preview inside a 16:9 frame, scaled to the frame's width.
 * The preview is decorative markup, so it is hidden from assistive technology and cannot
 * receive pointer events.
 */
export const ScaledFrame: React.FC<ScaledFrameProps> = ({ label, className, children }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.68);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const update = (): void => {
            if (el.clientWidth) setScale(el.clientWidth / FRAME_WIDTH);
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} role="img" aria-label={label} className={cn("media", className)}>
            <div
                className="embed pointer-events-none select-none"
                aria-hidden="true"
                style={{ transform: `scale(${scale})` }}
            >
                {children}
            </div>
        </div>
    );
};
