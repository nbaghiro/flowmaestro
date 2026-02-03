/**
 * DigitalOcean operation shared types and schemas
 */

import { z } from "zod";

// ============================================
// Common Schemas
// ============================================

/**
 * Droplet ID schema (numeric)
 */
export const DropletIdSchema = z
    .number()
    .int()
    .positive()
    .describe("The unique numeric identifier for the Droplet");

/**
 * Kubernetes cluster ID schema (UUID)
 */
export const KubernetesClusterIdSchema = z
    .string()
    .uuid()
    .describe("The UUID of the Kubernetes cluster");

/**
 * Node pool ID schema (UUID)
 */
export const NodePoolIdSchema = z.string().uuid().describe("The UUID of the node pool");

/**
 * App ID schema (UUID)
 */
export const AppIdSchema = z.string().uuid().describe("The UUID of the App Platform app");

/**
 * Deployment ID schema (UUID)
 */
export const DeploymentIdSchema = z.string().uuid().describe("The UUID of the deployment");

/**
 * Database ID schema (UUID)
 */
export const DatabaseIdSchema = z.string().uuid().describe("The UUID of the database cluster");

/**
 * Load Balancer ID schema (UUID)
 */
export const LoadBalancerIdSchema = z.string().uuid().describe("The UUID of the load balancer");

/**
 * Region slug schema
 */
export const RegionSlugSchema = z
    .string()
    .regex(/^[a-z]{3}\d$/, "Region must be in format like 'nyc1', 'sfo2', 'fra1'")
    .describe("The slug identifier for the region (e.g., 'nyc1', 'sfo2', 'fra1')");

/**
 * Size slug schema
 */
export const SizeSlugSchema = z
    .string()
    .describe("The slug identifier for the Droplet/instance size (e.g., 's-1vcpu-1gb')");

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
    page: z.number().int().min(1).optional().describe("Page number (default: 1)"),
    per_page: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe("Number of results per page (default: 20, max: 200)")
});

/**
 * Database engine enum
 */
export const DatabaseEngineSchema = z.enum(["pg", "mysql", "redis", "mongodb", "kafka"]);
