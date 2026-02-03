import { z } from "zod";
import { ECSClusterNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Describe Tasks operation schema
 */
export const describeTasksSchema = z.object({
    cluster: ECSClusterNameSchema.optional().describe("Cluster name or ARN"),
    tasks: z.array(z.string()).min(1).max(100).describe("Task IDs or ARNs (1-100)"),
    include: z
        .array(z.enum(["TAGS"]))
        .optional()
        .describe("Additional information to include")
});

export type DescribeTasksParams = z.infer<typeof describeTasksSchema>;

/**
 * Describe Tasks operation definition
 */
export const describeTasksOperation: OperationDefinition = {
    id: "ecs_describeTasks",
    name: "Describe ECS Tasks",
    description: "Get detailed information about ECS tasks",
    category: "ecs",
    inputSchema: describeTasksSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute describe tasks operation
 */
export async function executeDescribeTasks(
    client: AWSClient,
    params: DescribeTasksParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            tasks: params.tasks
        };

        if (params.cluster) {
            requestBody.cluster = params.cluster;
        }

        if (params.include) {
            requestBody.include = params.include;
        }

        const response = await client.ecs.request<{
            tasks: Array<{
                taskArn: string;
                taskDefinitionArn: string;
                clusterArn: string;
                lastStatus: string;
                desiredStatus: string;
                cpu?: string;
                memory?: string;
                containers: Array<{
                    containerArn: string;
                    name: string;
                    lastStatus: string;
                    exitCode?: number;
                    reason?: string;
                }>;
                createdAt: string;
                startedAt?: string;
                stoppedAt?: string;
                stoppedReason?: string;
                connectivity?: string;
                connectivityAt?: string;
                launchType: string;
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
                "X-Amz-Target": "AmazonEC2ContainerServiceV20141113.DescribeTasks",
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
                    cpu: task.cpu,
                    memory: task.memory,
                    containers: task.containers,
                    createdAt: task.createdAt,
                    startedAt: task.startedAt,
                    stoppedAt: task.stoppedAt,
                    stoppedReason: task.stoppedReason,
                    connectivity: task.connectivity,
                    connectivityAt: task.connectivityAt,
                    launchType: task.launchType
                })),
                failures: response.failures,
                taskCount: response.tasks.length,
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to describe ECS tasks",
                retryable: true
            }
        };
    }
}
