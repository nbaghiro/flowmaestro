import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { DiscordClient } from "../client/DiscordClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Discord Embed Field schema (same as sendMessage)
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
 * Execute Webhook operation schema
 */
export const executeWebhookSchema = z.object({
    webhookUrl: z
        .string()
        .url()
        .regex(/discord\.com\/api\/webhooks\/\d+\/[a-zA-Z0-9_-]+/)
        .describe("Discord webhook URL"),
    content: z.string().max(2000).optional().describe("Message content"),
    username: z.string().max(80).optional().describe("Override webhook username"),
    avatarUrl: z.string().url().optional().describe("Override webhook avatar URL"),
    embeds: z.array(discordEmbedSchema).max(10).optional().describe("Array of embed objects"),
    tts: z.boolean().optional().default(false).describe("Enable text-to-speech")
});

export type ExecuteWebhookParams = z.infer<typeof executeWebhookSchema>;

/**
 * Execute Webhook operation definition
 */
export const executeWebhookOperation: OperationDefinition = (() => {
    try {
        return {
            id: "executeWebhook",
            name: "Execute Webhook",
            description: "Send a message via Discord webhook",
            category: "messaging",
            inputSchema: executeWebhookSchema,
            inputSchemaJSON: toJSONSchema(executeWebhookSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Discord", err: error },
            "Failed to create executeWebhookOperation"
        );
        throw new Error(
            `Failed to create executeWebhook operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute webhook operation
 */
export async function executeExecuteWebhook(
    client: DiscordClient,
    params: ExecuteWebhookParams
): Promise<OperationResult> {
    try {
        // Validate that we have either content or embeds
        if (!params.content && (!params.embeds || params.embeds.length === 0)) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Webhook message must have either content or embeds",
                    retryable: false
                }
            };
        }

        const response = await client.executeWebhook(params.webhookUrl, {
            content: params.content,
            username: params.username,
            avatar_url: params.avatarUrl,
            embeds: params.embeds,
            tts: params.tts
        });

        return {
            success: true,
            data: {
                messageId: response ? (response as { id?: string }).id : undefined,
                webhookExecuted: true
            }
        };
    } catch (error) {
        logger.error({ component: "Discord", err: error }, "Failed to execute Discord webhook");
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to execute webhook",
                retryable: true
            }
        };
    }
}
