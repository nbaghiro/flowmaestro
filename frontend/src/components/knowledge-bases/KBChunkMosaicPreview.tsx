import { Database } from "lucide-react";
import { useMemo } from "react";
import { cn } from "../../lib/utils";

interface KBChunkMosaicPreviewProps {
    categoryId: string; // Used for procedural generation
    color: string; // Category accent color (e.g., "blue", "emerald")
    height?: string; // Tailwind height class
    className?: string;
    animated?: boolean; // Enable subtle pulse animation
}

/**
 * Simple hash function to generate consistent pseudo-random values from a string.
 * Returns a number between 0 and 1.
 */
function hashString(str: string, seed: number = 0): number {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash + char) | 0;
        hash = Math.imul(hash, 2654435761);
    }
    // Convert to 0-1 range
    return (Math.abs(hash) % 10000) / 10000;
}

interface Tile {
    x: number;
    y: number;
    width: number;
    height: number;
    opacity: number;
    animationDelay?: number;
    shouldAnimate: boolean;
}

/**
 * Generate tile grid from category ID.
 * Creates a procedural mosaic pattern unique to each category.
 */
function generateTiles(categoryId: string, cols: number, rows: number): Tile[] {
    if (!categoryId) return [];

    const tiles: Tile[] = [];
    const tileWidth = 8;
    const tileHeight = 6;
    const gap = 2;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const index = row * cols + col;
            const seed = index * 100;

            // Use hash to determine tile visibility and opacity
            const visibilityHash = hashString(categoryId, seed + 1);
            const opacityHash = hashString(categoryId, seed + 2);
            const animationHash = hashString(categoryId, seed + 3);

            // ~70% of tiles are visible with varying opacity
            if (visibilityHash > 0.3) {
                const x = col * (tileWidth + gap);
                const y = row * (tileHeight + gap);
                // Opacity between 0.1 and 0.6
                const opacity = 0.1 + opacityHash * 0.5;
                // Only ~5% of tiles animate
                const shouldAnimate = animationHash > 0.95;
                const animationDelay = shouldAnimate ? animationHash * 4 : undefined;

                tiles.push({
                    x,
                    y,
                    width: tileWidth,
                    height: tileHeight,
                    opacity,
                    shouldAnimate,
                    animationDelay
                });
            }
        }
    }

    return tiles;
}

/**
 * Get Tailwind color classes for the tile fill based on color name.
 */
function getColorClass(color: string): string {
    const colorMap: Record<string, string> = {
        blue: "fill-blue-500",
        emerald: "fill-emerald-500",
        violet: "fill-violet-500",
        amber: "fill-amber-500",
        cyan: "fill-cyan-500",
        rose: "fill-rose-500",
        orange: "fill-orange-500",
        purple: "fill-purple-500",
        gray: "fill-gray-400 dark:fill-gray-500"
    };
    return colorMap[color] || "fill-foreground/40";
}

export function KBChunkMosaicPreview({
    categoryId,
    color,
    height = "h-32",
    className,
    animated = true
}: KBChunkMosaicPreviewProps) {
    // 20 columns x 8 rows = 160 tiles
    const cols = 20;
    const rows = 8;

    const tiles = useMemo(() => {
        return generateTiles(categoryId, cols, rows);
    }, [categoryId, cols, rows]);

    const colorClass = getColorClass(color);

    // Calculate viewBox dimensions
    const tileWidth = 8;
    const tileHeight = 6;
    const gap = 2;
    const viewWidth = cols * (tileWidth + gap) - gap;
    const viewHeight = rows * (tileHeight + gap) - gap;

    // Show fallback for blank category
    if (!categoryId || categoryId === "blank") {
        return (
            <div
                className={cn(
                    height,
                    "bg-card dark:bg-card relative overflow-hidden shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] rounded-t-lg",
                    className
                )}
            >
                {/* Dotted background pattern */}
                <div
                    className="absolute inset-0 opacity-[0.15] dark:opacity-[0.10]"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle, currentColor 1px, transparent 1px)",
                        backgroundSize: "16px 16px"
                    }}
                />
                {/* Centered Database icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <Database className="w-10 h-10 text-muted-foreground opacity-50" />
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                height,
                "bg-card dark:bg-card relative overflow-hidden shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] rounded-t-lg",
                className
            )}
        >
            {/* Dotted background pattern */}
            <div
                className="absolute inset-0 opacity-[0.15] dark:opacity-[0.10]"
                style={{
                    backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                    backgroundSize: "16px 16px"
                }}
            />

            {/* Mosaic visualization */}
            <svg
                viewBox={`0 0 ${viewWidth} ${viewHeight}`}
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full"
            >
                {/* Define pulse animation */}
                {animated && (
                    <defs>
                        <style>{`
                            @keyframes tilePulse {
                                0%, 100% { opacity: var(--base-opacity); }
                                50% { opacity: calc(var(--base-opacity) + 0.3); }
                            }
                            .pulse-tile {
                                animation: tilePulse 2s ease-in-out infinite;
                            }
                        `}</style>
                    </defs>
                )}

                {tiles.map((tile, i) => (
                    <rect
                        key={i}
                        x={tile.x}
                        y={tile.y}
                        width={tile.width}
                        height={tile.height}
                        rx={1}
                        className={cn(colorClass, animated && tile.shouldAnimate && "pulse-tile")}
                        style={
                            {
                                opacity: tile.opacity,
                                "--base-opacity": tile.opacity,
                                animationDelay: tile.animationDelay
                                    ? `${tile.animationDelay}s`
                                    : undefined
                            } as React.CSSProperties
                        }
                    />
                ))}
            </svg>
        </div>
    );
}
