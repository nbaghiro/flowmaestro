import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOutlookClient } from "../client/MicrosoftOutlookClient";

export const updateEventSchema = z.object({
    eventId: z.string().describe("ID of the event to update"),
    subject: z.string().optional().describe("New event title"),
    start: z.string().optional().describe("New start time in ISO 8601 format"),
    end: z.string().optional().describe("New end time in ISO 8601 format"),
    timeZone: z.string().optional().describe("Time zone for start/end times"),
    body: z.string().optional().describe("New event description"),
    location: z.string().optional().describe("New location name")
});

export type UpdateEventParams = z.infer<typeof updateEventSchema>;

export const updateEventOperation: OperationDefinition = {
    id: "updateEvent",
    name: "Update Event",
    description: "Update an existing calendar event",
    category: "calendar",
    inputSchema: updateEventSchema,
    retryable: true
};

export async function executeUpdateEvent(
    client: MicrosoftOutlookClient,
    params: UpdateEventParams
): Promise<OperationResult> {
    try {
        const event = await client.updateEvent(params.eventId, {
            subject: params.subject,
            start: params.start,
            end: params.end,
            timeZone: params.timeZone,
            body: params.body,
            location: params.location
        });
        return {
            success: true,
            data: {
                id: event.id,
                subject: event.subject,
                start: event.start,
                end: event.end,
                location: event.location?.displayName,
                webLink: event.webLink,
                message: "Event updated successfully"
            }
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
