import { z } from "zod";
import { ECSClusterNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Stop Task operation schema
 */
export const stopTaskSchema = z.object({
    cluster: ECSClusterNameSchema.optional().describe("Cluster name or ARN"),
    task: z.string().describe("Task ID or ARN to stop"),
    reason: z.string().optional().describe("Reason for stopping the task")
});

export type StopTaskParams = z.infer<typeof stopTaskSchema>;

/**
 * Stop Task operation definition
 */
export const stopTaskOperation: OperationDefinition = {
    id: "ecs_stopTask",
    name: "Stop ECS Task",
    description: "Stop a running ECS task",
    category: "ecs",
    inputSchema: stopTaskSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute stop task operation
 */
export async function executeStopTask(
    client: AWSClient,
    params: StopTaskParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            task: params.task
        };

        if (params.cluster) {
            requestBody.cluster = params.cluster;
        }

        if (params.reason) {
            requestBody.reason = params.reason;
        }

        const response = await client.ecs.request<{
            task: {
                taskArn: string;
                taskDefinitionArn: string;
                clusterArn: string;
                lastStatus: string;
                desiredStatus: string;
                stoppedReason?: string;
                stoppingAt?: string;
                stoppedAt?: string;
            };
        }>({
            method: "POST",
            url: "/",
            data: requestBody,
            headers: {
                "X-Amz-Target": "AmazonEC2ContainerServiceV20141113.StopTask",
                "Content-Type": "application/x-amz-json-1.1"
            }
        });

        return {
            success: true,
            data: {
                task: response.task,
                stoppedAt: new Date().toISOString(),
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to stop ECS task",
                retryable: false
            }
        };
    }
}
