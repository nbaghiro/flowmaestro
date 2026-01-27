import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOutlookClient } from "../client/MicrosoftOutlookClient";

export const listEventsSchema = z.object({
    calendarId: z.string().optional().describe("Calendar ID (defaults to primary calendar)"),
    startDateTime: z.string().describe("Start of time range in ISO 8601 format"),
    endDateTime: z.string().describe("End of time range in ISO 8601 format"),
    top: z.number().min(1).optional().describe("Maximum number of events to return")
});

export type ListEventsParams = z.infer<typeof listEventsSchema>;

export const listEventsOperation: OperationDefinition = {
    id: "listEvents",
    name: "List Events",
    description: "List calendar events within a time range",
    category: "calendar",
    inputSchema: listEventsSchema,
    inputSchemaJSON: {
        type: "object",
        required: ["startDateTime", "endDateTime"],
        properties: {
            calendarId: {
                type: "string",
                description: "Calendar ID (defaults to primary calendar)"
            },
            startDateTime: {
                type: "string",
                description: "Start of time range in ISO 8601 format"
            },
            endDateTime: {
                type: "string",
                description: "End of time range in ISO 8601 format"
            },
            top: {
                type: "number",
                minimum: 1,
                description: "Maximum number of events to return"
            }
        }
    },
    retryable: true
};

export async function executeListEvents(
    client: MicrosoftOutlookClient,
    params: ListEventsParams
): Promise<OperationResult> {
    try {
        const result = await client.listEvents({
            calendarId: params.calendarId,
            startDateTime: params.startDateTime,
            endDateTime: params.endDateTime,
            top: params.top
        });
        return {
            success: true,
            data: {
                events: result.value.map((event) => ({
                    id: event.id,
                    subject: event.subject,
                    bodyPreview: event.bodyPreview,
                    start: event.start,
                    end: event.end,
                    location: event.location?.displayName,
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
                    isCancelled: event.isCancelled
                })),
                hasMore: !!result["@odata.nextLink"]
            }
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
