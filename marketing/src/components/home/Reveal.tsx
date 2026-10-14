import { useInView } from "framer-motion";
import React, { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";

/** Animates every `[data-count]` number inside `root` from 0 to its value. */
function countUp(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const end = Number(el.getAttribute("data-count")) || 0;
        const start = performance.now();
        const step = (now: number): void => {
            const p = Math.min(1, (now - start) / 1400);
            el.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    });
}

interface RevealProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    id?: string;
}

/** Fades and lifts its children in the first time they scroll into view. */
export const Reveal: React.FC<RevealProps> = ({ children, className, style, id }) => {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });

    useEffect(() => {
        if (inView && ref.current) countUp(ref.current);
    }, [inView]);

    return (
        <div ref={ref} id={id} className={cn("reveal", inView && "in", className)} style={style}>
            {children}
        </div>
    );
};
