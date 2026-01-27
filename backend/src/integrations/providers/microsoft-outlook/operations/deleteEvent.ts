import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOutlookClient } from "../client/MicrosoftOutlookClient";

export const deleteEventSchema = z.object({
    eventId: z.string().describe("ID of the event to delete")
});

export type DeleteEventParams = z.infer<typeof deleteEventSchema>;

export const deleteEventOperation: OperationDefinition = {
    id: "deleteEvent",
    name: "Delete Event",
    description: "Delete a calendar event",
    category: "calendar",
    inputSchema: deleteEventSchema,
    inputSchemaJSON: {
        type: "object",
        required: ["eventId"],
        properties: {
            eventId: {
                type: "string",
                description: "ID of the event to delete"
            }
        }
    },
    retryable: false // Delete should not auto-retry
};

export async function executeDeleteEvent(
    client: MicrosoftOutlookClient,
    params: DeleteEventParams
): Promise<OperationResult> {
    try {
        await client.deleteEvent(params.eventId);
        return {
            success: true,
            data: {
                message: "Event deleted successfully",
                eventId: params.eventId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete event",
                retryable: false
            }
        };
    }
}
