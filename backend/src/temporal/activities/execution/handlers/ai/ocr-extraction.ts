/**
 * OCR Extraction Node Handler
 *
 * Extracts text from images using the ocr_extract builtin tool (Tesseract).
 */

import type { JsonObject } from "@flowmaestro/shared";
import { ocrExtractTool } from "../../../../../services/tools/builtin/ocr-extract";
import { createActivityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import {
    OCRExtractionNodeConfigSchema,
    validateOrThrow,
    type OCRExtractionNodeConfig
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";
import type { ToolExecutionContext } from "../../../../../services/tools/types";

const logger = createActivityLogger({ nodeType: "OCRExtraction" });

// ============================================================================
// TYPES
// ============================================================================

export type { OCRExtractionNodeConfig };

/**
 * Result from OCR extraction.
 */
export interface OCRExtractionNodeResult {
    text: string;
    confidence: number;
    lineCount: number;
    wordCount: number;
    characterCount: number;
    language: string;
    words?: Array<{
        text: string;
        confidence: number;
        bbox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        lineNum: number;
        wordNum: number;
    }>;
    outputPath?: string;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for OCRExtraction node type.
 * Extracts text from images using Tesseract OCR.
 */
export class OCRExtractionNodeHandler extends BaseNodeHandler {
    readonly name = "OCRExtractionNodeHandler";
    readonly supportedNodeTypes = ["ocrExtraction"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(
            OCRExtractionNodeConfigSchema,
            input.nodeConfig,
            "OCRExtraction"
        );
        const context = getExecutionContext(input.context);

        logger.info("Extracting text via OCR", {
            languages: config.languages,
            outputFormat: config.outputFormat
        });

        // Interpolate variables in image source
        const imagePath = interpolateVariables(config.imageSource, context);

        if (!imagePath || typeof imagePath !== "string") {
            throw new Error("Image source path is required");
        }

        // Build tool input
        const toolInput: Record<string, unknown> = {
            path: imagePath,
            language: config.languages,
            psm: config.psm,
            outputFormat: config.outputFormat,
            confidenceThreshold: config.confidenceThreshold
        };

        // Add preprocessing options if provided
        if (config.preprocessing) {
            toolInput.preprocessing = config.preprocessing;
        }

        // Create tool execution context
        const toolContext: ToolExecutionContext = {
            userId: input.metadata.userId || "system",
            workspaceId: "default",
            mode: "workflow",
            traceId: input.metadata.executionId
        };

        // Execute the builtin tool
        const toolResult = await ocrExtractTool.execute(toolInput, toolContext);

        if (!toolResult.success) {
            throw new Error(toolResult.error?.message || "OCR extraction failed");
        }

        const result = toolResult.data as OCRExtractionNodeResult;

        logger.info("OCR extraction completed", {
            wordCount: result.wordCount,
            confidence: result.confidence,
            language: result.language
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
 * Factory function for creating OCRExtraction handler.
 */
export function createOCRExtractionNodeHandler(): OCRExtractionNodeHandler {
    return new OCRExtractionNodeHandler();
}
