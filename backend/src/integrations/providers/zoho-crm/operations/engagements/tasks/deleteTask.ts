import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { ZohoCrmClient } from "../../../client/ZohoCrmClient";
import type { ZohoDeleteResponse } from "../../types";

/**
 * Delete Task Parameters
 */
export const deleteTaskSchema = z.object({
    id: z.string().min(1, "Task ID is required")
});

export type DeleteTaskParams = z.infer<typeof deleteTaskSchema>;

/**
 * Operation Definition
 */
export const deleteTaskOperation: OperationDefinition = {
    id: "deleteTask",
    name: "Delete Task",
    description: "Delete a task from Zoho CRM",
    category: "crm",
    inputSchema: deleteTaskSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Delete Task
 */
export async function executeDeleteTask(
    client: ZohoCrmClient,
    params: DeleteTaskParams
): Promise<OperationResult> {
    try {
        const response = await client.delete<ZohoDeleteResponse>(`/crm/v8/Tasks?ids=${params.id}`);

        if (response.data?.[0]?.status === "success") {
            return {
                success: true,
                data: {
                    deleted: true,
                    taskId: params.id
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: response.data?.[0]?.message || "Failed to delete task",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete task",
                retryable: false
            }
        };
    }
}
