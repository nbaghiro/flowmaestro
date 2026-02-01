import { z } from "zod";
import { getLogger } from "../../../../../core/logging";
import { ClickUpClient } from "../../client/ClickUpClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

const logger = getLogger();

/**
 * Update Task operation schema
 */
export const updateTaskSchema = z.object({
    taskId: z.string().describe("The task ID to update"),
    name: z.string().optional().describe("New task name"),
    description: z.string().optional().describe("New description"),
    assignees: z
        .object({
            add: z.array(z.number()).optional().describe("User IDs to add as assignees"),
            rem: z.array(z.number()).optional().describe("User IDs to remove from assignees")
        })
        .optional()
        .describe("Assignee modifications"),
    priority: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe("New priority level (1=Urgent, 2=High, 3=Normal, 4=Low)"),
    dueDate: z.number().optional().describe("New due date (Unix timestamp in milliseconds)"),
    startDate: z.number().optional().describe("New start date (Unix timestamp in milliseconds)"),
    status: z.string().optional().describe("New status name")
});

export type UpdateTaskParams = z.infer<typeof updateTaskSchema>;

/**
 * Update Task operation definition
 */
export const updateTaskOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateTask",
            name: "Update Task",
            description: "Update an existing task's properties",
            category: "tasks",
            actionType: "write",
            inputSchema: updateTaskSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "ClickUp", err: error }, "Failed to create updateTaskOperation");
        throw new Error(
            `Failed to create updateTask operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute update task operation
 */
export async function executeUpdateTask(
    client: ClickUpClient,
    params: UpdateTaskParams
): Promise<OperationResult> {
    try {
        const updateData: {
            name?: string;
            description?: string;
            assignees?: { add?: number[]; rem?: number[] };
            priority?: number;
            due_date?: number;
            start_date?: number;
            status?: string;
        } = {};

        if (params.name) updateData.name = params.name;
        if (params.description) updateData.description = params.description;
        if (params.assignees) updateData.assignees = params.assignees;
        if (params.priority) updateData.priority = params.priority;
        if (params.dueDate) updateData.due_date = params.dueDate;
        if (params.startDate) updateData.start_date = params.startDate;
        if (params.status) updateData.status = params.status;

        const task = await client.updateTask(params.taskId, updateData);

        return {
            success: true,
            data: {
                id: task.id,
                name: task.name,
                status: task.status?.status,
                priority: task.priority?.priority,
                url: task.url,
                dateUpdated: task.date_updated,
                assignees: task.assignees?.map((a) => ({
                    id: a.id,
                    username: a.username
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update task",
                retryable: true
            }
        };
    }
}
