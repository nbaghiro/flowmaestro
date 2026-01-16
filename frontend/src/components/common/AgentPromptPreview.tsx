import { Bot } from "lucide-react";
import { useMemo } from "react";
import { cn } from "../../lib/utils";

interface WaveLayer {
    frequency: number; // Number of wave cycles
    amplitude: number; // Height of waves (0-1)
    phase: number; // Starting phase offset (0-2π)
    yOffset: number; // Vertical position (0-1, where 0.5 is center)
    opacity: number; // Layer opacity (0-1)
}

interface AgentPromptPreviewProps {
    systemPrompt?: string;
    temperature?: number;
    height?: string;
    className?: string;
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

/**
 * Generate wave layer parameters from the system prompt.
 * Each layer gets unique characteristics based on different hash seeds.
 */
function generateWaveLayers(prompt: string): WaveLayer[] {
    if (!prompt || prompt.length === 0) return [];

    const layers: WaveLayer[] = [];
    const layerCount = 3; // Reduced from 4 for cleaner look

    for (let i = 0; i < layerCount; i++) {
        const seed = i * 1000;

        // Generate unique values for each layer using different seeds
        const frequency = 1 + hashString(prompt, seed + 1) * 2; // 1 to 3 cycles (fewer waves)
        const amplitude = 0.08 + hashString(prompt, seed + 2) * 0.12; // 0.08 to 0.2 (thinner waves)
        const phase = hashString(prompt, seed + 3) * Math.PI * 2; // 0 to 2π
        const yOffset = 0.55 + hashString(prompt, seed + 4) * 0.25; // 0.55 to 0.8 (pushed lower)
        const opacity = 0.08 + (layerCount - i) * 0.12; // Reduced opacity (0.08 to 0.32)

        layers.push({ frequency, amplitude, phase, yOffset, opacity });
    }

    return layers;
}

/**
 * Generate SVG path for a wave layer.
 * Creates a filled area from the wave line down to the bottom.
 */
function generateWavePath(layer: WaveLayer, width: number, height: number): string {
    const { frequency, amplitude, phase, yOffset } = layer;
    const points: Array<{ x: number; y: number }> = [];
    const segments = 100;

    // Generate wave points
    for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * width;
        const waveX = (i / segments) * Math.PI * 2 * frequency + phase;
        const y = yOffset * height + Math.sin(waveX) * amplitude * height;
        points.push({ x, y });
    }

    // Create path: start at bottom-left, go up to wave, follow wave, down to bottom-right
    let path = `M 0 ${height} L ${points[0].x} ${points[0].y}`;

    // Follow wave line
    for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
    }

    // Close the path at the bottom
    path += ` L ${width} ${height} Z`;

    return path;
}

/**
 * Calculate hue shift based on temperature.
 * Temperature 0.0-0.5: Cool tones (negative shift toward blue)
 * Temperature 0.6-1.0: Neutral (no shift)
 * Temperature 1.1-2.0: Warm tones (positive shift toward orange/red)
 */
function getHueShift(temperature: number = 0.7): number {
    if (temperature <= 0.5) {
        return -15 * (1 - temperature * 2);
    } else if (temperature <= 1.0) {
        return 0;
    } else {
        return Math.min(20, (temperature - 1.0) * 20);
    }
}

export function AgentPromptPreview({
    systemPrompt,
    temperature = 0.7,
    height = "h-32",
    className
}: AgentPromptPreviewProps) {
    const waveLayers = useMemo(() => {
        return generateWaveLayers(systemPrompt || "");
    }, [systemPrompt]);

    const hueShift = useMemo(() => getHueShift(temperature), [temperature]);

    // Show fallback if no system prompt
    if (!systemPrompt || waveLayers.length === 0) {
        return (
            <div
                className={cn(
                    height,
                    "bg-muted dark:bg-muted relative overflow-hidden shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]",
                    className
                )}
            >
                {/* Dotted background pattern */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle, currentColor 1px, transparent 1px)",
                        backgroundSize: "16px 16px",
                        opacity: 0.1
                    }}
                />
                {/* Centered Bot icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <Bot className="w-10 h-10 text-muted-foreground opacity-50" />
                </div>
            </div>
        );
    }

    // SVG viewBox dimensions
    const viewWidth = 200;
    const viewHeight = 100;

    return (
        <div
            className={cn(
                height,
                "bg-muted dark:bg-muted relative overflow-hidden shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]",
                className
            )}
        >
            {/* Dotted background pattern */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                    opacity: 0.06
                }}
            />
            {/* Layered waves visualization */}
            <svg
                viewBox={`0 0 ${viewWidth} ${viewHeight}`}
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full"
                style={{ filter: hueShift !== 0 ? `hue-rotate(${hueShift}deg)` : undefined }}
            >
                {waveLayers.map((layer, i) => (
                    <path
                        key={i}
                        d={generateWavePath(layer, viewWidth, viewHeight)}
                        className="fill-foreground/20 dark:fill-foreground/30"
                        style={{ opacity: layer.opacity }}
                    />
                ))}
            </svg>
        </div>
    );
}
