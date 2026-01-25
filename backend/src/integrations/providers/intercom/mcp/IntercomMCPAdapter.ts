/**
 * Intercom MCP (Model Context Protocol) Adapter
 *
 * Exposes Intercom operations as MCP tools for AI agent integration
 */

import {
    executeListContacts,
    executeGetContact,
    executeCreateContact,
    executeUpdateContact,
    executeSearchContacts,
    executeListConversations,
    executeGetConversation,
    executeReplyToConversation,
    executeCloseConversation,
    executeAssignConversation,
    executeListCompanies,
    executeGetCompany,
    executeCreateOrUpdateCompany,
    executeListTags,
    executeTagContact,
    executeTagConversation,
    executeCreateNote,
    executeListNotes
} from "../operations";
import type { OperationDefinition, MCPTool, OperationResult } from "../../../core/types";
import type { IntercomClient } from "../client/IntercomClient";

export class IntercomMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Convert all operations to MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `intercom_${op.id}`,
            description: op.description,
            inputSchema: op.inputSchemaJSON
        }));
    }

    /**
     * Execute an MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: IntercomClient
    ): Promise<OperationResult> {
        // Extract operation ID from tool name
        const operationId = toolName.replace(/^intercom_/, "");

        // Route to appropriate executor
        switch (operationId) {
            // Contacts
            case "listContacts":
                return executeListContacts(client, params as never);
            case "getContact":
                return executeGetContact(client, params as never);
            case "createContact":
                return executeCreateContact(client, params as never);
            case "updateContact":
                return executeUpdateContact(client, params as never);
            case "searchContacts":
                return executeSearchContacts(client, params as never);

            // Conversations
            case "listConversations":
                return executeListConversations(client, params as never);
            case "getConversation":
                return executeGetConversation(client, params as never);
            case "replyToConversation":
                return executeReplyToConversation(client, params as never);
            case "closeConversation":
                return executeCloseConversation(client, params as never);
            case "assignConversation":
                return executeAssignConversation(client, params as never);

            // Companies
            case "listCompanies":
                return executeListCompanies(client, params as never);
            case "getCompany":
                return executeGetCompany(client, params as never);
            case "createOrUpdateCompany":
                return executeCreateOrUpdateCompany(client, params as never);

            // Tags
            case "listTags":
                return executeListTags(client, params as never);
            case "tagContact":
                return executeTagContact(client, params as never);
            case "tagConversation":
                return executeTagConversation(client, params as never);

            // Notes
            case "createNote":
                return executeCreateNote(client, params as never);
            case "listNotes":
                return executeListNotes(client, params as never);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown Intercom operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }
}
