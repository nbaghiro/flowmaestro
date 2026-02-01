import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { DiscordClient } from "../client/DiscordClient";
import {
    executeSendMessage,
    executeListGuilds,
    executeListChannels,
    executeCreateWebhook,
    executeExecuteWebhook
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Discord MCP Adapter - wraps operations as MCP tools
 */
export class DiscordMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `discord_${op.id}`,
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
        client: DiscordClient
    ): Promise<unknown> {
        // Remove "discord_" prefix to get operation ID
        const operationId = toolName.replace(/^discord_/, "");

        // Route to operation executor
        switch (operationId) {
            case "sendMessage":
                return await executeSendMessage(client, params as never);
            case "listGuilds":
                return await executeListGuilds(client, params as never);
            case "listChannels":
                return await executeListChannels(client, params as never);
            case "createWebhook":
                return await executeCreateWebhook(client, params as never);
            case "executeWebhook":
                return await executeExecuteWebhook(client, params as never);
            default:
                throw new Error(`Unknown Discord operation: ${operationId}`);
        }
    }
}
