import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { ZohoCrmClient } from "../../../client/ZohoCrmClient";
import type { ZohoListResponse, ZohoTask } from "../../types";

/**
 * Get Task Parameters
 */
export const getTaskSchema = z.object({
    id: z.string().min(1, "Task ID is required"),
    fields: z.array(z.string()).optional()
});

export type GetTaskParams = z.infer<typeof getTaskSchema>;

/**
 * Operation Definition
 */
export const getTaskOperation: OperationDefinition = {
    id: "getTask",
    name: "Get Task",
    description: "Get a task by ID from Zoho CRM",
    category: "crm",
    inputSchema: getTaskSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Task
 */
export async function executeGetTask(
    client: ZohoCrmClient,
    params: GetTaskParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(",");
        }

        const response = await client.get<ZohoListResponse<ZohoTask>>(
            `/crm/v8/Tasks/${params.id}`,
            queryParams
        );

        if (response.data?.[0]) {
            return {
                success: true,
                data: response.data[0]
            };
        }

        return {
            success: false,
            error: {
                type: "not_found",
                message: "Task not found",
                retryable: false
            }
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
