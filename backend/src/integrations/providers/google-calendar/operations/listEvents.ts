import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCalendarClient } from "../client/GoogleCalendarClient";

/**
 * List events input schema
 */
export const listEventsSchema = z.object({
    calendarId: z
        .string()
        .min(1)
        .default("primary")
        .describe("Calendar identifier (use 'primary' for main calendar)"),
    timeMin: z
        .string()
        .optional()
        .describe("Lower bound (inclusive) for event's start time (RFC3339 timestamp)"),
    timeMax: z
        .string()
        .optional()
        .describe("Upper bound (exclusive) for event's end time (RFC3339 timestamp)"),
    maxResults: z
        .number()
        .int()
        .min(1)
        .max(2500)
        .optional()
        .describe("Maximum number of events to return (default 250)"),
    orderBy: z
        .enum(["startTime", "updated"])
        .optional()
        .describe("Order of events (requires singleEvents=true for startTime)"),
    q: z.string().optional().describe("Free text search query"),
    singleEvents: z
        .boolean()
        .optional()
        .describe("Whether to expand recurring events into instances (default false)")
});

export type ListEventsParams = z.infer<typeof listEventsSchema>;

/**
 * List events operation definition
 */
export const listEventsOperation: OperationDefinition = {
    id: "listEvents",
    name: "List Events",
    description: "List events from a Google Calendar with optional filtering by time range",
    category: "events",
    retryable: true,
    inputSchema: listEventsSchema
};

/**
 * Execute list events operation
 */
export async function executeListEvents(
    client: GoogleCalendarClient,
    params: ListEventsParams
): Promise<OperationResult> {
    try {
        const response = await client.listEvents(params);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list events",
                retryable: true
            }
        };
    }
}
