import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { DriftClient } from "../client/DriftClient";
import {
    executeListContacts,
    executeGetContact,
    executeCreateContact,
    executeUpdateContact,
    executeDeleteContact,
    executeListConversations,
    executeGetConversation,
    executeCreateConversation,
    executeGetConversationMessages,
    executeSendMessage,
    executeListUsers,
    executeGetUser,
    executeListAccounts,
    executeGetAccount
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

export class DriftMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `drift_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema),
            executeRef: op.id
        }));
    }

    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: DriftClient
    ): Promise<unknown> {
        const operationId = toolName.replace(/^drift_/, "");

        switch (operationId) {
            // Contacts
            case "listContacts":
                return await executeListContacts(client, params as never);
            case "getContact":
                return await executeGetContact(client, params as never);
            case "createContact":
                return await executeCreateContact(client, params as never);
            case "updateContact":
                return await executeUpdateContact(client, params as never);
            case "deleteContact":
                return await executeDeleteContact(client, params as never);

            // Conversations
            case "listConversations":
                return await executeListConversations(client, params as never);
            case "getConversation":
                return await executeGetConversation(client, params as never);
            case "createConversation":
                return await executeCreateConversation(client, params as never);
            case "getConversationMessages":
                return await executeGetConversationMessages(client, params as never);
            case "sendMessage":
                return await executeSendMessage(client, params as never);

            // Users
            case "listUsers":
                return await executeListUsers(client, params as never);
            case "getUser":
                return await executeGetUser(client, params as never);

            // Accounts
            case "listAccounts":
                return await executeListAccounts(client, params as never);
            case "getAccount":
                return await executeGetAccount(client, params as never);

            default:
                throw new Error(`Unknown Drift operation: ${operationId}`);
        }
    }
}
