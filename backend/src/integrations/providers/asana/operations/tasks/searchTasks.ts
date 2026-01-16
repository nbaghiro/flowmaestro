import { toJSONSchema } from "../../../../core/schema-utils";
import { searchTasksInputSchema, type SearchTasksInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const searchTasksOperation: OperationDefinition = {
    id: "searchTasks",
    name: "Search Tasks",
    description:
        "Search for tasks in a workspace using various filters like text, assignee, projects, tags, dates, and completion status.",
    category: "tasks",
    inputSchema: searchTasksInputSchema,
    inputSchemaJSON: toJSONSchema(searchTasksInputSchema),
    retryable: true,
    timeout: 30000
};

export async function executeSearchTasks(
    client: AsanaClient,
    params: SearchTasksInput
): Promise<OperationResult> {
    try {
        const { workspace, limit, opt_fields, ...searchParams } = params;

        const queryParams: Record<string, unknown> = {};

        // Add search parameters
        for (const [key, value] of Object.entries(searchParams)) {
            if (value !== undefined) {
                queryParams[key] = value;
            }
        }

        if (opt_fields && opt_fields.length > 0) {
            queryParams.opt_fields = client.buildOptFields(opt_fields);
        }

        const tasks = await client.getPaginated<Record<string, unknown>>(
            `/workspaces/${workspace}/tasks/search`,
            queryParams,
            limit
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
                message: error instanceof Error ? error.message : "Failed to search tasks",
                retryable: true
            }
        };
    }
}
