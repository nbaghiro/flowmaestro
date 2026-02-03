import { z } from "zod";
import { ECSClusterNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Run Task operation schema
 */
export const runTaskSchema = z.object({
    cluster: ECSClusterNameSchema.optional().describe("Cluster name or ARN"),
    taskDefinition: z.string().describe("Task definition ARN or family:revision"),
    launchType: z.enum(["EC2", "FARGATE", "EXTERNAL"]).optional().describe("Launch type"),
    count: z.number().int().min(1).max(10).default(1).describe("Number of tasks to run (1-10)"),
    group: z.string().optional().describe("Task group name"),
    networkConfiguration: z
        .object({
            awsvpcConfiguration: z.object({
                subnets: z.array(z.string()).min(1).describe("Subnet IDs"),
                securityGroups: z.array(z.string()).optional().describe("Security group IDs"),
                assignPublicIp: z
                    .enum(["ENABLED", "DISABLED"])
                    .optional()
                    .describe("Assign public IP")
            })
        })
        .optional()
        .describe("Network configuration for FARGATE tasks")
});

export type RunTaskParams = z.infer<typeof runTaskSchema>;

/**
 * Run Task operation definition
 */
export const runTaskOperation: OperationDefinition = {
    id: "ecs_runTask",
    name: "Run ECS Task",
    description: "Run a one-time task in ECS",
    category: "ecs",
    inputSchema: runTaskSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute run task operation
 */
export async function executeRunTask(
    client: AWSClient,
    params: RunTaskParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            taskDefinition: params.taskDefinition,
            count: params.count
        };

        if (params.cluster) {
            requestBody.cluster = params.cluster;
        }

        if (params.launchType) {
            requestBody.launchType = params.launchType;
        }

        if (params.group) {
            requestBody.group = params.group;
        }

        if (params.networkConfiguration) {
            requestBody.networkConfiguration = params.networkConfiguration;
        }

        const response = await client.ecs.request<{
            tasks: Array<{
                taskArn: string;
                taskDefinitionArn: string;
                clusterArn: string;
                lastStatus: string;
                desiredStatus: string;
                createdAt: string;
            }>;
            failures: Array<{
                arn?: string;
                reason: string;
            }>;
        }>({
            method: "POST",
            url: "/",
            data: requestBody,
            headers: {
                "X-Amz-Target": "AmazonEC2ContainerServiceV20141113.RunTask",
                "Content-Type": "application/x-amz-json-1.1"
            }
        });

        return {
            success: true,
            data: {
                cluster: params.cluster || "default",
                tasks: response.tasks.map((task) => ({
                    taskArn: task.taskArn,
                    taskDefinitionArn: task.taskDefinitionArn,
                    clusterArn: task.clusterArn,
                    lastStatus: task.lastStatus,
                    desiredStatus: task.desiredStatus,
                    createdAt: task.createdAt
                })),
                failures: response.failures,
                tasksStarted: response.tasks.length,
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to run ECS task",
                retryable: false
            }
        };
    }
}
