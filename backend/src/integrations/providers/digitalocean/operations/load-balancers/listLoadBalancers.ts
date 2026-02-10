import { z } from "zod";
import { PaginationSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * List Load Balancers operation schema
 */
export const listLoadBalancersSchema = PaginationSchema;

export type ListLoadBalancersParams = z.infer<typeof listLoadBalancersSchema>;

/**
 * List Load Balancers operation definition
 */
export const listLoadBalancersOperation: OperationDefinition = {
    id: "loadBalancers_listLoadBalancers",
    name: "List Load Balancers",
    description: "List all load balancers in the account",
    category: "load-balancers",
    inputSchema: listLoadBalancersSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list load balancers operation
 */
export async function executeListLoadBalancers(
    client: DigitalOceanClient,
    params: ListLoadBalancersParams
): Promise<OperationResult> {
    try {
        const response = await client.listLoadBalancers(params);

        return {
            success: true,
            data: {
                loadBalancers: response.load_balancers.map((lb) => ({
                    id: lb.id,
                    name: lb.name,
                    ip: lb.ip,
                    algorithm: lb.algorithm,
                    status: lb.status,
                    region: lb.region?.slug,
                    dropletIds: lb.droplet_ids,
                    forwardingRules: lb.forwarding_rules?.map((rule) => ({
                        entryProtocol: rule.entry_protocol,
                        entryPort: rule.entry_port,
                        targetProtocol: rule.target_protocol,
                        targetPort: rule.target_port
                    })),
                    createdAt: lb.created_at
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
                message: error instanceof Error ? error.message : "Failed to list load balancers",
                retryable: true
            }
        };
    }
}
