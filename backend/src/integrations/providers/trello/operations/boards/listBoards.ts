import { z } from "zod";
import { TrelloClient } from "../../client/TrelloClient";
import { TrelloFilterSchema, TrelloLimitSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloBoard } from "../types";

/**
 * List Boards operation schema
 */
export const listBoardsSchema = z.object({
    filter: TrelloFilterSchema,
    limit: TrelloLimitSchema
});

export type ListBoardsParams = z.infer<typeof listBoardsSchema>;

/**
 * List Boards operation definition
 */
export const listBoardsOperation: OperationDefinition = {
    id: "listBoards",
    name: "List Boards",
    description: "List all Trello boards accessible by the current user",
    category: "boards",
    inputSchema: listBoardsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list boards operation
 */
export async function executeListBoards(
    client: TrelloClient,
    params: ListBoardsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            filter: params.filter,
            fields: "id,name,desc,closed,url,shortUrl,starred,dateLastActivity,prefs"
        };

        const boards = await client.get<TrelloBoard[]>("/members/me/boards", queryParams);

        // Apply limit (Trello API doesn't have limit param for this endpoint)
        const limitedBoards = params.limit ? boards.slice(0, params.limit) : boards;

        const mappedBoards = limitedBoards.map((board) => ({
            id: board.id,
            name: board.name,
            description: board.desc,
            closed: board.closed,
            url: board.url,
            shortUrl: board.shortUrl,
            starred: board.starred,
            lastActivity: board.dateLastActivity,
            backgroundColor: board.prefs?.background
        }));

        return {
            success: true,
            data: {
                boards: mappedBoards,
                count: mappedBoards.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list boards",
                retryable: true
            }
        };
    }
}
