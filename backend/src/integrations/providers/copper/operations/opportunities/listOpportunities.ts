import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperOpportunity } from "../types";

/**
 * List Opportunities operation schema
 */
export const listOpportunitiesSchema = z.object({
    page_number: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(200).optional().default(50),
    sort_by: z.string().optional(),
    sort_direction: z.enum(["asc", "desc"]).optional()
});

export type ListOpportunitiesParams = z.infer<typeof listOpportunitiesSchema>;

/**
 * List Opportunities operation definition
 */
export const listOpportunitiesOperation: OperationDefinition = {
    id: "listOpportunities",
    name: "List Opportunities",
    description: "List all opportunities in Copper CRM with pagination",
    category: "opportunities",
    inputSchema: listOpportunitiesSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list opportunities operation
 */
export async function executeListOpportunities(
    client: CopperClient,
    params: ListOpportunitiesParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            page_number: params.page_number,
            page_size: params.page_size
        };

        if (params.sort_by) {
            requestBody.sort_by = params.sort_by;
            requestBody.sort_direction = params.sort_direction || "asc";
        }

        const opportunities = await client.post<CopperOpportunity[]>(
            "/opportunities/search",
            requestBody
        );

        return {
            success: true,
            data: {
                opportunities,
                count: opportunities.length,
                page: params.page_number,
                page_size: params.page_size
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
