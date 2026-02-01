import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";
import type { HubspotEngagement } from "../../types";

/**
 * Get Task Parameters
 */
export const getTaskSchema = z.object({
    taskId: z.string(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional()
});

export type GetTaskParams = z.infer<typeof getTaskSchema>;

/**
 * Operation Definition
 */
export const getTaskOperation: OperationDefinition = {
    id: "getTask",
    name: "Get Task",
    description: "Retrieve a task engagement by ID from HubSpot CRM",
    category: "crm",
    inputSchema: getTaskSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Task
 */
export async function executeGetTask(
    client: HubspotClient,
    params: GetTaskParams
): Promise<OperationResult> {
    try {
        const endpoint = "/crm/v3/objects/tasks/${params.taskId}";

        const queryParams: Record<string, unknown> = {};
        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties;
        }
        if (params.associations && params.associations.length > 0) {
            queryParams.associations = params.associations;
        }

        const response = await client.get<HubspotEngagement>(endpoint, queryParams);

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
                retryable: false
            }
        };
    }
}
