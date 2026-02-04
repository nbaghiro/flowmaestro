import { z } from "zod";
import { ZoomClient } from "../client/ZoomClient";
import type { ZoomMeeting } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Meeting operation schema
 */
export const getMeetingSchema = z.object({
    meetingId: z.union([z.string(), z.number()]).describe("Zoom meeting ID")
});

export type GetMeetingParams = z.infer<typeof getMeetingSchema>;

/**
 * Get Meeting operation definition
 */
export const getMeetingOperation: OperationDefinition = {
    id: "getMeeting",
    name: "Get Meeting",
    description: "Retrieve details of a Zoom meeting",
    category: "meetings",
    actionType: "read",
    inputSchema: getMeetingSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get meeting operation
 */
export async function executeGetMeeting(
    client: ZoomClient,
    params: GetMeetingParams
): Promise<OperationResult> {
    try {
        const response = await client.get<ZoomMeeting>(`/meetings/${params.meetingId}`);

        return {
            success: true,
            data: {
                id: response.id,
                uuid: response.uuid,
                hostId: response.host_id,
                topic: response.topic,
                type: response.type,
                status: response.status,
                startTime: response.start_time,
                duration: response.duration,
                timezone: response.timezone,
                agenda: response.agenda,
                createdAt: response.created_at,
                joinUrl: response.join_url,
                startUrl: response.start_url,
                password: response.password,
                settings: response.settings
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get meeting",
                retryable: true
            }
        };
    }
}
