import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOutlookClient } from "../client/MicrosoftOutlookClient";

export const getEventSchema = z.object({
    eventId: z.string().describe("The ID of the event to retrieve")
});

export type GetEventParams = z.infer<typeof getEventSchema>;

export const getEventOperation: OperationDefinition = {
    id: "getEvent",
    name: "Get Event",
    description: "Get a specific calendar event by ID",
    category: "calendar",
    inputSchema: getEventSchema,
    inputSchemaJSON: {
        type: "object",
        required: ["eventId"],
        properties: {
            eventId: {
                type: "string",
                description: "The ID of the event to retrieve"
            }
        }
    },
    retryable: true
};

export async function executeGetEvent(
    client: MicrosoftOutlookClient,
    params: GetEventParams
): Promise<OperationResult> {
    try {
        const event = await client.getEvent(params.eventId);
        return {
            success: true,
            data: {
                id: event.id,
                subject: event.subject,
                bodyPreview: event.bodyPreview,
                body: event.body,
                start: event.start,
                end: event.end,
                location: event.location?.displayName,
                locations: event.locations?.map((l) => l.displayName),
                attendees: event.attendees?.map((a) => ({
                    email: a.emailAddress.address,
                    name: a.emailAddress.name,
                    type: a.type,
                    response: a.status?.response
                })),
                organizer: event.organizer?.emailAddress,
                isOnlineMeeting: event.isOnlineMeeting,
                onlineMeetingUrl: event.onlineMeeting?.joinUrl || event.onlineMeetingUrl,
                webLink: event.webLink,
                isCancelled: event.isCancelled,
                responseStatus: event.responseStatus,
                createdDateTime: event.createdDateTime,
                lastModifiedDateTime: event.lastModifiedDateTime
            }
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
