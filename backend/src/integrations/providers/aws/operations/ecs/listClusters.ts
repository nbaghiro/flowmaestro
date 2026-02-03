import { z } from "zod";
import { MaxResultsSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * List Clusters operation schema
 */
export const listClustersSchema = z.object({
    maxResults: MaxResultsSchema.optional(),
    nextToken: z.string().optional().describe("Pagination token")
});

export type ListClustersParams = z.infer<typeof listClustersSchema>;

/**
 * List Clusters operation definition
 */
export const listClustersOperation: OperationDefinition = {
    id: "ecs_listClusters",
    name: "List ECS Clusters",
    description: "List all ECS clusters in the region",
    category: "ecs",
    inputSchema: listClustersSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list clusters operation
 */
export async function executeListClusters(
    client: AWSClient,
    params: ListClustersParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {};

        if (params.maxResults) {
            requestBody.maxResults = params.maxResults;
        }

        if (params.nextToken) {
            requestBody.nextToken = params.nextToken;
        }

        const response = await client.ecs.request<{
            clusterArns: string[];
            nextToken?: string;
        }>({
            method: "POST",
            url: "/",
            data: requestBody,
            headers: {
                "X-Amz-Target": "AmazonEC2ContainerServiceV20141113.ListClusters",
                "Content-Type": "application/x-amz-json-1.1"
            }
        });

        return {
            success: true,
            data: {
                clusterArns: response.clusterArns,
                nextToken: response.nextToken,
                clusterCount: response.clusterArns.length,
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list ECS clusters",
                retryable: true
            }
        };
    }
}
