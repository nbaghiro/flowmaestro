import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { InsightlyTask } from "../types";

/**
 * Create Task operation schema
 */
export const createTaskSchema = z.object({
    TITLE: z.string().describe("Task title"),
    CATEGORY_ID: z.number().optional().describe("Category ID"),
    DUE_DATE: z.string().optional().describe("Due date (ISO 8601 format)"),
    START_DATE: z.string().optional().describe("Start date (ISO 8601 format)"),
    DETAILS: z.string().optional().describe("Task details/notes"),
    STATUS: z.string().optional().describe("Task status"),
    PRIORITY: z.number().min(1).max(3).optional().describe("Priority (1=Low, 2=Normal, 3=High)"),
    PERCENT_COMPLETE: z.number().min(0).max(100).optional().describe("Percent complete"),
    MILESTONE_ID: z.number().optional().describe("Milestone ID"),
    RESPONSIBLE_USER_ID: z.number().optional().describe("Responsible user ID"),
    OWNER_USER_ID: z.number().optional().describe("Owner user ID"),
    ASSIGNED_TEAM_ID: z.number().optional().describe("Assigned team ID"),
    RECURRENCE: z.string().optional().describe("Recurrence pattern"),
    REMINDER_DATE_UTC: z.string().optional().describe("Reminder date (ISO 8601 format)"),
    VISIBLE_TO: z.enum(["EVERYONE", "OWNER", "TEAM"]).optional().describe("Visibility setting"),
    VISIBLE_TEAM_ID: z.number().optional().describe("Visible team ID"),
    TASKLINKS: z
        .array(
            z.object({
                CONTACT_ID: z.number().optional(),
                ORGANISATION_ID: z.number().optional(),
                OPPORTUNITY_ID: z.number().optional(),
                PROJECT_ID: z.number().optional(),
                LEAD_ID: z.number().optional()
            })
        )
        .optional()
        .describe("Links to contacts, organisations, opportunities, projects, or leads")
});

export type CreateTaskParams = z.infer<typeof createTaskSchema>;

/**
 * Create Task operation definition
 */
export const createTaskOperation: OperationDefinition = {
    id: "createTask",
    name: "Create Task",
    description: "Create a new task in Insightly CRM",
    category: "tasks",
    inputSchema: createTaskSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create task operation
 */
export async function executeCreateTask(
    client: InsightlyClient,
    params: CreateTaskParams
): Promise<OperationResult> {
    try {
        const task = await client.post<InsightlyTask>("/Tasks", params);

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
