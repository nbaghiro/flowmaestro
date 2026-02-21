/**
 * PDF Generation Node Handler
 *
 * Generates PDF documents from markdown or HTML content using the pdf_generate builtin tool.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { pdfGenerateTool } from "../../../../../services/tools/builtin/pdf-generate";
import { createActivityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import {
    PdfGenerationNodeConfigSchema,
    validateOrThrow,
    type PdfGenerationNodeConfig
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";
import type { ToolExecutionContext } from "../../../../../services/tools/types";

const logger = createActivityLogger({ nodeType: "PdfGeneration" });

// ============================================================================
// TYPES
// ============================================================================

export type { PdfGenerationNodeConfig };

/**
 * Result from PDF generation.
 */
export interface PdfGenerationNodeResult {
    path: string;
    filename: string;
    size: number;
    pageCount: number;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for PdfGeneration node type.
 * Generates PDF documents from markdown or HTML content.
 */
export class PdfGenerationNodeHandler extends BaseNodeHandler {
    readonly name = "PdfGenerationNodeHandler";
    readonly supportedNodeTypes = ["pdfGeneration"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(
            PdfGenerationNodeConfigSchema,
            input.nodeConfig,
            "PdfGeneration"
        );
        const context = getExecutionContext(input.context);

        logger.info("Generating PDF", {
            format: config.format,
            pageSize: config.pageSize,
            orientation: config.orientation
        });

        // Interpolate variables in content
        const content = interpolateVariables(config.content, context);

        if (!content || typeof content !== "string") {
            throw new Error("PDF content is required");
        }

        // Build tool input
        const toolInput = {
            content,
            format: config.format,
            filename: config.filename,
            pageSize: config.pageSize,
            orientation: config.orientation,
            margins: {
                top: config.marginTop,
                right: config.marginRight,
                bottom: config.marginBottom,
                left: config.marginLeft
            },
            headerText: config.headerText,
            footerText: config.footerText,
            includePageNumbers: config.includePageNumbers
        };

        // Create tool execution context
        const toolContext: ToolExecutionContext = {
            userId: input.metadata.userId || "system",
            workspaceId: "default",
            mode: "workflow",
            traceId: input.metadata.executionId
        };

        // Execute the builtin tool
        const toolResult = await pdfGenerateTool.execute(toolInput, toolContext);

        if (!toolResult.success) {
            throw new Error(toolResult.error?.message || "PDF generation failed");
        }

        const result = toolResult.data as PdfGenerationNodeResult;

        logger.info("PDF generated successfully", {
            path: result.path,
            size: result.size,
            pageCount: result.pageCount
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
 * Factory function for creating PdfGeneration handler.
 */
export function createPdfGenerationNodeHandler(): PdfGenerationNodeHandler {
    return new PdfGenerationNodeHandler();
}
