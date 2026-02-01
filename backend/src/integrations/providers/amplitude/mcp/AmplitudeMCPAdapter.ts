import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { AmplitudeClient } from "../client/AmplitudeClient";
import { executeIdentifyUser } from "../operations/identifyUser";
import { executeTrackEvent } from "../operations/trackEvent";
import { executeTrackEvents } from "../operations/trackEvents";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Amplitude MCP Adapter - wraps operations as MCP tools
 */
export class AmplitudeMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `amplitude_${op.id}`,
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
        client: AmplitudeClient
    ): Promise<unknown> {
        // Remove "amplitude_" prefix to get operation ID
        const operationId = toolName.replace(/^amplitude_/, "");

        // Route to operation executor
        switch (operationId) {
            case "trackEvent":
                return await executeTrackEvent(client, params as never);
            case "trackEvents":
                return await executeTrackEvents(client, params as never);
            case "identifyUser":
                return await executeIdentifyUser(client, params as never);
            default:
                throw new Error(`Unknown Amplitude operation: ${operationId}`);
        }
    }
}
