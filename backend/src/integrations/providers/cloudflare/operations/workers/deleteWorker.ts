import { z } from "zod";
import { WorkerNameSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * Delete Worker operation schema
 */
export const deleteWorkerSchema = z.object({
    scriptName: WorkerNameSchema.describe("The name of the Worker script to delete")
});

export type DeleteWorkerParams = z.infer<typeof deleteWorkerSchema>;

/**
 * Delete Worker operation definition
 */
export const deleteWorkerOperation: OperationDefinition = {
    id: "workers_deleteScript",
    name: "Delete Worker",
    description: "Delete a Worker script",
    category: "workers",
    inputSchema: deleteWorkerSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute delete worker operation
 */
export async function executeDeleteWorker(
    client: CloudflareClient,
    params: DeleteWorkerParams
): Promise<OperationResult> {
    try {
        await client.deleteWorker(params.scriptName);

        return {
            success: true,
            data: {
                scriptName: params.scriptName,
                message: "Worker script deleted successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete Worker script",
                retryable: false
            }
        };
    }
}
