import { toJSONSchema } from "../../../../core/schema-utils";
import { deleteTaskInputSchema, type DeleteTaskInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const deleteTaskOperation: OperationDefinition = {
    id: "deleteTask",
    name: "Delete Task",
    description: "Delete a task from Asana. This action cannot be undone.",
    category: "tasks",
    inputSchema: deleteTaskInputSchema,
    inputSchemaJSON: toJSONSchema(deleteTaskInputSchema),
    retryable: false,
    timeout: 10000
};

export async function executeDeleteTask(
    client: AsanaClient,
    params: DeleteTaskInput
): Promise<OperationResult> {
    try {
        await client.deleteAsana(`/tasks/${params.task_gid}`);

        return {
            success: true,
            data: {
                deleted: true,
                task_gid: params.task_gid
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
