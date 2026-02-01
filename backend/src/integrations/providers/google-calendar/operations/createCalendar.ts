import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCalendarClient } from "../client/GoogleCalendarClient";

/**
 * Create calendar input schema
 */
export const createCalendarSchema = z.object({
    summary: z.string().min(1).max(255).describe("Calendar name/title"),
    description: z.string().optional().describe("Calendar description"),
    location: z.string().optional().describe("Geographic location of calendar"),
    timeZone: z.string().optional().describe("Time zone (e.g., America/Los_Angeles)")
});

export type CreateCalendarParams = z.infer<typeof createCalendarSchema>;

/**
 * Create calendar operation definition
 */
export const createCalendarOperation: OperationDefinition = {
    id: "createCalendar",
    name: "Create Calendar",
    description: "Create a new secondary calendar",
    category: "calendars",
    retryable: true,
    inputSchema: createCalendarSchema
};

/**
 * Execute create calendar operation
 */
export async function executeCreateCalendar(
    client: GoogleCalendarClient,
    params: CreateCalendarParams
): Promise<OperationResult> {
    try {
        const response = await client.createCalendar(params);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create calendar",
                retryable: true
            }
        };
    }
}
