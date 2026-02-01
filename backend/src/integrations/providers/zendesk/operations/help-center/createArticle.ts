import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { ArticleResponse } from "../../types";

/**
 * Create Article Parameters
 */
export const createArticleSchema = z.object({
    section_id: z.number().describe("The section ID to create the article in"),
    title: z.string().min(1).describe("Article title"),
    body: z.string().describe("Article body content (HTML)"),
    locale: z.string().optional().describe("Article locale (default: account default locale)"),
    user_segment_id: z.number().nullable().optional().describe("User segment ID for visibility"),
    permission_group_id: z.number().optional().describe("Permission group ID for editing access"),
    draft: z.boolean().optional().describe("Whether the article is a draft (default: true)"),
    promoted: z.boolean().optional().describe("Whether to promote the article"),
    position: z.number().optional().describe("Position in the section"),
    label_names: z.array(z.string()).optional().describe("Labels to apply to the article")
});

export type CreateArticleParams = z.infer<typeof createArticleSchema>;

/**
 * Operation Definition
 */
export const createArticleOperation: OperationDefinition = {
    id: "createArticle",
    name: "Create Article",
    description: "Create a new Help Center article in a section",
    category: "help-center",
    inputSchema: createArticleSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute Create Article
 */
export async function executeCreateArticle(
    client: ZendeskClient,
    params: CreateArticleParams
): Promise<OperationResult> {
    try {
        const { section_id, ...articleFields } = params;

        const response = await client.post<ArticleResponse>(
            `/help_center/sections/${section_id}/articles.json`,
            { article: articleFields }
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
                message: error instanceof Error ? error.message : "Failed to create article",
                retryable: false
            }
        };
    }
}
