import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoListResponse, ZohoLead } from "../types";

/**
 * Search Leads Parameters
 */
export const searchLeadsSchema = z.object({
    criteria: z.string().min(1, "Search criteria is required"),
    email: z.string().optional(),
    phone: z.string().optional(),
    word: z.string().optional(),
    page: z.number().min(1).optional().default(1),
    per_page: z.number().min(1).max(200).optional().default(200),
    fields: z.array(z.string()).optional()
});

export type SearchLeadsParams = z.infer<typeof searchLeadsSchema>;

/**
 * Operation Definition
 */
export const searchLeadsOperation: OperationDefinition = {
    id: "searchLeads",
    name: "Search Leads",
    description: "Search leads using criteria, email, phone, or word",
    category: "crm",
    inputSchema: searchLeadsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute Search Leads
 */
export async function executeSearchLeads(
    client: ZohoCrmClient,
    params: SearchLeadsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            page: params.page,
            per_page: params.per_page
        };

        if (params.criteria) {
            queryParams.criteria = params.criteria;
        }

        if (params.email) {
            queryParams.email = params.email;
        }

        if (params.phone) {
            queryParams.phone = params.phone;
        }

        if (params.word) {
            queryParams.word = params.word;
        }

        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(",");
        }

        const response = await client.get<ZohoListResponse<ZohoLead>>(
            "/crm/v8/Leads/search",
            queryParams
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search leads",
                retryable: false
            }
        };
    }
}
