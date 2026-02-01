import { getTaskInputSchema, type GetTaskInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const getTaskOperation: OperationDefinition = {
    id: "getTask",
    name: "Get Task",
    description: "Retrieve a specific task from Asana by its GID.",
    category: "tasks",
    inputSchema: getTaskInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetTask(
    client: AsanaClient,
    params: GetTaskInput
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.opt_fields && params.opt_fields.length > 0) {
            queryParams.opt_fields = client.buildOptFields(params.opt_fields);
        }

        const response = await client.getAsana<Record<string, unknown>>(
            `/tasks/${params.task_gid}`,
            queryParams
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get task",
                retryable: true
            }
        };
    }
}
