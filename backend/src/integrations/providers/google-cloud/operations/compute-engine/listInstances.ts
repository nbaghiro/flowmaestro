import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * List Instances operation schema
 */
export const listInstancesSchema = z.object({
    zone: z.string().describe("GCP zone (e.g., us-central1-a)"),
    filter: z.string().optional().describe("Filter expression for instances"),
    pageSize: z.number().int().min(1).max(500).optional().describe("Number of instances per page"),
    pageToken: z.string().optional().describe("Token for pagination")
});

export type ListInstancesParams = z.infer<typeof listInstancesSchema>;

/**
 * List Instances operation definition
 */
export const listInstancesOperation: OperationDefinition = {
    id: "compute_engine_listInstances",
    name: "List Instances",
    description: "List all VM instances in a specific zone",
    category: "compute-engine",
    inputSchema: listInstancesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list instances operation
 */
export async function executeListInstances(
    client: GoogleCloudClient,
    params: ListInstancesParams
): Promise<OperationResult> {
    try {
        const queryParams = new URLSearchParams();
        if (params.filter) {
            queryParams.append("filter", params.filter);
        }
        if (params.pageSize) {
            queryParams.append("maxResults", params.pageSize.toString());
        }
        if (params.pageToken) {
            queryParams.append("pageToken", params.pageToken);
        }

        const url = `/projects/${client.projectId}/zones/${params.zone}/instances${
            queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`;

        const response = await client.compute.get<{
            items: Array<{
                id: string;
                name: string;
                status: string;
                machineType: string;
                zone: string;
                creationTimestamp: string;
                networkInterfaces: Array<{
                    networkIP: string;
                    accessConfigs?: Array<{
                        natIP: string;
                    }>;
                }>;
            }>;
            nextPageToken?: string;
        }>(url);

        return {
            success: true,
            data: {
                instances: response.items || [],
                nextPageToken: response.nextPageToken,
                zone: params.zone,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list instances",
                retryable: true
            }
        };
    }
}
