/**
 * PDF Extract Node Handler
 *
 * Extracts text and metadata from PDF documents using the pdf_extract builtin tool.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { pdfExtractTool } from "../../../../../tools/builtin/pdf-extract";
import { createActivityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import {
    PdfExtractNodeConfigSchema,
    validateOrThrow,
    type PdfExtractNodeConfig
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";
import type { ToolExecutionContext } from "../../../../../tools/types";

const logger = createActivityLogger({ nodeType: "PdfExtract" });

// ============================================================================
// TYPES
// ============================================================================

export type { PdfExtractNodeConfig };

/**
 * Page content from PDF extraction.
 */
export interface ExtractedPage {
    pageNumber: number;
    text: string;
}

/**
 * PDF metadata.
 */
export interface PdfMetadata {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
    pageCount: number;
    isEncrypted: boolean;
}

/**
 * Result from PDF extraction.
 */
export interface PdfExtractNodeResult {
    text: string;
    pages: ExtractedPage[];
    metadata: PdfMetadata;
    wordCount: number;
    characterCount: number;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for PdfExtract node type.
 * Extracts text and metadata from PDF documents.
 */
export class PdfExtractNodeHandler extends BaseNodeHandler {
    readonly name = "PdfExtractNodeHandler";
    readonly supportedNodeTypes = ["pdfExtract"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(PdfExtractNodeConfigSchema, input.nodeConfig, "PdfExtract");
        const context = getExecutionContext(input.context);

        logger.info("Extracting PDF content", {
            extractText: config.extractText,
            extractMetadata: config.extractMetadata,
            outputFormat: config.outputFormat
        });

        // Interpolate variables in path
        const path = interpolateVariables(config.path, context);

        if (!path || typeof path !== "string") {
            throw new Error("PDF file path is required");
        }

        // Build pages config
        let pages: "all" | number[] | { start: number; end: number } = "all";
        if (config.pageStart !== undefined && config.pageEnd !== undefined) {
            pages = { start: config.pageStart, end: config.pageEnd };
        } else if (config.specificPages && config.specificPages.length > 0) {
            pages = config.specificPages;
        }

        // Build tool input
        const toolInput = {
            path,
            extractText: config.extractText,
            extractMetadata: config.extractMetadata,
            pages,
            outputFormat: config.outputFormat,
            password: config.password
        };

        // Create tool execution context
        const toolContext: ToolExecutionContext = {
            userId: input.metadata.userId || "system",
            workspaceId: "default",
            mode: "workflow",
            traceId: input.metadata.executionId
        };

        // Execute the builtin tool
        const toolResult = await pdfExtractTool.execute(toolInput, toolContext);

        if (!toolResult.success) {
            throw new Error(toolResult.error?.message || "PDF extraction failed");
        }

        const result = toolResult.data as PdfExtractNodeResult;

        logger.info("PDF extracted successfully", {
            pageCount: result.metadata.pageCount,
            wordCount: result.wordCount
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
 * Factory function for creating PdfExtract handler.
 */
export function createPdfExtractNodeHandler(): PdfExtractNodeHandler {
    return new PdfExtractNodeHandler();
}
