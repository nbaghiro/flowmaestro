import { z } from "zod";
import { RegionSlugSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Create Load Balancer operation schema
 */
export const createLoadBalancerSchema = z.object({
    name: z.string().min(1).max(255).describe("The name of the load balancer"),
    region: RegionSlugSchema,
    forwarding_rules: z
        .array(
            z.object({
                entry_protocol: z
                    .enum(["http", "https", "http2", "http3", "tcp", "udp"])
                    .describe("Entry protocol"),
                entry_port: z.number().int().min(1).max(65535).describe("Entry port"),
                target_protocol: z
                    .enum(["http", "https", "http2", "tcp", "udp"])
                    .describe("Target protocol"),
                target_port: z.number().int().min(1).max(65535).describe("Target port"),
                certificate_id: z.string().optional().describe("SSL certificate ID for HTTPS"),
                tls_passthrough: z.boolean().optional().describe("Enable TLS passthrough")
            })
        )
        .min(1)
        .describe("Forwarding rules for the load balancer"),
    health_check: z
        .object({
            protocol: z.enum(["http", "https", "tcp"]).optional().describe("Health check protocol"),
            port: z.number().int().min(1).max(65535).optional().describe("Health check port"),
            path: z.string().optional().describe("HTTP path for health check"),
            check_interval_seconds: z.number().int().optional().describe("Check interval"),
            response_timeout_seconds: z.number().int().optional().describe("Response timeout"),
            unhealthy_threshold: z.number().int().optional().describe("Unhealthy threshold"),
            healthy_threshold: z.number().int().optional().describe("Healthy threshold")
        })
        .optional()
        .describe("Health check configuration"),
    sticky_sessions: z
        .object({
            type: z.enum(["none", "cookies"]).optional(),
            cookie_name: z.string().optional(),
            cookie_ttl_seconds: z.number().int().optional()
        })
        .optional()
        .describe("Sticky session configuration"),
    droplet_ids: z
        .array(z.number().int().positive())
        .optional()
        .describe("Droplet IDs to add to the load balancer"),
    tag: z.string().optional().describe("Tag to auto-discover Droplets"),
    redirect_http_to_https: z.boolean().optional().describe("Redirect HTTP to HTTPS"),
    enable_proxy_protocol: z.boolean().optional().describe("Enable PROXY protocol"),
    enable_backend_keepalive: z.boolean().optional().describe("Enable backend keepalive"),
    vpc_uuid: z.string().uuid().optional().describe("VPC UUID"),
    project_id: z.string().uuid().optional().describe("Project UUID"),
    http_idle_timeout_seconds: z.number().int().optional().describe("HTTP idle timeout"),
    algorithm: z
        .enum(["round_robin", "least_connections"])
        .optional()
        .describe("Load balancing algorithm")
});

export type CreateLoadBalancerParams = z.infer<typeof createLoadBalancerSchema>;

/**
 * Create Load Balancer operation definition
 */
export const createLoadBalancerOperation: OperationDefinition = {
    id: "loadBalancers_createLoadBalancer",
    name: "Create Load Balancer",
    description: "Create a new load balancer",
    category: "load-balancers",
    inputSchema: createLoadBalancerSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute create load balancer operation
 */
export async function executeCreateLoadBalancer(
    client: DigitalOceanClient,
    params: CreateLoadBalancerParams
): Promise<OperationResult> {
    try {
        const lb = await client.createLoadBalancer(params);

        return {
            success: true,
            data: {
                id: lb.id,
                name: lb.name,
                ip: lb.ip,
                status: lb.status,
                region: lb.region?.slug,
                algorithm: lb.algorithm,
                createdAt: lb.created_at,
                message: "Load balancer creation initiated"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create load balancer",
                retryable: false
            }
        };
    }
}
