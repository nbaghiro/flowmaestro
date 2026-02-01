import { z } from "zod";
import { TrelloClient } from "../../client/TrelloClient";
import { TrelloBoardIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloBoard } from "../types";

/**
 * Update Board operation schema
 */
export const updateBoardSchema = z.object({
    boardId: TrelloBoardIdSchema,
    name: z.string().min(1).max(16384).optional().describe("New name for the board"),
    desc: z.string().max(16384).optional().describe("New description for the board"),
    closed: z.boolean().optional().describe("Whether the board is closed/archived"),
    prefs_permissionLevel: z
        .enum(["private", "org", "public"])
        .optional()
        .describe("Permission level of the board"),
    prefs_background: z.string().optional().describe("Background color or image ID")
});

export type UpdateBoardParams = z.infer<typeof updateBoardSchema>;

/**
 * Update Board operation definition
 */
export const updateBoardOperation: OperationDefinition = {
    id: "updateBoard",
    name: "Update Board",
    description: "Update an existing Trello board",
    category: "boards",
    actionType: "write",
    inputSchema: updateBoardSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute update board operation
 */
export async function executeUpdateBoard(
    client: TrelloClient,
    params: UpdateBoardParams
): Promise<OperationResult> {
    try {
        const { boardId, ...updateData } = params;

        // Build update params (only include defined values)
        const updateParams: Record<string, unknown> = {};
        if (updateData.name !== undefined) updateParams.name = updateData.name;
        if (updateData.desc !== undefined) updateParams.desc = updateData.desc;
        if (updateData.closed !== undefined) updateParams.closed = updateData.closed;
        if (updateData.prefs_permissionLevel !== undefined) {
            updateParams["prefs/permissionLevel"] = updateData.prefs_permissionLevel;
        }
        if (updateData.prefs_background !== undefined) {
            updateParams["prefs/background"] = updateData.prefs_background;
        }

        const board = await client.request<TrelloBoard>({
            method: "PUT",
            url: `/boards/${boardId}`,
            params: updateParams
        });

        return {
            success: true,
            data: {
                id: board.id,
                name: board.name,
                description: board.desc,
                url: board.url,
                shortUrl: board.shortUrl,
                closed: board.closed
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update board",
                retryable: false
            }
        };
    }
}
