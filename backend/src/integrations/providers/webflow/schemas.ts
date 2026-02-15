import { z } from "zod";

/**
 * Webflow ID Schema (Webflow uses MongoDB-style ObjectIds)
 */
export const WebflowIdSchema = z.string().min(1).describe("Webflow resource ID");

/**
 * Site ID Schema
 */
export const WebflowSiteIdSchema = z.string().min(1).describe("Webflow site ID");

/**
 * Collection ID Schema
 */
export const WebflowCollectionIdSchema = z.string().min(1).describe("Webflow collection ID");

/**
 * Item ID Schema
 */
export const WebflowItemIdSchema = z.string().min(1).describe("Webflow collection item ID");

/**
 * Slug Schema (URL-safe string)
 */
export const WebflowSlugSchema = z
    .string()
    .min(1)
    .max(256)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional()
    .describe("URL-safe slug for the item");

/**
 * Name Schema
 */
export const WebflowNameSchema = z.string().min(1).max(256).describe("Display name");

/**
 * Boolean flag schema
 */
export const WebflowBooleanSchema = z.boolean().optional();

/**
 * Field data schema (flexible key-value pairs for CMS items)
 */
export const WebflowFieldDataSchema = z
    .record(z.string(), z.unknown())
    .describe("Field data key-value pairs matching collection schema");

/**
 * Pagination parameters
 */
export const WebflowPaginationSchema = z.object({
    offset: z.number().int().min(0).optional().default(0).describe("Number of items to skip"),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(100)
        .describe("Number of items to return (max 100)")
});

/**
 * Domain array for publishing
 */
export const WebflowDomainsSchema = z
    .array(z.string())
    .optional()
    .describe("Specific domains to publish to (publishes to all if not specified)");
