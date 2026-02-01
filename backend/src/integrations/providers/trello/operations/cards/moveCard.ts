import { z } from "zod";
import { TrelloClient } from "../../client/TrelloClient";
import { TrelloCardIdSchema, TrelloListIdSchema, TrelloBoardIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloCard } from "../types";

/**
 * Move Card operation schema
 */
export const moveCardSchema = z.object({
    cardId: TrelloCardIdSchema,
    idList: TrelloListIdSchema.describe("ID of the destination list"),
    idBoard: TrelloBoardIdSchema.optional().describe(
        "ID of the destination board (only needed when moving to a different board)"
    ),
    pos: z
        .union([z.number(), z.enum(["top", "bottom"])])
        .optional()
        .default("bottom")
        .describe("Position in the destination list ('top', 'bottom', or a number)")
});

export type MoveCardParams = z.infer<typeof moveCardSchema>;

/**
 * Move Card operation definition
 */
export const moveCardOperation: OperationDefinition = {
    id: "moveCard",
    name: "Move Card",
    description: "Move a card to a different list (optionally to a different board)",
    category: "cards",
    actionType: "write",
    inputSchema: moveCardSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute move card operation
 */
export async function executeMoveCard(
    client: TrelloClient,
    params: MoveCardParams
): Promise<OperationResult> {
    try {
        const updateParams: Record<string, unknown> = {
            idList: params.idList,
            pos: params.pos
        };

        if (params.idBoard) {
            updateParams.idBoard = params.idBoard;
        }

        const card = await client.request<TrelloCard>({
            method: "PUT",
            url: `/cards/${params.cardId}`,
            params: updateParams
        });

        return {
            success: true,
            data: {
                id: card.id,
                name: card.name,
                listId: card.idList,
                boardId: card.idBoard,
                position: card.pos,
                moved: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to move card",
                retryable: false
            }
        };
    }
}
