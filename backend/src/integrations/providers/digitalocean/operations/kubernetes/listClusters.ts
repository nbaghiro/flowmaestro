import { z } from "zod";
import { PaginationSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * List Kubernetes Clusters operation schema
 */
export const listClustersSchema = PaginationSchema;

export type ListClustersParams = z.infer<typeof listClustersSchema>;

/**
 * List Kubernetes Clusters operation definition
 */
export const listClustersOperation: OperationDefinition = {
    id: "kubernetes_listClusters",
    name: "List Kubernetes Clusters",
    description: "List all Kubernetes clusters in the account",
    category: "kubernetes",
    inputSchema: listClustersSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list clusters operation
 */
export async function executeListClusters(
    client: DigitalOceanClient,
    params: ListClustersParams
): Promise<OperationResult> {
    try {
        const response = await client.listKubernetesClusters(params);

        return {
            success: true,
            data: {
                clusters: response.kubernetes_clusters.map((cluster) => ({
                    id: cluster.id,
                    name: cluster.name,
                    region: cluster.region,
                    version: cluster.version,
                    endpoint: cluster.endpoint,
                    ipv4: cluster.ipv4,
                    status: cluster.status,
                    nodePoolCount: cluster.node_pools?.length || 0,
                    totalNodeCount: cluster.node_pools?.reduce((sum, np) => sum + np.count, 0) || 0,
                    autoUpgrade: cluster.auto_upgrade,
                    surgeUpgrade: cluster.surge_upgrade,
                    ha: cluster.ha,
                    tags: cluster.tags,
                    createdAt: cluster.created_at,
                    updatedAt: cluster.updated_at
                })),
                meta: response.meta,
                links: response.links
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to list Kubernetes clusters",
                retryable: true
            }
        };
    }
}
