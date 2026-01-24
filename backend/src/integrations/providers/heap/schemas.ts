import { z } from "zod";

/**
 * Shared Zod schemas for Heap operations
 *
 * Heap has specific limits:
 * - Event name: max 255 characters
 * - Property keys: max 512 characters
 * - Property values: max 1024 characters
 * - Reserved event names: "click", "change", "pageview", "submit"
 */

/**
 * User identity - required for all Heap API calls
 */
export const HeapUserIdentitySchema = z
    .string()
    .min(1)
    .describe("The user's unique identifier in your system");

/**
 * Event name - max 255 chars, cannot be reserved names
 */
export const HeapEventNameSchema = z
    .string()
    .min(1)
    .max(255)
    .refine(
        (name) => !["click", "change", "pageview", "submit"].includes(name.toLowerCase()),
        "Event name cannot be a reserved Heap event (click, change, pageview, submit)"
    )
    .describe("The name of the custom event to track (max 255 chars)");

/**
 * Event properties - arbitrary key-value pairs
 */
export const HeapEventPropertiesSchema = z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .describe("Custom properties for the event (string, number, or boolean values)");

/**
 * User properties for profile updates
 */
export const HeapUserPropertiesSchema = z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .describe("User properties to set (string, number, or boolean values)");

/**
 * Account ID for B2B analytics
 */
export const HeapAccountIdSchema = z
    .string()
    .min(1)
    .describe("The account/organization identifier for B2B analytics");

/**
 * Account properties for B2B profile updates
 */
export const HeapAccountPropertiesSchema = z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .describe("Account properties to set (string, number, or boolean values)");

/**
 * Timestamp for the event (Unix timestamp in seconds)
 */
export const HeapTimestampSchema = z
    .number()
    .optional()
    .describe("Unix timestamp in seconds for the event (defaults to current time)");

/**
 * Idempotency key for deduplication
 */
export const HeapIdempotencyKeySchema = z
    .string()
    .optional()
    .describe("Unique identifier for deduplication (optional)");
