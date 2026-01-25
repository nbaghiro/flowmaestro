import { BufferClient } from "../client/BufferClient";
import { executeCreateUpdate } from "../operations/createUpdate";
import { executeDeleteUpdate } from "../operations/deleteUpdate";
import { executeGetPendingUpdates } from "../operations/getPendingUpdates";
import { executeGetProfile } from "../operations/getProfile";
import { executeGetUpdate } from "../operations/getUpdate";
import { executeListProfiles } from "../operations/listProfiles";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Buffer MCP Adapter - wraps operations as MCP tools
 */
export class BufferMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `buffer_${op.id}`,
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
        client: BufferClient
    ): Promise<unknown> {
        // Remove "buffer_" prefix to get operation ID
        const operationId = toolName.replace(/^buffer_/, "");

        // Route to operation executor
        switch (operationId) {
            case "listProfiles":
                return await executeListProfiles(client, params as never);
            case "getProfile":
                return await executeGetProfile(client, params as never);
            case "createUpdate":
                return await executeCreateUpdate(client, params as never);
            case "getUpdate":
                return await executeGetUpdate(client, params as never);
            case "getPendingUpdates":
                return await executeGetPendingUpdates(client, params as never);
            case "deleteUpdate":
                return await executeDeleteUpdate(client, params as never);
            default:
                throw new Error(`Unknown Buffer operation: ${operationId}`);
        }
    }
}
