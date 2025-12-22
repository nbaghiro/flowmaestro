import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { LinkedInClient } from "../client/LinkedInClient";
import { PostIdSchema } from "../schemas";
import type { LinkedInPost } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Post operation schema
 */
export const getPostSchema = z.object({
    postId: PostIdSchema
});

export type GetPostParams = z.infer<typeof getPostSchema>;

/**
 * Get Post operation definition
 */
export const getPostOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getPost",
            name: "Get Post",
            description: "Get details of a LinkedIn post by its URN.",
            category: "posts",
            inputSchema: getPostSchema,
            inputSchemaJSON: toJSONSchema(getPostSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        console.error("[LinkedIn] Failed to create getPostOperation:", error);
        throw new Error(
            `Failed to create getPost operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get post operation
 */
export async function executeGetPost(
    client: LinkedInClient,
    params: GetPostParams
): Promise<OperationResult> {
    try {
        const post = (await client.getPost(params.postId)) as LinkedInPost;

        return {
            success: true,
            data: {
                id: post.id,
                author: post.author,
                content: post.commentary,
                visibility: post.visibility,
                lifecycleState: post.lifecycleState,
                publishedAt: post.publishedAt,
                lastModifiedAt: post.lastModifiedAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get post",
                retryable: true
            }
        };
    }
}
