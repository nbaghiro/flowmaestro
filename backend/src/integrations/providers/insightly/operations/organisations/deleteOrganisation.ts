import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Delete Organisation operation schema
 */
export const deleteOrganisationSchema = z.object({
    organisation_id: z.number().describe("The ID of the organisation to delete")
});

export type DeleteOrganisationParams = z.infer<typeof deleteOrganisationSchema>;

/**
 * Delete Organisation operation definition
 */
export const deleteOrganisationOperation: OperationDefinition = {
    id: "deleteOrganisation",
    name: "Delete Organisation",
    description: "Delete an organisation from Insightly CRM",
    category: "organisations",
    inputSchema: deleteOrganisationSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute delete organisation operation
 */
export async function executeDeleteOrganisation(
    client: InsightlyClient,
    params: DeleteOrganisationParams
): Promise<OperationResult> {
    try {
        await client.delete(`/Organisations/${params.organisation_id}`);

        return {
            success: true,
            data: {
                deleted: true,
                organisation_id: params.organisation_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete organisation",
                retryable: false
            }
        };
    }
}
