import { z } from "zod";
import { LoadBalancerIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Get Load Balancer operation schema
 */
export const getLoadBalancerSchema = z.object({
    loadBalancerId: LoadBalancerIdSchema
});

export type GetLoadBalancerParams = z.infer<typeof getLoadBalancerSchema>;

/**
 * Get Load Balancer operation definition
 */
export const getLoadBalancerOperation: OperationDefinition = {
    id: "loadBalancers_getLoadBalancer",
    name: "Get Load Balancer",
    description: "Get details for a specific load balancer",
    category: "load-balancers",
    inputSchema: getLoadBalancerSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get load balancer operation
 */
export async function executeGetLoadBalancer(
    client: DigitalOceanClient,
    params: GetLoadBalancerParams
): Promise<OperationResult> {
    try {
        const lb = await client.getLoadBalancer(params.loadBalancerId);

        return {
            success: true,
            data: {
                id: lb.id,
                name: lb.name,
                ip: lb.ip,
                algorithm: lb.algorithm,
                status: lb.status,
                region: lb.region,
                dropletIds: lb.droplet_ids,
                vpcUuid: lb.vpc_uuid,
                projectId: lb.project_id,
                forwardingRules: lb.forwarding_rules?.map((rule) => ({
                    entryProtocol: rule.entry_protocol,
                    entryPort: rule.entry_port,
                    targetProtocol: rule.target_protocol,
                    targetPort: rule.target_port,
                    certificateId: rule.certificate_id,
                    tlsPassthrough: rule.tls_passthrough
                })),
                healthCheck: lb.health_check,
                stickySessions: lb.sticky_sessions,
                redirectHttpToHttps: lb.redirect_http_to_https,
                enableProxyProtocol: lb.enable_proxy_protocol,
                enableBackendKeepalive: lb.enable_backend_keepalive,
                httpIdleTimeoutSeconds: lb.http_idle_timeout_seconds,
                firewall: lb.firewall,
                createdAt: lb.created_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get load balancer",
                retryable: true
            }
        };
    }
}
