import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Create Service operation schema
 */
export const createServiceSchema = z.object({
    region: z.string().describe("GCP region (e.g., us-central1)"),
    serviceName: z.string().describe("Cloud Run service name"),
    containerImage: z.string().describe("Container image URL (e.g., gcr.io/project/image:tag)"),
    containerPort: z.number().int().optional().describe("Container port (default: 8080)"),
    environmentVariables: z
        .record(z.string())
        .optional()
        .describe("Environment variables for container"),
    minInstances: z.number().int().min(0).optional().describe("Minimum number of instances"),
    maxInstances: z.number().int().min(1).optional().describe("Maximum number of instances"),
    allowUnauthenticated: z.boolean().optional().describe("Allow public access without auth"),
    labels: z.record(z.string()).optional().describe("Service labels")
});

export type CreateServiceParams = z.infer<typeof createServiceSchema>;

/**
 * Create Service operation definition
 */
export const createServiceOperation: OperationDefinition = {
    id: "cloud_run_createService",
    name: "Create Service",
    description: "Deploy a new Cloud Run service",
    category: "cloud-run",
    inputSchema: createServiceSchema,
    retryable: false,
    timeout: 120000
};

/**
 * Execute create service operation
 */
export async function executeCreateService(
    client: GoogleCloudClient,
    params: CreateServiceParams
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
                                image: params.containerImage,
                                ports: [
                                    {
                                        containerPort: params.containerPort || 8080
                                    }
                                ],
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

        const response = await client.cloudRun.post<{
            name: string;
            metadata: {
                uid: string;
            };
        }>(
            `/projects/${client.projectId}/locations/${params.region}/services?serviceId=${encodeURIComponent(params.serviceName)}`,
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
                message: error instanceof Error ? error.message : "Failed to create service",
                retryable: false
            }
        };
    }
}
