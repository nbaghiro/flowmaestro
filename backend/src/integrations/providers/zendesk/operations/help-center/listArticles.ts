import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { ArticlesResponse } from "../../types";

/**
 * List Articles Parameters
 */
export const listArticlesSchema = z.object({
    section_id: z.number().optional().describe("Filter articles by section ID"),
    category_id: z.number().optional().describe("Filter articles by category ID"),
    locale: z.string().optional().describe("Filter by locale (e.g., 'en-us')"),
    page: z.number().optional().describe("Page number (default: 1)"),
    per_page: z.number().min(1).max(100).optional().describe("Results per page (max: 100)"),
    sort_by: z
        .enum(["position", "title", "created_at", "updated_at"])
        .optional()
        .describe("Field to sort by"),
    sort_order: z.enum(["asc", "desc"]).optional().describe("Sort order")
});

export type ListArticlesParams = z.infer<typeof listArticlesSchema>;

/**
 * Operation Definition
 */
export const listArticlesOperation: OperationDefinition = {
    id: "listArticles",
    name: "List Articles",
    description: "List Help Center articles with optional filtering by section or category",
    category: "help-center",
    inputSchema: listArticlesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute List Articles
 */
export async function executeListArticles(
    client: ZendeskClient,
    params: ListArticlesParams
): Promise<OperationResult> {
    try {
        // Determine endpoint based on filters
        let endpoint = "/help_center/articles.json";
        if (params.section_id) {
            endpoint = `/help_center/sections/${params.section_id}/articles.json`;
        } else if (params.category_id) {
            endpoint = `/help_center/categories/${params.category_id}/articles.json`;
        }

        const queryParams: Record<string, unknown> = {};
        if (params.locale) queryParams.locale = params.locale;
        if (params.page) queryParams.page = params.page;
        if (params.per_page) queryParams.per_page = params.per_page;
        if (params.sort_by) queryParams.sort_by = params.sort_by;
        if (params.sort_order) queryParams.sort_order = params.sort_order;

        const response = await client.get<ArticlesResponse>(endpoint, queryParams);

        return {
            success: true,
            data: {
                articles: response.articles,
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
                message: error instanceof Error ? error.message : "Failed to list articles",
                retryable: true
            }
        };
    }
}
