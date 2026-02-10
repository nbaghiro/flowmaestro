import { z } from "zod";
import { KubernetesClusterIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * List Node Pools operation schema
 */
export const listNodePoolsSchema = z.object({
    clusterId: KubernetesClusterIdSchema
});

export type ListNodePoolsParams = z.infer<typeof listNodePoolsSchema>;

/**
 * List Node Pools operation definition
 */
export const listNodePoolsOperation: OperationDefinition = {
    id: "kubernetes_listNodePools",
    name: "List Node Pools",
    description: "List all node pools in a Kubernetes cluster",
    category: "kubernetes",
    inputSchema: listNodePoolsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list node pools operation
 */
export async function executeListNodePools(
    client: DigitalOceanClient,
    params: ListNodePoolsParams
): Promise<OperationResult> {
    try {
        const response = await client.listNodePools(params.clusterId);

        return {
            success: true,
            data: {
                nodePools: response.node_pools.map((np) => ({
                    id: np.id,
                    name: np.name,
                    size: np.size,
                    count: np.count,
                    autoScale: np.auto_scale,
                    minNodes: np.min_nodes,
                    maxNodes: np.max_nodes,
                    labels: np.labels,
                    taints: np.taints,
                    tags: np.tags,
                    nodes: np.nodes?.map((node) => ({
                        id: node.id,
                        name: node.name,
                        status: node.status,
                        dropletId: node.droplet_id,
                        createdAt: node.created_at
                    }))
                })),
                clusterId: params.clusterId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list node pools",
                retryable: true
            }
        };
    }
}
