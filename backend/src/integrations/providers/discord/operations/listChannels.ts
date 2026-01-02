import { z } from "zod";
import type { DiscordChannel } from "@flowmaestro/shared";
import { DiscordChannelType } from "@flowmaestro/shared";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { DiscordClient } from "../client/DiscordClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Channels operation schema
 */
export const listChannelsSchema = z.object({
    guildId: z.string().regex(/^\d+$/).describe("Discord guild (server) ID"),
    textOnly: z
        .boolean()
        .optional()
        .default(true)
        .describe("Only return text channels (exclude voice, categories, etc.)")
});

export type ListChannelsParams = z.infer<typeof listChannelsSchema>;

/**
 * List Channels operation definition
 */
export const listChannelsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listChannels",
            name: "List Channels",
            description: "List channels in a Discord server",
            category: "discovery",
            inputSchema: listChannelsSchema,
            inputSchemaJSON: toJSONSchema(listChannelsSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Discord", err: error },
            "Failed to create listChannelsOperation"
        );
        throw new Error(
            `Failed to create listChannels operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Get channel type name
 */
function getChannelTypeName(type: DiscordChannelType): string {
    switch (type) {
        case DiscordChannelType.GUILD_TEXT:
            return "text";
        case DiscordChannelType.GUILD_VOICE:
            return "voice";
        case DiscordChannelType.GUILD_CATEGORY:
            return "category";
        case DiscordChannelType.GUILD_ANNOUNCEMENT:
            return "announcement";
        case DiscordChannelType.GUILD_STAGE_VOICE:
            return "stage";
        case DiscordChannelType.GUILD_FORUM:
            return "forum";
        case DiscordChannelType.GUILD_MEDIA:
            return "media";
        default:
            return "unknown";
    }
}

/**
 * Execute list channels operation
 */
export async function executeListChannels(
    client: DiscordClient,
    params: ListChannelsParams
): Promise<OperationResult> {
    try {
        let channels: DiscordChannel[];

        if (params.textOnly) {
            channels = await client.getGuildTextChannels(params.guildId);
        } else {
            channels = await client.getGuildChannels(params.guildId);
        }

        // Transform to simpler format
        const channelList = channels.map((channel) => ({
            id: channel.id,
            name: channel.name,
            type: channel.type,
            typeName: getChannelTypeName(channel.type as DiscordChannelType),
            position: channel.position,
            parentId: channel.parent_id,
            topic: channel.topic
        }));

        // Sort by position
        channelList.sort((a, b) => (a.position || 0) - (b.position || 0));

        return {
            success: true,
            data: {
                channels: channelList,
                count: channelList.length,
                guildId: params.guildId
            }
        };
    } catch (error) {
        logger.error(
            { component: "Discord", err: error, guildId: params.guildId },
            "Failed to list Discord channels"
        );
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list channels",
                retryable: true
            }
        };
    }
}
