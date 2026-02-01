import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { FacebookClient } from "../client/FacebookClient";
import {
    executeSendTextMessage,
    executeSendButtonTemplate,
    executeSendGenericTemplate,
    executeSendMediaTemplate,
    executeSendQuickReplies,
    executeSendTypingIndicator,
    executeMarkAsSeen,
    executeGetConversations,
    executeGetMessages,
    executeGetPageInfo
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Facebook MCP Adapter - wraps operations as MCP tools
 */
export class FacebookMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `facebook_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema),
            executeRef: op.id
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: FacebookClient
    ): Promise<unknown> {
        // Remove "facebook_" prefix to get operation ID
        const operationId = toolName.replace(/^facebook_/, "");

        // Route to operation executor
        switch (operationId) {
            // Messaging operations
            case "sendTextMessage":
                return await executeSendTextMessage(client, params as never);
            case "sendButtonTemplate":
                return await executeSendButtonTemplate(client, params as never);
            case "sendGenericTemplate":
                return await executeSendGenericTemplate(client, params as never);
            case "sendMediaTemplate":
                return await executeSendMediaTemplate(client, params as never);
            case "sendQuickReplies":
                return await executeSendQuickReplies(client, params as never);
            case "sendTypingIndicator":
                return await executeSendTypingIndicator(client, params as never);
            case "markAsSeen":
                return await executeMarkAsSeen(client, params as never);
            case "getConversations":
                return await executeGetConversations(client, params as never);
            case "getMessages":
                return await executeGetMessages(client, params as never);

            // Page operations
            case "getPageInfo":
                return await executeGetPageInfo(client, params as never);

            default:
                throw new Error(`Unknown Facebook operation: ${operationId}`);
        }
    }
}
