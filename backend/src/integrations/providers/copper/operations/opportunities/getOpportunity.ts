import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperOpportunity } from "../types";

/**
 * Get Opportunity operation schema
 */
export const getOpportunitySchema = z.object({
    opportunity_id: z.number().describe("The ID of the opportunity to retrieve")
});

export type GetOpportunityParams = z.infer<typeof getOpportunitySchema>;

/**
 * Get Opportunity operation definition
 */
export const getOpportunityOperation: OperationDefinition = {
    id: "getOpportunity",
    name: "Get Opportunity",
    description: "Get a specific opportunity by ID from Copper CRM",
    category: "opportunities",
    inputSchema: getOpportunitySchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get opportunity operation
 */
export async function executeGetOpportunity(
    client: CopperClient,
    params: GetOpportunityParams
): Promise<OperationResult> {
    try {
        const opportunity = await client.get<CopperOpportunity>(
            `/opportunities/${params.opportunity_id}`
        );

        return {
            success: true,
            data: opportunity
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get opportunity",
                retryable: false
            }
        };
    }
}
