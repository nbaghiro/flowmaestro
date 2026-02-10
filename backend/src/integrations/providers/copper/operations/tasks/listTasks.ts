import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperTask } from "../types";

/**
 * List Tasks operation schema
 */
export const listTasksSchema = z.object({
    page_number: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(200).optional().default(50),
    sort_by: z.string().optional(),
    sort_direction: z.enum(["asc", "desc"]).optional()
});

export type ListTasksParams = z.infer<typeof listTasksSchema>;

/**
 * List Tasks operation definition
 */
export const listTasksOperation: OperationDefinition = {
    id: "listTasks",
    name: "List Tasks",
    description: "List all tasks in Copper CRM with pagination",
    category: "tasks",
    inputSchema: listTasksSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list tasks operation
 */
export async function executeListTasks(
    client: CopperClient,
    params: ListTasksParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            page_number: params.page_number,
            page_size: params.page_size
        };

        if (params.sort_by) {
            requestBody.sort_by = params.sort_by;
            requestBody.sort_direction = params.sort_direction || "asc";
        }

        const tasks = await client.post<CopperTask[]>("/tasks/search", requestBody);

        return {
            success: true,
            data: {
                tasks,
                count: tasks.length,
                page: params.page_number,
                page_size: params.page_size
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
