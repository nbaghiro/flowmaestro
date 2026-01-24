import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { TrelloClient } from "../../client/TrelloClient";
import { TrelloListIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloCard } from "../types";

/**
 * Create Card operation schema
 */
export const createCardSchema = z.object({
    idList: TrelloListIdSchema.describe("ID of the list to add the card to"),
    name: z.string().min(1).max(16384).describe("Name of the card"),
    desc: z.string().max(16384).optional().describe("Description of the card"),
    pos: z
        .union([z.number(), z.enum(["top", "bottom"])])
        .optional()
        .default("bottom")
        .describe("Position of the card ('top', 'bottom', or a number)"),
    due: z.string().optional().describe("Due date in ISO 8601 format"),
    dueComplete: z.boolean().optional().default(false).describe("Whether the due date is complete"),
    start: z.string().optional().describe("Start date in ISO 8601 format"),
    idMembers: z.array(z.string()).optional().describe("Array of member IDs to assign"),
    idLabels: z.array(z.string()).optional().describe("Array of label IDs to add")
});

export type CreateCardParams = z.infer<typeof createCardSchema>;

/**
 * Create Card operation definition
 */
export const createCardOperation: OperationDefinition = {
    id: "createCard",
    name: "Create Card",
    description: "Create a new card in a Trello list",
    category: "cards",
    actionType: "write",
    inputSchema: createCardSchema,
    inputSchemaJSON: toJSONSchema(createCardSchema),
    retryable: false,
    timeout: 15000
};

/**
 * Execute create card operation
 */
export async function executeCreateCard(
    client: TrelloClient,
    params: CreateCardParams
): Promise<OperationResult> {
    try {
        const cardParams: Record<string, unknown> = {
            idList: params.idList,
            name: params.name,
            pos: params.pos
        };

        if (params.desc) cardParams.desc = params.desc;
        if (params.due) cardParams.due = params.due;
        if (params.dueComplete !== undefined) cardParams.dueComplete = params.dueComplete;
        if (params.start) cardParams.start = params.start;
        if (params.idMembers?.length) cardParams.idMembers = params.idMembers.join(",");
        if (params.idLabels?.length) cardParams.idLabels = params.idLabels.join(",");

        const card = await client.request<TrelloCard>({
            method: "POST",
            url: "/cards",
            params: cardParams
        });

        return {
            success: true,
            data: {
                id: card.id,
                name: card.name,
                description: card.desc,
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
                message: error instanceof Error ? error.message : "Failed to create card",
                retryable: false
            }
        };
    }
}
