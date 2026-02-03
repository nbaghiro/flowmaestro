import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { HelpScoutClient } from "../client/HelpScoutClient";
import {
    executeListConversations,
    executeGetConversation,
    executeCreateConversation,
    executeUpdateConversation,
    executeDeleteConversation,
    executeReplyToConversation,
    executeAddNoteToConversation,
    executeUpdateConversationTags,
    executeListCustomers,
    executeGetCustomer,
    executeCreateCustomer,
    executeUpdateCustomer,
    executeSearchCustomers,
    executeListMailboxes,
    executeGetMailbox,
    executeListUsers
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

export class HelpScoutMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `helpscout_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema),
            executeRef: op.id
        }));
    }

    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: HelpScoutClient
    ): Promise<unknown> {
        const operationId = toolName.replace(/^helpscout_/, "");

        switch (operationId) {
            // Conversations
            case "listConversations":
                return await executeListConversations(client, params as never);
            case "getConversation":
                return await executeGetConversation(client, params as never);
            case "createConversation":
                return await executeCreateConversation(client, params as never);
            case "updateConversation":
                return await executeUpdateConversation(client, params as never);
            case "deleteConversation":
                return await executeDeleteConversation(client, params as never);
            case "replyToConversation":
                return await executeReplyToConversation(client, params as never);
            case "addNoteToConversation":
                return await executeAddNoteToConversation(client, params as never);
            case "updateConversationTags":
                return await executeUpdateConversationTags(client, params as never);

            // Customers
            case "listCustomers":
                return await executeListCustomers(client, params as never);
            case "getCustomer":
                return await executeGetCustomer(client, params as never);
            case "createCustomer":
                return await executeCreateCustomer(client, params as never);
            case "updateCustomer":
                return await executeUpdateCustomer(client, params as never);
            case "searchCustomers":
                return await executeSearchCustomers(client, params as never);

            // Mailboxes
            case "listMailboxes":
                return await executeListMailboxes(client, params as never);
            case "getMailbox":
                return await executeGetMailbox(client, params as never);

            // Users
            case "listUsers":
                return await executeListUsers(client, params as never);

            default:
                throw new Error(`Unknown Help Scout operation: ${operationId}`);
        }
    }
}
