import { z } from "zod";
import { createServiceLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { RedditClient } from "../client/RedditClient";
import { FullnameSchema, CommentTextSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = createServiceLogger("Reddit");

/**
 * Submit Comment operation schema
 */
export const submitCommentSchema = z.object({
    parentFullname: FullnameSchema.describe(
        "Fullname of post (t3_xxx) or comment (t1_xxx) to reply to"
    ),
    text: CommentTextSchema
});

export type SubmitCommentParams = z.infer<typeof submitCommentSchema>;

/**
 * Submit Comment operation definition
 */
export const submitCommentOperation: OperationDefinition = (() => {
    try {
        return {
            id: "submitComment",
            name: "Submit Comment",
            description: "Submit a comment on a post or reply to another comment.",
            category: "comments",
            inputSchema: submitCommentSchema,
            inputSchemaJSON: toJSONSchema(submitCommentSchema),
            retryable: false, // Don't retry to avoid duplicate comments
            timeout: 15000
        };
    } catch (error) {
        logger.error({ err: error }, "Failed to create submitCommentOperation");
        throw new Error(
            `Failed to create submitComment operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute submit comment operation
 */
export async function executeSubmitComment(
    client: RedditClient,
    params: SubmitCommentParams
): Promise<OperationResult> {
    try {
        const response = await client.submitComment({
            parentFullname: params.parentFullname,
            text: params.text
        });

        // Check for Reddit API errors
        if (response.json.errors && response.json.errors.length > 0) {
            const errorMessages = response.json.errors.map((e) => e.join(": ")).join(", ");
            return {
                success: false,
                error: {
                    type: "validation",
                    message: `Reddit API error: ${errorMessages}`,
                    retryable: false
                }
            };
        }

        const things = response.json.data?.things;
        if (!things || things.length === 0) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "No data returned from Reddit API",
                    retryable: false
                }
            };
        }

        const commentData = things[0].data;

        return {
            success: true,
            data: {
                commentId: commentData.id,
                fullname: commentData.name,
                body: commentData.body,
                author: commentData.author,
                parentId: commentData.parent_id,
                createdUtc: commentData.created_utc
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to submit comment",
                retryable: false
            }
        };
    }
}
