import { z } from "zod";

/**
 * Shared Zod schemas for Buffer operations
 */

export const BufferProfileIdSchema = z
    .string()
    .describe("Buffer profile ID (e.g., 4eb854340acb04e870000010)");

export const BufferUpdateIdSchema = z
    .string()
    .describe("Buffer update/post ID (e.g., 4ecda256512f7ee521000001)");

export const BufferTextSchema = z
    .string()
    .min(1)
    .max(2000)
    .describe("The text content of the post");

export const BufferMediaSchema = z
    .object({
        link: z.string().url().optional().describe("URL of the media to attach"),
        photo: z.string().url().optional().describe("URL of the photo to attach"),
        thumbnail: z.string().url().optional().describe("URL of the thumbnail")
    })
    .optional()
    .describe("Media attachments for the post");

export const BufferScheduledAtSchema = z
    .string()
    .optional()
    .describe("ISO 8601 timestamp for when to publish (e.g., 2024-01-15T10:00:00Z)");

export const BufferNowSchema = z
    .boolean()
    .optional()
    .describe("If true, post immediately instead of adding to queue");

export const BufferTopSchema = z
    .boolean()
    .optional()
    .describe("If true, add to the top of the queue instead of bottom");
