import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Attach Disk operation schema
 */
export const attachDiskSchema = z.object({
    zone: z.string().describe("GCP zone (e.g., us-central1-a)"),
    instanceName: z.string().describe("Instance name"),
    diskName: z.string().describe("Persistent disk name to attach"),
    autoDelete: z.boolean().optional().describe("Auto-delete disk when instance is deleted"),
    mode: z.enum(["READ_WRITE", "READ_ONLY"]).optional().describe("Disk access mode")
});

export type AttachDiskParams = z.infer<typeof attachDiskSchema>;

/**
 * Attach Disk operation definition
 */
export const attachDiskOperation: OperationDefinition = {
    id: "compute_engine_attachDisk",
    name: "Attach Disk",
    description: "Attach a persistent disk to a VM instance",
    category: "compute-engine",
    inputSchema: attachDiskSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute attach disk operation
 */
export async function executeAttachDisk(
    client: GoogleCloudClient,
    params: AttachDiskParams
): Promise<OperationResult> {
    try {
        const requestBody = {
            source: `projects/${client.projectId}/zones/${params.zone}/disks/${params.diskName}`,
            autoDelete: params.autoDelete || false,
            mode: params.mode || "READ_WRITE"
        };

        const response = await client.compute.post<{
            name: string;
            status: string;
            targetLink: string;
        }>(
            `/projects/${client.projectId}/zones/${params.zone}/instances/${params.instanceName}/attachDisk`,
            requestBody
        );

        return {
            success: true,
            data: {
                operationName: response.name,
                status: response.status,
                targetLink: response.targetLink,
                instanceName: params.instanceName,
                diskName: params.diskName,
                zone: params.zone,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to attach disk",
                retryable: false
            }
        };
    }
}
