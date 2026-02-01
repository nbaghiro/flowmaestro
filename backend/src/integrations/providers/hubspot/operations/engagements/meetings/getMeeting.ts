import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";
import type { HubspotEngagement } from "../../types";

/**
 * Get Meeting Parameters
 */
export const getMeetingSchema = z.object({
    meetingId: z.string(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional()
});

export type GetMeetingParams = z.infer<typeof getMeetingSchema>;

/**
 * Operation Definition
 */
export const getMeetingOperation: OperationDefinition = {
    id: "getMeeting",
    name: "Get Meeting",
    description: "Retrieve a meeting engagement by ID from HubSpot CRM",
    category: "crm",
    inputSchema: getMeetingSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Meeting
 */
export async function executeGetMeeting(
    client: HubspotClient,
    params: GetMeetingParams
): Promise<OperationResult> {
    try {
        const endpoint = `/crm/v3/objects/meetings/${params.meetingId}`;

        const queryParams: Record<string, unknown> = {};
        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties;
        }
        if (params.associations && params.associations.length > 0) {
            queryParams.associations = params.associations;
        }

        const response = await client.get<HubspotEngagement>(endpoint, queryParams);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get meeting",
                retryable: false
            }
        };
    }
}
