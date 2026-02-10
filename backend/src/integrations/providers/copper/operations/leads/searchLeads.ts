import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperLead } from "../types";

/**
 * Search Leads operation schema
 */
export const searchLeadsSchema = z.object({
    name: z.string().optional().describe("Search by name (partial match)"),
    email: z.string().optional().describe("Search by email"),
    company_name: z.string().optional().describe("Search by company name"),
    status_ids: z.array(z.number()).optional().describe("Filter by status IDs"),
    assignee_ids: z.array(z.number()).optional().describe("Filter by assignee user IDs"),
    tags: z.array(z.string()).optional().describe("Filter by tags"),
    minimum_monetary_value: z.number().optional().describe("Minimum monetary value"),
    maximum_monetary_value: z.number().optional().describe("Maximum monetary value"),
    page_number: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(200).optional().default(50),
    sort_by: z.string().optional(),
    sort_direction: z.enum(["asc", "desc"]).optional()
});

export type SearchLeadsParams = z.infer<typeof searchLeadsSchema>;

/**
 * Search Leads operation definition
 */
export const searchLeadsOperation: OperationDefinition = {
    id: "searchLeads",
    name: "Search Leads",
    description: "Search for leads in Copper CRM with filters",
    category: "leads",
    inputSchema: searchLeadsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute search leads operation
 */
export async function executeSearchLeads(
    client: CopperClient,
    params: SearchLeadsParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            page_number: params.page_number,
            page_size: params.page_size
        };

        if (params.name) {
            requestBody.name = params.name;
        }
        if (params.email) {
            requestBody.emails = [params.email];
        }
        if (params.company_name) {
            requestBody.company_name = params.company_name;
        }
        if (params.status_ids && params.status_ids.length > 0) {
            requestBody.status_ids = params.status_ids;
        }
        if (params.assignee_ids && params.assignee_ids.length > 0) {
            requestBody.assignee_ids = params.assignee_ids;
        }
        if (params.tags && params.tags.length > 0) {
            requestBody.tags = params.tags;
        }
        if (params.minimum_monetary_value !== undefined) {
            requestBody.minimum_monetary_value = params.minimum_monetary_value;
        }
        if (params.maximum_monetary_value !== undefined) {
            requestBody.maximum_monetary_value = params.maximum_monetary_value;
        }
        if (params.sort_by) {
            requestBody.sort_by = params.sort_by;
            requestBody.sort_direction = params.sort_direction || "asc";
        }

        const leads = await client.post<CopperLead[]>("/leads/search", requestBody);

        return {
            success: true,
            data: {
                leads,
                count: leads.length,
                page: params.page_number,
                page_size: params.page_size
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
