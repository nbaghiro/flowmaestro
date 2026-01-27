import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOutlookClient } from "../client/MicrosoftOutlookClient";

export const respondToEventSchema = z.object({
    eventId: z.string().describe("ID of the event to respond to"),
    response: z
        .enum(["accept", "tentativelyAccept", "decline"])
        .describe("Response type: accept, tentativelyAccept, or decline"),
    sendResponse: z.boolean().optional().default(true).describe("Send response to organizer"),
    comment: z.string().optional().describe("Optional response message")
});

export type RespondToEventParams = z.infer<typeof respondToEventSchema>;

export const respondToEventOperation: OperationDefinition = {
    id: "respondToEvent",
    name: "Respond to Event",
    description: "Accept, tentatively accept, or decline an event invitation",
    category: "calendar",
    inputSchema: respondToEventSchema,
    inputSchemaJSON: {
        type: "object",
        required: ["eventId", "response"],
        properties: {
            eventId: {
                type: "string",
                description: "ID of the event to respond to"
            },
            response: {
                type: "string",
                enum: ["accept", "tentativelyAccept", "decline"],
                description: "Response type: accept, tentativelyAccept, or decline"
            },
            sendResponse: {
                type: "boolean",
                default: true,
                description: "Send response to organizer"
            },
            comment: {
                type: "string",
                description: "Optional response message"
            }
        }
    },
    retryable: false // Response should not auto-retry
};

export async function executeRespondToEvent(
    client: MicrosoftOutlookClient,
    params: RespondToEventParams
): Promise<OperationResult> {
    try {
        await client.respondToEvent(params.eventId, params.response, {
            sendResponse: params.sendResponse,
            comment: params.comment
        });

        const responseText = {
            accept: "accepted",
            tentativelyAccept: "tentatively accepted",
            decline: "declined"
        }[params.response];

        return {
            success: true,
            data: {
                message: `Event ${responseText} successfully`,
                eventId: params.eventId,
                response: params.response,
                responseSent: params.sendResponse
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to respond to event",
                retryable: false
            }
        };
    }
}
