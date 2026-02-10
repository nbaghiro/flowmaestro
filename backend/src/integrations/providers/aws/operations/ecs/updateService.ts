import { z } from "zod";
import { ECSClusterNameSchema, ECSServiceNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Update Service operation schema
 */
export const updateServiceSchema = z.object({
    cluster: ECSClusterNameSchema.optional().describe("Cluster name or ARN"),
    service: ECSServiceNameSchema.describe("Service name or ARN"),
    desiredCount: z.number().int().min(0).optional().describe("Desired number of tasks"),
    taskDefinition: z.string().optional().describe("Task definition ARN or family:revision"),
    forceNewDeployment: z.boolean().optional().describe("Force new deployment even if no changes")
});

export type UpdateServiceParams = z.infer<typeof updateServiceSchema>;

/**
 * Update Service operation definition
 */
export const updateServiceOperation: OperationDefinition = {
    id: "ecs_updateService",
    name: "Update ECS Service",
    description: "Update ECS service configuration (task count, task definition, etc.)",
    category: "ecs",
    inputSchema: updateServiceSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute update service operation
 */
export async function executeUpdateService(
    client: AWSClient,
    params: UpdateServiceParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            service: params.service
        };

        if (params.cluster) {
            requestBody.cluster = params.cluster;
        }

        if (params.desiredCount !== undefined) {
            requestBody.desiredCount = params.desiredCount;
        }

        if (params.taskDefinition) {
            requestBody.taskDefinition = params.taskDefinition;
        }

        if (params.forceNewDeployment !== undefined) {
            requestBody.forceNewDeployment = params.forceNewDeployment;
        }

        const response = await client.ecs.request<{
            service: {
                serviceArn: string;
                serviceName: string;
                clusterArn: string;
                status: string;
                desiredCount: number;
                runningCount: number;
                taskDefinition: string;
            };
        }>({
            method: "POST",
            url: "/",
            data: requestBody,
            headers: {
                "X-Amz-Target": "AmazonEC2ContainerServiceV20141113.UpdateService",
                "Content-Type": "application/x-amz-json-1.1"
            }
        });

        return {
            success: true,
            data: {
                service: response.service,
                updatedAt: new Date().toISOString(),
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update ECS service",
                retryable: false
            }
        };
    }
}
