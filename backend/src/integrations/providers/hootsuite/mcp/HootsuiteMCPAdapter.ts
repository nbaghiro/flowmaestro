import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { HootsuiteClient } from "../client/HootsuiteClient";
import { executeDeleteMessage } from "../operations/deleteMessage";
import { executeGetMessage } from "../operations/getMessage";
import { executeListSocialProfiles } from "../operations/listSocialProfiles";
import { executeScheduleMessage } from "../operations/scheduleMessage";
import { executeUploadMedia } from "../operations/uploadMedia";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Hootsuite MCP Adapter - wraps operations as MCP tools
 */
export class HootsuiteMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `hootsuite_${op.id}`,
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
        client: HootsuiteClient
    ): Promise<unknown> {
        // Remove "hootsuite_" prefix to get operation ID
        const operationId = toolName.replace(/^hootsuite_/, "");

        // Route to operation executor
        switch (operationId) {
            case "listSocialProfiles":
                return await executeListSocialProfiles(client, params as never);
            case "scheduleMessage":
                return await executeScheduleMessage(client, params as never);
            case "getMessage":
                return await executeGetMessage(client, params as never);
            case "deleteMessage":
                return await executeDeleteMessage(client, params as never);
            case "uploadMedia":
                return await executeUploadMedia(client, params as never);
            default:
                throw new Error(`Unknown Hootsuite operation: ${operationId}`);
        }
    }
}
