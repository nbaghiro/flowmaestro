import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";

/**
 * Delete Task Parameters
 */
export const deleteTaskSchema = z.object({
    taskId: z.string()
});

export type DeleteTaskParams = z.infer<typeof deleteTaskSchema>;

/**
 * Operation Definition
 */
export const deleteTaskOperation: OperationDefinition = {
    id: "deleteTask",
    name: "Delete Task",
    description: "Delete (archive) a task engagement in HubSpot CRM",
    category: "crm",
    inputSchema: deleteTaskSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Delete Task
 */
export async function executeDeleteTask(
    client: HubspotClient,
    params: DeleteTaskParams
): Promise<OperationResult> {
    try {
        await client.delete(`/crm/v3/objects/tasks/${params.taskId}`);

        return {
            success: true,
            data: { deleted: true }
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
