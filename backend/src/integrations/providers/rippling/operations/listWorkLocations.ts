import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { RipplingClient } from "../client/RipplingClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Work Locations operation schema
 */
export const listWorkLocationsSchema = z.object({});

export type ListWorkLocationsParams = z.infer<typeof listWorkLocationsSchema>;

/**
 * List Work Locations operation definition
 */
export const listWorkLocationsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listWorkLocations",
            name: "List Work Locations",
            description: "List all work locations in Rippling with addresses",
            category: "hr",
            actionType: "read",
            inputSchema: listWorkLocationsSchema,
            inputSchemaJSON: toJSONSchema(listWorkLocationsSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Rippling", err: error },
            "Failed to create listWorkLocationsOperation"
        );
        throw new Error(
            `Failed to create listWorkLocations operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list work locations operation
 */
export async function executeListWorkLocations(
    client: RipplingClient,
    _params: ListWorkLocationsParams
): Promise<OperationResult> {
    try {
        const response = await client.listWorkLocations();

        return {
            success: true,
            data: {
                workLocations: response.data.map((location) => ({
                    id: location.id,
                    name: location.name,
                    address: {
                        street1: location.address.street1,
                        street2: location.address.street2,
                        city: location.address.city,
                        state: location.address.state,
                        postalCode: location.address.postalCode,
                        country: location.address.country
                    },
                    timezone: location.timezone,
                    isPrimary: location.isPrimary,
                    employeeCount: location.employeeCount
                })),
                pagination: {
                    total: response.pagination.total,
                    limit: response.pagination.limit,
                    offset: response.pagination.offset,
                    hasMore: response.pagination.hasMore
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list work locations",
                retryable: true
            }
        };
    }
}
