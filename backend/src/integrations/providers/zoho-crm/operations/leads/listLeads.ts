import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoListResponse, ZohoLead } from "../types";

/**
 * List Leads Parameters
 */
export const listLeadsSchema = z.object({
    page: z.number().min(1).optional().default(1),
    per_page: z.number().min(1).max(200).optional().default(200),
    fields: z.array(z.string()).optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(["asc", "desc"]).optional(),
    converted: z.enum(["true", "false", "both"]).optional()
});

export type ListLeadsParams = z.infer<typeof listLeadsSchema>;

/**
 * Operation Definition
 */
export const listLeadsOperation: OperationDefinition = {
    id: "listLeads",
    name: "List Leads",
    description: "List all leads with pagination",
    category: "crm",
    inputSchema: listLeadsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute List Leads
 */
export async function executeListLeads(
    client: ZohoCrmClient,
    params: ListLeadsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            page: params.page,
            per_page: params.per_page
        };

        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(",");
        }

        if (params.sort_by) {
            queryParams.sort_by = params.sort_by;
        }

        if (params.sort_order) {
            queryParams.sort_order = params.sort_order;
        }

        if (params.converted) {
            queryParams.converted = params.converted;
        }

        const response = await client.get<ZohoListResponse<ZohoLead>>("/crm/v8/Leads", queryParams);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list leads",
                retryable: false
            }
        };
    }
}
