import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { LiveChatClient } from "../client/LiveChatClient";
import {
    executeListChats,
    executeGetChat,
    executeListArchives,
    executeStartChat,
    executeSendEvent,
    executeTransferChat,
    executeDeactivateChat,
    executeGetCustomer,
    executeUpdateCustomer,
    executeBanCustomer,
    executeListAgents,
    executeSetRoutingStatus,
    executeTagThread,
    executeUntagThread
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

export class LiveChatMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `livechat_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema),
            executeRef: op.id
        }));
    }

    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: LiveChatClient
    ): Promise<unknown> {
        const operationId = toolName.replace(/^livechat_/, "");

        switch (operationId) {
            // Chats
            case "listChats":
                return await executeListChats(client, params as never);
            case "getChat":
                return await executeGetChat(client, params as never);
            case "listArchives":
                return await executeListArchives(client, params as never);
            case "startChat":
                return await executeStartChat(client, params as never);
            case "sendEvent":
                return await executeSendEvent(client, params as never);
            case "transferChat":
                return await executeTransferChat(client, params as never);
            case "deactivateChat":
                return await executeDeactivateChat(client, params as never);

            // Customers
            case "getCustomer":
                return await executeGetCustomer(client, params as never);
            case "updateCustomer":
                return await executeUpdateCustomer(client, params as never);
            case "banCustomer":
                return await executeBanCustomer(client, params as never);

            // Agents
            case "listAgents":
                return await executeListAgents(client, params as never);
            case "setRoutingStatus":
                return await executeSetRoutingStatus(client, params as never);

            // Tags
            case "tagThread":
                return await executeTagThread(client, params as never);
            case "untagThread":
                return await executeUntagThread(client, params as never);

            default:
                throw new Error(`Unknown LiveChat operation: ${operationId}`);
        }
    }
}
