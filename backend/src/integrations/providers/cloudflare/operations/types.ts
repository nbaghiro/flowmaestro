/**
 * Cloudflare operation shared types and schemas
 */

import { z } from "zod";

// ============================================
// Common Schemas
// ============================================

/**
 * Zone ID schema (32-character hex string)
 */
export const ZoneIdSchema = z
    .string()
    .regex(/^[a-f0-9]{32}$/, "Zone ID must be a 32-character hex string")
    .describe("The zone identifier (32-character hex string)");

/**
 * DNS Record ID schema (32-character hex string)
 */
export const DNSRecordIdSchema = z
    .string()
    .regex(/^[a-f0-9]{32}$/, "Record ID must be a 32-character hex string")
    .describe("The DNS record identifier (32-character hex string)");

/**
 * Worker script name schema
 */
export const WorkerNameSchema = z
    .string()
    .min(1)
    .max(64)
    .regex(
        /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
        "Worker name must be lowercase alphanumeric with hyphens"
    )
    .describe("The Worker script name");

/**
 * KV namespace ID schema (32-character hex string)
 */
export const KVNamespaceIdSchema = z
    .string()
    .regex(/^[a-f0-9]{32}$/, "Namespace ID must be a 32-character hex string")
    .describe("The KV namespace identifier (32-character hex string)");

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
    page: z.number().int().min(1).optional().describe("Page number (default: 1)"),
    per_page: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe("Number of results per page (default: 20, max: 1000)")
});

/**
 * DNS record type enum
 */
export const DNSRecordTypeSchema = z.enum([
    "A",
    "AAAA",
    "CNAME",
    "TXT",
    "MX",
    "NS",
    "SRV",
    "CAA",
    "PTR",
    "SPF"
]);

/**
 * TTL schema
 */
export const TTLSchema = z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Time to live in seconds (1 = automatic)");
