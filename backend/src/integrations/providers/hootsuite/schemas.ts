import { z } from "zod";

/**
 * Shared Zod schemas for Hootsuite operations
 */

export const HootsuiteSocialProfileIdSchema = z
    .string()
    .describe("Hootsuite social profile ID (e.g., 123456789)");

export const HootsuiteMessageIdSchema = z.string().describe("Hootsuite message ID");

export const HootsuiteMediaIdSchema = z.string().describe("Hootsuite media ID");

export const HootsuiteTextSchema = z
    .string()
    .min(1)
    .max(5000)
    .describe("The text content of the post");

export const HootsuiteScheduledSendTimeSchema = z
    .string()
    .describe("ISO 8601 UTC timestamp for when to publish (e.g., 2024-01-15T10:00:00Z)");

export const HootsuiteMediaUrlSchema = z.string().url().describe("URL of the media to upload");

export const HootsuiteMediaUrlsSchema = z
    .array(HootsuiteMediaIdSchema)
    .optional()
    .describe("Array of media IDs to attach to the message");

export const HootsuiteMessageStateSchema = z
    .enum(["SCHEDULED", "DRAFT", "SEND_NOW"])
    .default("SCHEDULED")
    .describe("The state of the message (SCHEDULED, DRAFT, or SEND_NOW)");
