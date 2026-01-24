import { MixpanelClient } from "../client/MixpanelClient";
import { executeImportEvents } from "../operations/importEvents";
import { executeSetGroupProfile } from "../operations/setGroupProfile";
import { executeSetUserProfile } from "../operations/setUserProfile";
import { executeTrackEvent } from "../operations/trackEvent";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Mixpanel MCP Adapter - wraps operations as MCP tools
 */
export class MixpanelMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `mixpanel_${op.id}`,
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
        client: MixpanelClient
    ): Promise<unknown> {
        // Remove "mixpanel_" prefix to get operation ID
        const operationId = toolName.replace(/^mixpanel_/, "");

        // Route to operation executor
        switch (operationId) {
            case "trackEvent":
                return await executeTrackEvent(client, params as never);
            case "importEvents":
                return await executeImportEvents(client, params as never);
            case "setUserProfile":
                return await executeSetUserProfile(client, params as never);
            case "setGroupProfile":
                return await executeSetGroupProfile(client, params as never);
            default:
                throw new Error(`Unknown Mixpanel operation: ${operationId}`);
        }
    }
}
