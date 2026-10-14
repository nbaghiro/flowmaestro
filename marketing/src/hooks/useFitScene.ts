import { useEffect, useRef, useState } from "react";

/**
 * Scales a fixed-size scene to the width of its stage, centred, up to `max`.
 * Returns the stage ref, the scale and the horizontal offset that centres the scene.
 */
export function useFitScene(
    sceneWidth: number,
    max: number
): [React.RefObject<HTMLDivElement>, number, number] {
    const ref = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState(0);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const update = (): void => {
            const width = el.clientWidth;
            if (!width) return;
            const next = Math.min(max, width / sceneWidth);
            setScale(next);
            setOffset(Math.max(0, (width - sceneWidth * next) / 2));
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, [sceneWidth, max]);
    return [ref, scale, offset];
}
