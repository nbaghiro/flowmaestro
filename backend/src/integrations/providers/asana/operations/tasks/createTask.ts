import { toJSONSchema } from "../../../../core/schema-utils";
import { createTaskInputSchema, type CreateTaskInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const createTaskOperation: OperationDefinition = {
    id: "createTask",
    name: "Create Task",
    description:
        "Create a new task in Asana. Can be added to projects, assigned to users, and include custom fields.",
    category: "tasks",
    inputSchema: createTaskInputSchema,
    inputSchemaJSON: toJSONSchema(createTaskInputSchema),
    retryable: true,
    timeout: 10000
};

export async function executeCreateTask(
    client: AsanaClient,
    params: CreateTaskInput
): Promise<OperationResult> {
    try {
        const taskData: Record<string, unknown> = {
            workspace: params.workspace,
            name: params.name
        };

        // Add optional fields
        if (params.notes !== undefined) {
            taskData.notes = params.notes;
        }
        if (params.html_notes !== undefined) {
            taskData.html_notes = params.html_notes;
        }
        if (params.assignee !== undefined) {
            taskData.assignee = params.assignee;
        }
        if (params.due_on !== undefined) {
            taskData.due_on = params.due_on;
        }
        if (params.due_at !== undefined) {
            taskData.due_at = params.due_at;
        }
        if (params.start_on !== undefined) {
            taskData.start_on = params.start_on;
        }
        if (params.start_at !== undefined) {
            taskData.start_at = params.start_at;
        }
        if (params.projects && params.projects.length > 0) {
            taskData.projects = params.projects;
        }
        if (params.parent !== undefined) {
            taskData.parent = params.parent;
        }
        if (params.tags && params.tags.length > 0) {
            taskData.tags = params.tags;
        }
        if (params.followers && params.followers.length > 0) {
            taskData.followers = params.followers;
        }
        if (params.custom_fields !== undefined) {
            taskData.custom_fields = params.custom_fields;
        }

        const response = await client.postAsana<{
            gid: string;
            name: string;
            resource_type: string;
            permalink_url: string;
        }>("/tasks", taskData);

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
                message: error instanceof Error ? error.message : "Failed to create task",
                retryable: true
            }
        };
    }
}
