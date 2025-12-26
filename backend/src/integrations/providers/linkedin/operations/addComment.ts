import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { LinkedInClient } from "../client/LinkedInClient";
import { PostIdSchema, AuthorUrnSchema, CommentTextSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Add Comment operation schema
 */
export const addCommentSchema = z.object({
    postId: PostIdSchema,
    actor: AuthorUrnSchema,
    text: CommentTextSchema
});

export type AddCommentParams = z.infer<typeof addCommentSchema>;

/**
 * Add Comment operation definition
 */
export const addCommentOperation: OperationDefinition = (() => {
    try {
        return {
            id: "addComment",
            name: "Add Comment",
            description: "Add a comment to a LinkedIn post.",
            category: "engagement",
            inputSchema: addCommentSchema,
            inputSchemaJSON: toJSONSchema(addCommentSchema),
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "LinkedIn", err: error }, "Failed to create addCommentOperation");
        throw new Error(
            `Failed to create addComment operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute add comment operation
 */
export async function executeAddComment(
    client: LinkedInClient,
    params: AddCommentParams
): Promise<OperationResult> {
    try {
        const response = (await client.addComment(params.postId, params.actor, params.text)) as
            | { id?: string }
            | string;

        const commentId = typeof response === "string" ? response : response.id;

        return {
            success: true,
            data: {
                commentId,
                postId: params.postId,
                actor: params.actor,
                text: params.text
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add comment",
                retryable: false
            }
        };
    }
}
