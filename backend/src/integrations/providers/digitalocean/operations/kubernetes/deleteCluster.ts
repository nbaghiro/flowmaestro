import { z } from "zod";
import { KubernetesClusterIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Delete Kubernetes Cluster operation schema
 */
export const deleteClusterSchema = z.object({
    clusterId: KubernetesClusterIdSchema
});

export type DeleteClusterParams = z.infer<typeof deleteClusterSchema>;

/**
 * Delete Kubernetes Cluster operation definition
 */
export const deleteClusterOperation: OperationDefinition = {
    id: "kubernetes_deleteCluster",
    name: "Delete Kubernetes Cluster",
    description: "Delete a Kubernetes cluster",
    category: "kubernetes",
    inputSchema: deleteClusterSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute delete cluster operation
 */
export async function executeDeleteCluster(
    client: DigitalOceanClient,
    params: DeleteClusterParams
): Promise<OperationResult> {
    try {
        await client.deleteKubernetesCluster(params.clusterId);

        return {
            success: true,
            data: {
                clusterId: params.clusterId,
                message: "Kubernetes cluster deletion initiated"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to delete Kubernetes cluster",
                retryable: false
            }
        };
    }
}
