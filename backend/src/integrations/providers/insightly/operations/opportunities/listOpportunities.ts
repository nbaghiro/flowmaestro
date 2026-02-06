import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { InsightlyOpportunity } from "../types";

/**
 * List Opportunities operation schema
 */
export const listOpportunitiesSchema = z.object({
    skip: z.number().min(0).optional().default(0),
    top: z.number().min(1).max(500).optional().default(50),
    order_by: z.string().optional().describe("Field to sort by (e.g., DATE_UPDATED_UTC desc)")
});

export type ListOpportunitiesParams = z.infer<typeof listOpportunitiesSchema>;

/**
 * List Opportunities operation definition
 */
export const listOpportunitiesOperation: OperationDefinition = {
    id: "listOpportunities",
    name: "List Opportunities",
    description: "List all opportunities in Insightly CRM with pagination",
    category: "opportunities",
    inputSchema: listOpportunitiesSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list opportunities operation
 */
export async function executeListOpportunities(
    client: InsightlyClient,
    params: ListOpportunitiesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            skip: params.skip,
            top: params.top
        };

        if (params.order_by) {
            queryParams["$orderby"] = params.order_by;
        }

        const opportunities = await client.get<InsightlyOpportunity[]>(
            "/Opportunities",
            queryParams
        );

        return {
            success: true,
            data: {
                opportunities,
                count: opportunities.length,
                skip: params.skip,
                top: params.top
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list opportunities",
                retryable: true
            }
        };
    }
}
