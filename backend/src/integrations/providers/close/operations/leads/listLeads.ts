import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseListResponse, CloseLead } from "../types";

/**
 * List Leads Parameters
 */
export const listLeadsSchema = z.object({
    _skip: z.number().int().min(0).optional().default(0).describe("Number of items to skip"),
    _limit: z.number().int().min(1).max(100).optional().default(50).describe("Items per page"),
    _fields: z.array(z.string()).optional().describe("Fields to include in response"),
    query: z.string().optional().describe("Search query string")
});

export type ListLeadsParams = z.infer<typeof listLeadsSchema>;

/**
 * Operation Definition
 */
export const listLeadsOperation: OperationDefinition = {
    id: "listLeads",
    name: "List Leads",
    description: "Get all leads (companies) with optional filtering and pagination",
    category: "leads",
    inputSchema: listLeadsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute List Leads
 */
export async function executeListLeads(
    client: CloseClient,
    params: ListLeadsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            _skip: params._skip,
            _limit: params._limit
        };

        if (params._fields && params._fields.length > 0) {
            queryParams._fields = params._fields.join(",");
        }
        if (params.query) {
            queryParams.query = params.query;
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
                message: error instanceof Error ? error.message : "Failed to list leads",
                retryable: true
            }
        };
    }
}
