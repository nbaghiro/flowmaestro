import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseTask } from "../types";

/**
 * Complete Task Parameters
 */
export const completeTaskSchema = z.object({
    id: z.string().describe("The task ID to complete (starts with 'task_')")
});

export type CompleteTaskParams = z.infer<typeof completeTaskSchema>;

/**
 * Operation Definition
 */
export const completeTaskOperation: OperationDefinition = {
    id: "completeTask",
    name: "Complete Task",
    description: "Mark a task as completed",
    category: "activities",
    inputSchema: completeTaskSchema,
    inputSchemaJSON: toJSONSchema(completeTaskSchema),
    retryable: false,
    timeout: 10000
};

/**
 * Execute Complete Task
 */
export async function executeCompleteTask(
    client: CloseClient,
    params: CompleteTaskParams
): Promise<OperationResult> {
    try {
        const response = await client.put<CloseTask>(`/task/${params.id}/`, {
            is_complete: true
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to complete task",
                retryable: false
            }
        };
    }
}
