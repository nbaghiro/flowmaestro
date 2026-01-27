import { SegmentClient } from "../client/SegmentClient";
import {
    executeTrackEvent,
    executeIdentifyUser,
    executeTrackPage,
    executeTrackScreen,
    executeGroupUser,
    executeAliasUser,
    executeBatchEvents
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Segment MCP Adapter - wraps operations as MCP tools
 */
export class SegmentMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `segment_${op.id}`,
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
        client: SegmentClient
    ): Promise<unknown> {
        // Remove "segment_" prefix to get operation ID
        const operationId = toolName.replace(/^segment_/, "");

        // Route to operation executor
        switch (operationId) {
            case "trackEvent":
                return await executeTrackEvent(client, params as never);
            case "identifyUser":
                return await executeIdentifyUser(client, params as never);
            case "trackPage":
                return await executeTrackPage(client, params as never);
            case "trackScreen":
                return await executeTrackScreen(client, params as never);
            case "groupUser":
                return await executeGroupUser(client, params as never);
            case "aliasUser":
                return await executeAliasUser(client, params as never);
            case "batchEvents":
                return await executeBatchEvents(client, params as never);
            default:
                throw new Error(`Unknown Segment operation: ${operationId}`);
        }
    }
}
