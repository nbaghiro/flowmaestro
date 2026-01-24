import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { TrelloClient } from "../../client/TrelloClient";
import { TrelloCardIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloComment } from "../types";

/**
 * Add Comment operation schema
 */
export const addCommentSchema = z.object({
    cardId: TrelloCardIdSchema,
    text: z.string().min(1).max(16384).describe("The comment text")
});

export type AddCommentParams = z.infer<typeof addCommentSchema>;

/**
 * Add Comment operation definition
 */
export const addCommentOperation: OperationDefinition = {
    id: "addComment",
    name: "Add Comment",
    description: "Add a comment to a Trello card",
    category: "comments",
    actionType: "write",
    inputSchema: addCommentSchema,
    inputSchemaJSON: toJSONSchema(addCommentSchema),
    retryable: false,
    timeout: 10000
};

/**
 * Execute add comment operation
 */
export async function executeAddComment(
    client: TrelloClient,
    params: AddCommentParams
): Promise<OperationResult> {
    try {
        const comment = await client.request<TrelloComment>({
            method: "POST",
            url: `/cards/${params.cardId}/actions/comments`,
            params: {
                text: params.text
            }
        });

        return {
            success: true,
            data: {
                id: comment.id,
                text: comment.data.text,
                cardId: comment.data.card.id,
                cardName: comment.data.card.name,
                createdAt: comment.date,
                authorId: comment.idMemberCreator
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
