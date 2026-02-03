import { z } from "zod";
import { KubernetesClusterIdSchema, NodePoolIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Scale Node Pool operation schema
 */
export const scaleNodePoolSchema = z.object({
    clusterId: KubernetesClusterIdSchema,
    nodePoolId: NodePoolIdSchema,
    count: z.number().int().min(1).max(512).optional().describe("New node count"),
    auto_scale: z.boolean().optional().describe("Enable/disable autoscaling"),
    min_nodes: z.number().int().min(1).optional().describe("Minimum nodes when autoscaling"),
    max_nodes: z.number().int().min(1).optional().describe("Maximum nodes when autoscaling"),
    name: z.string().optional().describe("New name for the node pool"),
    tags: z.array(z.string()).optional().describe("Tags for the node pool")
});

export type ScaleNodePoolParams = z.infer<typeof scaleNodePoolSchema>;

/**
 * Scale Node Pool operation definition
 */
export const scaleNodePoolOperation: OperationDefinition = {
    id: "kubernetes_scaleNodePool",
    name: "Scale Node Pool",
    description: "Scale a node pool by changing the node count or autoscaling settings",
    category: "kubernetes",
    inputSchema: scaleNodePoolSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute scale node pool operation
 */
export async function executeScaleNodePool(
    client: DigitalOceanClient,
    params: ScaleNodePoolParams
): Promise<OperationResult> {
    try {
        const { clusterId, nodePoolId, ...updateParams } = params;
        const nodePool = await client.updateNodePool(clusterId, nodePoolId, updateParams);

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
                tags: nodePool.tags,
                clusterId,
                message: "Node pool scaling initiated"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to scale node pool",
                retryable: false
            }
        };
    }
}
