import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { CalComClient } from "../client/CalComClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Available Slots operation schema
 */
export const getAvailableSlotsSchema = z.object({
    eventTypeId: z.number().describe("Event type ID to check availability for"),
    startTime: z.string().describe("Start of the time range in ISO 8601 format"),
    endTime: z.string().describe("End of the time range in ISO 8601 format"),
    timeZone: z.string().optional().describe("Timezone for the slots (e.g., 'America/New_York')")
});

export type GetAvailableSlotsParams = z.infer<typeof getAvailableSlotsSchema>;

/**
 * Get Available Slots operation definition
 */
export const getAvailableSlotsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getAvailableSlots",
            name: "Get Available Slots",
            description: "Get available time slots for an event type within a date range",
            category: "scheduling",
            actionType: "read",
            inputSchema: getAvailableSlotsSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "CalCom", err: error },
            "Failed to create getAvailableSlotsOperation"
        );
        throw new Error(
            `Failed to create getAvailableSlots operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get available slots operation
 */
export async function executeGetAvailableSlots(
    client: CalComClient,
    params: GetAvailableSlotsParams
): Promise<OperationResult> {
    try {
        const response = await client.getAvailableSlots({
            eventTypeId: params.eventTypeId,
            startTime: params.startTime,
            endTime: params.endTime,
            timeZone: params.timeZone
        });

        // Transform the slots from { date: [{ time: string }] } to a flat array
        const slots: { date: string; time: string }[] = [];
        if (response.data?.slots) {
            for (const [date, dateSlots] of Object.entries(response.data.slots)) {
                for (const slot of dateSlots) {
                    slots.push({
                        date,
                        time: slot.time
                    });
                }
            }
        }

        return {
            success: true,
            data: {
                slots,
                totalSlots: slots.length,
                eventTypeId: params.eventTypeId,
                startTime: params.startTime,
                endTime: params.endTime,
                timeZone: params.timeZone || null
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get available slots",
                retryable: true
            }
        };
    }
}
