import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Delete Task operation schema
 */
export const deleteTaskSchema = z.object({
    task_id: z.number().describe("The ID of the task to delete")
});

export type DeleteTaskParams = z.infer<typeof deleteTaskSchema>;

/**
 * Delete Task operation definition
 */
export const deleteTaskOperation: OperationDefinition = {
    id: "deleteTask",
    name: "Delete Task",
    description: "Delete a task from Insightly CRM",
    category: "tasks",
    inputSchema: deleteTaskSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute delete task operation
 */
export async function executeDeleteTask(
    client: InsightlyClient,
    params: DeleteTaskParams
): Promise<OperationResult> {
    try {
        await client.delete(`/Tasks/${params.task_id}`);

        return {
            success: true,
            data: {
                deleted: true,
                task_id: params.task_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete task",
                retryable: false
            }
        };
    }
}
