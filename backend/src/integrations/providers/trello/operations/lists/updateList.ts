import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { TrelloClient } from "../../client/TrelloClient";
import { TrelloListIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloList } from "../types";

/**
 * Update List operation schema
 */
export const updateListSchema = z.object({
    listId: TrelloListIdSchema,
    name: z.string().min(1).max(16384).optional().describe("New name for the list"),
    closed: z.boolean().optional().describe("Whether the list is archived"),
    pos: z
        .union([z.number(), z.enum(["top", "bottom"])])
        .optional()
        .describe("New position ('top', 'bottom', or a number)")
});

export type UpdateListParams = z.infer<typeof updateListSchema>;

/**
 * Update List operation definition
 */
export const updateListOperation: OperationDefinition = {
    id: "updateList",
    name: "Update List",
    description: "Update an existing Trello list",
    category: "lists",
    actionType: "write",
    inputSchema: updateListSchema,
    inputSchemaJSON: toJSONSchema(updateListSchema),
    retryable: false,
    timeout: 10000
};

/**
 * Execute update list operation
 */
export async function executeUpdateList(
    client: TrelloClient,
    params: UpdateListParams
): Promise<OperationResult> {
    try {
        const { listId, ...updateData } = params;

        // Build update params
        const updateParams: Record<string, unknown> = {};
        if (updateData.name !== undefined) updateParams.name = updateData.name;
        if (updateData.closed !== undefined) updateParams.closed = updateData.closed;
        if (updateData.pos !== undefined) updateParams.pos = updateData.pos;

        const list = await client.request<TrelloList>({
            method: "PUT",
            url: `/lists/${listId}`,
            params: updateParams
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
                message: error instanceof Error ? error.message : "Failed to update list",
                retryable: false
            }
        };
    }
}
