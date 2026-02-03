import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Update Service operation schema
 */
export const updateServiceSchema = z.object({
    region: z.string().describe("GCP region (e.g., us-central1)"),
    serviceName: z.string().describe("Cloud Run service name"),
    containerImage: z.string().optional().describe("New container image URL"),
    containerPort: z.number().int().optional().describe("New container port"),
    environmentVariables: z.record(z.string()).optional().describe("Updated environment variables"),
    minInstances: z.number().int().min(0).optional().describe("Minimum number of instances"),
    maxInstances: z.number().int().min(1).optional().describe("Maximum number of instances"),
    labels: z.record(z.string()).optional().describe("Updated service labels")
});

export type UpdateServiceParams = z.infer<typeof updateServiceSchema>;

/**
 * Update Service operation definition
 */
export const updateServiceOperation: OperationDefinition = {
    id: "cloud_run_updateService",
    name: "Update Service",
    description: "Update an existing Cloud Run service configuration",
    category: "cloud-run",
    inputSchema: updateServiceSchema,
    retryable: false,
    timeout: 120000
};

/**
 * Execute update service operation
 */
export async function executeUpdateService(
    client: GoogleCloudClient,
    params: UpdateServiceParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            apiVersion: "serving.knative.dev/v1",
            kind: "Service",
            metadata: {
                name: params.serviceName,
                ...(params.labels && { labels: params.labels })
            },
            spec: {
                template: {
                    spec: {
                        containers: [
                            {
                                ...(params.containerImage && { image: params.containerImage }),
                                ...(params.containerPort && {
                                    ports: [{ containerPort: params.containerPort }]
                                }),
                                ...(params.environmentVariables && {
                                    env: Object.entries(params.environmentVariables).map(
                                        ([name, value]) => ({
                                            name,
                                            value
                                        })
                                    )
                                })
                            }
                        ]
                    },
                    metadata: {
                        annotations: {
                            ...(params.minInstances !== undefined && {
                                "autoscaling.knative.dev/minScale": params.minInstances.toString()
                            }),
                            ...(params.maxInstances !== undefined && {
                                "autoscaling.knative.dev/maxScale": params.maxInstances.toString()
                            })
                        }
                    }
                }
            }
        };

        const response = await client.cloudRun.patch<{
            name: string;
            metadata: {
                uid: string;
            };
        }>(
            `/projects/${client.projectId}/locations/${params.region}/services/${params.serviceName}`,
            requestBody
        );

        return {
            success: true,
            data: {
                operationName: response.name,
                serviceUid: response.metadata.uid,
                serviceName: params.serviceName,
                region: params.region,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update service",
                retryable: false
            }
        };
    }
}
