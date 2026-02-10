/**
 * Kustomer MCP (Model Context Protocol) Adapter
 *
 * Exposes Kustomer operations as MCP tools for AI agent integration
 */

import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // Customers
    executeListCustomers,
    executeGetCustomer,
    executeCreateCustomer,
    executeUpdateCustomer,
    executeDeleteCustomer,
    executeSearchCustomers,
    // Conversations
    executeListConversations,
    executeGetConversation,
    executeCreateConversation,
    executeUpdateConversation,
    executeAddConversationTags,
    executeRemoveConversationTags,
    // Messages
    executeListMessages,
    executeCreateMessage,
    executeCreateMessageByCustomer
} from "../operations";
import type { OperationDefinition, MCPTool, OperationResult } from "../../../core/types";
import type { KustomerClient } from "../client/KustomerClient";

export class KustomerMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Convert all operations to MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `kustomer_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema)
        }));
    }

    /**
     * Execute an MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: KustomerClient
    ): Promise<OperationResult> {
        // Extract operation ID from tool name
        const operationId = toolName.replace(/^kustomer_/, "");

        // Route to appropriate executor
        switch (operationId) {
            // Customers
            case "listCustomers":
                return executeListCustomers(client, params as never);
            case "getCustomer":
                return executeGetCustomer(client, params as never);
            case "createCustomer":
                return executeCreateCustomer(client, params as never);
            case "updateCustomer":
                return executeUpdateCustomer(client, params as never);
            case "deleteCustomer":
                return executeDeleteCustomer(client, params as never);
            case "searchCustomers":
                return executeSearchCustomers(client, params as never);

            // Conversations
            case "listConversations":
                return executeListConversations(client, params as never);
            case "getConversation":
                return executeGetConversation(client, params as never);
            case "createConversation":
                return executeCreateConversation(client, params as never);
            case "updateConversation":
                return executeUpdateConversation(client, params as never);
            case "addConversationTags":
                return executeAddConversationTags(client, params as never);
            case "removeConversationTags":
                return executeRemoveConversationTags(client, params as never);

            // Messages
            case "listMessages":
                return executeListMessages(client, params as never);
            case "createMessage":
                return executeCreateMessage(client, params as never);
            case "createMessageByCustomer":
                return executeCreateMessageByCustomer(client, params as never);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown Kustomer operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }
}
