import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { ArticleResponse } from "../../types";

/**
 * Update Article Parameters
 */
export const updateArticleSchema = z.object({
    article_id: z.number().describe("The ID of the article to update"),
    title: z.string().optional().describe("Updated article title"),
    body: z.string().optional().describe("Updated article body content (HTML)"),
    user_segment_id: z.number().nullable().optional().describe("User segment ID for visibility"),
    permission_group_id: z.number().optional().describe("Permission group ID for editing access"),
    draft: z.boolean().optional().describe("Whether the article is a draft"),
    promoted: z.boolean().optional().describe("Whether to promote the article"),
    position: z.number().optional().describe("Position in the section"),
    label_names: z.array(z.string()).optional().describe("Labels to apply to the article")
});

export type UpdateArticleParams = z.infer<typeof updateArticleSchema>;

/**
 * Operation Definition
 */
export const updateArticleOperation: OperationDefinition = {
    id: "updateArticle",
    name: "Update Article",
    description: "Update an existing Help Center article",
    category: "help-center",
    inputSchema: updateArticleSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute Update Article
 */
export async function executeUpdateArticle(
    client: ZendeskClient,
    params: UpdateArticleParams
): Promise<OperationResult> {
    try {
        const { article_id, ...updateFields } = params;

        const response = await client.put<ArticleResponse>(
            `/help_center/articles/${article_id}.json`,
            { article: updateFields }
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
                message: error instanceof Error ? error.message : "Failed to update article",
                retryable: false
            }
        };
    }
}
