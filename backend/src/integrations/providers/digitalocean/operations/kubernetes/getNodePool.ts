import { z } from "zod";
import { KubernetesClusterIdSchema, NodePoolIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Get Node Pool operation schema
 */
export const getNodePoolSchema = z.object({
    clusterId: KubernetesClusterIdSchema,
    nodePoolId: NodePoolIdSchema
});

export type GetNodePoolParams = z.infer<typeof getNodePoolSchema>;

/**
 * Get Node Pool operation definition
 */
export const getNodePoolOperation: OperationDefinition = {
    id: "kubernetes_getNodePool",
    name: "Get Node Pool",
    description: "Get details for a specific node pool",
    category: "kubernetes",
    inputSchema: getNodePoolSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get node pool operation
 */
export async function executeGetNodePool(
    client: DigitalOceanClient,
    params: GetNodePoolParams
): Promise<OperationResult> {
    try {
        const nodePool = await client.getNodePool(params.clusterId, params.nodePoolId);

        return {
            success: true,
            data: {
                id: nodePool.id,
                name: nodePool.name,
                size: nodePool.size,
                count: nodePool.count,
                autoScale: nodePool.auto_scale,
                minNodes: nodePool.min_nodes,
                maxNodes: nodePool.max_nodes,
                labels: nodePool.labels,
                taints: nodePool.taints,
                tags: nodePool.tags,
                nodes: nodePool.nodes?.map((node) => ({
                    id: node.id,
                    name: node.name,
                    status: node.status,
                    dropletId: node.droplet_id,
                    createdAt: node.created_at,
                    updatedAt: node.updated_at
                })),
                clusterId: params.clusterId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get node pool",
                retryable: true
            }
        };
    }
}
