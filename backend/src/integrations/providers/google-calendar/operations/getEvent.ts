import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCalendarClient } from "../client/GoogleCalendarClient";

/**
 * Get event input schema
 */
export const getEventSchema = z.object({
    calendarId: z
        .string()
        .min(1)
        .default("primary")
        .describe("Calendar identifier (use 'primary' for main calendar)"),
    eventId: z.string().min(1).describe("Event identifier")
});

export type GetEventParams = z.infer<typeof getEventSchema>;

/**
 * Get event operation definition
 */
export const getEventOperation: OperationDefinition = {
    id: "getEvent",
    name: "Get Event",
    description: "Get details of a specific calendar event",
    category: "events",
    retryable: true,
    inputSchema: getEventSchema
};

/**
 * Execute get event operation
 */
export async function executeGetEvent(
    client: GoogleCalendarClient,
    params: GetEventParams
): Promise<OperationResult> {
    try {
        const response = await client.getEvent(params.calendarId, params.eventId);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get event",
                retryable: true
            }
        };
    }
}
