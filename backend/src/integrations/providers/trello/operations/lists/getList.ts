import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { TrelloClient } from "../../client/TrelloClient";
import { TrelloListIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloList } from "../types";

/**
 * Get List operation schema
 */
export const getListSchema = z.object({
    listId: TrelloListIdSchema
});

export type GetListParams = z.infer<typeof getListSchema>;

/**
 * Get List operation definition
 */
export const getListOperation: OperationDefinition = {
    id: "getList",
    name: "Get List",
    description: "Get detailed information about a specific Trello list",
    category: "lists",
    inputSchema: getListSchema,
    inputSchemaJSON: toJSONSchema(getListSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute get list operation
 */
export async function executeGetList(
    client: TrelloClient,
    params: GetListParams
): Promise<OperationResult> {
    try {
        const list = await client.get<TrelloList>(`/lists/${params.listId}`, {
            fields: "all"
        });

        return {
            success: true,
            data: {
                id: list.id,
                name: list.name,
                closed: list.closed,
                position: list.pos,
                boardId: list.idBoard,
                subscribed: list.subscribed,
                softLimit: list.softLimit
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get list",
                retryable: true
            }
        };
    }
}
