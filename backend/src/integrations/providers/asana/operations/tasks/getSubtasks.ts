import { toJSONSchema } from "../../../../core/schema-utils";
import { getSubtasksInputSchema, type GetSubtasksInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const getSubtasksOperation: OperationDefinition = {
    id: "getSubtasks",
    name: "Get Subtasks",
    description: "Get all subtasks of a parent task in Asana.",
    category: "tasks",
    inputSchema: getSubtasksInputSchema,
    inputSchemaJSON: toJSONSchema(getSubtasksInputSchema),
    retryable: true,
    timeout: 30000
};

export async function executeGetSubtasks(
    client: AsanaClient,
    params: GetSubtasksInput
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.opt_fields && params.opt_fields.length > 0) {
            queryParams.opt_fields = client.buildOptFields(params.opt_fields);
        }

        const subtasks = await client.getPaginated<Record<string, unknown>>(
            `/tasks/${params.task_gid}/subtasks`,
            queryParams,
            params.limit
        );

        return {
            success: true,
            data: {
                subtasks,
                count: subtasks.length,
                parent_gid: params.task_gid
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get subtasks",
                retryable: true
            }
        };
    }
}
