import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // Conversation Operations
    executeListConversations,
    executeGetConversation,
    executeUpdateConversation,
    // Message Operations
    executeSendReply,
    // Comment Operations
    executeAddComment,
    executeListComments,
    // Tag Operations
    executeAddTag,
    executeRemoveTag,
    // Inbox Operations
    executeListInboxes,
    // Contact Operations
    executeListContacts,
    executeGetContact,
    executeCreateContact
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { FrontClient } from "../client/FrontClient";

/**
 * Front MCP Adapter
 *
 * Converts Front operations into MCP tools for AI agents
 */
export class FrontMCPAdapter {
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
                name: `front_${id}`,
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
        client: FrontClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("front_", "");

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
            // Conversation Operations
            case "listConversations":
                return executeListConversations(client, params as never);
            case "getConversation":
                return executeGetConversation(client, params as never);
            case "updateConversation":
                return executeUpdateConversation(client, params as never);

            // Message Operations
            case "sendReply":
                return executeSendReply(client, params as never);

            // Comment Operations
            case "addComment":
                return executeAddComment(client, params as never);
            case "listComments":
                return executeListComments(client, params as never);

            // Tag Operations
            case "addTag":
                return executeAddTag(client, params as never);
            case "removeTag":
                return executeRemoveTag(client, params as never);

            // Inbox Operations
            case "listInboxes":
                return executeListInboxes(client, params as never);

            // Contact Operations
            case "listContacts":
                return executeListContacts(client, params as never);
            case "getContact":
                return executeGetContact(client, params as never);
            case "createContact":
                return executeCreateContact(client, params as never);

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
