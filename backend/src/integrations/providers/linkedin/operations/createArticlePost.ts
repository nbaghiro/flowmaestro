import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { LinkedInClient } from "../client/LinkedInClient";
import {
    PostContentSchema,
    AuthorUrnSchema,
    VisibilitySchema,
    ArticleUrlSchema,
    ArticleTitleSchema,
    ArticleDescriptionSchema
} from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create Article Post operation schema
 */
export const createArticlePostSchema = z.object({
    author: AuthorUrnSchema,
    content: PostContentSchema,
    visibility: VisibilitySchema,
    articleUrl: ArticleUrlSchema,
    articleTitle: ArticleTitleSchema.optional(),
    articleDescription: ArticleDescriptionSchema.optional()
});

export type CreateArticlePostParams = z.infer<typeof createArticlePostSchema>;

/**
 * Create Article Post operation definition
 */
export const createArticlePostOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createArticlePost",
            name: "Create Article Post",
            description:
                "Create a LinkedIn post with an article link. The article URL will be displayed with a preview card.",
            category: "posts",
            inputSchema: createArticlePostSchema,
            inputSchemaJSON: toJSONSchema(createArticlePostSchema),
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "LinkedIn", err: error },
            "Failed to create createArticlePostOperation"
        );
        throw new Error(
            `Failed to create createArticlePost operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create article post operation
 */
export async function executeCreateArticlePost(
    client: LinkedInClient,
    params: CreateArticlePostParams
): Promise<OperationResult> {
    try {
        const response = (await client.createArticlePost({
            author: params.author,
            commentary: params.content,
            visibility: params.visibility,
            articleUrl: params.articleUrl,
            articleTitle: params.articleTitle,
            articleDescription: params.articleDescription
        })) as { id?: string } | string;

        const postId = typeof response === "string" ? response : response.id;

        return {
            success: true,
            data: {
                postId,
                author: params.author,
                content: params.content,
                visibility: params.visibility,
                articleUrl: params.articleUrl
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create article post",
                retryable: false
            }
        };
    }
}
