import { z } from "zod";
import { TrelloClient } from "../../client/TrelloClient";
import { TrelloBoardIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloList } from "../types";

/**
 * Create List operation schema
 */
export const createListSchema = z.object({
    name: z.string().min(1).max(16384).describe("Name of the list"),
    idBoard: TrelloBoardIdSchema.describe("ID of the board to create the list in"),
    pos: z
        .union([z.number(), z.enum(["top", "bottom"])])
        .optional()
        .default("bottom")
        .describe("Position of the list ('top', 'bottom', or a number)")
});

export type CreateListParams = z.infer<typeof createListSchema>;

/**
 * Create List operation definition
 */
export const createListOperation: OperationDefinition = {
    id: "createList",
    name: "Create List",
    description: "Create a new list on a Trello board",
    category: "lists",
    actionType: "write",
    inputSchema: createListSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute create list operation
 */
export async function executeCreateList(
    client: TrelloClient,
    params: CreateListParams
): Promise<OperationResult> {
    try {
        const list = await client.request<TrelloList>({
            method: "POST",
            url: "/lists",
            params: {
                name: params.name,
                idBoard: params.idBoard,
                pos: params.pos
            }
        });

        return {
            success: true,
            data: {
                id: list.id,
                name: list.name,
                closed: list.closed,
                position: list.pos,
                boardId: list.idBoard
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create list",
                retryable: false
            }
        };
    }
}
