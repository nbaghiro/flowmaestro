import { z } from "zod";
import { TrelloClient } from "../../client/TrelloClient";
import { TrelloBoardIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloBoard } from "../types";

/**
 * Get Board operation schema
 */
export const getBoardSchema = z.object({
    boardId: TrelloBoardIdSchema
});

export type GetBoardParams = z.infer<typeof getBoardSchema>;

/**
 * Get Board operation definition
 */
export const getBoardOperation: OperationDefinition = {
    id: "getBoard",
    name: "Get Board",
    description: "Get detailed information about a specific Trello board",
    category: "boards",
    inputSchema: getBoardSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get board operation
 */
export async function executeGetBoard(
    client: TrelloClient,
    params: GetBoardParams
): Promise<OperationResult> {
    try {
        const board = await client.get<TrelloBoard>(`/boards/${params.boardId}`, {
            fields: "all"
        });

        return {
            success: true,
            data: {
                id: board.id,
                name: board.name,
                description: board.desc,
                closed: board.closed,
                url: board.url,
                shortUrl: board.shortUrl,
                starred: board.starred,
                lastActivity: board.dateLastActivity,
                lastViewed: board.dateLastView,
                backgroundColor: board.prefs?.background,
                backgroundImage: board.prefs?.backgroundImage,
                permissionLevel: board.prefs?.permissionLevel,
                labelNames: board.labelNames,
                organizationId: board.idOrganization
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get board",
                retryable: true
            }
        };
    }
}
