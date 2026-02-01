import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { CalComClient } from "../client/CalComClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Event Type operation schema
 */
export const getEventTypeSchema = z.object({
    id: z.number().describe("Event type ID")
});

export type GetEventTypeParams = z.infer<typeof getEventTypeSchema>;

/**
 * Get Event Type operation definition
 */
export const getEventTypeOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getEventType",
            name: "Get Event Type",
            description: "Get details of a specific event type by ID",
            category: "data",
            actionType: "read",
            inputSchema: getEventTypeSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "CalCom", err: error }, "Failed to create getEventTypeOperation");
        throw new Error(
            `Failed to create getEventType operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get event type operation
 */
export async function executeGetEventType(
    client: CalComClient,
    params: GetEventTypeParams
): Promise<OperationResult> {
    try {
        const response = await client.getEventType(params.id);
        const eventType = response.data;

        return {
            success: true,
            data: {
                id: eventType.id,
                title: eventType.title,
                slug: eventType.slug,
                description: eventType.description,
                length: eventType.length,
                locations: eventType.locations,
                requiresConfirmation: eventType.requiresConfirmation,
                recurringEvent: eventType.recurringEvent,
                disableGuests: eventType.disableGuests,
                hideCalendarNotes: eventType.hideCalendarNotes,
                minimumBookingNotice: eventType.minimumBookingNotice,
                beforeEventBuffer: eventType.beforeEventBuffer,
                afterEventBuffer: eventType.afterEventBuffer,
                schedulingType: eventType.schedulingType,
                price: eventType.price,
                currency: eventType.currency,
                slotInterval: eventType.slotInterval,
                successRedirectUrl: eventType.successRedirectUrl,
                seatsPerTimeSlot: eventType.seatsPerTimeSlot,
                seatsShowAttendees: eventType.seatsShowAttendees,
                seatsShowAvailabilityCount: eventType.seatsShowAvailabilityCount,
                bookingFields: eventType.bookingFields,
                bookingLimits: eventType.bookingLimits,
                durationLimits: eventType.durationLimits,
                hosts: eventType.hosts,
                metadata: eventType.metadata
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get event type",
                retryable: true
            }
        };
    }
}
