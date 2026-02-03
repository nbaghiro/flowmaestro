/**
 * Reusable Zod schemas for GCP operations
 */

import { z } from "zod";

/**
 * GCP Project ID schema
 */
export const GCPProjectIdSchema = z
    .string()
    .regex(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/)
    .describe("GCP Project ID");

/**
 * GCP Resource Name schema (full path)
 */
export const GCPResourceNameSchema = z
    .string()
    .regex(/^projects\/[^/]+\//)
    .describe("GCP resource name (projects/PROJECT_ID/...)");

/**
 * Cloud Build ID schema
 */
export const BuildIdSchema = z.string().uuid().describe("Cloud Build ID");

/**
 * Secret name schema (short name, not full path)
 */
export const SecretNameSchema = z
    .string()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_-]{0,254}$/)
    .describe("Secret name");

/**
 * Instance name schema
 */
export const InstanceNameSchema = z
    .string()
    .regex(/^[a-z][-a-z0-9]{0,62}$/)
    .describe("Compute Engine instance name");

/**
 * Zone schema
 */
export const ZoneSchema = z
    .string()
    .regex(/^[a-z]+-[a-z]+[0-9]-[a-z]$/)
    .describe("GCP zone (e.g., us-central1-a)");

/**
 * Region schema
 */
export const RegionSchema = z
    .string()
    .regex(/^[a-z]+-[a-z]+[0-9]$/)
    .describe("GCP region (e.g., us-central1)");

/**
 * Cloud Run service name schema
 */
export const ServiceNameSchema = z
    .string()
    .regex(/^[a-z][-a-z0-9]{0,62}$/)
    .describe("Cloud Run service name");

/**
 * Container image schema
 */
export const ContainerImageSchema = z
    .string()
    .regex(/^([a-z0-9.-]+\/)?[a-z0-9-_./]+:[a-z0-9-_.]+$/)
    .describe("Container image (e.g., gcr.io/project/image:tag)");

/**
 * ISO 8601 timestamp schema
 */
export const ISO8601TimestampSchema = z.string().datetime().describe("ISO 8601 timestamp");

/**
 * Page size schema (for list operations)
 */
export const PageSizeSchema = z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(100)
    .describe("Maximum number of results to return");

/**
 * Page token schema
 */
export const PageTokenSchema = z.string().optional().describe("Pagination token");

/**
 * Machine type schema
 */
export const MachineTypeSchema = z
    .string()
    .describe("Machine type (e.g., n1-standard-1, e2-medium)");

/**
 * Disk size schema (in GB)
 */
export const DiskSizeGBSchema = z
    .number()
    .int()
    .min(10)
    .max(65536)
    .describe("Disk size in GB (10-65536)");
