import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { CalComClient } from "../client/CalComClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Event Types operation schema
 */
export const listEventTypesSchema = z.object({
    take: z.number().min(1).max(100).optional().describe("Number of results per page (1-100)"),
    skip: z.number().min(0).optional().describe("Number of results to skip for pagination")
});

export type ListEventTypesParams = z.infer<typeof listEventTypesSchema>;

/**
 * List Event Types operation definition
 */
export const listEventTypesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listEventTypes",
            name: "List Event Types",
            description: "List scheduling templates (event types) for the authenticated user",
            category: "data",
            actionType: "read",
            inputSchema: listEventTypesSchema,
            inputSchemaJSON: toJSONSchema(listEventTypesSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "CalCom", err: error },
            "Failed to create listEventTypesOperation"
        );
        throw new Error(
            `Failed to create listEventTypes operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list event types operation
 */
export async function executeListEventTypes(
    client: CalComClient,
    params: ListEventTypesParams
): Promise<OperationResult> {
    try {
        const response = await client.listEventTypes({
            take: params.take,
            skip: params.skip
        });

        return {
            success: true,
            data: {
                eventTypes: response.data.map((eventType) => ({
                    id: eventType.id,
                    title: eventType.title,
                    slug: eventType.slug,
                    description: eventType.description,
                    length: eventType.length,
                    locations: eventType.locations,
                    requiresConfirmation: eventType.requiresConfirmation,
                    price: eventType.price,
                    currency: eventType.currency,
                    slotInterval: eventType.slotInterval,
                    minimumBookingNotice: eventType.minimumBookingNotice,
                    beforeEventBuffer: eventType.beforeEventBuffer,
                    afterEventBuffer: eventType.afterEventBuffer,
                    seatsPerTimeSlot: eventType.seatsPerTimeSlot,
                    hosts: eventType.hosts
                })),
                pagination: response.pagination
                    ? {
                          totalCount: response.pagination.totalCount,
                          pageCount: response.pagination.pageCount,
                          currentPage: response.pagination.currentPage,
                          perPage: response.pagination.perPage
                      }
                    : null
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list event types",
                retryable: true
            }
        };
    }
}
