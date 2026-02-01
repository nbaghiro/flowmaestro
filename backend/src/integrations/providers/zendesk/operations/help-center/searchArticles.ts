import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";

/**
 * Search Articles Parameters
 */
export const searchArticlesSchema = z.object({
    query: z.string().describe("Search query for articles"),
    locale: z.string().optional().describe("Filter by locale (e.g., 'en-us')"),
    category_id: z.number().optional().describe("Filter by category ID"),
    section_id: z.number().optional().describe("Filter by section ID"),
    label_names: z.string().optional().describe("Comma-separated label names to filter by"),
    page: z.number().optional().describe("Page number (default: 1)"),
    per_page: z.number().min(1).max(100).optional().describe("Results per page (max: 100)")
});

export type SearchArticlesParams = z.infer<typeof searchArticlesSchema>;

/**
 * Operation Definition
 */
export const searchArticlesOperation: OperationDefinition = {
    id: "searchArticles",
    name: "Search Articles",
    description: "Search Help Center articles by keyword with optional filtering",
    category: "help-center",
    inputSchema: searchArticlesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Search result response type
 */
interface ArticleSearchResponse {
    results: Array<{
        id: number;
        url: string;
        html_url: string;
        title: string;
        body: string;
        locale: string;
        section_id: number;
        created_at: string;
        updated_at: string;
        result_type: string;
    }>;
    count: number;
    next_page: string | null;
    previous_page: string | null;
}

/**
 * Execute Search Articles
 */
export async function executeSearchArticles(
    client: ZendeskClient,
    params: SearchArticlesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            query: params.query
        };

        if (params.locale) queryParams.locale = params.locale;
        if (params.category_id) queryParams.category = params.category_id;
        if (params.section_id) queryParams.section = params.section_id;
        if (params.label_names) queryParams.label_names = params.label_names;
        if (params.page) queryParams.page = params.page;
        if (params.per_page) queryParams.per_page = params.per_page;

        const response = await client.get<ArticleSearchResponse>(
            "/help_center/articles/search.json",
            queryParams
        );

        return {
            success: true,
            data: {
                articles: response.results,
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
                message: error instanceof Error ? error.message : "Failed to search articles",
                retryable: true
            }
        };
    }
}
