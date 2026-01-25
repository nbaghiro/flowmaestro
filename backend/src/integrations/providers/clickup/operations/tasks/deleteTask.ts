import { z } from "zod";
import { getLogger } from "../../../../../core/logging";
import { toJSONSchema } from "../../../../core/schema-utils";
import { ClickUpClient } from "../../client/ClickUpClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

const logger = getLogger();

/**
 * Delete Task operation schema
 */
export const deleteTaskSchema = z.object({
    taskId: z.string().describe("The task ID to delete")
});

export type DeleteTaskParams = z.infer<typeof deleteTaskSchema>;

/**
 * Delete Task operation definition
 */
export const deleteTaskOperation: OperationDefinition = (() => {
    try {
        return {
            id: "deleteTask",
            name: "Delete Task",
            description: "Delete a task from ClickUp",
            category: "tasks",
            actionType: "write",
            inputSchema: deleteTaskSchema,
            inputSchemaJSON: toJSONSchema(deleteTaskSchema),
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "ClickUp", err: error }, "Failed to create deleteTaskOperation");
        throw new Error(
            `Failed to create deleteTask operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute delete task operation
 */
export async function executeDeleteTask(
    client: ClickUpClient,
    params: DeleteTaskParams
): Promise<OperationResult> {
    try {
        await client.deleteTask(params.taskId);

        return {
            success: true,
            data: {
                deleted: true,
                taskId: params.taskId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete task",
                retryable: false
            }
        };
    }
}
