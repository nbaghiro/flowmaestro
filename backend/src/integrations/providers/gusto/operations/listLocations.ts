import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { GustoClient } from "../client/GustoClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Locations operation schema
 */
export const listLocationsSchema = z.object({
    companyId: z.string().describe("The Gusto company UUID")
});

export type ListLocationsParams = z.infer<typeof listLocationsSchema>;

/**
 * List Locations operation definition
 */
export const listLocationsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listLocations",
            name: "List Locations",
            description: "List all locations for a company in Gusto",
            category: "hr",
            actionType: "read",
            inputSchema: listLocationsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Gusto", err: error }, "Failed to create listLocationsOperation");
        throw new Error(
            `Failed to create listLocations operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list locations operation
 */
export async function executeListLocations(
    client: GustoClient,
    params: ListLocationsParams
): Promise<OperationResult> {
    try {
        const locations = await client.listLocations(params.companyId);

        return {
            success: true,
            data: {
                locations: locations.map((loc) => ({
                    uuid: loc.uuid,
                    companyUuid: loc.company_uuid,
                    street1: loc.street_1,
                    street2: loc.street_2,
                    city: loc.city,
                    state: loc.state,
                    zip: loc.zip,
                    country: loc.country,
                    active: loc.active
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list locations",
                retryable: true
            }
        };
    }
}
