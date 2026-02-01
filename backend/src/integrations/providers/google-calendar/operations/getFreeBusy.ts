import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCalendarClient } from "../client/GoogleCalendarClient";

/**
 * Get free/busy input schema
 */
export const getFreeBusySchema = z.object({
    timeMin: z.string().describe("Start of the interval (RFC3339 timestamp)"),
    timeMax: z.string().describe("End of the interval (RFC3339 timestamp)"),
    items: z
        .array(
            z.object({
                id: z.string().describe("Calendar identifier")
            })
        )
        .min(1)
        .describe("List of calendars to query"),
    timeZone: z.string().optional().describe("Time zone for the query (e.g., America/Los_Angeles)")
});

export type GetFreeBusyParams = z.infer<typeof getFreeBusySchema>;

/**
 * Get free/busy operation definition
 */
export const getFreeBusyOperation: OperationDefinition = {
    id: "getFreeBusy",
    name: "Get Free/Busy Information",
    description: "Query free/busy (availability) information for a set of calendars",
    category: "availability",
    retryable: true,
    inputSchema: getFreeBusySchema
};

/**
 * Execute get free/busy operation
 */
export async function executeGetFreeBusy(
    client: GoogleCalendarClient,
    params: GetFreeBusyParams
): Promise<OperationResult> {
    try {
        const response = await client.getFreeBusy(params);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to get free/busy information",
                retryable: true
            }
        };
    }
}
