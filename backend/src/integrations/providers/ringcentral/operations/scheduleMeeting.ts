import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { RingCentralClient } from "../client/RingCentralClient";

export const scheduleMeetingSchema = z.object({
    topic: z.string().min(1).describe("Meeting topic/title"),
    meetingType: z
        .enum(["Scheduled", "Instant", "Recurring"])
        .optional()
        .describe("Type of meeting (default: Scheduled)"),
    startTime: z
        .string()
        .optional()
        .describe("Start time (ISO 8601 format) - required for Scheduled"),
    durationInMinutes: z.number().min(1).optional().describe("Duration in minutes (default: 60)"),
    timeZone: z.string().optional().describe("Time zone ID (e.g., America/New_York)"),
    password: z.string().optional().describe("Meeting password"),
    allowJoinBeforeHost: z.boolean().optional().describe("Allow participants to join before host"),
    enableWaitingRoom: z.boolean().optional().describe("Enable waiting room"),
    muteParticipantsOnEntry: z.boolean().optional().describe("Mute participants when they join"),
    usePersonalMeetingId: z.boolean().optional().describe("Use personal meeting ID")
});

export type ScheduleMeetingParams = z.infer<typeof scheduleMeetingSchema>;

export const scheduleMeetingOperation: OperationDefinition = {
    id: "scheduleMeeting",
    name: "Schedule Meeting",
    description: "Create a video meeting",
    category: "meetings",
    inputSchema: scheduleMeetingSchema,
    retryable: false,
    timeout: 30000
};

export async function executeScheduleMeeting(
    client: RingCentralClient,
    params: ScheduleMeetingParams
): Promise<OperationResult> {
    try {
        const meeting = await client.scheduleMeeting({
            topic: params.topic,
            meetingType: params.meetingType,
            schedule:
                params.startTime || params.durationInMinutes
                    ? {
                          startTime: params.startTime || new Date().toISOString(),
                          durationInMinutes: params.durationInMinutes || 60,
                          timeZone: params.timeZone ? { id: params.timeZone } : undefined
                      }
                    : undefined,
            password: params.password,
            allowJoinBeforeHost: params.allowJoinBeforeHost,
            enableWaitingRoom: params.enableWaitingRoom,
            muteParticipantsOnEntry: params.muteParticipantsOnEntry,
            usePersonalMeetingId: params.usePersonalMeetingId
        });

        return {
            success: true,
            data: {
                meetingId: meeting.id,
                uuid: meeting.uuid,
                topic: meeting.topic,
                startTime: meeting.startTime,
                duration: meeting.duration,
                password: meeting.password,
                status: meeting.status,
                joinUrl: meeting.links?.joinUri,
                startUrl: meeting.links?.startUri
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to schedule meeting",
                retryable: false
            }
        };
    }
}
