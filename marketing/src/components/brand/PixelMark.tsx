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

/**
 * The FM monogram: pixel F in white and M in grey over a dark baseline. Used where the mark
 * is small, in header bars and the favicon. A glint sweeps across the letters when live.
 */
const MONOGRAM_FRAMES: string[][] = [
    [
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "..GGWWWWWW.GG........GG.",
        "..GWWWWWWW.GGG......GGG.",
        "..WW.......GGGG....GGGG.",
        "..WW.......GG.GG..GG.GG.",
        "..WW.......GG..GGGG..GG.",
        "..WWWWWW...GG...GG...GG.",
        "..WWWWWW...GG...GG...GG.",
        "..WW.......GG........GG.",
        "..WW.......GG........GG.",
        "..WW.......GG........GG.",
        "..WW.......GG........GG.",
        "..WW.......GG........GG.",
        "........................",
        "..DDDDDDDDDDDDDDDDDDDDD.",
        "........................",
        "........................",
        "........................",
        "........................"
    ],
    [
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "..WWWWWWWW.WG........GG.",
        "..WWWWWWWG.GGG......GGG.",
        "..WW.......GGGG....GGGG.",
        "..WW.......GG.GG..GG.GG.",
        "..WW.......GG..GGGG..GG.",
        "..WWWGGW...GG...GG...GG.",
        "..WWGGWW...GG...GG...GG.",
        "..WG.......GG........GG.",
        "..GG.......GG........GG.",
        "..GW.......GG........GG.",
        "..WW.......GG........GG.",
        "..WW.......GG........GG.",
        "........................",
        "..DDDDDDDDDDDDDDDDDDDDD.",
        "........................",
        "........................",
        "........................",
        "........................"
    ],
    [
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "..WWWWWWWW.GG........GG.",
        "..WWWWWWWW.GGG......GGG.",
        "..WW.......GGGG....GGGG.",
        "..WW.......GG.GW..GG.GG.",
        "..WW.......GG..WGGG..GG.",
        "..WWWWWW...GG...GG...GG.",
        "..WWWWWW...GW...GG...GG.",
        "..WW.......WW........GG.",
        "..WW.......WG........GG.",
        "..WW.......GG........GG.",
        "..WW.......GG........GG.",
        "..WW.......GG........GG.",
        "........................",
        "..DDDDDDDDDDDDDDDDDDDDD.",
        "........................",
        "........................",
        "........................",
        "........................"
    ]
];

export const MONOGRAM = MONOGRAM_FRAMES;
export type MarkVariant = "conductor" | "monogram";
export type MarkTone = "light" | "ink";

const INK: Record<string, string> = {
    W: "#0b0b0d",
    G: "#55555e",
    D: "#a7a7b0"
};

function framesFor(variant: MarkVariant): string[][] {
    return variant === "monogram" ? MONOGRAM_FRAMES : FRAMES;
}

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
    /** "conductor" is the character for large placements; "monogram" is the FM for small ones. */
    variant?: MarkVariant;
    /** "ink" draws the mark for light surfaces. */
    tone?: MarkTone;
    className?: string;
}

export const PixelMark: React.FC<PixelMarkProps> = ({
    size = 24,
    live = false,
    variant = "conductor",
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
        {framesFor(variant).map((frame, index) => (
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
