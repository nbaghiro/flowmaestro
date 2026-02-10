import { z } from "zod";
import { RegionSlugSchema, SizeSlugSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Create Kubernetes Cluster operation schema
 */
export const createClusterSchema = z.object({
    name: z.string().min(1).max(255).describe("The name of the Kubernetes cluster"),
    region: RegionSlugSchema,
    version: z
        .string()
        .describe(
            "The Kubernetes version (e.g., '1.28.2-do.0'). Use 'latest' for the latest version."
        ),
    node_pools: z
        .array(
            z.object({
                name: z.string().min(1).describe("Name for the node pool"),
                size: SizeSlugSchema,
                count: z.number().int().min(1).max(512).describe("Number of nodes in the pool"),
                tags: z.array(z.string()).optional().describe("Tags for the node pool"),
                auto_scale: z.boolean().optional().describe("Enable autoscaling"),
                min_nodes: z
                    .number()
                    .int()
                    .min(1)
                    .optional()
                    .describe("Minimum nodes when autoscaling"),
                max_nodes: z
                    .number()
                    .int()
                    .min(1)
                    .optional()
                    .describe("Maximum nodes when autoscaling")
            })
        )
        .min(1)
        .describe("Node pools for the cluster"),
    vpc_uuid: z.string().uuid().optional().describe("VPC UUID to deploy in"),
    tags: z.array(z.string()).optional().describe("Tags to apply to the cluster"),
    ha: z.boolean().optional().describe("Enable highly available control plane"),
    surge_upgrade: z.boolean().optional().describe("Enable surge upgrades during cluster upgrades"),
    auto_upgrade: z.boolean().optional().describe("Enable automatic Kubernetes version upgrades")
});

export type CreateClusterParams = z.infer<typeof createClusterSchema>;

/**
 * Create Kubernetes Cluster operation definition
 */
export const createClusterOperation: OperationDefinition = {
    id: "kubernetes_createCluster",
    name: "Create Kubernetes Cluster",
    description: "Create a new Kubernetes cluster",
    category: "kubernetes",
    inputSchema: createClusterSchema,
    retryable: false,
    timeout: 120000
};

/**
 * Execute create cluster operation
 */
export async function executeCreateCluster(
    client: DigitalOceanClient,
    params: CreateClusterParams
): Promise<OperationResult> {
    try {
        const cluster = await client.createKubernetesCluster(params);

        return {
            success: true,
            data: {
                id: cluster.id,
                name: cluster.name,
                region: cluster.region,
                version: cluster.version,
                endpoint: cluster.endpoint,
                status: cluster.status,
                nodePoolCount: cluster.node_pools?.length || 0,
                createdAt: cluster.created_at,
                message: "Kubernetes cluster creation initiated"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to create Kubernetes cluster",
                retryable: false
            }
        };
    }
}
