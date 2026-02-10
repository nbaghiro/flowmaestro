import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { InsightlyOpportunity } from "../types";

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
    description: "Get a specific opportunity by ID from Insightly CRM",
    category: "opportunities",
    inputSchema: getOpportunitySchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get opportunity operation
 */
export async function executeGetOpportunity(
    client: InsightlyClient,
    params: GetOpportunityParams
): Promise<OperationResult> {
    try {
        const opportunity = await client.get<InsightlyOpportunity>(
            `/Opportunities/${params.opportunity_id}`
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
