import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCalendarClient } from "../client/GoogleCalendarClient";

/**
 * List calendars input schema
 */
export const listCalendarsSchema = z.object({
    maxResults: z
        .number()
        .int()
        .min(1)
        .max(250)
        .optional()
        .describe("Maximum number of calendars to return")
});

export type ListCalendarsParams = z.infer<typeof listCalendarsSchema>;

/**
 * List calendars operation definition
 */
export const listCalendarsOperation: OperationDefinition = {
    id: "listCalendars",
    name: "List Calendars",
    description: "List all calendars accessible by the user",
    category: "calendars",
    retryable: true,
    inputSchema: listCalendarsSchema
};

/**
 * Execute list calendars operation
 */
export async function executeListCalendars(
    client: GoogleCalendarClient,
    params: ListCalendarsParams
): Promise<OperationResult> {
    try {
        const response = await client.listCalendars(params);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list calendars",
                retryable: true
            }
        };
    }
}
