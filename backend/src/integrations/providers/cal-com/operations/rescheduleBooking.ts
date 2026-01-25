import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { CalComClient } from "../client/CalComClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Reschedule Booking operation schema
 */
export const rescheduleBookingSchema = z.object({
    uid: z.string().describe("Booking UID to reschedule"),
    start: z.string().describe("New start time in ISO 8601 format"),
    rescheduledReason: z.string().optional().describe("Reason for rescheduling")
});

export type RescheduleBookingParams = z.infer<typeof rescheduleBookingSchema>;

/**
 * Reschedule Booking operation definition
 */
export const rescheduleBookingOperation: OperationDefinition = (() => {
    try {
        return {
            id: "rescheduleBooking",
            name: "Reschedule Booking",
            description: "Reschedule an existing booking to a new time",
            category: "scheduling",
            actionType: "write",
            inputSchema: rescheduleBookingSchema,
            inputSchemaJSON: toJSONSchema(rescheduleBookingSchema),
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "CalCom", err: error },
            "Failed to create rescheduleBookingOperation"
        );
        throw new Error(
            `Failed to create rescheduleBooking operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute reschedule booking operation
 */
export async function executeRescheduleBooking(
    client: CalComClient,
    params: RescheduleBookingParams
): Promise<OperationResult> {
    try {
        const response = await client.rescheduleBooking(params.uid, {
            start: params.start,
            rescheduledReason: params.rescheduledReason
        });

        const booking = response.data;

        return {
            success: true,
            data: {
                rescheduled: true,
                id: booking.id,
                uid: booking.uid,
                title: booking.title,
                startTime: booking.startTime,
                endTime: booking.endTime,
                status: booking.status,
                location: booking.location,
                meetingUrl: booking.meetingUrl,
                rescheduledFromUid: booking.rescheduledFromUid,
                attendees: booking.attendees.map((a) => ({
                    id: a.id,
                    email: a.email,
                    name: a.name,
                    timeZone: a.timeZone
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to reschedule booking",
                retryable: false
            }
        };
    }
}
