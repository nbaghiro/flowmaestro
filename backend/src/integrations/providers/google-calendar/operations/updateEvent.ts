import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCalendarClient } from "../client/GoogleCalendarClient";

/**
 * Event time schema (either dateTime or date, not both)
 */
const eventTimeSchema = z.object({
    dateTime: z
        .string()
        .optional()
        .describe("Date-time in RFC3339 format (e.g., 2024-12-25T10:00:00-07:00)"),
    date: z.string().optional().describe("Date in YYYY-MM-DD format for all-day events"),
    timeZone: z.string().optional().describe("Time zone (e.g., America/Los_Angeles)")
});

/**
 * Update event input schema
 */
export const updateEventSchema = z.object({
    calendarId: z
        .string()
        .min(1)
        .default("primary")
        .describe("Calendar identifier (use 'primary' for main calendar)"),
    eventId: z.string().min(1).describe("Event identifier"),
    summary: z.string().min(1).max(1024).optional().describe("Event title"),
    description: z.string().optional().describe("Event description"),
    location: z.string().optional().describe("Event location"),
    start: eventTimeSchema.optional().describe("Start time of the event"),
    end: eventTimeSchema.optional().describe("End time of the event"),
    attendees: z
        .array(
            z.object({
                email: z.string().email().describe("Attendee email address"),
                displayName: z.string().optional().describe("Attendee display name"),
                optional: z.boolean().optional().describe("Whether attendance is optional")
            })
        )
        .optional()
        .describe("List of attendees"),
    reminders: z
        .object({
            useDefault: z.boolean().optional().describe("Use default reminders"),
            overrides: z
                .array(
                    z.object({
                        method: z.enum(["email", "popup"]).describe("Reminder method"),
                        minutes: z.number().int().min(0).describe("Minutes before event")
                    })
                )
                .optional()
                .describe("Custom reminder overrides")
        })
        .optional()
        .describe("Reminder settings")
});

export type UpdateEventParams = z.infer<typeof updateEventSchema>;

/**
 * Update event operation definition
 */
export const updateEventOperation: OperationDefinition = {
    id: "updateEvent",
    name: "Update Event",
    description: "Update an existing calendar event (partial update supported)",
    category: "events",
    retryable: true,
    inputSchema: updateEventSchema
};

/**
 * Execute update event operation
 */
export async function executeUpdateEvent(
    client: GoogleCalendarClient,
    params: UpdateEventParams
): Promise<OperationResult> {
    try {
        const { calendarId, eventId, ...eventData } = params;

        const response = await client.patchEvent(calendarId, eventId, eventData);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update event",
                retryable: true
            }
        };
    }
}
