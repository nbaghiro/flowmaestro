import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperTask } from "../types";

/**
 * Update Task operation schema
 */
export const updateTaskSchema = z.object({
    task_id: z.number().describe("The ID of the task to update"),
    name: z.string().optional().describe("Task name"),
    related_resource: z
        .object({
            id: z.number(),
            type: z.enum(["lead", "person", "company", "opportunity", "project"])
        })
        .optional()
        .describe("Related resource (lead, person, company, opportunity, or project)"),
    assignee_id: z.number().optional().describe("User ID to assign the task to"),
    due_date: z.number().optional().describe("Due date as Unix timestamp"),
    reminder_date: z.number().optional().describe("Reminder date as Unix timestamp"),
    priority: z.enum(["None", "High"]).optional().describe("Task priority"),
    status: z.enum(["Open", "Completed"]).optional().describe("Task status"),
    details: z.string().optional().describe("Additional details/notes"),
    tags: z.array(z.string()).optional().describe("Tags to add to the task")
});

export type UpdateTaskParams = z.infer<typeof updateTaskSchema>;

/**
 * Update Task operation definition
 */
export const updateTaskOperation: OperationDefinition = {
    id: "updateTask",
    name: "Update Task",
    description: "Update an existing task in Copper CRM",
    category: "tasks",
    inputSchema: updateTaskSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute update task operation
 */
export async function executeUpdateTask(
    client: CopperClient,
    params: UpdateTaskParams
): Promise<OperationResult> {
    try {
        const { task_id, ...updateData } = params;
        const task = await client.put<CopperTask>(`/tasks/${task_id}`, updateData);

        return {
            success: true,
            data: task
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
