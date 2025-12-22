import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { LinkedInClient } from "../client/LinkedInClient";
import { PostIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Delete Post operation schema
 */
export const deletePostSchema = z.object({
    postId: PostIdSchema
});

export type DeletePostParams = z.infer<typeof deletePostSchema>;

/**
 * Delete Post operation definition
 */
export const deletePostOperation: OperationDefinition = (() => {
    try {
        return {
            id: "deletePost",
            name: "Delete Post",
            description:
                "Delete a LinkedIn post by its URN (urn:li:share:xxx or urn:li:ugcPost:xxx).",
            category: "posts",
            inputSchema: deletePostSchema,
            inputSchemaJSON: toJSONSchema(deletePostSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        console.error("[LinkedIn] Failed to create deletePostOperation:", error);
        throw new Error(
            `Failed to create deletePost operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute delete post operation
 */
export async function executeDeletePost(
    client: LinkedInClient,
    params: DeletePostParams
): Promise<OperationResult> {
    try {
        await client.deletePost(params.postId);

        return {
            success: true,
            data: {
                deleted: true,
                postId: params.postId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete post",
                retryable: true
            }
        };
    }
}
