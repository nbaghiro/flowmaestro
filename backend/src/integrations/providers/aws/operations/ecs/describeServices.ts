import { z } from "zod";
import { ECSClusterNameSchema, ECSServiceNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Describe Services operation schema
 */
export const describeServicesSchema = z.object({
    cluster: ECSClusterNameSchema.optional().describe("Cluster name or ARN"),
    services: z.array(ECSServiceNameSchema).min(1).max(10).describe("Service names or ARNs (1-10)"),
    include: z
        .array(z.enum(["TAGS"]))
        .optional()
        .describe("Additional information to include")
});

export type DescribeServicesParams = z.infer<typeof describeServicesSchema>;

/**
 * Describe Services operation definition
 */
export const describeServicesOperation: OperationDefinition = {
    id: "ecs_describeServices",
    name: "Describe ECS Services",
    description: "Get detailed information about ECS services",
    category: "ecs",
    inputSchema: describeServicesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute describe services operation
 */
export async function executeDescribeServices(
    client: AWSClient,
    params: DescribeServicesParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            services: params.services
        };

        if (params.cluster) {
            requestBody.cluster = params.cluster;
        }

        if (params.include) {
            requestBody.include = params.include;
        }

        const response = await client.ecs.request<{
            services: Array<{
                serviceArn: string;
                serviceName: string;
                clusterArn: string;
                status: string;
                desiredCount: number;
                runningCount: number;
                pendingCount: number;
                launchType: string;
                taskDefinition: string;
                deployments: Array<{
                    id: string;
                    status: string;
                    taskDefinition: string;
                    desiredCount: number;
                    runningCount: number;
                    createdAt: string;
                    updatedAt: string;
                }>;
                createdAt: string;
            }>;
            failures: Array<{
                arn: string;
                reason: string;
            }>;
        }>({
            method: "POST",
            url: "/",
            data: requestBody,
            headers: {
                "X-Amz-Target": "AmazonEC2ContainerServiceV20141113.DescribeServices",
                "Content-Type": "application/x-amz-json-1.1"
            }
        });

        return {
            success: true,
            data: {
                cluster: params.cluster || "default",
                services: response.services.map((service) => ({
                    serviceArn: service.serviceArn,
                    serviceName: service.serviceName,
                    clusterArn: service.clusterArn,
                    status: service.status,
                    desiredCount: service.desiredCount,
                    runningCount: service.runningCount,
                    pendingCount: service.pendingCount,
                    launchType: service.launchType,
                    taskDefinition: service.taskDefinition,
                    deployments: service.deployments,
                    createdAt: service.createdAt
                })),
                failures: response.failures,
                serviceCount: response.services.length,
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to describe ECS services",
                retryable: true
            }
        };
    }
}
