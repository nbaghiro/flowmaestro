import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperTask } from "../types";

/**
 * Create Task operation schema
 */
export const createTaskSchema = z.object({
    name: z.string().describe("Task name"),
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

export type CreateTaskParams = z.infer<typeof createTaskSchema>;

/**
 * Create Task operation definition
 */
export const createTaskOperation: OperationDefinition = {
    id: "createTask",
    name: "Create Task",
    description: "Create a new task in Copper CRM",
    category: "tasks",
    inputSchema: createTaskSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create task operation
 */
export async function executeCreateTask(
    client: CopperClient,
    params: CreateTaskParams
): Promise<OperationResult> {
    try {
        const task = await client.post<CopperTask>("/tasks", params);

        return {
            success: true,
            data: task
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
