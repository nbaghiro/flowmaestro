import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCalendarClient } from "../client/GoogleCalendarClient";

/**
 * Quick add event input schema
 */
export const quickAddSchema = z.object({
    calendarId: z
        .string()
        .min(1)
        .default("primary")
        .describe("Calendar identifier (use 'primary' for main calendar)"),
    text: z
        .string()
        .min(1)
        .describe(
            "Natural language text describing the event (e.g., 'Dinner with John tomorrow at 7pm')"
        )
});

export type QuickAddParams = z.infer<typeof quickAddSchema>;

/**
 * Quick add event operation definition
 */
export const quickAddOperation: OperationDefinition = {
    id: "quickAdd",
    name: "Quick Add Event",
    description:
        "Create an event from natural language text (e.g., 'Dinner with John tomorrow at 7pm')",
    category: "events",
    retryable: true,
    inputSchema: quickAddSchema
};

/**
 * Execute quick add event operation
 */
export async function executeQuickAdd(
    client: GoogleCalendarClient,
    params: QuickAddParams
): Promise<OperationResult> {
    try {
        const response = await client.quickAdd(params.calendarId, params.text);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to quick add event",
                retryable: true
            }
        };
    }
}
