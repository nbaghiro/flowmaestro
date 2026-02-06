import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperLead } from "../types";

/**
 * List Leads operation schema
 */
export const listLeadsSchema = z.object({
    page_number: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(200).optional().default(50),
    sort_by: z.string().optional(),
    sort_direction: z.enum(["asc", "desc"]).optional()
});

export type ListLeadsParams = z.infer<typeof listLeadsSchema>;

/**
 * List Leads operation definition
 */
export const listLeadsOperation: OperationDefinition = {
    id: "listLeads",
    name: "List Leads",
    description: "List all leads in Copper CRM with pagination",
    category: "leads",
    inputSchema: listLeadsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list leads operation
 */
export async function executeListLeads(
    client: CopperClient,
    params: ListLeadsParams
): Promise<OperationResult> {
    try {
        // Copper uses POST for search/list operations
        const requestBody: Record<string, unknown> = {
            page_number: params.page_number,
            page_size: params.page_size
        };

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
                message: error instanceof Error ? error.message : "Failed to list leads",
                retryable: true
            }
        };
    }
}
