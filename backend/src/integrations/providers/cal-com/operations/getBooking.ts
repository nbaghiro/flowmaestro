import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { CalComClient } from "../client/CalComClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Booking operation schema
 */
export const getBookingSchema = z.object({
    uid: z.string().describe("Booking UID")
});

export type GetBookingParams = z.infer<typeof getBookingSchema>;

/**
 * Get Booking operation definition
 */
export const getBookingOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getBooking",
            name: "Get Booking",
            description: "Get details of a specific booking by UID",
            category: "data",
            actionType: "read",
            inputSchema: getBookingSchema,
            inputSchemaJSON: toJSONSchema(getBookingSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "CalCom", err: error }, "Failed to create getBookingOperation");
        throw new Error(
            `Failed to create getBooking operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get booking operation
 */
export async function executeGetBooking(
    client: CalComClient,
    params: GetBookingParams
): Promise<OperationResult> {
    try {
        const response = await client.getBooking(params.uid);
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
                cancellationReason: booking.cancellationReason,
                rejectionReason: booking.rejectionReason,
                rescheduledFromUid: booking.rescheduledFromUid,
                eventTypeId: booking.eventTypeId,
                attendees: booking.attendees.map((a) => ({
                    id: a.id,
                    email: a.email,
                    name: a.name,
                    timeZone: a.timeZone,
                    locale: a.locale
                })),
                guests: booking.guests,
                createdAt: booking.createdAt,
                updatedAt: booking.updatedAt,
                responses: booking.responses,
                metadata: booking.metadata
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get booking",
                retryable: true
            }
        };
    }
}
