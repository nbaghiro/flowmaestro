/**
 * Chart Generation Node Handler
 *
 * Generates chart images from data using the chart_generate builtin tool.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { chartGenerateTool } from "../../../../../services/tools/builtin/chart-generate";
import { createActivityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import {
    ChartGenerationNodeConfigSchema,
    validateOrThrow,
    type ChartGenerationNodeConfig
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";
import type { ToolExecutionContext } from "../../../../../services/tools/types";

const logger = createActivityLogger({ nodeType: "ChartGeneration" });

// ============================================================================
// TYPES
// ============================================================================

export type { ChartGenerationNodeConfig };

/**
 * Result from chart generation.
 */
export interface ChartGenerationNodeResult {
    path: string;
    filename: string;
    format: string;
    width: number;
    height: number;
    size: number;
    chartType: string;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for ChartGeneration node type.
 * Generates chart images from structured data.
 */
export class ChartGenerationNodeHandler extends BaseNodeHandler {
    readonly name = "ChartGenerationNodeHandler";
    readonly supportedNodeTypes = ["chartGeneration"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(
            ChartGenerationNodeConfigSchema,
            input.nodeConfig,
            "ChartGeneration"
        );
        const context = getExecutionContext(input.context);

        logger.info("Generating chart", {
            chartType: config.chartType,
            theme: config.theme
        });

        // Interpolate variables in config
        const dataSourceRaw = interpolateVariables(config.dataSource, context);
        const dataLabelsRaw = config.dataLabels
            ? interpolateVariables(config.dataLabels, context)
            : undefined;

        // Parse data source - could be JSON string or already parsed
        let datasets: Array<{ label: string; data: number[]; color?: string }>;
        try {
            datasets =
                typeof dataSourceRaw === "string" ? JSON.parse(dataSourceRaw) : dataSourceRaw;
        } catch {
            throw new Error(`Failed to parse data source: ${dataSourceRaw}`);
        }

        // Parse labels
        let labels: string[] | undefined;
        if (dataLabelsRaw) {
            if (typeof dataLabelsRaw === "string") {
                // Could be JSON array or comma-separated
                try {
                    labels = JSON.parse(dataLabelsRaw);
                } catch {
                    labels = dataLabelsRaw.split(",").map((l) => l.trim());
                }
            } else if (Array.isArray(dataLabelsRaw)) {
                labels = dataLabelsRaw;
            }
        }

        // Build tool input
        const toolInput = {
            type: config.chartType,
            data: {
                labels,
                datasets
            },
            options: {
                title: config.title,
                subtitle: config.subtitle,
                xAxisLabel: config.xAxisLabel,
                yAxisLabel: config.yAxisLabel,
                width: config.width,
                height: config.height,
                theme: config.theme,
                legend: config.legend,
                showGrid: config.showGrid,
                showValues: config.showValues
            },
            filename: config.filename
        };

        // Create tool execution context
        const toolContext: ToolExecutionContext = {
            userId: input.metadata.userId || "system",
            workspaceId: "default",
            mode: "workflow",
            traceId: input.metadata.executionId
        };

        // Execute the builtin tool
        const toolResult = await chartGenerateTool.execute(toolInput, toolContext);

        if (!toolResult.success) {
            throw new Error(toolResult.error?.message || "Chart generation failed");
        }

        const result = toolResult.data as ChartGenerationNodeResult;

        logger.info("Chart generated successfully", {
            path: result.path,
            size: result.size,
            chartType: result.chartType
        });

        // Build output
        const outputData: JsonObject = {};
        if (config.outputVariable) {
            outputData[config.outputVariable] = result as unknown as JsonObject;
        }

        return this.success(outputData, {}, { durationMs: Date.now() - startTime });
    }
}

/**
 * Factory function for creating ChartGeneration handler.
 */
export function createChartGenerationNodeHandler(): ChartGenerationNodeHandler {
    return new ChartGenerationNodeHandler();
}
