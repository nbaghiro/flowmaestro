import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { HeapClient } from "../client/HeapClient";
import { executeSetAccountProperties } from "../operations/setAccountProperties";
import { executeSetUserProperties } from "../operations/setUserProperties";
import { executeTrackEvent } from "../operations/trackEvent";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Heap MCP Adapter - wraps operations as MCP tools
 */
export class HeapMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `heap_${op.id}`,
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
        client: HeapClient
    ): Promise<unknown> {
        // Remove "heap_" prefix to get operation ID
        const operationId = toolName.replace(/^heap_/, "");

        // Route to operation executor
        switch (operationId) {
            case "trackEvent":
                return await executeTrackEvent(client, params as never);
            case "setUserProperties":
                return await executeSetUserProperties(client, params as never);
            case "setAccountProperties":
                return await executeSetAccountProperties(client, params as never);
            default:
                throw new Error(`Unknown Heap operation: ${operationId}`);
        }
    }
}
