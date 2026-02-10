import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // Space Operations
    executeListSpaces,
    // Content Type Operations
    executeListContentTypes,
    // Entry Operations
    executeListEntries,
    executeGetEntry,
    executeCreateEntry,
    executeUpdateEntry,
    executePublishEntry,
    // Asset Operations
    executeListAssets
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { ContentfulClient } from "../client/ContentfulClient";

/**
 * Contentful MCP Adapter
 *
 * Converts Contentful operations into MCP tools for AI agents
 */
export class ContentfulMCPAdapter {
    private operations: Map<string, OperationDefinition>;

    constructor(operations: Map<string, OperationDefinition>) {
        this.operations = operations;
    }

    /**
     * Get MCP tools from registered operations
     */
    getTools(): MCPTool[] {
        const tools: MCPTool[] = [];

        for (const [id, operation] of this.operations.entries()) {
            tools.push({
                name: `contentful_${id}`,
                description: operation.description,
                inputSchema: toJSONSchema(operation.inputSchema)
            });
        }

        return tools;
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: ContentfulClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("contentful_", "");

        const operation = this.operations.get(operationId);
        if (!operation) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: `Unknown MCP tool: ${toolName}`,
                    retryable: false
                }
            };
        }

        // Validate parameters using the operation's schema
        try {
            operation.inputSchema.parse(params);
        } catch (error) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: error instanceof Error ? error.message : "Invalid parameters",
                    retryable: false
                }
            };
        }

        // Route to appropriate operation executor
        switch (operationId) {
            // Space Operations
            case "listSpaces":
                return executeListSpaces(client, params as never);

            // Content Type Operations
            case "listContentTypes":
                return executeListContentTypes(client, params as never);

            // Entry Operations
            case "listEntries":
                return executeListEntries(client, params as never);
            case "getEntry":
                return executeGetEntry(client, params as never);
            case "createEntry":
                return executeCreateEntry(client, params as never);
            case "updateEntry":
                return executeUpdateEntry(client, params as never);
            case "publishEntry":
                return executePublishEntry(client, params as never);

            // Asset Operations
            case "listAssets":
                return executeListAssets(client, params as never);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Operation not implemented: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }
}
