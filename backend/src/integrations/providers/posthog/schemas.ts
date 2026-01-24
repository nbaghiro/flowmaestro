import { z } from "zod";

/**
 * Shared Zod schemas for PostHog operations
 *
 * PostHog accepts events via the capture endpoint with flexible schema.
 * Special events like $set (identify) and $groupidentify use specific properties.
 */

/**
 * Distinct ID - unique identifier for a person
 */
export const PostHogDistinctIdSchema = z
    .string()
    .min(1)
    .describe("Unique identifier for the user/person");

/**
 * Event name
 */
export const PostHogEventNameSchema = z
    .string()
    .min(1)
    .describe("The name of the event to capture");

/**
 * Event properties - arbitrary key-value pairs
 */
export const PostHogEventPropertiesSchema = z
    .record(z.unknown())
    .optional()
    .describe("Custom properties for the event");

/**
 * Person properties for $set operations
 */
export const PostHogPersonPropertiesSchema = z
    .record(z.unknown())
    .describe("Person properties to set");

/**
 * Person properties for $set_once operations
 */
export const PostHogPersonSetOnceSchema = z
    .record(z.unknown())
    .optional()
    .describe("Person properties to set only if not already set");

/**
 * Group type for group analytics (e.g., "company", "organization")
 */
export const PostHogGroupTypeSchema = z
    .string()
    .min(1)
    .describe("The type of group (e.g., 'company', 'organization')");

/**
 * Group key - unique identifier for the group
 */
export const PostHogGroupKeySchema = z
    .string()
    .min(1)
    .describe("The unique identifier for the group");

/**
 * Group properties
 */
export const PostHogGroupPropertiesSchema = z
    .record(z.unknown())
    .describe("Group properties to set");

/**
 * Timestamp for the event (ISO 8601 string)
 */
export const PostHogTimestampSchema = z
    .string()
    .optional()
    .describe("ISO 8601 timestamp for the event (defaults to current time)");

/**
 * UUID for event deduplication
 */
export const PostHogUuidSchema = z
    .string()
    .uuid()
    .optional()
    .describe("UUID for event deduplication");

/**
 * Single event in a batch
 */
export const PostHogBatchEventSchema = z.object({
    event: PostHogEventNameSchema,
    distinct_id: PostHogDistinctIdSchema,
    properties: PostHogEventPropertiesSchema,
    timestamp: PostHogTimestampSchema,
    uuid: PostHogUuidSchema
});

export type PostHogBatchEvent = z.infer<typeof PostHogBatchEventSchema>;
