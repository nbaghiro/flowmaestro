import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { InsightlyOrganisation } from "../types";

/**
 * Get Organisation operation schema
 */
export const getOrganisationSchema = z.object({
    organisation_id: z.number().describe("The ID of the organisation to retrieve")
});

export type GetOrganisationParams = z.infer<typeof getOrganisationSchema>;

/**
 * Get Organisation operation definition
 */
export const getOrganisationOperation: OperationDefinition = {
    id: "getOrganisation",
    name: "Get Organisation",
    description: "Get a specific organisation by ID from Insightly CRM",
    category: "organisations",
    inputSchema: getOrganisationSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get organisation operation
 */
export async function executeGetOrganisation(
    client: InsightlyClient,
    params: GetOrganisationParams
): Promise<OperationResult> {
    try {
        const organisation = await client.get<InsightlyOrganisation>(
            `/Organisations/${params.organisation_id}`
        );

        return {
            success: true,
            data: organisation
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get organisation",
                retryable: false
            }
        };
    }
}
