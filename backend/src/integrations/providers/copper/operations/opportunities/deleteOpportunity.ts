import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Delete Opportunity operation schema
 */
export const deleteOpportunitySchema = z.object({
    opportunity_id: z.number().describe("The ID of the opportunity to delete")
});

export type DeleteOpportunityParams = z.infer<typeof deleteOpportunitySchema>;

/**
 * Delete Opportunity operation definition
 */
export const deleteOpportunityOperation: OperationDefinition = {
    id: "deleteOpportunity",
    name: "Delete Opportunity",
    description: "Delete an opportunity from Copper CRM",
    category: "opportunities",
    inputSchema: deleteOpportunitySchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute delete opportunity operation
 */
export async function executeDeleteOpportunity(
    client: CopperClient,
    params: DeleteOpportunityParams
): Promise<OperationResult> {
    try {
        await client.delete(`/opportunities/${params.opportunity_id}`);

        return {
            success: true,
            data: {
                deleted: true,
                opportunity_id: params.opportunity_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete opportunity",
                retryable: false
            }
        };
    }
}
