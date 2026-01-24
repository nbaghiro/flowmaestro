import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { TrelloClient } from "../../client/TrelloClient";
import { TrelloListIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloList } from "../types";

/**
 * Archive List operation schema
 */
export const archiveListSchema = z.object({
    listId: TrelloListIdSchema,
    archive: z.boolean().optional().default(true).describe("True to archive, false to unarchive")
});

export type ArchiveListParams = z.infer<typeof archiveListSchema>;

/**
 * Archive List operation definition
 */
export const archiveListOperation: OperationDefinition = {
    id: "archiveList",
    name: "Archive List",
    description: "Archive or unarchive a Trello list",
    category: "lists",
    actionType: "write",
    inputSchema: archiveListSchema,
    inputSchemaJSON: toJSONSchema(archiveListSchema),
    retryable: false,
    timeout: 10000
};

/**
 * Execute archive list operation
 */
export async function executeArchiveList(
    client: TrelloClient,
    params: ArchiveListParams
): Promise<OperationResult> {
    try {
        const list = await client.request<TrelloList>({
            method: "PUT",
            url: `/lists/${params.listId}/closed`,
            params: {
                value: params.archive
            }
        });

        return {
            success: true,
            data: {
                id: list.id,
                name: list.name,
                closed: list.closed,
                archived: list.closed
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to archive list",
                retryable: false
            }
        };
    }
}
