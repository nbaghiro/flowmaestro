import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { TrelloClient } from "../../client/TrelloClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloBoard } from "../types";

/**
 * Create Board operation schema
 */
export const createBoardSchema = z.object({
    name: z.string().min(1).max(16384).describe("Name of the board"),
    desc: z.string().max(16384).optional().describe("Description of the board"),
    defaultLists: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to create default lists (To Do, Doing, Done)"),
    defaultLabels: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to create default labels"),
    prefs_permissionLevel: z
        .enum(["private", "org", "public"])
        .optional()
        .default("private")
        .describe("Permission level of the board"),
    prefs_background: z.string().optional().describe("Background color or image ID")
});

export type CreateBoardParams = z.infer<typeof createBoardSchema>;

/**
 * Create Board operation definition
 */
export const createBoardOperation: OperationDefinition = {
    id: "createBoard",
    name: "Create Board",
    description: "Create a new Trello board",
    category: "boards",
    actionType: "write",
    inputSchema: createBoardSchema,
    inputSchemaJSON: toJSONSchema(createBoardSchema),
    retryable: false,
    timeout: 15000
};

/**
 * Execute create board operation
 */
export async function executeCreateBoard(
    client: TrelloClient,
    params: CreateBoardParams
): Promise<OperationResult> {
    try {
        const board = await client.request<TrelloBoard>({
            method: "POST",
            url: "/boards",
            params: {
                name: params.name,
                desc: params.desc,
                defaultLists: params.defaultLists,
                defaultLabels: params.defaultLabels,
                prefs_permissionLevel: params.prefs_permissionLevel,
                prefs_background: params.prefs_background
            }
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
                message: error instanceof Error ? error.message : "Failed to create board",
                retryable: false
            }
        };
    }
}
