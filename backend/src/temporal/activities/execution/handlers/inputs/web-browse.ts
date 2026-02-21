/**
 * Web Browse Node Handler
 *
 * Fetches and reads web page content using the web_browse builtin tool.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { webBrowseTool } from "../../../../../services/tools/builtin/web-browse";
import { createActivityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import {
    WebBrowseNodeConfigSchema,
    validateOrThrow,
    type WebBrowseNodeConfig
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";
import type { ToolExecutionContext } from "../../../../../services/tools/types";

const logger = createActivityLogger({ nodeType: "WebBrowse" });

// ============================================================================
// TYPES
// ============================================================================

export type { WebBrowseNodeConfig };

/**
 * Result from web browse.
 */
export interface WebBrowseNodeResult {
    url: string;
    content: string;
    contentType: string;
    contentLength: number;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for WebBrowse node type.
 * Fetches and reads web page content.
 */
export class WebBrowseNodeHandler extends BaseNodeHandler {
    readonly name = "WebBrowseNodeHandler";
    readonly supportedNodeTypes = ["webBrowse"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(WebBrowseNodeConfigSchema, input.nodeConfig, "WebBrowse");
        const context = getExecutionContext(input.context);

        logger.info("Fetching web page", {
            extractText: config.extractText,
            maxLength: config.maxLength
        });

        // Interpolate variables in URL
        const url = interpolateVariables(config.url, context);

        if (!url || typeof url !== "string") {
            throw new Error("URL is required");
        }

        // Build tool input
        const toolInput = {
            url,
            extractText: config.extractText,
            maxLength: config.maxLength
        };

        // Create tool execution context
        const toolContext: ToolExecutionContext = {
            userId: input.metadata.userId || "system",
            workspaceId: "default",
            mode: "workflow",
            traceId: input.metadata.executionId
        };

        // Execute the builtin tool
        const toolResult = await webBrowseTool.execute(toolInput, toolContext);

        if (!toolResult.success) {
            throw new Error(toolResult.error?.message || "Web browse failed");
        }

        const result = toolResult.data as WebBrowseNodeResult;

        logger.info("Web page fetched", {
            url: result.url,
            contentLength: result.contentLength,
            contentType: result.contentType
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
 * Factory function for creating WebBrowse handler.
 */
export function createWebBrowseNodeHandler(): WebBrowseNodeHandler {
    return new WebBrowseNodeHandler();
}
