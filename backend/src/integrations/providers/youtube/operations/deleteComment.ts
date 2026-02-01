import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * Delete comment input schema
 */
export const deleteCommentSchema = z.object({
    commentId: z.string().min(1).describe("The comment ID to delete")
});

export type DeleteCommentParams = z.infer<typeof deleteCommentSchema>;

/**
 * Delete comment operation definition
 */
export const deleteCommentOperation: OperationDefinition = {
    id: "deleteComment",
    name: "Delete Comment",
    description: "Delete a comment you authored or a comment on your video",
    category: "comments",
    retryable: false,
    inputSchema: deleteCommentSchema
};

/**
 * Execute delete comment operation
 */
export async function executeDeleteComment(
    client: YouTubeClient,
    params: DeleteCommentParams
): Promise<OperationResult> {
    try {
        await client.deleteComment(params.commentId);

        return {
            success: true,
            data: {
                commentId: params.commentId,
                deleted: true,
                message: "Comment deleted successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete comment",
                retryable: false
            }
        };
    }
}
