import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { ZohoCrmClient } from "../../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoTask } from "../../types";

/**
 * Create Task Parameters
 */
export const createTaskSchema = z.object({
    Subject: z.string().min(1, "Subject is required"),
    Due_Date: z.string().optional(),
    Status: z.string().optional(),
    Priority: z.string().optional(),
    What_Id: z.object({ id: z.string() }).optional(),
    Who_Id: z.object({ id: z.string() }).optional(),
    Description: z.string().optional()
});

export type CreateTaskParams = z.infer<typeof createTaskSchema>;

/**
 * Operation Definition
 */
export const createTaskOperation: OperationDefinition = {
    id: "createTask",
    name: "Create Task",
    description: "Create a new task in Zoho CRM",
    category: "crm",
    inputSchema: createTaskSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Task
 */
export async function executeCreateTask(
    client: ZohoCrmClient,
    params: CreateTaskParams
): Promise<OperationResult> {
    try {
        const response = await client.post<ZohoRecordResponse<ZohoTask>>("/crm/v8/Tasks", {
            data: [params]
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
                message: response.data?.[0]?.message || "Failed to create task",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create task",
                retryable: false
            }
        };
    }
}
