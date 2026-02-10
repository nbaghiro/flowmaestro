import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { ZoomClient } from "../client/ZoomClient";
import {
    // Meetings
    executeCreateMeeting,
    executeListMeetings,
    executeGetMeeting,
    executeUpdateMeeting,
    executeDeleteMeeting,
    // Users
    executeGetUser,
    // Recordings
    executeListRecordings,
    executeGetMeetingRecordings
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Zoom MCP Adapter - wraps operations as MCP tools
 */
export class ZoomMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `zoom_${op.id}`,
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
        client: ZoomClient
    ): Promise<unknown> {
        // Remove "zoom_" prefix to get operation ID
        const operationId = toolName.replace(/^zoom_/, "");

        // Route to operation executor
        switch (operationId) {
            // Meetings
            case "createMeeting":
                return await executeCreateMeeting(client, params as never);
            case "listMeetings":
                return await executeListMeetings(client, params as never);
            case "getMeeting":
                return await executeGetMeeting(client, params as never);
            case "updateMeeting":
                return await executeUpdateMeeting(client, params as never);
            case "deleteMeeting":
                return await executeDeleteMeeting(client, params as never);

            // Users
            case "getUser":
                return await executeGetUser(client, params as never);

            // Recordings
            case "listRecordings":
                return await executeListRecordings(client, params as never);
            case "getMeetingRecordings":
                return await executeGetMeetingRecordings(client, params as never);

            default:
                throw new Error(`Unknown Zoom operation: ${operationId}`);
        }
    }
}
