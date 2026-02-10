import { z } from "zod";
import { LoadBalancerIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Delete Load Balancer operation schema
 */
export const deleteLoadBalancerSchema = z.object({
    loadBalancerId: LoadBalancerIdSchema
});

export type DeleteLoadBalancerParams = z.infer<typeof deleteLoadBalancerSchema>;

/**
 * Delete Load Balancer operation definition
 */
export const deleteLoadBalancerOperation: OperationDefinition = {
    id: "loadBalancers_deleteLoadBalancer",
    name: "Delete Load Balancer",
    description: "Delete a load balancer",
    category: "load-balancers",
    inputSchema: deleteLoadBalancerSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute delete load balancer operation
 */
export async function executeDeleteLoadBalancer(
    client: DigitalOceanClient,
    params: DeleteLoadBalancerParams
): Promise<OperationResult> {
    try {
        await client.deleteLoadBalancer(params.loadBalancerId);

        return {
            success: true,
            data: {
                loadBalancerId: params.loadBalancerId,
                message: "Load balancer deleted successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete load balancer",
                retryable: false
            }
        };
    }
}
