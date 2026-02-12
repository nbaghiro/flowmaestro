import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FrontClient } from "../client/FrontClient";

export const addCommentSchema = z.object({
    conversationId: z.string().describe("The conversation ID to add a comment to"),
    body: z.string().min(1).describe("The comment text"),
    authorId: z.string().optional().describe("Teammate ID to attribute the comment to")
});

export type AddCommentParams = z.infer<typeof addCommentSchema>;

export const addCommentOperation: OperationDefinition = {
    id: "addComment",
    name: "Add Comment",
    description: "Add an internal comment to a conversation",
    category: "messaging",
    inputSchema: addCommentSchema,
    retryable: false,
    timeout: 30000
};

export async function executeAddComment(
    client: FrontClient,
    params: AddCommentParams
): Promise<OperationResult> {
    try {
        const comment = await client.addComment(params.conversationId, {
            body: params.body,
            author_id: params.authorId
        });

        return {
            success: true,
            data: {
                commentId: comment.id,
                body: comment.body,
                postedAt: new Date(comment.posted_at * 1000).toISOString(),
                author: comment.author
                    ? {
                          id: comment.author.id,
                          email: comment.author.email,
                          name: `${comment.author.first_name} ${comment.author.last_name}`.trim()
                      }
                    : null
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to add comment";
        const isNotFound = errorMessage.includes("not found") || errorMessage.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message: errorMessage,
                retryable: !isNotFound
            }
        };
    }
}
