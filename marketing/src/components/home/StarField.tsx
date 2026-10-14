import React, { useEffect, useRef } from "react";

interface Star {
    x: number;
    y: number;
    r: number;
    a: number;
    phase: number;
    speed: number;
    glint: boolean;
}

interface StarFieldProps {
    /** Stars per 7,000 square pixels; 1 is the hero default. */
    density?: number;
    /** Dim the stars behind the centre of the section so text stays readable. */
    fade?: boolean;
}

/**
 * A night sky on a canvas that fills its parent: small stars at random sizes and
 * brightness, each twinkling at its own pace, a few with a four-point glint.
 * Draws once and stops when reduced motion is set.
 */
export const StarField: React.FC<StarFieldProps> = ({ density = 1, fade = true }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const host = canvas?.parentElement;
        if (!canvas || !host) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let raf = 0;
        let stars: Star[] = [];

        const seed = (): void => {
            const count = Math.round(((width * height) / 7000) * density);
            stars = Array.from({ length: count }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                r: 0.4 + Math.random() * 1.1,
                a: 0.15 + Math.random() * 0.7,
                phase: Math.random() * 6.2832,
                speed: 0.4 + Math.random() * 1.2,
                glint: Math.random() < 0.06
            }));
        };

        const resize = (): void => {
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            width = host.clientWidth;
            height = host.clientHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            seed();
        };

        const draw = (t: number): void => {
            ctx.clearRect(0, 0, width, height);
            for (const s of stars) {
                const twinkle = 0.65 + 0.35 * Math.sin(t * 0.001 * s.speed + s.phase);
                let a = s.a * twinkle;
                if (fade) {
                    const dx = (s.x - width / 2) / (width * 0.5);
                    const dy = (s.y - height * 0.42) / (height * 0.5);
                    a *= Math.min(1, 0.25 + Math.sqrt(dx * dx + dy * dy));
                }
                ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, 6.2832);
                ctx.fill();
                if (s.glint && twinkle > 0.9) {
                    const g = s.r * 5;
                    ctx.strokeStyle = `rgba(255,255,255,${(a * 0.5).toFixed(3)})`;
                    ctx.lineWidth = 0.6;
                    ctx.beginPath();
                    ctx.moveTo(s.x - g, s.y);
                    ctx.lineTo(s.x + g, s.y);
                    ctx.moveTo(s.x, s.y - g);
                    ctx.lineTo(s.x, s.y + g);
                    ctx.stroke();
                }
            }
        };

        const frame = (t: number): void => {
            draw(t);
            raf = requestAnimationFrame(frame);
        };

        resize();
        window.addEventListener("resize", resize);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) draw(0);
        else raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
        };
    }, [density, fade]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
        />
    );
};
