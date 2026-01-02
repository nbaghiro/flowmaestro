import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { DiscordClient } from "../client/DiscordClient";
import type { DiscordMessageResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Discord Embed Field schema
 */
const discordEmbedFieldSchema = z.object({
    name: z.string().max(256).describe("Field name"),
    value: z.string().max(1024).describe("Field value"),
    inline: z.boolean().optional().describe("Display inline with other fields")
});

/**
 * Discord Embed schema
 */
const discordEmbedSchema = z.object({
    title: z.string().max(256).optional().describe("Embed title"),
    description: z.string().max(4096).optional().describe("Embed description"),
    url: z.string().url().optional().describe("URL for the title"),
    color: z.number().int().optional().describe("Color code (decimal integer)"),
    timestamp: z.string().optional().describe("ISO8601 timestamp"),
    footer: z
        .object({
            text: z.string().max(2048).describe("Footer text"),
            icon_url: z.string().url().optional().describe("Footer icon URL")
        })
        .optional()
        .describe("Footer object"),
    image: z
        .object({
            url: z.string().url().describe("Image URL")
        })
        .optional()
        .describe("Image object"),
    thumbnail: z
        .object({
            url: z.string().url().describe("Thumbnail URL")
        })
        .optional()
        .describe("Thumbnail object"),
    author: z
        .object({
            name: z.string().max(256).describe("Author name"),
            url: z.string().url().optional().describe("Author URL"),
            icon_url: z.string().url().optional().describe("Author icon URL")
        })
        .optional()
        .describe("Author object"),
    fields: z.array(discordEmbedFieldSchema).max(25).optional().describe("Array of field objects")
});

/**
 * Send Message operation schema
 */
export const sendMessageSchema = z.object({
    channelId: z.string().regex(/^\d+$/).describe("Discord channel ID"),
    content: z.string().max(2000).optional().describe("Message content (max 2000 characters)"),
    embeds: z.array(discordEmbedSchema).max(10).optional().describe("Array of embed objects"),
    tts: z.boolean().optional().default(false).describe("Enable text-to-speech")
});

export type SendMessageParams = z.infer<typeof sendMessageSchema>;

/**
 * Send Message operation definition
 */
export const sendMessageOperation: OperationDefinition = (() => {
    try {
        return {
            id: "sendMessage",
            name: "Send Message",
            description: "Send a message to a Discord channel",
            category: "messaging",
            inputSchema: sendMessageSchema,
            inputSchemaJSON: toJSONSchema(sendMessageSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Discord", err: error }, "Failed to create sendMessageOperation");
        throw new Error(
            `Failed to create sendMessage operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send message operation
 */
export async function executeSendMessage(
    client: DiscordClient,
    params: SendMessageParams
): Promise<OperationResult> {
    try {
        // Validate that we have either content or embeds
        if (!params.content && (!params.embeds || params.embeds.length === 0)) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Message must have either content or embeds",
                    retryable: false
                }
            };
        }

        const response = await client.sendMessage(params.channelId, {
            content: params.content,
            embeds: params.embeds,
            tts: params.tts
        });

        const data = response as unknown as DiscordMessageResponse;

        return {
            success: true,
            data: {
                messageId: data.id,
                channelId: data.channel_id,
                guildId: data.guild_id,
                timestamp: data.timestamp
            }
        };
    } catch (error) {
        logger.error(
            { component: "Discord", err: error, channelId: params.channelId },
            "Failed to send Discord message"
        );
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send message",
                retryable: true
            }
        };
    }
}
