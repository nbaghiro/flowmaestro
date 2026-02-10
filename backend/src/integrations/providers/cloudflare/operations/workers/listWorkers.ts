import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * List Workers operation schema
 */
export const listWorkersSchema = z.object({});

export type ListWorkersParams = z.infer<typeof listWorkersSchema>;

/**
 * List Workers operation definition
 */
export const listWorkersOperation: OperationDefinition = {
    id: "workers_listScripts",
    name: "List Workers",
    description: "List all Worker scripts in the account",
    category: "workers",
    inputSchema: listWorkersSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list workers operation
 */
export async function executeListWorkers(
    client: CloudflareClient,
    _params: ListWorkersParams
): Promise<OperationResult> {
    try {
        const workers = await client.listWorkers();

        return {
            success: true,
            data: {
                workers: workers.map((worker) => ({
                    id: worker.id,
                    etag: worker.etag,
                    handlers: worker.handlers,
                    usageModel: worker.usage_model,
                    compatibilityDate: worker.compatibility_date,
                    compatibilityFlags: worker.compatibility_flags,
                    createdOn: worker.created_on,
                    modifiedOn: worker.modified_on
                })),
                accountId: client.getAccountId()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list Workers",
                retryable: true
            }
        };
    }
}
