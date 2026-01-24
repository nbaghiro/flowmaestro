import { z } from "zod";

/**
 * Shared Zod schemas for Mixpanel operations
 */

/**
 * Distinct ID - unique identifier for a user
 */
export const MixpanelDistinctIdSchema = z
    .string()
    .min(1)
    .describe("Unique identifier for the user (e.g., user ID, email)");

/**
 * Event name
 */
export const MixpanelEventNameSchema = z.string().min(1).describe("The name of the event to track");

/**
 * Event properties - arbitrary key-value pairs
 */
export const MixpanelEventPropertiesSchema = z
    .record(z.unknown())
    .optional()
    .describe("Custom properties for the event");

/**
 * User profile properties
 */
export const MixpanelProfilePropertiesSchema = z
    .record(z.unknown())
    .optional()
    .describe("Properties to set on the user profile");

/**
 * Timestamp for the event
 */
export const MixpanelTimeSchema = z
    .number()
    .optional()
    .describe("Unix timestamp in seconds for the event");

/**
 * Insert ID for deduplication
 */
export const MixpanelInsertIdSchema = z
    .string()
    .optional()
    .describe("Unique identifier for deduplication (UUID recommended)");

/**
 * Group key for group analytics
 */
export const MixpanelGroupKeySchema = z.string().min(1).describe("The group key (e.g., 'company')");

/**
 * Group ID for group analytics
 */
export const MixpanelGroupIdSchema = z.string().min(1).describe("The group ID value");
