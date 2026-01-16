import { toJSONSchema } from "../../../../core/schema-utils";
import { removeTaskFromProjectInputSchema, type RemoveTaskFromProjectInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const removeTaskFromProjectOperation: OperationDefinition = {
    id: "removeTaskFromProject",
    name: "Remove Task from Project",
    description:
        "Remove a task from a project. The task will still exist but no longer be part of the project.",
    category: "tasks",
    inputSchema: removeTaskFromProjectInputSchema,
    inputSchemaJSON: toJSONSchema(removeTaskFromProjectInputSchema),
    retryable: true,
    timeout: 10000
};

export async function executeRemoveTaskFromProject(
    client: AsanaClient,
    params: RemoveTaskFromProjectInput
): Promise<OperationResult> {
    try {
        await client.postAsana(`/tasks/${params.task_gid}/removeProject`, {
            project: params.project
        });

        return {
            success: true,
            data: {
                removed: true,
                task_gid: params.task_gid,
                project_gid: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to remove task from project",
                retryable: true
            }
        };
    }
}
