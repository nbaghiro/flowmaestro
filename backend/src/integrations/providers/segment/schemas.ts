import { z } from "zod";

/**
 * Shared Zod schemas for Segment operations
 *
 * Segment uses the Segment Spec which defines common fields for all calls:
 * https://segment.com/docs/connections/spec/
 */

/**
 * User ID - identifies the user performing the action
 */
export const SegmentUserIdSchema = z
    .string()
    .optional()
    .describe("The unique identifier for the user in your database");

/**
 * Anonymous ID - identifies anonymous/logged-out users
 */
export const SegmentAnonymousIdSchema = z
    .string()
    .optional()
    .describe("A pseudo-unique identifier for an anonymous user (before they log in)");

/**
 * Event name
 */
export const SegmentEventSchema = z
    .string()
    .min(1)
    .describe("The name of the action the user performed (e.g., 'Order Completed')");

/**
 * Properties - additional data about the event
 */
export const SegmentPropertiesSchema = z
    .record(z.unknown())
    .optional()
    .describe("Free-form dictionary of properties that describe the event");

/**
 * Traits - data about the user
 */
export const SegmentTraitsSchema = z
    .record(z.unknown())
    .optional()
    .describe("Free-form dictionary of traits about the user (e.g., email, name, plan)");

/**
 * Context - contextual information about the event
 */
export const SegmentContextSchema = z
    .object({
        active: z.boolean().optional().describe("Whether user is active"),
        app: z
            .object({
                name: z.string().optional(),
                version: z.string().optional(),
                build: z.string().optional(),
                namespace: z.string().optional()
            })
            .optional()
            .describe("Dictionary of info about the current application"),
        campaign: z
            .object({
                name: z.string().optional(),
                source: z.string().optional(),
                medium: z.string().optional(),
                term: z.string().optional(),
                content: z.string().optional()
            })
            .optional()
            .describe("Dictionary of info about the campaign that resulted in the API call"),
        device: z
            .object({
                id: z.string().optional(),
                advertisingId: z.string().optional(),
                adTrackingEnabled: z.boolean().optional(),
                manufacturer: z.string().optional(),
                model: z.string().optional(),
                name: z.string().optional(),
                type: z.string().optional(),
                token: z.string().optional()
            })
            .optional()
            .describe("Dictionary of info about the device"),
        ip: z.string().optional().describe("Current user IP address"),
        library: z
            .object({
                name: z.string().optional(),
                version: z.string().optional()
            })
            .optional()
            .describe("Dictionary of info about the library making the request"),
        locale: z.string().optional().describe("Locale string for the current user"),
        location: z
            .object({
                city: z.string().optional(),
                country: z.string().optional(),
                latitude: z.number().optional(),
                longitude: z.number().optional(),
                region: z.string().optional(),
                speed: z.number().optional()
            })
            .optional()
            .describe("Dictionary of info about the user location"),
        network: z
            .object({
                bluetooth: z.boolean().optional(),
                carrier: z.string().optional(),
                cellular: z.boolean().optional(),
                wifi: z.boolean().optional()
            })
            .optional()
            .describe("Dictionary of info about the current network connection"),
        os: z
            .object({
                name: z.string().optional(),
                version: z.string().optional()
            })
            .optional()
            .describe("Dictionary of info about the operating system"),
        page: z
            .object({
                path: z.string().optional(),
                referrer: z.string().optional(),
                search: z.string().optional(),
                title: z.string().optional(),
                url: z.string().optional()
            })
            .optional()
            .describe("Dictionary of info about the current page in the browser"),
        referrer: z
            .object({
                type: z.string().optional(),
                name: z.string().optional(),
                url: z.string().optional(),
                link: z.string().optional()
            })
            .optional()
            .describe("Dictionary of info about the way the user was referred"),
        screen: z
            .object({
                density: z.number().optional(),
                height: z.number().optional(),
                width: z.number().optional()
            })
            .optional()
            .describe("Dictionary of info about the device screen"),
        timezone: z
            .string()
            .optional()
            .describe("Timezones as specified in IANA Time Zone Database"),
        groupId: z.string().optional().describe("Group/Account ID"),
        traits: z.record(z.unknown()).optional().describe("Traits about the current user"),
        userAgent: z.string().optional().describe("User agent of the device making the request")
    })
    .optional()
    .describe("Context dictionary with info about the environment");

/**
 * Timestamp - when the event occurred
 */
export const SegmentTimestampSchema = z
    .string()
    .optional()
    .describe("ISO 8601 timestamp when the message was generated (defaults to current time)");

/**
 * Message ID - unique identifier for deduplication
 */
export const SegmentMessageIdSchema = z
    .string()
    .optional()
    .describe("Unique identifier for the message, used for deduplication");

/**
 * Group ID - identifies a group/organization
 */
export const SegmentGroupIdSchema = z
    .string()
    .min(1)
    .describe("The unique identifier for the group/organization");

/**
 * Previous ID - for alias calls
 */
export const SegmentPreviousIdSchema = z
    .string()
    .min(1)
    .describe("The previous unique identifier for the user");

/**
 * Page/Screen name
 */
export const SegmentNameSchema = z
    .string()
    .optional()
    .describe("The name of the page or screen being viewed");

/**
 * Integrations - control which destinations receive the event
 */
export const SegmentIntegrationsSchema = z
    .record(z.union([z.boolean(), z.record(z.unknown())]))
    .optional()
    .describe("Dictionary of destination-specific options");

/**
 * Common base schema for all Segment calls
 */
export const SegmentBaseCallSchema = z.object({
    userId: SegmentUserIdSchema,
    anonymousId: SegmentAnonymousIdSchema,
    context: SegmentContextSchema,
    integrations: SegmentIntegrationsSchema,
    timestamp: SegmentTimestampSchema,
    messageId: SegmentMessageIdSchema
});
