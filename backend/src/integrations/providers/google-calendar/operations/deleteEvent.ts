import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCalendarClient } from "../client/GoogleCalendarClient";

/**
 * Delete event input schema
 */
export const deleteEventSchema = z.object({
    calendarId: z
        .string()
        .min(1)
        .default("primary")
        .describe("Calendar identifier (use 'primary' for main calendar)"),
    eventId: z.string().min(1).describe("Event identifier"),
    sendUpdates: z
        .enum(["all", "externalOnly", "none"])
        .optional()
        .describe("Whether to send notifications about the deletion (all, externalOnly, or none)")
});

export type DeleteEventParams = z.infer<typeof deleteEventSchema>;

/**
 * Delete event operation definition
 */
export const deleteEventOperation: OperationDefinition = {
    id: "deleteEvent",
    name: "Delete Event",
    description: "Delete a calendar event",
    category: "events",
    retryable: true,
    inputSchema: deleteEventSchema
};

/**
 * Execute delete event operation
 */
export async function executeDeleteEvent(
    client: GoogleCalendarClient,
    params: DeleteEventParams
): Promise<OperationResult> {
    try {
        const { calendarId, eventId, sendUpdates } = params;

        await client.deleteEvent(calendarId, eventId, sendUpdates ? { sendUpdates } : undefined);

        return {
            success: true,
            data: {
                deleted: true,
                eventId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete event",
                retryable: true
            }
        };
    }
}
