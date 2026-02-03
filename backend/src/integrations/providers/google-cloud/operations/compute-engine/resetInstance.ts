import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Reset Instance operation schema
 */
export const resetInstanceSchema = z.object({
    zone: z.string().describe("GCP zone (e.g., us-central1-a)"),
    instanceName: z.string().describe("Instance name")
});

export type ResetInstanceParams = z.infer<typeof resetInstanceSchema>;

/**
 * Reset Instance operation definition
 */
export const resetInstanceOperation: OperationDefinition = {
    id: "compute_engine_resetInstance",
    name: "Reset Instance",
    description: "Perform a hard reset (power cycle) of a VM instance",
    category: "compute-engine",
    inputSchema: resetInstanceSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute reset instance operation
 */
export async function executeResetInstance(
    client: GoogleCloudClient,
    params: ResetInstanceParams
): Promise<OperationResult> {
    try {
        const response = await client.compute.post<{
            name: string;
            status: string;
            targetLink: string;
        }>(
            `/projects/${client.projectId}/zones/${params.zone}/instances/${params.instanceName}/reset`,
            {}
        );

        return {
            success: true,
            data: {
                operationName: response.name,
                status: response.status,
                targetLink: response.targetLink,
                instanceName: params.instanceName,
                zone: params.zone,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to reset instance",
                retryable: false
            }
        };
    }
}
