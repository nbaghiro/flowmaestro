import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Get Instance operation schema
 */
export const getInstanceSchema = z.object({
    zone: z.string().describe("GCP zone (e.g., us-central1-a)"),
    instanceName: z.string().describe("Instance name")
});

export type GetInstanceParams = z.infer<typeof getInstanceSchema>;

/**
 * Get Instance operation definition
 */
export const getInstanceOperation: OperationDefinition = {
    id: "compute_engine_getInstance",
    name: "Get Instance",
    description: "Get detailed information about a specific VM instance",
    category: "compute-engine",
    inputSchema: getInstanceSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get instance operation
 */
export async function executeGetInstance(
    client: GoogleCloudClient,
    params: GetInstanceParams
): Promise<OperationResult> {
    try {
        const response = await client.compute.get<{
            id: string;
            name: string;
            status: string;
            machineType: string;
            zone: string;
            creationTimestamp: string;
            disks: Array<{
                source: string;
                type: string;
                boot: boolean;
            }>;
            networkInterfaces: Array<{
                network: string;
                networkIP: string;
                accessConfigs?: Array<{
                    natIP: string;
                    type: string;
                }>;
            }>;
            metadata?: {
                items: Array<{
                    key: string;
                    value: string;
                }>;
            };
            tags?: {
                items: string[];
            };
            labels?: Record<string, string>;
        }>(`/projects/${client.projectId}/zones/${params.zone}/instances/${params.instanceName}`);

        return {
            success: true,
            data: {
                id: response.id,
                name: response.name,
                status: response.status,
                machineType: response.machineType,
                zone: response.zone,
                creationTimestamp: response.creationTimestamp,
                disks: response.disks,
                networkInterfaces: response.networkInterfaces,
                metadata: response.metadata,
                tags: response.tags,
                labels: response.labels,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get instance",
                retryable: true
            }
        };
    }
}
