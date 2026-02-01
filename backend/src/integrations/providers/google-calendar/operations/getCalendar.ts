import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCalendarClient } from "../client/GoogleCalendarClient";

/**
 * Get calendar input schema
 */
export const getCalendarSchema = z.object({
    calendarId: z
        .string()
        .min(1)
        .default("primary")
        .describe("Calendar identifier (use 'primary' for main calendar)")
});

export type GetCalendarParams = z.infer<typeof getCalendarSchema>;

/**
 * Get calendar operation definition
 */
export const getCalendarOperation: OperationDefinition = {
    id: "getCalendar",
    name: "Get Calendar",
    description: "Get metadata for a specific calendar (name, timezone, description, etc.)",
    category: "calendars",
    retryable: true,
    inputSchema: getCalendarSchema
};

/**
 * Execute get calendar operation
 */
export async function executeGetCalendar(
    client: GoogleCalendarClient,
    params: GetCalendarParams
): Promise<OperationResult> {
    try {
        const response = await client.getCalendar(params.calendarId);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get calendar",
                retryable: true
            }
        };
    }
}
