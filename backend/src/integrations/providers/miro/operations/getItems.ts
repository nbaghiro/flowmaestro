import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MiroClient } from "../client/MiroClient";

export const getItemsOperation: OperationDefinition = {
    id: "getItems",
    name: "Get Items",
    description: "Retrieve items from a Miro board with optional type filtering",
    category: "items",
    inputSchema: z.object({
        boardId: z.string().describe("The ID of the board to get items from"),
        type: z
            .string()
            .optional()
            .describe(
                "Filter by item type (e.g., 'sticky_note', 'card', 'shape', 'text', 'image')"
            ),
        limit: z.number().min(1).max(50).optional().describe("Maximum number of items to return"),
        cursor: z.string().optional().describe("Cursor for pagination")
    }),
    retryable: true
};

export async function executeGetItems(
    client: MiroClient,
    params: z.infer<typeof getItemsOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.getItems(params.boardId, {
            type: params.type,
            limit: params.limit,
            cursor: params.cursor
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
                message: error instanceof Error ? error.message : "Failed to get Miro items",
                retryable: true
            }
        };
    }
}
