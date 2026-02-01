import { z } from "zod";
import { getLogger } from "../../../../../core/logging";
import { ClickUpClient } from "../../client/ClickUpClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

const logger = getLogger();

/**
 * Get Task operation schema
 */
export const getTaskSchema = z.object({
    taskId: z.string().describe("The task ID to retrieve")
});

export type GetTaskParams = z.infer<typeof getTaskSchema>;

/**
 * Get Task operation definition
 */
export const getTaskOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getTask",
            name: "Get Task",
            description: "Get details of a specific task",
            category: "tasks",
            actionType: "read",
            inputSchema: getTaskSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "ClickUp", err: error }, "Failed to create getTaskOperation");
        throw new Error(
            `Failed to create getTask operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get task operation
 */
export async function executeGetTask(
    client: ClickUpClient,
    params: GetTaskParams
): Promise<OperationResult> {
    try {
        const task = await client.getTask(params.taskId);

        return {
            success: true,
            data: {
                id: task.id,
                customId: task.custom_id,
                name: task.name,
                description: task.description || task.text_content,
                status: task.status?.status,
                statusColor: task.status?.color,
                priority: task.priority
                    ? {
                          id: task.priority.id,
                          priority: task.priority.priority,
                          color: task.priority.color
                      }
                    : null,
                creator: task.creator
                    ? {
                          id: task.creator.id,
                          username: task.creator.username,
                          email: task.creator.email
                      }
                    : null,
                assignees: task.assignees?.map((a) => ({
                    id: a.id,
                    username: a.username,
                    email: a.email
                })),
                tags: task.tags?.map((t) => t.name),
                dueDate: task.due_date,
                startDate: task.start_date,
                dateCreated: task.date_created,
                dateUpdated: task.date_updated,
                dateClosed: task.date_closed,
                archived: task.archived,
                url: task.url,
                list: task.list
                    ? {
                          id: task.list.id,
                          name: task.list.name
                      }
                    : null,
                folder: task.folder
                    ? {
                          id: task.folder.id,
                          name: task.folder.name
                      }
                    : null,
                space: task.space ? { id: task.space.id } : null,
                timeEstimate: task.time_estimate,
                timeSpent: task.time_spent,
                points: task.points,
                parent: task.parent
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get task",
                retryable: true
            }
        };
    }
}
