import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { SlackClient } from "../client/SlackClient";
import { executeListChannels } from "../operations/listChannels";
import { executeSendMessage } from "../operations/sendMessage";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Slack MCP Adapter - wraps operations as MCP tools
 */
export class SlackMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `slack_${op.id}`,
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
        client: SlackClient
    ): Promise<unknown> {
        // Remove "slack_" prefix to get operation ID
        const operationId = toolName.replace(/^slack_/, "");

        // Route to operation executor
        switch (operationId) {
            case "sendMessage":
                return await executeSendMessage(client, params as never);
            case "listChannels":
                return await executeListChannels(client, params as never);
            default:
                throw new Error(`Unknown Slack operation: ${operationId}`);
        }
    }
}
