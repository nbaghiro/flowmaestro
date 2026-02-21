/**
 * Spreadsheet Generation Node Handler
 *
 * Generates Excel/CSV files from data using the spreadsheet_generate builtin tool.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { spreadsheetGenerateTool } from "../../../../../services/tools/builtin/spreadsheet-generate";
import { createActivityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import {
    SpreadsheetGenerationNodeConfigSchema,
    validateOrThrow,
    type SpreadsheetGenerationNodeConfig
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";
import type { ToolExecutionContext } from "../../../../../services/tools/types";

const logger = createActivityLogger({ nodeType: "SpreadsheetGeneration" });

// ============================================================================
// TYPES
// ============================================================================

export type { SpreadsheetGenerationNodeConfig };

/**
 * Result from spreadsheet generation.
 */
export interface SpreadsheetGenerationNodeResult {
    path: string;
    filename: string;
    format: string;
    size: number;
    sheetCount: number;
    rowCount: number;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for SpreadsheetGeneration node type.
 * Generates Excel/CSV files from structured data.
 */
export class SpreadsheetGenerationNodeHandler extends BaseNodeHandler {
    readonly name = "SpreadsheetGenerationNodeHandler";
    readonly supportedNodeTypes = ["spreadsheetGeneration"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(
            SpreadsheetGenerationNodeConfigSchema,
            input.nodeConfig,
            "SpreadsheetGeneration"
        );
        const context = getExecutionContext(input.context);

        logger.info("Generating spreadsheet", {
            format: config.format,
            filename: config.filename
        });

        // Interpolate variables in data source
        const dataSourceRaw = interpolateVariables(config.dataSource, context);

        // Parse data source - could be JSON string or already parsed
        let data: Array<Record<string, unknown>>;
        try {
            data = typeof dataSourceRaw === "string" ? JSON.parse(dataSourceRaw) : dataSourceRaw;
        } catch {
            throw new Error(`Failed to parse data source: ${dataSourceRaw}`);
        }

        if (!Array.isArray(data)) {
            throw new Error("Data source must be an array of objects");
        }

        // Build tool input
        const toolInput: Record<string, unknown> = {
            format: config.format,
            filename: config.filename,
            data
        };

        // Add xlsx-specific options
        if (config.format === "xlsx") {
            toolInput.sheets = [
                {
                    name: config.sheetName,
                    data
                }
            ];
            toolInput.styling = {
                headerStyle: {
                    bold: config.headerBold,
                    backgroundColor: config.headerBackgroundColor,
                    fontColor: config.headerFontColor
                },
                alternateRows: config.alternateRows,
                freezeHeader: config.freezeHeader
            };
        }

        // Create tool execution context
        const toolContext: ToolExecutionContext = {
            userId: input.metadata.userId || "system",
            workspaceId: "default",
            mode: "workflow",
            traceId: input.metadata.executionId
        };

        // Execute the builtin tool
        const toolResult = await spreadsheetGenerateTool.execute(toolInput, toolContext);

        if (!toolResult.success) {
            throw new Error(toolResult.error?.message || "Spreadsheet generation failed");
        }

        const result = toolResult.data as SpreadsheetGenerationNodeResult;

        logger.info("Spreadsheet generated successfully", {
            path: result.path,
            size: result.size,
            rowCount: result.rowCount
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
 * Factory function for creating SpreadsheetGeneration handler.
 */
export function createSpreadsheetGenerationNodeHandler(): SpreadsheetGenerationNodeHandler {
    return new SpreadsheetGenerationNodeHandler();
}
