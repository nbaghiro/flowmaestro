import { z } from "zod";
import { ECSClusterNameSchema, ECSServiceNameSchema, MaxResultsSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * List Tasks operation schema
 */
export const listTasksSchema = z.object({
    cluster: ECSClusterNameSchema.optional().describe("Cluster name or ARN"),
    serviceName: ECSServiceNameSchema.optional().describe("Filter by service name"),
    desiredStatus: z
        .enum(["RUNNING", "PENDING", "STOPPED"])
        .optional()
        .describe("Filter by task status"),
    launchType: z.enum(["EC2", "FARGATE", "EXTERNAL"]).optional().describe("Filter by launch type"),
    maxResults: MaxResultsSchema.optional(),
    nextToken: z.string().optional().describe("Pagination token")
});

export type ListTasksParams = z.infer<typeof listTasksSchema>;

/**
 * List Tasks operation definition
 */
export const listTasksOperation: OperationDefinition = {
    id: "ecs_listTasks",
    name: "List ECS Tasks",
    description: "List running tasks in an ECS cluster",
    category: "ecs",
    inputSchema: listTasksSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list tasks operation
 */
export async function executeListTasks(
    client: AWSClient,
    params: ListTasksParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {};

        if (params.cluster) {
            requestBody.cluster = params.cluster;
        }

        if (params.serviceName) {
            requestBody.serviceName = params.serviceName;
        }

        if (params.desiredStatus) {
            requestBody.desiredStatus = params.desiredStatus;
        }

        if (params.launchType) {
            requestBody.launchType = params.launchType;
        }

        if (params.maxResults) {
            requestBody.maxResults = params.maxResults;
        }

        if (params.nextToken) {
            requestBody.nextToken = params.nextToken;
        }

        const response = await client.ecs.request<{
            taskArns: string[];
            nextToken?: string;
        }>({
            method: "POST",
            url: "/",
            data: requestBody,
            headers: {
                "X-Amz-Target": "AmazonEC2ContainerServiceV20141113.ListTasks",
                "Content-Type": "application/x-amz-json-1.1"
            }
        });

        return {
            success: true,
            data: {
                cluster: params.cluster || "default",
                taskArns: response.taskArns,
                nextToken: response.nextToken,
                taskCount: response.taskArns.length,
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list ECS tasks",
                retryable: true
            }
        };
    }
}
