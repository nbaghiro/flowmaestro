import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { ZohoCrmClient } from "../../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoTask } from "../../types";

/**
 * Update Task Parameters
 */
export const updateTaskSchema = z.object({
    id: z.string().min(1, "Task ID is required"),
    Subject: z.string().optional(),
    Due_Date: z.string().optional(),
    Status: z.string().optional(),
    Priority: z.string().optional(),
    What_Id: z.object({ id: z.string() }).optional(),
    Who_Id: z.object({ id: z.string() }).optional(),
    Description: z.string().optional()
});

export type UpdateTaskParams = z.infer<typeof updateTaskSchema>;

/**
 * Operation Definition
 */
export const updateTaskOperation: OperationDefinition = {
    id: "updateTask",
    name: "Update Task",
    description: "Update an existing task in Zoho CRM",
    category: "crm",
    inputSchema: updateTaskSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Task
 */
export async function executeUpdateTask(
    client: ZohoCrmClient,
    params: UpdateTaskParams
): Promise<OperationResult> {
    try {
        const { id, ...updateData } = params;

        const response = await client.put<ZohoRecordResponse<ZohoTask>>(`/crm/v8/Tasks/${id}`, {
            data: [updateData]
        });

        if (response.data?.[0]?.status === "success") {
            return {
                success: true,
                data: response.data[0].details
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: response.data?.[0]?.message || "Failed to update task",
                retryable: false
            }
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
