import { z } from "zod";
import { ECSClusterNameSchema, MaxResultsSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * List Services operation schema
 */
export const listServicesSchema = z.object({
    cluster: ECSClusterNameSchema.optional().describe(
        "Cluster name or ARN (default cluster if not specified)"
    ),
    maxResults: MaxResultsSchema.optional(),
    nextToken: z.string().optional().describe("Pagination token"),
    launchType: z.enum(["EC2", "FARGATE", "EXTERNAL"]).optional().describe("Filter by launch type")
});

export type ListServicesParams = z.infer<typeof listServicesSchema>;

/**
 * List Services operation definition
 */
export const listServicesOperation: OperationDefinition = {
    id: "ecs_listServices",
    name: "List ECS Services",
    description: "List services in an ECS cluster",
    category: "ecs",
    inputSchema: listServicesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list services operation
 */
export async function executeListServices(
    client: AWSClient,
    params: ListServicesParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {};

        if (params.cluster) {
            requestBody.cluster = params.cluster;
        }

        if (params.maxResults) {
            requestBody.maxResults = params.maxResults;
        }

        if (params.nextToken) {
            requestBody.nextToken = params.nextToken;
        }

        if (params.launchType) {
            requestBody.launchType = params.launchType;
        }

        const response = await client.ecs.request<{
            serviceArns: string[];
            nextToken?: string;
        }>({
            method: "POST",
            url: "/",
            data: requestBody,
            headers: {
                "X-Amz-Target": "AmazonEC2ContainerServiceV20141113.ListServices",
                "Content-Type": "application/x-amz-json-1.1"
            }
        });

        return {
            success: true,
            data: {
                cluster: params.cluster || "default",
                serviceArns: response.serviceArns,
                nextToken: response.nextToken,
                serviceCount: response.serviceArns.length,
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list ECS services",
                retryable: true
            }
        };
    }
}
