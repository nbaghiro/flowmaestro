import { toJSONSchema } from "../../../../core/schema-utils";
import { addTaskToProjectInputSchema, type AddTaskToProjectInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const addTaskToProjectOperation: OperationDefinition = {
    id: "addTaskToProject",
    name: "Add Task to Project",
    description: "Add an existing task to a project. Optionally specify a section and position.",
    category: "tasks",
    inputSchema: addTaskToProjectInputSchema,
    inputSchemaJSON: toJSONSchema(addTaskToProjectInputSchema),
    retryable: true,
    timeout: 10000
};

export async function executeAddTaskToProject(
    client: AsanaClient,
    params: AddTaskToProjectInput
): Promise<OperationResult> {
    try {
        const requestData: Record<string, unknown> = {
            project: params.project
        };

        if (params.section !== undefined) {
            requestData.section = params.section;
        }
        if (params.insert_before !== undefined) {
            requestData.insert_before = params.insert_before;
        }
        if (params.insert_after !== undefined) {
            requestData.insert_after = params.insert_after;
        }

        await client.postAsana(`/tasks/${params.task_gid}/addProject`, requestData);

        return {
            success: true,
            data: {
                added: true,
                task_gid: params.task_gid,
                project_gid: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add task to project",
                retryable: true
            }
        };
    }
}
