import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { InsightlyTask } from "../types";

/**
 * List Tasks operation schema
 */
export const listTasksSchema = z.object({
    skip: z.number().min(0).optional().default(0),
    top: z.number().min(1).max(500).optional().default(50),
    order_by: z.string().optional().describe("Field to sort by (e.g., DUE_DATE desc)")
});

export type ListTasksParams = z.infer<typeof listTasksSchema>;

/**
 * List Tasks operation definition
 */
export const listTasksOperation: OperationDefinition = {
    id: "listTasks",
    name: "List Tasks",
    description: "List all tasks in Insightly CRM with pagination",
    category: "tasks",
    inputSchema: listTasksSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list tasks operation
 */
export async function executeListTasks(
    client: InsightlyClient,
    params: ListTasksParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            skip: params.skip,
            top: params.top
        };

        if (params.order_by) {
            queryParams["$orderby"] = params.order_by;
        }

        const tasks = await client.get<InsightlyTask[]>("/Tasks", queryParams);

        return {
            success: true,
            data: {
                tasks,
                count: tasks.length,
                skip: params.skip,
                top: params.top
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list tasks",
                retryable: true
            }
        };
    }
}
