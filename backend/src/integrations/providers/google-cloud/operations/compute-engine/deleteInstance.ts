import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Delete Instance operation schema
 */
export const deleteInstanceSchema = z.object({
    zone: z.string().describe("GCP zone (e.g., us-central1-a)"),
    instanceName: z.string().describe("Instance name")
});

export type DeleteInstanceParams = z.infer<typeof deleteInstanceSchema>;

/**
 * Delete Instance operation definition
 */
export const deleteInstanceOperation: OperationDefinition = {
    id: "compute_engine_deleteInstance",
    name: "Delete Instance",
    description: "Delete a VM instance",
    category: "compute-engine",
    inputSchema: deleteInstanceSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute delete instance operation
 */
export async function executeDeleteInstance(
    client: GoogleCloudClient,
    params: DeleteInstanceParams
): Promise<OperationResult> {
    try {
        const response = await client.compute.delete<{
            name: string;
            status: string;
            targetLink: string;
        }>(`/projects/${client.projectId}/zones/${params.zone}/instances/${params.instanceName}`);

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
                message: error instanceof Error ? error.message : "Failed to delete instance",
                retryable: false
            }
        };
    }
}
