import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { LinkedInClient } from "../client/LinkedInClient";
import { PostIdSchema, MaxResultsSchema, PaginationStartSchema } from "../schemas";
import type { GetCommentsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Comments operation schema
 */
export const getCommentsSchema = z.object({
    postId: PostIdSchema,
    start: PaginationStartSchema.optional(),
    count: MaxResultsSchema.optional()
});

export type GetCommentsParams = z.infer<typeof getCommentsSchema>;

/**
 * Get Comments operation definition
 */
export const getCommentsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getComments",
            name: "Get Comments",
            description: "Get comments on a LinkedIn post.",
            category: "engagement",
            inputSchema: getCommentsSchema,
            inputSchemaJSON: toJSONSchema(getCommentsSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        console.error("[LinkedIn] Failed to create getCommentsOperation:", error);
        throw new Error(
            `Failed to create getComments operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get comments operation
 */
export async function executeGetComments(
    client: LinkedInClient,
    params: GetCommentsParams
): Promise<OperationResult> {
    try {
        const response = (await client.getComments(params.postId, {
            start: params.start,
            count: params.count
        })) as GetCommentsResponse;

        const comments = (response.elements || []).map((comment) => ({
            id: comment.id,
            actor: comment.actor,
            text: comment.message?.text,
            createdAt: comment.created?.time
                ? new Date(comment.created.time).toISOString()
                : undefined,
            lastModifiedAt: comment.lastModified?.time
                ? new Date(comment.lastModified.time).toISOString()
                : undefined
        }));

        return {
            success: true,
            data: {
                comments,
                count: comments.length,
                paging: response.paging
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get comments",
                retryable: true
            }
        };
    }
}
