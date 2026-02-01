import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { ArticleResponse } from "../../types";

/**
 * Get Article Parameters
 */
export const getArticleSchema = z.object({
    article_id: z.number().describe("The ID of the article to retrieve"),
    locale: z.string().optional().describe("Locale for the article (e.g., 'en-us')")
});

export type GetArticleParams = z.infer<typeof getArticleSchema>;

/**
 * Operation Definition
 */
export const getArticleOperation: OperationDefinition = {
    id: "getArticle",
    name: "Get Article",
    description: "Get a Help Center article by ID",
    category: "help-center",
    inputSchema: getArticleSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Article
 */
export async function executeGetArticle(
    client: ZendeskClient,
    params: GetArticleParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};
        if (params.locale) queryParams.locale = params.locale;

        const response = await client.get<ArticleResponse>(
            `/help_center/articles/${params.article_id}.json`,
            queryParams
        );

        return {
            success: true,
            data: response.article
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get article",
                retryable: false
            }
        };
    }
}
