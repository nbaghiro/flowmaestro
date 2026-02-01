import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { CalComClient } from "../client/CalComClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Cancel Booking operation schema
 */
export const cancelBookingSchema = z.object({
    uid: z.string().describe("Booking UID to cancel"),
    cancellationReason: z.string().optional().describe("Reason for cancellation")
});

export type CancelBookingParams = z.infer<typeof cancelBookingSchema>;

/**
 * Cancel Booking operation definition
 */
export const cancelBookingOperation: OperationDefinition = (() => {
    try {
        return {
            id: "cancelBooking",
            name: "Cancel Booking",
            description: "Cancel an existing booking",
            category: "scheduling",
            actionType: "write",
            inputSchema: cancelBookingSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "CalCom", err: error },
            "Failed to create cancelBookingOperation"
        );
        throw new Error(
            `Failed to create cancelBooking operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute cancel booking operation
 */
export async function executeCancelBooking(
    client: CalComClient,
    params: CancelBookingParams
): Promise<OperationResult> {
    try {
        const response = await client.cancelBooking(params.uid, params.cancellationReason);
        const booking = response.data;

        return {
            success: true,
            data: {
                cancelled: true,
                bookingUid: params.uid,
                status: booking.status,
                cancellationReason: booking.cancellationReason || params.cancellationReason || null
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to cancel booking",
                retryable: false
            }
        };
    }
}
