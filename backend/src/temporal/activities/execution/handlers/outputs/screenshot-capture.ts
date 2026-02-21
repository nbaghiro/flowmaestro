/**
 * Screenshot Capture Node Handler
 *
 * Captures screenshots of web pages using the screenshot_capture builtin tool.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { screenshotCaptureTool } from "../../../../../services/tools/builtin/screenshot-capture";
import { createActivityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import {
    ScreenshotCaptureNodeConfigSchema,
    validateOrThrow,
    type ScreenshotCaptureNodeConfig
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";
import type { ToolExecutionContext } from "../../../../../services/tools/types";

const logger = createActivityLogger({ nodeType: "ScreenshotCapture" });

// ============================================================================
// TYPES
// ============================================================================

export type { ScreenshotCaptureNodeConfig };

/**
 * Result from screenshot capture.
 */
export interface ScreenshotCaptureNodeResult {
    path: string;
    filename: string;
    format: string;
    width: number;
    height: number;
    size: number;
    url: string;
    capturedAt: string;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for ScreenshotCapture node type.
 * Captures screenshots of web pages.
 */
export class ScreenshotCaptureNodeHandler extends BaseNodeHandler {
    readonly name = "ScreenshotCaptureNodeHandler";
    readonly supportedNodeTypes = ["screenshotCapture"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(
            ScreenshotCaptureNodeConfigSchema,
            input.nodeConfig,
            "ScreenshotCapture"
        );
        const context = getExecutionContext(input.context);

        logger.info("Capturing screenshot", {
            width: config.width,
            height: config.height,
            format: config.format,
            fullPage: config.fullPage
        });

        // Interpolate variables in URL
        const url = interpolateVariables(config.url, context);

        if (!url || typeof url !== "string") {
            throw new Error("URL is required");
        }

        // Build tool input
        const toolInput = {
            url,
            fullPage: config.fullPage,
            width: config.width,
            height: config.height,
            deviceScale: config.deviceScale,
            format: config.format,
            quality: config.quality,
            delay: config.delay,
            selector: config.selector,
            darkMode: config.darkMode,
            timeout: config.timeout,
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
        const toolResult = await screenshotCaptureTool.execute(toolInput, toolContext);

        if (!toolResult.success) {
            throw new Error(toolResult.error?.message || "Screenshot capture failed");
        }

        const result = toolResult.data as ScreenshotCaptureNodeResult;

        logger.info("Screenshot captured successfully", {
            path: result.path,
            size: result.size,
            dimensions: `${result.width}x${result.height}`
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
 * Factory function for creating ScreenshotCapture handler.
 */
export function createScreenshotCaptureNodeHandler(): ScreenshotCaptureNodeHandler {
    return new ScreenshotCaptureNodeHandler();
}
