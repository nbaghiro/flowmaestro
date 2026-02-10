import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MiroClient } from "../client/MiroClient";

export const listBoardsOperation: OperationDefinition = {
    id: "listBoards",
    name: "List Boards",
    description: "List boards in the user's Miro account with optional search and sorting",
    category: "boards",
    inputSchema: z.object({
        query: z.string().optional().describe("Search query to filter boards by name"),
        limit: z.number().min(1).max(50).optional().describe("Maximum number of boards to return"),
        offset: z.string().optional().describe("Offset for pagination"),
        sort: z
            .enum(["default", "last_modified", "last_opened", "last_created", "alphabetically"])
            .optional()
            .describe("Sort order for the results")
    }),
    retryable: true
};

export async function executeListBoards(
    client: MiroClient,
    params: z.infer<typeof listBoardsOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.listBoards({
            query: params.query,
            limit: params.limit,
            offset: params.offset,
            sort: params.sort
        });

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list Miro boards",
                retryable: true
            }
        };
    }
}
