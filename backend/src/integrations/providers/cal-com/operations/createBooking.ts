import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { CalComClient } from "../client/CalComClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create Booking operation schema
 */
export const createBookingSchema = z.object({
    eventTypeId: z.number().describe("Event type ID to book"),
    start: z.string().describe("Start time in ISO 8601 format"),
    end: z
        .string()
        .optional()
        .describe("End time in ISO 8601 format (optional, calculated from event type length)"),
    name: z.string().describe("Attendee name"),
    email: z.string().email().describe("Attendee email"),
    timeZone: z.string().describe("Attendee timezone (e.g., 'America/New_York')"),
    language: z.string().optional().default("en").describe("Language for booking confirmation"),
    notes: z.string().optional().describe("Additional notes from the attendee"),
    guests: z.array(z.string().email()).optional().describe("List of guest email addresses"),
    location: z.string().optional().describe("Meeting location (if applicable)"),
    metadata: z
        .record(z.unknown())
        .optional()
        .describe("Additional metadata to attach to the booking")
});

export type CreateBookingParams = z.infer<typeof createBookingSchema>;

/**
 * Create Booking operation definition
 */
export const createBookingOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createBooking",
            name: "Create Booking",
            description: "Create a new booking for an event type",
            category: "scheduling",
            actionType: "write",
            inputSchema: createBookingSchema,
            inputSchemaJSON: toJSONSchema(createBookingSchema),
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "CalCom", err: error },
            "Failed to create createBookingOperation"
        );
        throw new Error(
            `Failed to create createBooking operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create booking operation
 */
export async function executeCreateBooking(
    client: CalComClient,
    params: CreateBookingParams
): Promise<OperationResult> {
    try {
        const response = await client.createBooking({
            eventTypeId: params.eventTypeId,
            start: params.start,
            end: params.end,
            responses: {
                name: params.name,
                email: params.email,
                notes: params.notes,
                guests: params.guests,
                location: params.location
                    ? {
                          value: params.location
                      }
                    : undefined
            },
            timeZone: params.timeZone,
            language: params.language || "en",
            metadata: params.metadata
        });

        const booking = response.data;

        return {
            success: true,
            data: {
                id: booking.id,
                uid: booking.uid,
                title: booking.title,
                description: booking.description,
                startTime: booking.startTime,
                endTime: booking.endTime,
                status: booking.status,
                location: booking.location,
                meetingUrl: booking.meetingUrl,
                eventTypeId: booking.eventTypeId,
                attendees: booking.attendees.map((a) => ({
                    id: a.id,
                    email: a.email,
                    name: a.name,
                    timeZone: a.timeZone
                })),
                guests: booking.guests,
                createdAt: booking.createdAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create booking",
                retryable: false
            }
        };
    }
}
