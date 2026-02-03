import { z } from "zod";
import { WorkerNameSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * Get Worker Settings operation schema
 */
export const getWorkerSettingsSchema = z.object({
    scriptName: WorkerNameSchema.describe("The name of the Worker script")
});

export type GetWorkerSettingsParams = z.infer<typeof getWorkerSettingsSchema>;

/**
 * Get Worker Settings operation definition
 */
export const getWorkerSettingsOperation: OperationDefinition = {
    id: "workers_getSettings",
    name: "Get Worker Settings",
    description: "Get the settings and bindings for a Worker script",
    category: "workers",
    inputSchema: getWorkerSettingsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get worker settings operation
 */
export async function executeGetWorkerSettings(
    client: CloudflareClient,
    params: GetWorkerSettingsParams
): Promise<OperationResult> {
    try {
        const settings = await client.getWorkerSettings(params.scriptName);

        return {
            success: true,
            data: {
                scriptName: params.scriptName,
                bindings: settings.bindings,
                compatibilityDate: settings.compatibility_date,
                compatibilityFlags: settings.compatibility_flags,
                usageModel: settings.usage_model,
                accountId: client.getAccountId()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get Worker settings",
                retryable: true
            }
        };
    }
}
