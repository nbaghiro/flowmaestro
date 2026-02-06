import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { InsightlyTask } from "../types";

/**
 * Get Task operation schema
 */
export const getTaskSchema = z.object({
    task_id: z.number().describe("The ID of the task to retrieve")
});

export type GetTaskParams = z.infer<typeof getTaskSchema>;

/**
 * Get Task operation definition
 */
export const getTaskOperation: OperationDefinition = {
    id: "getTask",
    name: "Get Task",
    description: "Get a specific task by ID from Insightly CRM",
    category: "tasks",
    inputSchema: getTaskSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get task operation
 */
export async function executeGetTask(
    client: InsightlyClient,
    params: GetTaskParams
): Promise<OperationResult> {
    try {
        const task = await client.get<InsightlyTask>(`/Tasks/${params.task_id}`);

        return {
            success: true,
            data: task
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
