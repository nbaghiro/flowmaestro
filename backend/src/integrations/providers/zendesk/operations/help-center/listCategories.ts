import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { CategoriesResponse } from "../../types";

/**
 * List Categories Parameters
 */
export const listCategoriesSchema = z.object({
    locale: z.string().optional().describe("Filter by locale (e.g., 'en-us')"),
    page: z.number().optional().describe("Page number (default: 1)"),
    per_page: z.number().min(1).max(100).optional().describe("Results per page (max: 100)"),
    sort_by: z
        .enum(["position", "name", "created_at", "updated_at"])
        .optional()
        .describe("Field to sort by"),
    sort_order: z.enum(["asc", "desc"]).optional().describe("Sort order")
});

export type ListCategoriesParams = z.infer<typeof listCategoriesSchema>;

/**
 * Operation Definition
 */
export const listCategoriesOperation: OperationDefinition = {
    id: "listCategories",
    name: "List Categories",
    description: "List Help Center categories",
    category: "help-center",
    inputSchema: listCategoriesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute List Categories
 */
export async function executeListCategories(
    client: ZendeskClient,
    params: ListCategoriesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};
        if (params.locale) queryParams.locale = params.locale;
        if (params.page) queryParams.page = params.page;
        if (params.per_page) queryParams.per_page = params.per_page;
        if (params.sort_by) queryParams.sort_by = params.sort_by;
        if (params.sort_order) queryParams.sort_order = params.sort_order;

        const response = await client.get<CategoriesResponse>(
            "/help_center/categories.json",
            queryParams
        );

        return {
            success: true,
            data: {
                categories: response.categories,
                count: response.count,
                next_page: response.next_page,
                previous_page: response.previous_page
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list categories",
                retryable: true
            }
        };
    }
}
