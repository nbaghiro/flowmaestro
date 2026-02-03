import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * List Services operation schema
 */
export const listServicesSchema = z.object({
    region: z.string().describe("GCP region (e.g., us-central1)"),
    pageSize: z.number().int().min(1).max(100).optional().describe("Number of services per page"),
    pageToken: z.string().optional().describe("Token for pagination")
});

export type ListServicesParams = z.infer<typeof listServicesSchema>;

/**
 * List Services operation definition
 */
export const listServicesOperation: OperationDefinition = {
    id: "cloud_run_listServices",
    name: "List Services",
    description: "List all Cloud Run services in a region",
    category: "cloud-run",
    inputSchema: listServicesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list services operation
 */
export async function executeListServices(
    client: GoogleCloudClient,
    params: ListServicesParams
): Promise<OperationResult> {
    try {
        const queryParams = new URLSearchParams();
        if (params.pageSize) {
            queryParams.append("pageSize", params.pageSize.toString());
        }
        if (params.pageToken) {
            queryParams.append("pageToken", params.pageToken);
        }

        const url = `/projects/${client.projectId}/locations/${params.region}/services${
            queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`;

        const response = await client.cloudRun.get<{
            services: Array<{
                name: string;
                uid: string;
                createTime: string;
                updateTime: string;
                uri: string;
                traffic: Array<{
                    type: string;
                    revision: string;
                    percent: number;
                }>;
            }>;
            nextPageToken?: string;
        }>(url);

        return {
            success: true,
            data: {
                services: response.services || [],
                nextPageToken: response.nextPageToken,
                region: params.region,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list services",
                retryable: true
            }
        };
    }
}
