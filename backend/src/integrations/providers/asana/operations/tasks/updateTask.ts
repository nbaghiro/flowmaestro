import { updateTaskInputSchema, type UpdateTaskInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const updateTaskOperation: OperationDefinition = {
    id: "updateTask",
    name: "Update Task",
    description:
        "Update an existing task in Asana. Can modify name, description, assignee, dates, and more.",
    category: "tasks",
    inputSchema: updateTaskInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeUpdateTask(
    client: AsanaClient,
    params: UpdateTaskInput
): Promise<OperationResult> {
    try {
        const { task_gid, ...updateData } = params;

        // Filter out undefined values but keep null (for clearing fields)
        const taskData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updateData)) {
            if (value !== undefined) {
                taskData[key] = value;
            }
        }

        const response = await client.putAsana<{
            gid: string;
            name: string;
            resource_type: string;
            permalink_url: string;
        }>(`/tasks/${task_gid}`, taskData);

        return {
            success: true,
            data: {
                gid: response.gid,
                name: response.name,
                resource_type: response.resource_type,
                permalink_url: response.permalink_url
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update task",
                retryable: true
            }
        };
    }
}
