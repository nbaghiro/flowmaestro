import { removeTagFromTaskInputSchema, type RemoveTagFromTaskInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const removeTagFromTaskOperation: OperationDefinition = {
    id: "removeTagFromTask",
    name: "Remove Tag from Task",
    description: "Remove a tag from a task in Asana.",
    category: "tasks",
    inputSchema: removeTagFromTaskInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeRemoveTagFromTask(
    client: AsanaClient,
    params: RemoveTagFromTaskInput
): Promise<OperationResult> {
    try {
        await client.postAsana(`/tasks/${params.task_gid}/removeTag`, {
            tag: params.tag
        });

        return {
            success: true,
            data: {
                removed: true,
                task_gid: params.task_gid,
                tag_gid: params.tag
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to remove tag from task",
                retryable: true
            }
        };
    }
}
