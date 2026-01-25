import { z } from "zod";
import { getLogger } from "../../../../../core/logging";
import { toJSONSchema } from "../../../../core/schema-utils";
import { ClickUpClient } from "../../client/ClickUpClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

const logger = getLogger();

/**
 * Create Task operation schema
 */
export const createTaskSchema = z.object({
    listId: z.string().describe("The list ID to create the task in"),
    name: z.string().min(1).max(255).describe("Name of the task"),
    description: z.string().optional().describe("Task description (supports markdown)"),
    assignees: z.array(z.number()).optional().describe("Array of user IDs to assign"),
    priority: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe("Priority level (1=Urgent, 2=High, 3=Normal, 4=Low)"),
    dueDate: z.number().optional().describe("Due date as Unix timestamp in milliseconds"),
    startDate: z.number().optional().describe("Start date as Unix timestamp in milliseconds"),
    status: z.string().optional().describe("Status name for the task"),
    tags: z.array(z.string()).optional().describe("Array of tag names")
});

export type CreateTaskParams = z.infer<typeof createTaskSchema>;

/**
 * Create Task operation definition
 */
export const createTaskOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createTask",
            name: "Create Task",
            description: "Create a new task in a ClickUp list",
            category: "tasks",
            actionType: "write",
            inputSchema: createTaskSchema,
            inputSchemaJSON: toJSONSchema(createTaskSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "ClickUp", err: error }, "Failed to create createTaskOperation");
        throw new Error(
            `Failed to create createTask operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create task operation
 */
export async function executeCreateTask(
    client: ClickUpClient,
    params: CreateTaskParams
): Promise<OperationResult> {
    try {
        const taskData: {
            name: string;
            description?: string;
            assignees?: number[];
            priority?: number;
            due_date?: number;
            start_date?: number;
            status?: string;
            tags?: string[];
        } = {
            name: params.name
        };

        if (params.description) taskData.description = params.description;
        if (params.assignees) taskData.assignees = params.assignees;
        if (params.priority) taskData.priority = params.priority;
        if (params.dueDate) taskData.due_date = params.dueDate;
        if (params.startDate) taskData.start_date = params.startDate;
        if (params.status) taskData.status = params.status;
        if (params.tags) taskData.tags = params.tags;

        const task = await client.createTask(params.listId, taskData);

        return {
            success: true,
            data: {
                id: task.id,
                name: task.name,
                status: task.status?.status,
                url: task.url,
                dateCreated: task.date_created,
                creator: task.creator?.username,
                list: task.list?.name
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create task",
                retryable: true
            }
        };
    }
}
