import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoListResponse, ZohoDeal } from "../types";

/**
 * Search Deals Parameters
 */
export const searchDealsSchema = z.object({
    criteria: z.string().min(1, "Search criteria is required"),
    word: z.string().optional(),
    page: z.number().min(1).optional().default(1),
    per_page: z.number().min(1).max(200).optional().default(200),
    fields: z.array(z.string()).optional()
});

export type SearchDealsParams = z.infer<typeof searchDealsSchema>;

/**
 * Operation Definition
 */
export const searchDealsOperation: OperationDefinition = {
    id: "searchDeals",
    name: "Search Deals",
    description: "Search deals using criteria or word",
    category: "crm",
    inputSchema: searchDealsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute Search Deals
 */
export async function executeSearchDeals(
    client: ZohoCrmClient,
    params: SearchDealsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            page: params.page,
            per_page: params.per_page
        };

        if (params.criteria) {
            queryParams.criteria = params.criteria;
        }

        if (params.word) {
            queryParams.word = params.word;
        }

        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(",");
        }

        const response = await client.get<ZohoListResponse<ZohoDeal>>(
            "/crm/v8/Deals/search",
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
                message: error instanceof Error ? error.message : "Failed to search deals",
                retryable: false
            }
        };
    }
}
