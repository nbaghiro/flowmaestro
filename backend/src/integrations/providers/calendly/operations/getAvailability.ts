import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { CalendlyClient } from "../client/CalendlyClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Availability operation schema
 */
export const getAvailabilitySchema = z.object({
    eventType: z.string().describe("Event type URI"),
    startTime: z.string().describe("ISO 8601 datetime - start of availability window"),
    endTime: z.string().describe("ISO 8601 datetime - end of availability window")
});

export type GetAvailabilityParams = z.infer<typeof getAvailabilitySchema>;

/**
 * Get Availability operation definition
 */
export const getAvailabilityOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getAvailability",
            name: "Get Availability",
            description: "Get available time slots for an event type",
            category: "scheduling",
            actionType: "read",
            inputSchema: getAvailabilitySchema,
            inputSchemaJSON: toJSONSchema(getAvailabilitySchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Calendly", err: error },
            "Failed to create getAvailabilityOperation"
        );
        throw new Error(
            `Failed to create getAvailability operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get availability operation
 */
export async function executeGetAvailability(
    client: CalendlyClient,
    params: GetAvailabilityParams
): Promise<OperationResult> {
    try {
        const response = await client.getAvailability({
            event_type: params.eventType,
            start_time: params.startTime,
            end_time: params.endTime
        });

        return {
            success: true,
            data: {
                availableTimes: response.collection.map((slot) => ({
                    status: slot.status,
                    inviteesRemaining: slot.invitees_remaining,
                    startTime: slot.start_time,
                    schedulingUrl: slot.scheduling_url
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get availability",
                retryable: true
            }
        };
    }
}
