import { z } from "zod";
import { TrelloClient } from "../../client/TrelloClient";
import { TrelloBoardIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloList } from "../types";

/**
 * Get Lists operation schema
 */
export const getListsSchema = z.object({
    boardId: TrelloBoardIdSchema,
    filter: z
        .enum(["all", "open", "closed"])
        .optional()
        .default("open")
        .describe("Filter for lists")
});

export type GetListsParams = z.infer<typeof getListsSchema>;

/**
 * Get Lists operation definition
 */
export const getListsOperation: OperationDefinition = {
    id: "getLists",
    name: "Get Lists",
    description: "Get all lists on a Trello board",
    category: "lists",
    inputSchema: getListsSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get lists operation
 */
export async function executeGetLists(
    client: TrelloClient,
    params: GetListsParams
): Promise<OperationResult> {
    try {
        const lists = await client.get<TrelloList[]>(`/boards/${params.boardId}/lists`, {
            filter: params.filter,
            fields: "id,name,closed,pos,idBoard"
        });

        const mappedLists = lists.map((list) => ({
            id: list.id,
            name: list.name,
            closed: list.closed,
            position: list.pos,
            boardId: list.idBoard
        }));

        return {
            success: true,
            data: {
                lists: mappedLists,
                count: mappedLists.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get lists",
                retryable: true
            }
        };
    }
}
