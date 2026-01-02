import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { DiscordClient } from "../client/DiscordClient";
import type { DiscordWebhookResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create Webhook operation schema
 */
export const createWebhookSchema = z.object({
    channelId: z.string().regex(/^\d+$/).describe("Discord channel ID"),
    name: z.string().min(1).max(80).describe("Webhook name (1-80 characters)"),
    avatar: z.string().optional().describe("Base64 encoded image data for webhook avatar")
});

export type CreateWebhookParams = z.infer<typeof createWebhookSchema>;

/**
 * Create Webhook operation definition
 */
export const createWebhookOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createWebhook",
            name: "Create Webhook",
            description: "Create a webhook in a Discord channel",
            category: "management",
            inputSchema: createWebhookSchema,
            inputSchemaJSON: toJSONSchema(createWebhookSchema),
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Discord", err: error },
            "Failed to create createWebhookOperation"
        );
        throw new Error(
            `Failed to create createWebhook operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create webhook operation
 */
export async function executeCreateWebhook(
    client: DiscordClient,
    params: CreateWebhookParams
): Promise<OperationResult> {
    try {
        const webhook = await client.createWebhook(params.channelId, params.name, params.avatar);

        const data = webhook as unknown as DiscordWebhookResponse;

        return {
            success: true,
            data: {
                webhookId: data.id,
                webhookToken: data.token,
                webhookUrl: data.url || `https://discord.com/api/webhooks/${data.id}/${data.token}`,
                channelId: data.channel_id,
                guildId: data.guild_id,
                name: data.name
            }
        };
    } catch (error) {
        logger.error(
            { component: "Discord", err: error, channelId: params.channelId },
            "Failed to create Discord webhook"
        );
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create webhook",
                retryable: false
            }
        };
    }
}
