/**
 * GitBook MCP Adapter
 *
 * Converts GitBook operations into MCP tools for AI agents
 */

import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    executeListOrganizations,
    executeGetOrganization,
    executeListSpaces,
    executeGetSpace,
    executeSearchSpaceContent,
    executeListPages,
    executeGetPage
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { GitBookClient } from "../client/GitBookClient";

export class GitBookMCPAdapter {
    private operations: Map<string, OperationDefinition>;

    constructor(operations: Map<string, OperationDefinition>) {
        this.operations = operations;
    }

    /**
     * Get MCP tools from registered operations
     */
    getTools(): MCPTool[] {
        const tools: MCPTool[] = [];

        // Convert each operation to an MCP tool
        for (const [id, operation] of this.operations.entries()) {
            tools.push({
                name: `gitbook_${id}`,
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
        client: GitBookClient
    ): Promise<OperationResult> {
        // Remove "gitbook_" prefix to get operation ID
        const operationId = toolName.replace("gitbook_", "");

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
                    message:
                        error instanceof Error ? error.message : "Invalid parameters for MCP tool",
                    retryable: false
                }
            };
        }

        // Route to appropriate executor
        switch (operationId) {
            // Organization operations
            case "listOrganizations":
                return executeListOrganizations(client, params as never);
            case "getOrganization":
                return executeGetOrganization(client, params as never);

            // Space operations
            case "listSpaces":
                return executeListSpaces(client, params as never);
            case "getSpace":
                return executeGetSpace(client, params as never);
            case "searchSpaceContent":
                return executeSearchSpaceContent(client, params as never);

            // Page operations
            case "listPages":
                return executeListPages(client, params as never);
            case "getPage":
                return executeGetPage(client, params as never);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Operation not implemented in MCP adapter: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }
}
