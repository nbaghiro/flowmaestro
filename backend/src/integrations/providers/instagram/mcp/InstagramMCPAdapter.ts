import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { InstagramClient } from "../client/InstagramClient";
import {
    executeSendTextMessage,
    executeSendMediaMessage,
    executeSendQuickReplies,
    executeGetConversations,
    executeGetMessages,
    executePublishPhoto,
    executePublishCarousel,
    executePublishReel,
    executePublishStory,
    executeGetMediaInsights,
    executeGetAccountInsights,
    executeGetAccountInfo
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Instagram MCP Adapter - wraps operations as MCP tools
 */
export class InstagramMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `instagram_${op.id}`,
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
        client: InstagramClient
    ): Promise<unknown> {
        // Remove "instagram_" prefix to get operation ID
        const operationId = toolName.replace(/^instagram_/, "");

        // Route to operation executor
        switch (operationId) {
            // Messaging operations
            case "sendTextMessage":
                return await executeSendTextMessage(client, params as never);
            case "sendMediaMessage":
                return await executeSendMediaMessage(client, params as never);
            case "sendQuickReplies":
                return await executeSendQuickReplies(client, params as never);
            case "getConversations":
                return await executeGetConversations(client, params as never);
            case "getMessages":
                return await executeGetMessages(client, params as never);

            // Publishing operations
            case "publishPhoto":
                return await executePublishPhoto(client, params as never);
            case "publishCarousel":
                return await executePublishCarousel(client, params as never);
            case "publishReel":
                return await executePublishReel(client, params as never);
            case "publishStory":
                return await executePublishStory(client, params as never);

            // Analytics operations
            case "getMediaInsights":
                return await executeGetMediaInsights(client, params as never);
            case "getAccountInsights":
                return await executeGetAccountInsights(client, params as never);

            // Account operations
            case "getAccountInfo":
                return await executeGetAccountInfo(client, params as never);

            default:
                throw new Error(`Unknown Instagram operation: ${operationId}`);
        }
    }
}
