import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { CalendlyClient } from "../client/CalendlyClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Scheduled Event operation schema
 */
export const getScheduledEventSchema = z.object({
    uuid: z.string().describe("Scheduled event UUID (extracted from the event URI)")
});

export type GetScheduledEventParams = z.infer<typeof getScheduledEventSchema>;

/**
 * Get Scheduled Event operation definition
 */
export const getScheduledEventOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getScheduledEvent",
            name: "Get Scheduled Event",
            description: "Get details of a specific scheduled event",
            category: "data",
            actionType: "read",
            inputSchema: getScheduledEventSchema,
            inputSchemaJSON: toJSONSchema(getScheduledEventSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Calendly", err: error },
            "Failed to create getScheduledEventOperation"
        );
        throw new Error(
            `Failed to create getScheduledEvent operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get scheduled event operation
 */
export async function executeGetScheduledEvent(
    client: CalendlyClient,
    params: GetScheduledEventParams
): Promise<OperationResult> {
    try {
        const response = await client.getScheduledEvent(params.uuid);
        const event = response.resource;

        return {
            success: true,
            data: {
                uri: event.uri,
                name: event.name,
                status: event.status,
                startTime: event.start_time,
                endTime: event.end_time,
                eventType: event.event_type,
                location: event.location,
                inviteesCounter: {
                    total: event.invitees_counter.total,
                    active: event.invitees_counter.active,
                    limit: event.invitees_counter.limit
                },
                eventMemberships: event.event_memberships,
                eventGuests: event.event_guests,
                cancellation: event.cancellation
                    ? {
                          canceledBy: event.cancellation.canceled_by,
                          reason: event.cancellation.reason,
                          cancelerType: event.cancellation.canceler_type,
                          createdAt: event.cancellation.created_at
                      }
                    : null,
                createdAt: event.created_at,
                updatedAt: event.updated_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get scheduled event",
                retryable: true
            }
        };
    }
}
