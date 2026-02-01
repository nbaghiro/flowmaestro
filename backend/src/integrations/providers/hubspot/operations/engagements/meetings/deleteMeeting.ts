import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";

/**
 * Delete Meeting Parameters
 */
export const deleteMeetingSchema = z.object({
    meetingId: z.string()
});

export type DeleteMeetingParams = z.infer<typeof deleteMeetingSchema>;

/**
 * Operation Definition
 */
export const deleteMeetingOperation: OperationDefinition = {
    id: "deleteMeeting",
    name: "Delete Meeting",
    description: "Delete (archive) a meeting engagement in HubSpot CRM",
    category: "crm",
    inputSchema: deleteMeetingSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Delete Meeting
 */
export async function executeDeleteMeeting(
    client: HubspotClient,
    params: DeleteMeetingParams
): Promise<OperationResult> {
    try {
        await client.delete(`/crm/v3/objects/meetings/${params.meetingId}`);

        return {
            success: true,
            data: { deleted: true }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete meeting",
                retryable: false
            }
        };
    }
}
