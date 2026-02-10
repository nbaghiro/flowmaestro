import { z } from "zod";
import { WorkerNameSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * Get Worker operation schema
 */
export const getWorkerSchema = z.object({
    scriptName: WorkerNameSchema.describe("The name of the Worker script")
});

export type GetWorkerParams = z.infer<typeof getWorkerSchema>;

/**
 * Get Worker operation definition
 */
export const getWorkerOperation: OperationDefinition = {
    id: "workers_getScript",
    name: "Get Worker",
    description: "Get the content of a Worker script",
    category: "workers",
    inputSchema: getWorkerSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get worker operation
 */
export async function executeGetWorker(
    client: CloudflareClient,
    params: GetWorkerParams
): Promise<OperationResult> {
    try {
        const scriptContent = await client.getWorker(params.scriptName);

        return {
            success: true,
            data: {
                scriptName: params.scriptName,
                content: scriptContent,
                accountId: client.getAccountId()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get Worker script",
                retryable: true
            }
        };
    }
}
