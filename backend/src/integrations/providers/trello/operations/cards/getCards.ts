import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { TrelloClient } from "../../client/TrelloClient";
import { TrelloListIdSchema, TrelloLimitSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloCard } from "../types";

/**
 * Get Cards operation schema
 */
export const getCardsSchema = z.object({
    listId: TrelloListIdSchema,
    limit: TrelloLimitSchema,
    filter: z
        .enum(["all", "open", "closed"])
        .optional()
        .default("open")
        .describe("Filter for cards")
});

export type GetCardsParams = z.infer<typeof getCardsSchema>;

/**
 * Get Cards operation definition
 */
export const getCardsOperation: OperationDefinition = {
    id: "getCards",
    name: "Get Cards",
    description: "Get all cards in a Trello list",
    category: "cards",
    inputSchema: getCardsSchema,
    inputSchemaJSON: toJSONSchema(getCardsSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute get cards operation
 */
export async function executeGetCards(
    client: TrelloClient,
    params: GetCardsParams
): Promise<OperationResult> {
    try {
        const cards = await client.get<TrelloCard[]>(`/lists/${params.listId}/cards`, {
            filter: params.filter,
            fields: "id,name,desc,closed,due,dueComplete,idList,idBoard,pos,shortUrl,url,labels,idMembers,dateLastActivity"
        });

        // Apply limit
        const limitedCards = params.limit ? cards.slice(0, params.limit) : cards;

        const mappedCards = limitedCards.map((card) => ({
            id: card.id,
            name: card.name,
            description: card.desc,
            closed: card.closed,
            due: card.due,
            dueComplete: card.dueComplete,
            listId: card.idList,
            boardId: card.idBoard,
            position: card.pos,
            shortUrl: card.shortUrl,
            url: card.url,
            labels: card.labels.map((l) => ({ id: l.id, name: l.name, color: l.color })),
            memberIds: card.idMembers,
            lastActivity: card.dateLastActivity
        }));

        return {
            success: true,
            data: {
                cards: mappedCards,
                count: mappedCards.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get cards",
                retryable: true
            }
        };
    }
}
