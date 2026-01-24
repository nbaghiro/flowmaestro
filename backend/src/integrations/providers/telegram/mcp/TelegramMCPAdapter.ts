import { TelegramClient } from "../client/TelegramClient";
import {
    executeSendMessage,
    executeSendPhoto,
    executeSendDocument,
    executeForwardMessage,
    executeEditMessageText,
    executeDeleteMessage,
    executeGetMe,
    executeGetChat
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Telegram MCP Adapter - wraps operations as MCP tools
 */
export class TelegramMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `telegram_${op.id}`,
            description: op.description,
            inputSchema: op.inputSchemaJSON,
            executeRef: op.id
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: TelegramClient
    ): Promise<unknown> {
        // Remove "telegram_" prefix to get operation ID
        const operationId = toolName.replace(/^telegram_/, "");

        // Route to operation executor
        switch (operationId) {
            case "sendMessage":
                return await executeSendMessage(client, params as never);
            case "sendPhoto":
                return await executeSendPhoto(client, params as never);
            case "sendDocument":
                return await executeSendDocument(client, params as never);
            case "forwardMessage":
                return await executeForwardMessage(client, params as never);
            case "editMessageText":
                return await executeEditMessageText(client, params as never);
            case "deleteMessage":
                return await executeDeleteMessage(client, params as never);
            case "getMe":
                return await executeGetMe(client, params as never);
            case "getChat":
                return await executeGetChat(client, params as never);
            default:
                throw new Error(`Unknown Telegram operation: ${operationId}`);
        }
    }
}
