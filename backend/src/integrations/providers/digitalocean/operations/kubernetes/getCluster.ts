import { z } from "zod";
import { KubernetesClusterIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Get Kubernetes Cluster operation schema
 */
export const getClusterSchema = z.object({
    clusterId: KubernetesClusterIdSchema
});

export type GetClusterParams = z.infer<typeof getClusterSchema>;

/**
 * Get Kubernetes Cluster operation definition
 */
export const getClusterOperation: OperationDefinition = {
    id: "kubernetes_getCluster",
    name: "Get Kubernetes Cluster",
    description: "Get details for a specific Kubernetes cluster",
    category: "kubernetes",
    inputSchema: getClusterSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get cluster operation
 */
export async function executeGetCluster(
    client: DigitalOceanClient,
    params: GetClusterParams
): Promise<OperationResult> {
    try {
        const cluster = await client.getKubernetesCluster(params.clusterId);

        return {
            success: true,
            data: {
                id: cluster.id,
                name: cluster.name,
                region: cluster.region,
                version: cluster.version,
                clusterSubnet: cluster.cluster_subnet,
                serviceSubnet: cluster.service_subnet,
                vpcUuid: cluster.vpc_uuid,
                ipv4: cluster.ipv4,
                endpoint: cluster.endpoint,
                status: cluster.status,
                maintenancePolicy: cluster.maintenance_policy,
                autoUpgrade: cluster.auto_upgrade,
                surgeUpgrade: cluster.surge_upgrade,
                ha: cluster.ha,
                registryEnabled: cluster.registry_enabled,
                tags: cluster.tags,
                nodePools: cluster.node_pools?.map((np) => ({
                    id: np.id,
                    name: np.name,
                    size: np.size,
                    count: np.count,
                    autoScale: np.auto_scale,
                    minNodes: np.min_nodes,
                    maxNodes: np.max_nodes,
                    labels: np.labels,
                    tags: np.tags
                })),
                createdAt: cluster.created_at,
                updatedAt: cluster.updated_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to get Kubernetes cluster",
                retryable: true
            }
        };
    }
}
