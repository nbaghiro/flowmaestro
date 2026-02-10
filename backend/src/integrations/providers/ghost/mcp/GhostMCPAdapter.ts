import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // Post Operations
    executeListPosts,
    executeGetPost,
    executeCreatePost,
    executeUpdatePost,
    executeDeletePost,
    // Tag Operations
    executeListTags,
    // Member Operations
    executeListMembers,
    // Site Operations
    executeGetSiteInfo
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { GhostClient } from "../client/GhostClient";

/**
 * Ghost MCP Adapter
 *
 * Converts Ghost operations into MCP tools for AI agents
 */
export class GhostMCPAdapter {
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
                name: `ghost_${id}`,
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
        client: GhostClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("ghost_", "");

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
            // Post Operations
            case "listPosts":
                return executeListPosts(client, params as never);
            case "getPost":
                return executeGetPost(client, params as never);
            case "createPost":
                return executeCreatePost(client, params as never);
            case "updatePost":
                return executeUpdatePost(client, params as never);
            case "deletePost":
                return executeDeletePost(client, params as never);

            // Tag Operations
            case "listTags":
                return executeListTags(client, params as never);

            // Member Operations
            case "listMembers":
                return executeListMembers(client, params as never);

            // Site Operations
            case "getSiteInfo":
                return executeGetSiteInfo(client, params as never);

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
