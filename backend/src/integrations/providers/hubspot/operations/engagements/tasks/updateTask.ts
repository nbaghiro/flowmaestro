import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";
import type { HubspotEngagement } from "../../types";

/**
 * Update Task Parameters
 */
export const updateTaskSchema = z.object({
    taskId: z.string(),
    properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
});

export type UpdateTaskParams = z.infer<typeof updateTaskSchema>;

/**
 * Operation Definition
 */
export const updateTaskOperation: OperationDefinition = {
    id: "updateTask",
    name: "Update Task",
    description: "Update an existing task engagement in HubSpot CRM",
    category: "crm",
    inputSchema: updateTaskSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Task
 */
export async function executeUpdateTask(
    client: HubspotClient,
    params: UpdateTaskParams
): Promise<OperationResult> {
    try {
        const response = await client.patch<HubspotEngagement>(
            "/crm/v3/objects/tasks/${params.taskId}",
            { properties: params.properties }
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
                message: error instanceof Error ? error.message : "Failed to update task",
                retryable: false
            }
        };
    }
}
