import { z } from "zod";
import { ZoomClient } from "../client/ZoomClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Update Meeting operation schema
 */
export const updateMeetingSchema = z.object({
    meetingId: z.union([z.string(), z.number()]).describe("Zoom meeting ID to update"),
    topic: z.string().optional().describe("Updated meeting topic/title"),
    type: z
        .number()
        .int()
        .optional()
        .describe(
            "Meeting type: 1=instant, 2=scheduled, " +
                "3=recurring no fixed time, 8=recurring fixed time"
        ),
    start_time: z
        .string()
        .optional()
        .describe("Updated start time in ISO 8601 format " + "(e.g., '2024-06-15T14:00:00Z')"),
    duration: z.number().int().optional().describe("Updated meeting duration in minutes"),
    timezone: z.string().optional().describe("Updated timezone (e.g., 'America/New_York')"),
    agenda: z.string().optional().describe("Updated meeting agenda/description"),
    password: z.string().optional().describe("Updated meeting password (max 10 characters)"),
    settings: z
        .object({
            host_video: z.boolean().optional().describe("Start with host video on"),
            participant_video: z.boolean().optional().describe("Start with participant video on"),
            join_before_host: z.boolean().optional().describe("Allow joining before host"),
            mute_upon_entry: z.boolean().optional().describe("Mute participants upon entry"),
            auto_recording: z
                .enum(["local", "cloud", "none"])
                .optional()
                .describe("Automatic recording setting"),
            waiting_room: z.boolean().optional().describe("Enable waiting room")
        })
        .optional()
        .describe("Updated meeting settings")
});

export type UpdateMeetingParams = z.infer<typeof updateMeetingSchema>;

/**
 * Update Meeting operation definition
 */
export const updateMeetingOperation: OperationDefinition = {
    id: "updateMeeting",
    name: "Update Meeting",
    description: "Update an existing Zoom meeting",
    category: "meetings",
    actionType: "write",
    inputSchema: updateMeetingSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute update meeting operation
 */
export async function executeUpdateMeeting(
    client: ZoomClient,
    params: UpdateMeetingParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {};

        if (params.topic !== undefined) {
            body.topic = params.topic;
        }
        if (params.type !== undefined) {
            body.type = params.type;
        }
        if (params.start_time !== undefined) {
            body.start_time = params.start_time;
        }
        if (params.duration !== undefined) {
            body.duration = params.duration;
        }
        if (params.timezone !== undefined) {
            body.timezone = params.timezone;
        }
        if (params.agenda !== undefined) {
            body.agenda = params.agenda;
        }
        if (params.password !== undefined) {
            body.password = params.password;
        }
        if (params.settings !== undefined) {
            body.settings = params.settings;
        }

        // Zoom PATCH /meetings/{meetingId} returns 204 No Content
        await client.patch(`/meetings/${params.meetingId}`, body);

        return {
            success: true,
            data: {
                meetingId: params.meetingId,
                updated: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update meeting",
                retryable: true
            }
        };
    }
}
