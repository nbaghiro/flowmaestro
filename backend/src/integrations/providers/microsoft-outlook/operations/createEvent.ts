import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOutlookClient } from "../client/MicrosoftOutlookClient";

export const createEventSchema = z.object({
    subject: z.string().describe("Event title"),
    start: z.string().describe("Start time in ISO 8601 format"),
    end: z.string().describe("End time in ISO 8601 format"),
    timeZone: z.string().optional().default("UTC").describe("Time zone (default: UTC)"),
    body: z.string().optional().describe("Event description/body"),
    location: z.string().optional().describe("Location name"),
    attendees: z.array(z.string().email()).optional().describe("Attendee email addresses"),
    isOnlineMeeting: z.boolean().optional().default(false).describe("Create as Teams meeting"),
    calendarId: z.string().optional().describe("Target calendar ID (defaults to primary)")
});

export type CreateEventParams = z.infer<typeof createEventSchema>;

export const createEventOperation: OperationDefinition = {
    id: "createEvent",
    name: "Create Event",
    description: "Create a new calendar event",
    category: "calendar",
    inputSchema: createEventSchema,
    retryable: false // Event creation should not auto-retry to avoid duplicates
};

export async function executeCreateEvent(
    client: MicrosoftOutlookClient,
    params: CreateEventParams
): Promise<OperationResult> {
    try {
        const event = await client.createEvent({
            subject: params.subject,
            start: params.start,
            end: params.end,
            timeZone: params.timeZone,
            body: params.body,
            location: params.location,
            attendees: params.attendees,
            isOnlineMeeting: params.isOnlineMeeting,
            calendarId: params.calendarId
        });
        return {
            success: true,
            data: {
                id: event.id,
                subject: event.subject,
                start: event.start,
                end: event.end,
                location: event.location?.displayName,
                isOnlineMeeting: event.isOnlineMeeting,
                onlineMeetingUrl: event.onlineMeeting?.joinUrl || event.onlineMeetingUrl,
                webLink: event.webLink
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create event",
                retryable: false
            }
        };
    }
}
