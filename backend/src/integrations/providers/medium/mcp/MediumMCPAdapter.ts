import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // User Operations
    executeGetMe,
    // Publication Operations
    executeGetPublications,
    executeGetPublicationContributors,
    // Post Operations
    executeCreatePost,
    executeCreatePublicationPost,
    // Image Operations
    executeUploadImage
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { MediumClient } from "../client/MediumClient";

/**
 * Medium MCP Adapter
 *
 * Converts Medium operations into MCP tools for AI agents
 */
export class MediumMCPAdapter {
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
                name: `medium_${id}`,
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
        client: MediumClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("medium_", "");

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
            // User Operations
            case "getMe":
                return executeGetMe(client, params as never);

            // Publication Operations
            case "getPublications":
                return executeGetPublications(client, params as never);
            case "getPublicationContributors":
                return executeGetPublicationContributors(client, params as never);

            // Post Operations
            case "createPost":
                return executeCreatePost(client, params as never);
            case "createPublicationPost":
                return executeCreatePublicationPost(client, params as never);

            // Image Operations
            case "uploadImage":
                return executeUploadImage(client, params as never);

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
