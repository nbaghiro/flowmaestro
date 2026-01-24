/**
 * Web Search Node Handler
 *
 * Performs web searches using the web_search builtin tool.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { webSearchTool } from "../../../../../tools/builtin/web-search";
import { createActivityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import {
    WebSearchNodeConfigSchema,
    validateOrThrow,
    type WebSearchNodeConfig
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";
import type { ToolExecutionContext } from "../../../../../tools/types";

const logger = createActivityLogger({ nodeType: "WebSearch" });

// ============================================================================
// TYPES
// ============================================================================

export type { WebSearchNodeConfig };

/**
 * Search result item.
 */
export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    publishedDate?: string;
}

/**
 * Result from web search.
 */
export interface WebSearchNodeResult {
    query: string;
    results: SearchResult[];
    message?: string;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for WebSearch node type.
 * Performs web searches using search APIs.
 */
export class WebSearchNodeHandler extends BaseNodeHandler {
    readonly name = "WebSearchNodeHandler";
    readonly supportedNodeTypes = ["webSearch"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(WebSearchNodeConfigSchema, input.nodeConfig, "WebSearch");
        const context = getExecutionContext(input.context);

        logger.info("Performing web search", {
            maxResults: config.maxResults,
            searchType: config.searchType
        });

        // Interpolate variables in query
        const query = interpolateVariables(config.query, context);

        if (!query || typeof query !== "string") {
            throw new Error("Search query is required");
        }

        // Build tool input
        const toolInput = {
            query,
            maxResults: config.maxResults,
            searchType: config.searchType
        };

        // Create tool execution context
        const toolContext: ToolExecutionContext = {
            userId: input.metadata.userId || "system",
            workspaceId: "default",
            mode: "workflow",
            traceId: input.metadata.executionId
        };

        // Execute the builtin tool
        const toolResult = await webSearchTool.execute(toolInput, toolContext);

        if (!toolResult.success) {
            throw new Error(toolResult.error?.message || "Web search failed");
        }

        const result = toolResult.data as WebSearchNodeResult;

        logger.info("Web search completed", {
            query: result.query,
            resultCount: result.results.length
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
 * Factory function for creating WebSearch handler.
 */
export function createWebSearchNodeHandler(): WebSearchNodeHandler {
    return new WebSearchNodeHandler();
}
