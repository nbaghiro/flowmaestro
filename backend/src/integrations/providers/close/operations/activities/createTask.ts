import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseTask } from "../types";

/**
 * Create Task Parameters
 */
export const createTaskSchema = z.object({
    lead_id: z.string().describe("Lead ID to add task to (required)"),
    text: z.string().min(1).describe("Task description (required)"),
    assigned_to: z.string().optional().describe("User ID to assign task to"),
    due_date: z.string().optional().describe("Due date (YYYY-MM-DD)"),
    is_dateless: z.boolean().optional().describe("Task has no due date")
});

export type CreateTaskParams = z.infer<typeof createTaskSchema>;

/**
 * Operation Definition
 */
export const createTaskOperation: OperationDefinition = {
    id: "createTask",
    name: "Create Task",
    description: "Create a task on a lead",
    category: "activities",
    inputSchema: createTaskSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Create Task
 */
export async function executeCreateTask(
    client: CloseClient,
    params: CreateTaskParams
): Promise<OperationResult> {
    try {
        const response = await client.post<CloseTask>("/task/", params);

        return {
            success: true,
            data: response
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
