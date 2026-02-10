import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Get Service URL operation schema
 */
export const getServiceUrlSchema = z.object({
    region: z.string().describe("GCP region (e.g., us-central1)"),
    serviceName: z.string().describe("Cloud Run service name")
});

export type GetServiceUrlParams = z.infer<typeof getServiceUrlSchema>;

/**
 * Get Service URL operation definition
 */
export const getServiceUrlOperation: OperationDefinition = {
    id: "cloud_run_getServiceUrl",
    name: "Get Service URL",
    description: "Get the public URL of a Cloud Run service",
    category: "cloud-run",
    inputSchema: getServiceUrlSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get service URL operation
 */
export async function executeGetServiceUrl(
    client: GoogleCloudClient,
    params: GetServiceUrlParams
): Promise<OperationResult> {
    try {
        const response = await client.cloudRun.get<{
            name: string;
            uri: string;
            status: {
                conditions: Array<{
                    type: string;
                    status: string;
                }>;
            };
        }>(
            `/projects/${client.projectId}/locations/${params.region}/services/${params.serviceName}`
        );

        const readyCondition = response.status?.conditions?.find((c) => c.type === "Ready");
        const isReady = readyCondition?.status === "True";

        return {
            success: true,
            data: {
                serviceName: params.serviceName,
                url: response.uri,
                ready: isReady,
                region: params.region,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get service URL",
                retryable: true
            }
        };
    }
}
