import { toJSONSchema } from "../../../../core/schema-utils";
import { listTasksInputSchema, type ListTasksInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const listTasksOperation: OperationDefinition = {
    id: "listTasks",
    name: "List Tasks",
    description:
        "List tasks from a project, section, or by assignee. At least one filter (project, section, or assignee+workspace) is required.",
    category: "tasks",
    inputSchema: listTasksInputSchema,
    inputSchemaJSON: toJSONSchema(listTasksInputSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListTasks(
    client: AsanaClient,
    params: ListTasksInput
): Promise<OperationResult> {
    try {
        // Determine the endpoint based on provided filters
        let url: string;
        const queryParams: Record<string, unknown> = {};

        if (params.project) {
            url = `/projects/${params.project}/tasks`;
        } else if (params.section) {
            url = `/sections/${params.section}/tasks`;
        } else if (params.assignee && params.workspace) {
            url = "/tasks";
            queryParams.assignee = params.assignee;
            queryParams.workspace = params.workspace;
        } else {
            return {
                success: false,
                error: {
                    type: "validation",
                    message:
                        "At least one filter is required: project, section, or assignee with workspace",
                    retryable: false
                }
            };
        }

        // Add optional filters
        if (params.completed_since) {
            queryParams.completed_since = params.completed_since;
        }
        if (params.modified_since) {
            queryParams.modified_since = params.modified_since;
        }
        if (params.opt_fields && params.opt_fields.length > 0) {
            queryParams.opt_fields = client.buildOptFields(params.opt_fields);
        }

        const tasks = await client.getPaginated<Record<string, unknown>>(
            url,
            queryParams,
            params.limit
        );

        return {
            success: true,
            data: {
                tasks,
                count: tasks.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list tasks",
                retryable: true
            }
        };
    }
}
