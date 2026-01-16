import { toJSONSchema } from "../../../../core/schema-utils";
import { addTaskToSectionInputSchema, type AddTaskToSectionInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const addTaskToSectionOperation: OperationDefinition = {
    id: "addTaskToSection",
    name: "Add Task to Section",
    description: "Add or move a task to a specific section within a project.",
    category: "sections",
    inputSchema: addTaskToSectionInputSchema,
    inputSchemaJSON: toJSONSchema(addTaskToSectionInputSchema),
    retryable: true,
    timeout: 10000
};

export async function executeAddTaskToSection(
    client: AsanaClient,
    params: AddTaskToSectionInput
): Promise<OperationResult> {
    try {
        const requestData: Record<string, unknown> = {
            task: params.task
        };

        if (params.insert_before !== undefined) {
            requestData.insert_before = params.insert_before;
        }
        if (params.insert_after !== undefined) {
            requestData.insert_after = params.insert_after;
        }

        await client.postAsana(`/sections/${params.section_gid}/addTask`, requestData);

        return {
            success: true,
            data: {
                added: true,
                task_gid: params.task,
                section_gid: params.section_gid
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add task to section",
                retryable: true
            }
        };
    }
}
