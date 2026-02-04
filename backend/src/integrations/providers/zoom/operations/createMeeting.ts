import { z } from "zod";
import { ZoomClient } from "../client/ZoomClient";
import type { ZoomMeeting } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Meeting operation schema
 */
export const createMeetingSchema = z.object({
    topic: z.string().describe("Meeting topic/title"),
    type: z
        .number()
        .int()
        .optional()
        .default(2)
        .describe(
            "Meeting type: 1=instant, 2=scheduled, " +
                "3=recurring no fixed time, 8=recurring fixed time"
        ),
    start_time: z
        .string()
        .optional()
        .describe("Meeting start time in ISO 8601 format " + "(e.g., '2024-06-15T14:00:00Z')"),
    duration: z.number().int().optional().describe("Meeting duration in minutes"),
    timezone: z.string().optional().describe("Timezone (e.g., 'America/New_York')"),
    agenda: z.string().optional().describe("Meeting agenda/description"),
    password: z.string().optional().describe("Meeting password (max 10 characters)"),
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
        .describe("Meeting settings")
});

export type CreateMeetingParams = z.infer<typeof createMeetingSchema>;

/**
 * Create Meeting operation definition
 */
export const createMeetingOperation: OperationDefinition = {
    id: "createMeeting",
    name: "Create Meeting",
    description: "Create a new Zoom meeting",
    category: "meetings",
    actionType: "write",
    inputSchema: createMeetingSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute create meeting operation
 */
export async function executeCreateMeeting(
    client: ZoomClient,
    params: CreateMeetingParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {
            topic: params.topic,
            type: params.type
        };

        if (params.start_time) {
            body.start_time = params.start_time;
        }
        if (params.duration !== undefined) {
            body.duration = params.duration;
        }
        if (params.timezone) {
            body.timezone = params.timezone;
        }
        if (params.agenda) {
            body.agenda = params.agenda;
        }
        if (params.password) {
            body.password = params.password;
        }
        if (params.settings) {
            body.settings = params.settings;
        }

        const response = await client.post<ZoomMeeting>("/users/me/meetings", body);

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
                message: error instanceof Error ? error.message : "Failed to create meeting",
                retryable: true
            }
        };
    }
}
