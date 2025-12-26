import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { LinkedInClient } from "../client/LinkedInClient";
import { PostContentSchema, AuthorUrnSchema, VisibilitySchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import { getLogger } from "../../../../core/logging";

const logger = getLogger();

/**
 * Create Post operation schema
 */
export const createPostSchema = z.object({
    author: AuthorUrnSchema,
    content: PostContentSchema,
    visibility: VisibilitySchema
});

export type CreatePostParams = z.infer<typeof createPostSchema>;

/**
 * Create Post operation definition
 */
export const createPostOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createPost",
            name: "Create Post",
            description:
                "Create a new text post on LinkedIn. Use the author URN from getProfile (urn:li:person:xxx) or an organization URN.",
            category: "posts",
            inputSchema: createPostSchema,
            inputSchemaJSON: toJSONSchema(createPostSchema),
            retryable: false, // Don't retry to avoid duplicate posts
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "LinkedIn", err: error }, "Failed to create createPostOperation");
        throw new Error(
            `Failed to create createPost operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create post operation
 */
export async function executeCreatePost(
    client: LinkedInClient,
    params: CreatePostParams
): Promise<OperationResult> {
    try {
        const response = (await client.createPost({
            author: params.author,
            commentary: params.content,
            visibility: params.visibility
        })) as { id?: string } | string;

        // LinkedIn returns the post ID in the x-restli-id header or response
        const postId = typeof response === "string" ? response : response.id;

        return {
            success: true,
            data: {
                postId,
                author: params.author,
                content: params.content,
                visibility: params.visibility
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create post",
                retryable: false
            }
        };
    }
}
