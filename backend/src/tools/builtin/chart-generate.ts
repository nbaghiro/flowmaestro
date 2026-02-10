/**
 * Chart Generation Tool
 *
 * Generates chart images (PNG/SVG) from data using Chart.js with node-canvas
 */

import { writeFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import { z } from "zod";
import { createServiceLogger } from "../../core/logging";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";
import type { ChartConfiguration, ChartType as ChartJsType, ChartItem } from "chart.js";

const logger = createServiceLogger("ChartGenerateTool");

/**
 * Dataset schema
 */
const datasetSchema = z.object({
    label: z.string().describe("Dataset name/label"),
    data: z.array(z.number()).describe("Data points"),
    color: z.string().optional().describe("Line/bar color (hex or name)"),
    backgroundColor: z.string().optional().describe("Fill color for area/bar charts")
});

/**
 * Chart options schema
 */
const chartOptionsSchema = z.object({
    title: z.string().optional().describe("Chart title"),
    subtitle: z.string().optional().describe("Chart subtitle"),
    xAxisLabel: z.string().optional().describe("X-axis label"),
    yAxisLabel: z.string().optional().describe("Y-axis label"),
    width: z.number().int().min(200).max(2000).default(800).describe("Chart width in pixels"),
    height: z.number().int().min(200).max(2000).default(600).describe("Chart height in pixels"),
    legend: z
        .union([z.boolean(), z.enum(["top", "bottom", "left", "right"])])
        .optional()
        .describe("Legend position or false to hide"),
    theme: z.enum(["light", "dark"]).default("light").describe("Color theme"),
    format: z.enum(["png", "svg"]).default("png").describe("Output format"),
    showGrid: z.boolean().default(true).describe("Show grid lines"),
    showValues: z.boolean().default(false).describe("Show values on data points")
});

/**
 * Input schema for chart generation
 */
export const chartGenerateInputSchema = z.object({
    type: z
        .enum([
            "bar",
            "line",
            "pie",
            "scatter",
            "area",
            "donut",
            "histogram",
            "heatmap",
            "horizontal_bar"
        ])
        .describe("Chart type"),
    data: z.object({
        labels: z.array(z.string()).optional().describe("X-axis labels or pie slice labels"),
        datasets: z.array(datasetSchema).describe("Data series to plot")
    }),
    options: chartOptionsSchema.optional().describe("Chart options"),
    filename: z
        .string()
        .min(1)
        .max(255)
        .default("chart")
        .describe("Output filename without extension")
});

export type ChartGenerateInput = z.infer<typeof chartGenerateInputSchema>;

/**
 * Chart generation result
 */
export interface ChartGenerateOutput {
    path: string;
    filename: string;
    format: string;
    width: number;
    height: number;
    size: number;
    chartType: string;
}

// Default color palette
const DEFAULT_COLORS = [
    "#3B82F6", // blue
    "#EF4444", // red
    "#10B981", // green
    "#F59E0B", // amber
    "#8B5CF6", // violet
    "#EC4899", // pink
    "#06B6D4", // cyan
    "#84CC16", // lime
    "#F97316", // orange
    "#6366F1" // indigo
];

/**
 * Convert hex color to rgba with alpha
 */
function hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Build Chart.js configuration from input
 */
function buildChartConfig(input: ChartGenerateInput): {
    type: string;
    data: Record<string, unknown>;
    options: Record<string, unknown>;
} {
    const chartType = input.type;
    const theme = input.options?.theme ?? "light";
    const showGrid = input.options?.showGrid ?? true;
    const showValues = input.options?.showValues ?? false;

    // Map our chart types to Chart.js types
    let chartJsType: string;
    switch (chartType) {
        case "bar":
        case "horizontal_bar":
            chartJsType = "bar";
            break;
        case "line":
        case "area":
            chartJsType = "line";
            break;
        case "pie":
        case "donut":
            chartJsType = "pie";
            break;
        case "scatter":
            chartJsType = "scatter";
            break;
        case "histogram":
            chartJsType = "bar";
            break;
        case "heatmap":
            chartJsType = "bar"; // Use stacked bar as approximation
            break;
        default:
            chartJsType = "bar";
    }

    // Build datasets
    const datasets = input.data.datasets.map((ds, index) => {
        const color = ds.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
        const bgColor = ds.backgroundColor || hexToRgba(color, chartType === "area" ? 0.3 : 0.8);

        const dataset: Record<string, unknown> = {
            label: ds.label,
            data: ds.data,
            borderColor: color,
            backgroundColor: bgColor,
            borderWidth: 2
        };

        // Area chart settings
        if (chartType === "area") {
            dataset.fill = true;
            dataset.tension = 0.4;
        }

        // Line chart settings
        if (chartType === "line") {
            dataset.fill = false;
            dataset.tension = 0;
            dataset.pointRadius = 4;
            dataset.pointHoverRadius = 6;
        }

        // Scatter chart settings
        if (chartType === "scatter") {
            dataset.pointRadius = 6;
            dataset.pointHoverRadius = 8;
        }

        return dataset;
    });

    // Build options
    const textColor = theme === "dark" ? "#E5E7EB" : "#374151";
    const gridColor = theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";

    const options: Record<string, unknown> = {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: !!input.options?.title,
                text: input.options?.title || "",
                color: textColor,
                font: { size: 16, weight: "bold" }
            },
            subtitle: {
                display: !!input.options?.subtitle,
                text: input.options?.subtitle || "",
                color: textColor,
                font: { size: 12, style: "italic" }
            },
            legend: {
                display: input.options?.legend !== false,
                position: typeof input.options?.legend === "string" ? input.options.legend : "top",
                labels: { color: textColor }
            },
            datalabels:
                showValues && chartType !== "pie" && chartType !== "donut"
                    ? {
                          color: textColor,
                          anchor: "end",
                          align: "top",
                          font: { size: 10 }
                      }
                    : false
        }
    };

    // Scales for non-pie charts
    if (chartType !== "pie" && chartType !== "donut") {
        const scales: Record<string, unknown> = {
            x: {
                display: true,
                title: {
                    display: !!input.options?.xAxisLabel,
                    text: input.options?.xAxisLabel || "",
                    color: textColor
                },
                ticks: { color: textColor },
                grid: { display: showGrid, color: gridColor }
            },
            y: {
                display: true,
                title: {
                    display: !!input.options?.yAxisLabel,
                    text: input.options?.yAxisLabel || "",
                    color: textColor
                },
                ticks: { color: textColor },
                grid: { display: showGrid, color: gridColor }
            }
        };

        // Horizontal bar
        if (chartType === "horizontal_bar") {
            (options as Record<string, unknown>).indexAxis = "y";
        }

        (options as Record<string, unknown>).scales = scales;
    }

    // Donut configuration
    if (chartType === "donut") {
        (options as Record<string, unknown>).cutout = "50%";
    }

    return {
        type: chartJsType,
        data: {
            labels: input.data.labels || [],
            datasets
        },
        options
    };
}

/**
 * Render chart using Chart.js and node-canvas
 */
async function renderChart(
    input: ChartGenerateInput,
    outputDir: string
): Promise<{ buffer: Buffer; path: string; filename: string }> {
    // Dynamic imports for optional dependencies
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const canvasModule = await import("canvas");
    const createCanvas = canvasModule.createCanvas;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const chartModule = await import("chart.js");
    const Chart = chartModule.Chart;
    const registerables = chartModule.registerables;

    // Register all Chart.js components
    Chart.register(...registerables);

    const width = input.options?.width ?? 800;
    const height = input.options?.height ?? 600;
    const format = input.options?.format ?? "png";
    const filename = `${input.filename}.${format}`;
    const outputPath = join(outputDir, filename);

    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Set background
    const theme = input.options?.theme ?? "light";
    ctx.fillStyle = theme === "dark" ? "#1F2937" : "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // Build chart config
    const config = buildChartConfig(input);

    // Create chart - node-canvas CanvasRenderingContext2D is structurally compatible
    // with DOM CanvasRenderingContext2D but nominally different, so we cast via unknown.
    // The config object structure matches ChartConfiguration but uses looser types.
    new Chart(
        ctx as unknown as ChartItem,
        {
            type: config.type as ChartJsType,
            data: config.data,
            options: config.options
        } as unknown as ChartConfiguration
    );

    // Get buffer
    let buffer: Buffer;
    if (format === "svg") {
        // For SVG, we need to use a different approach
        // Chart.js doesn't natively support SVG, so we'll use PNG
        logger.warn("SVG format requested but Chart.js uses canvas. Generating PNG instead.");
        buffer = canvas.toBuffer("image/png");
    } else {
        buffer = canvas.toBuffer("image/png");
    }

    return { buffer, path: outputPath, filename };
}

/**
 * Execute chart generation
 */
async function executeChartGenerate(
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
        const input = chartGenerateInputSchema.parse(params);

        logger.info(
            {
                chartType: input.type,
                datasetCount: input.data.datasets.length,
                traceId: context.traceId
            },
            "Generating chart"
        );

        // Determine output directory
        const outputDir = context.traceId ? `/tmp/fm-workspace/${context.traceId}` : "/tmp";

        // Ensure output directory exists
        try {
            await mkdir(outputDir, { recursive: true });
        } catch {
            // Directory may already exist
        }

        // Render the chart
        const { buffer, path, filename } = await renderChart(input, outputDir);

        // Write to file
        await writeFile(path, buffer);

        // Get file stats
        const stats = await stat(path);
        const format = input.options?.format ?? "png";

        const output: ChartGenerateOutput = {
            path,
            filename,
            format: format === "svg" ? "png" : format, // Chart.js outputs PNG
            width: input.options?.width ?? 800,
            height: input.options?.height ?? 600,
            size: stats.size,
            chartType: input.type
        };

        logger.info(
            {
                path: output.path,
                size: output.size,
                chartType: output.chartType,
                traceId: context.traceId
            },
            "Chart generated successfully"
        );

        return {
            success: true,
            data: output,
            metadata: {
                durationMs: Date.now() - startTime,
                creditCost: 1
            }
        };
    } catch (error) {
        logger.error({ err: error, traceId: context.traceId }, "Chart generation failed");

        // Check for missing canvas dependency
        if (error instanceof Error && error.message.includes("canvas")) {
            return {
                success: false,
                error: {
                    message:
                        "Chart generation requires the 'canvas' package. Install with: npm install canvas",
                    code: "MISSING_DEPENDENCY",
                    retryable: false
                },
                metadata: { durationMs: Date.now() - startTime }
            };
        }

        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Chart generation failed",
                retryable: false
            },
            metadata: { durationMs: Date.now() - startTime }
        };
    }
}

/**
 * Chart Generate Tool Definition
 */
export const chartGenerateTool: BuiltInTool = {
    name: "chart_generate",
    displayName: "Generate Chart",
    description:
        "Generate chart images (PNG) from data. Supports bar, line, pie, scatter, area, donut, histogram, and heatmap charts with customizable styling.",
    category: "data",
    riskLevel: "low",
    inputSchema: {
        type: "object",
        properties: {
            type: {
                type: "string",
                enum: [
                    "bar",
                    "line",
                    "pie",
                    "scatter",
                    "area",
                    "donut",
                    "histogram",
                    "heatmap",
                    "horizontal_bar"
                ],
                description: "Chart type"
            },
            data: {
                type: "object",
                properties: {
                    labels: {
                        type: "array",
                        items: { type: "string" },
                        description: "X-axis labels or pie slice labels"
                    },
                    datasets: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                label: { type: "string" },
                                data: { type: "array", items: { type: "number" } },
                                color: { type: "string" },
                                backgroundColor: { type: "string" }
                            },
                            required: ["label", "data"]
                        },
                        description: "Data series to plot"
                    }
                },
                required: ["datasets"]
            },
            options: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    subtitle: { type: "string" },
                    xAxisLabel: { type: "string" },
                    yAxisLabel: { type: "string" },
                    width: { type: "number", default: 800 },
                    height: { type: "number", default: 600 },
                    legend: { type: ["boolean", "string"] },
                    theme: { type: "string", enum: ["light", "dark"], default: "light" },
                    format: { type: "string", enum: ["png", "svg"], default: "png" },
                    showGrid: { type: "boolean", default: true },
                    showValues: { type: "boolean", default: false }
                }
            },
            filename: {
                type: "string",
                description: "Output filename without extension",
                default: "chart"
            }
        },
        required: ["type", "data"]
    },
    zodSchema: chartGenerateInputSchema,
    enabledByDefault: true,
    creditCost: 1,
    tags: ["chart", "visualization", "graph", "data", "plot"],
    execute: executeChartGenerate
};
