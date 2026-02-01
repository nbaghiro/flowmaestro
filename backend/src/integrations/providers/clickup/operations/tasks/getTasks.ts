import { z } from "zod";
import { getLogger } from "../../../../../core/logging";
import { ClickUpClient } from "../../client/ClickUpClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

const logger = getLogger();

/**
 * Get Tasks operation schema
 */
export const getTasksSchema = z.object({
    listId: z.string().describe("The list ID to get tasks from"),
    archived: z.boolean().optional().describe("Include archived tasks"),
    page: z.number().int().min(0).optional().describe("Page number for pagination (0-indexed)"),
    subtasks: z.boolean().optional().describe("Include subtasks"),
    statuses: z.array(z.string()).optional().describe("Filter by status names"),
    assignees: z.array(z.string()).optional().describe("Filter by assignee IDs")
});

export type GetTasksParams = z.infer<typeof getTasksSchema>;

/**
 * Get Tasks operation definition
 */
export const getTasksOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getTasks",
            name: "Get Tasks",
            description: "Get tasks from a list with optional filters",
            category: "tasks",
            actionType: "read",
            inputSchema: getTasksSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "ClickUp", err: error }, "Failed to create getTasksOperation");
        throw new Error(
            `Failed to create getTasks operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get tasks operation
 */
export async function executeGetTasks(
    client: ClickUpClient,
    params: GetTasksParams
): Promise<OperationResult> {
    try {
        const response = await client.getTasks(params.listId, {
            archived: params.archived,
            page: params.page,
            subtasks: params.subtasks,
            statuses: params.statuses,
            assignees: params.assignees
        });

        return {
            success: true,
            data: {
                tasks: response.tasks.map((task) => ({
                    id: task.id,
                    customId: task.custom_id,
                    name: task.name,
                    status: task.status?.status,
                    priority: task.priority?.priority,
                    assignees: task.assignees?.map((a) => ({
                        id: a.id,
                        username: a.username
                    })),
                    tags: task.tags?.map((t) => t.name),
                    dueDate: task.due_date,
                    startDate: task.start_date,
                    dateCreated: task.date_created,
                    dateUpdated: task.date_updated,
                    archived: task.archived,
                    url: task.url
                })),
                lastPage: response.last_page,
                count: response.tasks.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get tasks",
                retryable: true
            }
        };
    }
}
