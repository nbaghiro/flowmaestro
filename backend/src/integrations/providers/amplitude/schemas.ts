import { z } from "zod";

/**
 * Shared Zod schemas for Amplitude operations
 */

/**
 * User identifier - either user_id or device_id is required
 */
export const AmplitudeUserIdSchema = z
    .string()
    .optional()
    .describe("The user ID to associate with the event");

export const AmplitudeDeviceIdSchema = z
    .string()
    .optional()
    .describe("The device ID to associate with the event");

/**
 * Event type (required)
 */
export const AmplitudeEventTypeSchema = z
    .string()
    .min(1)
    .describe("The name of the event to track");

/**
 * Event properties - arbitrary key-value pairs
 */
export const AmplitudeEventPropertiesSchema = z
    .record(z.unknown())
    .optional()
    .describe("Custom properties for the event");

/**
 * User properties - for identifying/updating users
 */
export const AmplitudeUserPropertiesSchema = z
    .record(z.unknown())
    .optional()
    .describe("User properties to set or update");

/**
 * Timestamp for the event
 */
export const AmplitudeTimeSchema = z
    .number()
    .optional()
    .describe("Unix timestamp in milliseconds for the event (defaults to current time)");

/**
 * Insert ID for deduplication
 */
export const AmplitudeInsertIdSchema = z
    .string()
    .optional()
    .describe("Unique identifier for the event, used for deduplication");
