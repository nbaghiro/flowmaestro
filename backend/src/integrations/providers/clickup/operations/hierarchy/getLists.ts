import { z } from "zod";
import { getLogger } from "../../../../../core/logging";
import { ClickUpClient } from "../../client/ClickUpClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

const logger = getLogger();

/**
 * Get Lists operation schema
 */
export const getListsSchema = z.object({
    folderId: z.string().optional().describe("Get lists from this folder"),
    spaceId: z.string().optional().describe("Get folderless lists from this space"),
    archived: z.boolean().optional().describe("Include archived lists")
});

export type GetListsParams = z.infer<typeof getListsSchema>;

/**
 * Get Lists operation definition
 */
export const getListsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getLists",
            name: "Get Lists",
            description: "Get all lists in a folder or folderless lists in a space",
            category: "hierarchy",
            actionType: "read",
            inputSchema: getListsSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "ClickUp", err: error }, "Failed to create getListsOperation");
        throw new Error(
            `Failed to create getLists operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get lists operation
 */
export async function executeGetLists(
    client: ClickUpClient,
    params: GetListsParams
): Promise<OperationResult> {
    try {
        // Validate that at least one of folderId or spaceId is provided
        if (!params.folderId && !params.spaceId) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Either folderId or spaceId must be provided",
                    retryable: false
                }
            };
        }

        let response;

        if (params.folderId) {
            response = await client.getListsInFolder(params.folderId, params.archived);
        } else if (params.spaceId) {
            response = await client.getFolderlessLists(params.spaceId, params.archived);
        } else {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Either folderId or spaceId must be provided",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: {
                lists: response.lists.map((list) => ({
                    id: list.id,
                    name: list.name,
                    orderindex: list.orderindex,
                    content: list.content,
                    status: list.status
                        ? {
                              status: list.status.status,
                              color: list.status.color
                          }
                        : null,
                    priority: list.priority
                        ? {
                              priority: list.priority.priority,
                              color: list.priority.color
                          }
                        : null,
                    taskCount: list.task_count,
                    dueDate: list.due_date,
                    startDate: list.start_date,
                    archived: list.archived,
                    folder: list.folder
                        ? {
                              id: list.folder.id,
                              name: list.folder.name
                          }
                        : null,
                    space: list.space
                        ? {
                              id: list.space.id,
                              name: list.space.name
                          }
                        : null,
                    statuses: list.statuses?.map((s) => ({
                        status: s.status,
                        type: s.type,
                        color: s.color
                    }))
                })),
                count: response.lists.length
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
