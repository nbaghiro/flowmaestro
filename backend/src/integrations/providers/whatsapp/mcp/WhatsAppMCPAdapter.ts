import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { WhatsAppClient } from "../client/WhatsAppClient";
import {
    executeSendTextMessage,
    executeSendTemplateMessage,
    executeSendMediaMessage,
    executeSendReaction,
    executeMarkAsRead,
    executeGetBusinessProfile,
    executeGetPhoneNumbers,
    executeGetMessageTemplates
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * WhatsApp MCP Adapter - wraps operations as MCP tools
 */
export class WhatsAppMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `whatsapp_${op.id}`,
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
        client: WhatsAppClient
    ): Promise<unknown> {
        // Remove "whatsapp_" prefix to get operation ID
        const operationId = toolName.replace(/^whatsapp_/, "");

        // Route to operation executor
        switch (operationId) {
            case "sendTextMessage":
                return await executeSendTextMessage(client, params as never);
            case "sendTemplateMessage":
                return await executeSendTemplateMessage(client, params as never);
            case "sendMediaMessage":
                return await executeSendMediaMessage(client, params as never);
            case "sendReaction":
                return await executeSendReaction(client, params as never);
            case "markAsRead":
                return await executeMarkAsRead(client, params as never);
            case "getBusinessProfile":
                return await executeGetBusinessProfile(client, params as never);
            case "getPhoneNumbers":
                return await executeGetPhoneNumbers(client, params as never);
            case "getMessageTemplates":
                return await executeGetMessageTemplates(client, params as never);
            default:
                throw new Error(`Unknown WhatsApp operation: ${operationId}`);
        }
    }
}
