import { addTagToTaskInputSchema, type AddTagToTaskInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const addTagToTaskOperation: OperationDefinition = {
    id: "addTagToTask",
    name: "Add Tag to Task",
    description: "Add a tag to a task in Asana.",
    category: "tasks",
    inputSchema: addTagToTaskInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeAddTagToTask(
    client: AsanaClient,
    params: AddTagToTaskInput
): Promise<OperationResult> {
    try {
        await client.postAsana(`/tasks/${params.task_gid}/addTag`, {
            tag: params.tag
        });

        return {
            success: true,
            data: {
                added: true,
                task_gid: params.task_gid,
                tag_gid: params.tag
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add tag to task",
                retryable: true
            }
        };
    }
}
