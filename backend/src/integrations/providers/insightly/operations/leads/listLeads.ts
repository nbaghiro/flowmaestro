import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { InsightlyLead } from "../types";

/**
 * List Leads operation schema
 */
export const listLeadsSchema = z.object({
    skip: z.number().min(0).optional().default(0),
    top: z.number().min(1).max(500).optional().default(50),
    order_by: z.string().optional().describe("Field to sort by (e.g., DATE_UPDATED_UTC desc)")
});

export type ListLeadsParams = z.infer<typeof listLeadsSchema>;

/**
 * List Leads operation definition
 */
export const listLeadsOperation: OperationDefinition = {
    id: "listLeads",
    name: "List Leads",
    description: "List all leads in Insightly CRM with pagination",
    category: "leads",
    inputSchema: listLeadsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list leads operation
 */
export async function executeListLeads(
    client: InsightlyClient,
    params: ListLeadsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            skip: params.skip,
            top: params.top
        };

        if (params.order_by) {
            queryParams["$orderby"] = params.order_by;
        }

        const leads = await client.get<InsightlyLead[]>("/Leads", queryParams);

        return {
            success: true,
            data: {
                leads,
                count: leads.length,
                skip: params.skip,
                top: params.top
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
