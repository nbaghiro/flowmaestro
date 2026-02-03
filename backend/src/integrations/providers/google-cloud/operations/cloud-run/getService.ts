import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Get Service operation schema
 */
export const getServiceSchema = z.object({
    region: z.string().describe("GCP region (e.g., us-central1)"),
    serviceName: z.string().describe("Cloud Run service name")
});

export type GetServiceParams = z.infer<typeof getServiceSchema>;

/**
 * Get Service operation definition
 */
export const getServiceOperation: OperationDefinition = {
    id: "cloud_run_getService",
    name: "Get Service",
    description: "Get detailed information about a Cloud Run service",
    category: "cloud-run",
    inputSchema: getServiceSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get service operation
 */
export async function executeGetService(
    client: GoogleCloudClient,
    params: GetServiceParams
): Promise<OperationResult> {
    try {
        const response = await client.cloudRun.get<{
            name: string;
            uid: string;
            createTime: string;
            updateTime: string;
            uri: string;
            template: {
                containers: Array<{
                    image: string;
                    ports?: Array<{
                        containerPort: number;
                    }>;
                    env?: Array<{
                        name: string;
                        value?: string;
                    }>;
                }>;
                scaling?: {
                    minInstanceCount: number;
                    maxInstanceCount: number;
                };
            };
            traffic: Array<{
                type: string;
                revision: string;
                percent: number;
            }>;
            labels?: Record<string, string>;
        }>(
            `/projects/${client.projectId}/locations/${params.region}/services/${params.serviceName}`
        );

        return {
            success: true,
            data: {
                name: response.name,
                uid: response.uid,
                createTime: response.createTime,
                updateTime: response.updateTime,
                uri: response.uri,
                template: response.template,
                traffic: response.traffic,
                labels: response.labels,
                region: params.region,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get service",
                retryable: true
            }
        };
    }
}
