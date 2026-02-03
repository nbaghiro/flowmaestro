import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Create Instance operation schema
 */
export const createInstanceSchema = z.object({
    zone: z.string().describe("GCP zone (e.g., us-central1-a)"),
    instanceName: z.string().describe("Instance name"),
    machineType: z.string().describe("Machine type (e.g., n1-standard-1)"),
    sourceImage: z
        .string()
        .describe(
            "Source image (e.g., projects/debian-cloud/global/images/debian-11-bullseye-v20230912)"
        ),
    diskSizeGb: z.number().int().min(10).optional().describe("Boot disk size in GB (default: 10)"),
    networkTier: z.enum(["PREMIUM", "STANDARD"]).optional().describe("Network tier"),
    labels: z.record(z.string()).optional().describe("Instance labels"),
    metadata: z.record(z.string()).optional().describe("Instance metadata")
});

export type CreateInstanceParams = z.infer<typeof createInstanceSchema>;

/**
 * Create Instance operation definition
 */
export const createInstanceOperation: OperationDefinition = {
    id: "compute_engine_createInstance",
    name: "Create Instance",
    description: "Create a new VM instance",
    category: "compute-engine",
    inputSchema: createInstanceSchema,
    retryable: false,
    timeout: 120000
};

/**
 * Execute create instance operation
 */
export async function executeCreateInstance(
    client: GoogleCloudClient,
    params: CreateInstanceParams
): Promise<OperationResult> {
    try {
        const requestBody = {
            name: params.instanceName,
            machineType: `zones/${params.zone}/machineTypes/${params.machineType}`,
            disks: [
                {
                    boot: true,
                    autoDelete: true,
                    initializeParams: {
                        sourceImage: params.sourceImage,
                        diskSizeGb: params.diskSizeGb || 10
                    }
                }
            ],
            networkInterfaces: [
                {
                    network: "global/networks/default",
                    accessConfigs: [
                        {
                            name: "External NAT",
                            type: "ONE_TO_ONE_NAT",
                            networkTier: params.networkTier || "PREMIUM"
                        }
                    ]
                }
            ],
            ...(params.labels && { labels: params.labels }),
            ...(params.metadata && {
                metadata: {
                    items: Object.entries(params.metadata).map(([key, value]) => ({
                        key,
                        value
                    }))
                }
            })
        };

        const response = await client.compute.post<{
            name: string;
            status: string;
            targetLink: string;
        }>(`/projects/${client.projectId}/zones/${params.zone}/instances`, requestBody);

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
                message: error instanceof Error ? error.message : "Failed to create instance",
                retryable: false
            }
        };
    }
}
