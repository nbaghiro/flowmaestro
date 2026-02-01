import { createSubtaskInputSchema, type CreateSubtaskInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const createSubtaskOperation: OperationDefinition = {
    id: "createSubtask",
    name: "Create Subtask",
    description: "Create a subtask under a parent task in Asana.",
    category: "tasks",
    inputSchema: createSubtaskInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeCreateSubtask(
    client: AsanaClient,
    params: CreateSubtaskInput
): Promise<OperationResult> {
    try {
        const subtaskData: Record<string, unknown> = {
            name: params.name
        };

        if (params.notes !== undefined) {
            subtaskData.notes = params.notes;
        }
        if (params.assignee !== undefined) {
            subtaskData.assignee = params.assignee;
        }
        if (params.due_on !== undefined) {
            subtaskData.due_on = params.due_on;
        }
        if (params.custom_fields !== undefined) {
            subtaskData.custom_fields = params.custom_fields;
        }

        const response = await client.postAsana<{
            gid: string;
            name: string;
            resource_type: string;
            permalink_url: string;
        }>(`/tasks/${params.parent_task_gid}/subtasks`, subtaskData);

        return {
            success: true,
            data: {
                gid: response.gid,
                name: response.name,
                resource_type: response.resource_type,
                permalink_url: response.permalink_url,
                parent_gid: params.parent_task_gid
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create subtask",
                retryable: true
            }
        };
    }
}
