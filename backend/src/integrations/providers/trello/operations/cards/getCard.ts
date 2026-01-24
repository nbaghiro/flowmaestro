import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { TrelloClient } from "../../client/TrelloClient";
import { TrelloCardIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloCard } from "../types";

/**
 * Get Card operation schema
 */
export const getCardSchema = z.object({
    cardId: TrelloCardIdSchema
});

export type GetCardParams = z.infer<typeof getCardSchema>;

/**
 * Get Card operation definition
 */
export const getCardOperation: OperationDefinition = {
    id: "getCard",
    name: "Get Card",
    description: "Get detailed information about a specific Trello card",
    category: "cards",
    inputSchema: getCardSchema,
    inputSchemaJSON: toJSONSchema(getCardSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute get card operation
 */
export async function executeGetCard(
    client: TrelloClient,
    params: GetCardParams
): Promise<OperationResult> {
    try {
        const card = await client.get<TrelloCard>(`/cards/${params.cardId}`, {
            fields: "all"
        });

        return {
            success: true,
            data: {
                id: card.id,
                name: card.name,
                description: card.desc,
                closed: card.closed,
                due: card.due,
                dueComplete: card.dueComplete,
                start: card.start,
                listId: card.idList,
                boardId: card.idBoard,
                position: card.pos,
                shortUrl: card.shortUrl,
                url: card.url,
                labels: card.labels.map((l) => ({ id: l.id, name: l.name, color: l.color })),
                memberIds: card.idMembers,
                checklistIds: card.idChecklists,
                lastActivity: card.dateLastActivity,
                badges: {
                    votes: card.badges.votes,
                    comments: card.badges.comments,
                    attachments: card.badges.attachments,
                    checkItems: card.badges.checkItems,
                    checkItemsChecked: card.badges.checkItemsChecked,
                    hasDescription: card.badges.description
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get card",
                retryable: true
            }
        };
    }
}
