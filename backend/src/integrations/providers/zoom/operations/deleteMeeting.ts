import { z } from "zod";
import { ZoomClient } from "../client/ZoomClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Delete Meeting operation schema
 */
export const deleteMeetingSchema = z.object({
    meetingId: z.union([z.string(), z.number()]).describe("Zoom meeting ID to delete")
});

export type DeleteMeetingParams = z.infer<typeof deleteMeetingSchema>;

/**
 * Delete Meeting operation definition
 */
export const deleteMeetingOperation: OperationDefinition = {
    id: "deleteMeeting",
    name: "Delete Meeting",
    description: "Delete a Zoom meeting",
    category: "meetings",
    actionType: "write",
    inputSchema: deleteMeetingSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute delete meeting operation
 */
export async function executeDeleteMeeting(
    client: ZoomClient,
    params: DeleteMeetingParams
): Promise<OperationResult> {
    try {
        // Zoom DELETE /meetings/{meetingId} returns 204 No Content
        await client.delete(`/meetings/${params.meetingId}`);

        return {
            success: true,
            data: {
                meetingId: params.meetingId,
                deleted: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete meeting",
                retryable: true
            }
        };
    }
}
