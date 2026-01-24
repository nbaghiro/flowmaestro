import { z } from "zod";

/**
 * Shared Zod schemas for Telegram operations
 */

export const TelegramChatIdSchema = z
    .union([z.string(), z.number()])
    .describe("Unique identifier for the target chat or @username of the target channel");

export const TelegramMessageIdSchema = z
    .number()
    .int()
    .positive()
    .describe("Unique message identifier");

export const TelegramTextSchema = z
    .string()
    .min(1)
    .max(4096)
    .describe("Text of the message to be sent (1-4096 characters)");

export const TelegramParseModeSchema = z
    .enum(["Markdown", "MarkdownV2", "HTML"])
    .optional()
    .describe("Mode for parsing entities in the message text");

export const TelegramDisableNotificationSchema = z
    .boolean()
    .optional()
    .describe("Sends the message silently. Users will receive a notification with no sound.");

export const TelegramReplyToMessageIdSchema = z
    .number()
    .int()
    .positive()
    .optional()
    .describe("If the message is a reply, ID of the original message");

export const TelegramCaptionSchema = z
    .string()
    .max(1024)
    .optional()
    .describe("Caption for the media (0-1024 characters)");

export const TelegramFileSchema = z
    .string()
    .describe(
        "File to send. Pass a file_id to send a file that exists on the Telegram servers, or pass an HTTP URL for Telegram to get a file from the Internet."
    );
