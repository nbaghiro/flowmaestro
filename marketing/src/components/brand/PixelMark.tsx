import React from "react";
import { cn } from "../../lib/utils";

/**
 * The FlowMaestro mark: a 24 by 24 pixel conductor in three tones (face, shirt, hands and
 * baton in white; hair and tailcoat in light grey; eyes, bow tie and trousers in dark grey).
 * Three frames beat time with the baton; with `live` they cycle, otherwise the first shows.
 */
const PALETTE: Record<string, string> = {
    W: "#fafafa",
    G: "#a7a7b0",
    D: "#55555e"
};

const BODY = [
    "..GGGGGWWGGGG...........",
    ".G.GGGGWWGGGG...........",
    "G..GGGGWWGGGG...........",
    "W..GGGGWWGGGG...........",
    "...GGGGWWGGGG...........",
    "...GGGGGGGGGG...........",
    "....GGGGGGGG............",
    "...GGGDDDDGGG...........",
    "...GG.DD.DD.GG..........",
    "..GG..DD.DD..GG.........",
    "......DD.DD.............",
    "....GGGG.GGGG..........."
];

const HEAD = [
    "....GGGGGG..............",
    "...GGGGGGGG.............",
    "...GGGGGGGGG............",
    "...GGWWWWWGG............",
    "...GWWDWWDWG............",
    "....WWWWWWW.............",
    "....WWWWWWW.............",
    ".....WWWWW..............",
    ".......WW..............."
];

/** Overlays a sparse frame (baton arm) onto the base rows. */
function overlay(base: string[], arm: Record<number, string>): string[] {
    return base.map((row, y) => {
        const extra = arm[y];
        if (!extra) return row;
        return row
            .split("")
            .map((ch, x) => (extra[x] && extra[x] !== "." ? extra[x] : ch))
            .join("");
    });
}

const BASE = [
    "........................",
    "........................",
    ...HEAD,
    "..GGGDDWDDGGGG..........",
    ...BODY
];

const FRAMES: string[][] = [
    // baton up
    overlay(BASE, {
        0: ".......................W",
        1: "......................W.",
        2: ".....................W..",
        3: "....................W...",
        4: "...................W....",
        5: "..................W.....",
        6: ".................G......",
        7: "................G.......",
        8: "...............G........",
        9: "..............G.........",
        10: ".............G.........."
    }),
    // baton level
    overlay(BASE, {
        6: ".......................W",
        7: "......................W.",
        8: ".....................W..",
        9: "....................W...",
        10: "...................W....",
        11: "..............GGGGW....."
    }),
    // baton down
    overlay(BASE, {
        12: "..............G.........",
        13: "...............G........",
        14: "................G.......",
        15: ".................G......",
        16: "..................W.....",
        17: "...................W....",
        18: "....................W...",
        19: ".....................W..",
        20: "......................W.",
        21: ".......................W"
    })
];

export type MarkTone = "light" | "ink";

const INK: Record<string, string> = {
    W: "#0b0b0d",
    G: "#55555e",
    D: "#a7a7b0"
};

export const PIXEL_FRAMES = FRAMES;
export const PIXEL_GRID = 24;

export interface PixelCell {
    x: number;
    y: number;
    fill: string;
}

export function pixelCells(frame: string[], tone: MarkTone = "light"): PixelCell[] {
    const palette = tone === "ink" ? INK : PALETTE;
    const cells: PixelCell[] = [];
    frame.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            const fill = palette[row[x]];
            if (fill) cells.push({ x, y, fill });
        }
    });
    return cells;
}

interface PixelMarkProps {
    size?: number;
    live?: boolean;
    /** "ink" draws the mark for light surfaces. */
    tone?: MarkTone;
    className?: string;
}

export const PixelMark: React.FC<PixelMarkProps> = ({
    size = 24,
    live = false,
    tone = "light",
    className
}) => (
    <svg
        width={size}
        height={size}
        viewBox={`0 0 ${PIXEL_GRID} ${PIXEL_GRID}`}
        shapeRendering="crispEdges"
        className={cn("pm", live && "live", className)}
        aria-hidden="true"
    >
        {FRAMES.map((frame, index) => (
            <g key={index} className={`f f${index + 1}`}>
                {pixelCells(frame, tone).map((cell) => (
                    <rect
                        key={`${cell.x}-${cell.y}`}
                        x={cell.x}
                        y={cell.y}
                        width="1"
                        height="1"
                        fill={cell.fill}
                    />
                ))}
            </g>
        ))}
    </svg>
);
