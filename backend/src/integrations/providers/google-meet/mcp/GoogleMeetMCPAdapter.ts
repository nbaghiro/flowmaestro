import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { GoogleMeetClient } from "../client/GoogleMeetClient";
import {
    // Spaces
    executeCreateSpace,
    executeGetSpace,
    executeUpdateSpace,
    executeEndActiveConference,
    // Conference Records
    executeListConferenceRecords,
    executeGetConferenceRecord,
    // Participants
    executeListParticipants,
    executeGetParticipant
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Google Meet MCP Adapter - wraps operations as MCP tools
 */
export class GoogleMeetMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `google_meet_${op.id}`,
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
        client: GoogleMeetClient
    ): Promise<unknown> {
        // Remove "google_meet_" prefix to get operation ID
        const operationId = toolName.replace(/^google_meet_/, "");

        // Route to operation executor
        switch (operationId) {
            // Spaces
            case "createSpace":
                return await executeCreateSpace(client, params as never);
            case "getSpace":
                return await executeGetSpace(client, params as never);
            case "updateSpace":
                return await executeUpdateSpace(client, params as never);
            case "endActiveConference":
                return await executeEndActiveConference(client, params as never);

            // Conference Records
            case "listConferenceRecords":
                return await executeListConferenceRecords(client, params as never);
            case "getConferenceRecord":
                return await executeGetConferenceRecord(client, params as never);

            // Participants
            case "listParticipants":
                return await executeListParticipants(client, params as never);
            case "getParticipant":
                return await executeGetParticipant(client, params as never);

            default:
                throw new Error(`Unknown Google Meet operation: ${operationId}`);
        }
    }
}
