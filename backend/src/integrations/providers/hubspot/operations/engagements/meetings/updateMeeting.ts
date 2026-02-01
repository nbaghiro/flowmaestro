import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";
import type { HubspotEngagement } from "../../types";

/**
 * Update Meeting Parameters
 */
export const updateMeetingSchema = z.object({
    meetingId: z.string(),
    properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
});

export type UpdateMeetingParams = z.infer<typeof updateMeetingSchema>;

/**
 * Operation Definition
 */
export const updateMeetingOperation: OperationDefinition = {
    id: "updateMeeting",
    name: "Update Meeting",
    description: "Update an existing meeting engagement in HubSpot CRM",
    category: "crm",
    inputSchema: updateMeetingSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Meeting
 */
export async function executeUpdateMeeting(
    client: HubspotClient,
    params: UpdateMeetingParams
): Promise<OperationResult> {
    try {
        const response = await client.patch<HubspotEngagement>(
            `/crm/v3/objects/meetings/${params.meetingId}`,
            { properties: params.properties }
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update meeting",
                retryable: false
            }
        };
    }
}
