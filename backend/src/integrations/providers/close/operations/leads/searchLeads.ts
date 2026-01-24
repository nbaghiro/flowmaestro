import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseListResponse, CloseLead } from "../types";

/**
 * Search Leads Parameters
 */
export const searchLeadsSchema = z.object({
    query: z.string().min(1).describe("Search query using Close query language"),
    _skip: z.number().int().min(0).optional().default(0).describe("Number of items to skip"),
    _limit: z.number().int().min(1).max(100).optional().default(50).describe("Items per page"),
    _fields: z.array(z.string()).optional().describe("Fields to include in response")
});

export type SearchLeadsParams = z.infer<typeof searchLeadsSchema>;

/**
 * Operation Definition
 */
export const searchLeadsOperation: OperationDefinition = {
    id: "searchLeads",
    name: "Search Leads",
    description: "Search leads using advanced query language",
    category: "leads",
    inputSchema: searchLeadsSchema,
    inputSchemaJSON: toJSONSchema(searchLeadsSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute Search Leads
 */
export async function executeSearchLeads(
    client: CloseClient,
    params: SearchLeadsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            query: params.query,
            _skip: params._skip,
            _limit: params._limit
        };

        if (params._fields && params._fields.length > 0) {
            queryParams._fields = params._fields.join(",");
        }

        const response = await client.get<CloseListResponse<CloseLead>>("/lead/", queryParams);

        return {
            success: true,
            data: {
                leads: response.data,
                has_more: response.has_more,
                total_results: response.total_results
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search leads",
                retryable: true
            }
        };
    }
}
