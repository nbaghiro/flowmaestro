import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { TrelloClient } from "../../client/TrelloClient";
import { TrelloCardIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Delete Card operation schema
 */
export const deleteCardSchema = z.object({
    cardId: TrelloCardIdSchema
});

export type DeleteCardParams = z.infer<typeof deleteCardSchema>;

/**
 * Delete Card operation definition
 */
export const deleteCardOperation: OperationDefinition = {
    id: "deleteCard",
    name: "Delete Card",
    description: "Permanently delete a Trello card",
    category: "cards",
    actionType: "write",
    inputSchema: deleteCardSchema,
    inputSchemaJSON: toJSONSchema(deleteCardSchema),
    retryable: false,
    timeout: 10000
};

/**
 * Execute delete card operation
 */
export async function executeDeleteCard(
    client: TrelloClient,
    params: DeleteCardParams
): Promise<OperationResult> {
    try {
        await client.delete(`/cards/${params.cardId}`);

        return {
            success: true,
            data: {
                deleted: true,
                cardId: params.cardId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete card",
                retryable: false
            }
        };
    }
}
