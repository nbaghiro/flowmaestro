import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { TrelloClient } from "../../client/TrelloClient";
import { TrelloCardIdSchema, TrelloListIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloCard } from "../types";

/**
 * Update Card operation schema
 */
export const updateCardSchema = z.object({
    cardId: TrelloCardIdSchema,
    name: z.string().min(1).max(16384).optional().describe("New name for the card"),
    desc: z.string().max(16384).optional().describe("New description for the card"),
    closed: z.boolean().optional().describe("Whether the card is archived"),
    idList: TrelloListIdSchema.optional().describe("ID of the list to move the card to"),
    pos: z
        .union([z.number(), z.enum(["top", "bottom"])])
        .optional()
        .describe("New position ('top', 'bottom', or a number)"),
    due: z.string().nullable().optional().describe("Due date in ISO 8601 format (null to remove)"),
    dueComplete: z.boolean().optional().describe("Whether the due date is complete"),
    start: z
        .string()
        .nullable()
        .optional()
        .describe("Start date in ISO 8601 format (null to remove)"),
    idMembers: z.array(z.string()).optional().describe("Array of member IDs to assign"),
    idLabels: z.array(z.string()).optional().describe("Array of label IDs")
});

export type UpdateCardParams = z.infer<typeof updateCardSchema>;

/**
 * Update Card operation definition
 */
export const updateCardOperation: OperationDefinition = {
    id: "updateCard",
    name: "Update Card",
    description: "Update an existing Trello card",
    category: "cards",
    actionType: "write",
    inputSchema: updateCardSchema,
    inputSchemaJSON: toJSONSchema(updateCardSchema),
    retryable: false,
    timeout: 10000
};

/**
 * Execute update card operation
 */
export async function executeUpdateCard(
    client: TrelloClient,
    params: UpdateCardParams
): Promise<OperationResult> {
    try {
        const { cardId, ...updateData } = params;

        // Build update params
        const updateParams: Record<string, unknown> = {};
        if (updateData.name !== undefined) updateParams.name = updateData.name;
        if (updateData.desc !== undefined) updateParams.desc = updateData.desc;
        if (updateData.closed !== undefined) updateParams.closed = updateData.closed;
        if (updateData.idList !== undefined) updateParams.idList = updateData.idList;
        if (updateData.pos !== undefined) updateParams.pos = updateData.pos;
        if (updateData.due !== undefined) updateParams.due = updateData.due;
        if (updateData.dueComplete !== undefined) updateParams.dueComplete = updateData.dueComplete;
        if (updateData.start !== undefined) updateParams.start = updateData.start;
        if (updateData.idMembers !== undefined)
            updateParams.idMembers = updateData.idMembers.join(",");
        if (updateData.idLabels !== undefined)
            updateParams.idLabels = updateData.idLabels.join(",");

        const card = await client.request<TrelloCard>({
            method: "PUT",
            url: `/cards/${cardId}`,
            params: updateParams
        });

        return {
            success: true,
            data: {
                id: card.id,
                name: card.name,
                description: card.desc,
                closed: card.closed,
                listId: card.idList,
                boardId: card.idBoard,
                shortUrl: card.shortUrl,
                url: card.url,
                due: card.due,
                position: card.pos
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update card",
                retryable: false
            }
        };
    }
}
