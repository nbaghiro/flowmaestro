import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Set Instance Metadata operation schema
 */
export const setInstanceMetadataSchema = z.object({
    zone: z.string().describe("GCP zone (e.g., us-central1-a)"),
    instanceName: z.string().describe("Instance name"),
    metadata: z.record(z.string()).describe("Metadata key-value pairs"),
    fingerprint: z.string().describe("Metadata fingerprint for optimistic locking")
});

export type SetInstanceMetadataParams = z.infer<typeof setInstanceMetadataSchema>;

/**
 * Set Instance Metadata operation definition
 */
export const setInstanceMetadataOperation: OperationDefinition = {
    id: "compute_engine_setInstanceMetadata",
    name: "Set Instance Metadata",
    description: "Update instance metadata key-value pairs",
    category: "compute-engine",
    inputSchema: setInstanceMetadataSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute set instance metadata operation
 */
export async function executeSetInstanceMetadata(
    client: GoogleCloudClient,
    params: SetInstanceMetadataParams
): Promise<OperationResult> {
    try {
        const requestBody = {
            fingerprint: params.fingerprint,
            items: Object.entries(params.metadata).map(([key, value]) => ({
                key,
                value
            }))
        };

        const response = await client.compute.post<{
            name: string;
            status: string;
            targetLink: string;
        }>(
            `/projects/${client.projectId}/zones/${params.zone}/instances/${params.instanceName}/setMetadata`,
            requestBody
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
                message: error instanceof Error ? error.message : "Failed to set instance metadata",
                retryable: false
            }
        };
    }
}
