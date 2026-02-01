import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseListResponse, CloseOpportunity } from "../types";

/**
 * List Opportunities Parameters
 */
export const listOpportunitiesSchema = z.object({
    _skip: z.number().int().min(0).optional().default(0).describe("Number of items to skip"),
    _limit: z.number().int().min(1).max(100).optional().default(50).describe("Items per page"),
    lead_id: z.string().optional().describe("Filter by lead ID"),
    status_id: z.string().optional().describe("Filter by status ID"),
    user_id: z.string().optional().describe("Filter by assigned user ID"),
    _fields: z.array(z.string()).optional().describe("Fields to include in response")
});

export type ListOpportunitiesParams = z.infer<typeof listOpportunitiesSchema>;

/**
 * Operation Definition
 */
export const listOpportunitiesOperation: OperationDefinition = {
    id: "listOpportunities",
    name: "List Opportunities",
    description: "Get all opportunities with optional filtering and pagination",
    category: "opportunities",
    inputSchema: listOpportunitiesSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute List Opportunities
 */
export async function executeListOpportunities(
    client: CloseClient,
    params: ListOpportunitiesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            _skip: params._skip,
            _limit: params._limit
        };

        if (params.lead_id) {
            queryParams.lead_id = params.lead_id;
        }
        if (params.status_id) {
            queryParams.status_id = params.status_id;
        }
        if (params.user_id) {
            queryParams.user_id = params.user_id;
        }
        if (params._fields && params._fields.length > 0) {
            queryParams._fields = params._fields.join(",");
        }

        const response = await client.get<CloseListResponse<CloseOpportunity>>(
            "/opportunity/",
            queryParams
        );

        return {
            success: true,
            data: {
                opportunities: response.data,
                has_more: response.has_more,
                total_results: response.total_results
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
