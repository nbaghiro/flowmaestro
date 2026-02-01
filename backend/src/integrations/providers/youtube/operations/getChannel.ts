import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * Get channel input schema
 */
export const getChannelSchema = z.object({
    channelId: z.string().optional().describe("The YouTube channel ID"),
    forUsername: z.string().optional().describe("Get channel by legacy username"),
    mine: z.boolean().optional().default(false).describe("Get the authenticated user's channel"),
    part: z
        .array(z.enum(["snippet", "statistics", "contentDetails", "brandingSettings", "status"]))
        .optional()
        .default(["snippet", "statistics"])
        .describe("Channel resource parts to include")
});

export type GetChannelParams = z.infer<typeof getChannelSchema>;

/**
 * Get channel operation definition
 */
export const getChannelOperation: OperationDefinition = {
    id: "getChannel",
    name: "Get Channel Details",
    description:
        "Get detailed information about a YouTube channel by ID, username, or authenticated user",
    category: "channels",
    retryable: true,
    inputSchema: getChannelSchema
};

/**
 * Execute get channel operation
 */
export async function executeGetChannel(
    client: YouTubeClient,
    params: GetChannelParams
): Promise<OperationResult> {
    try {
        // Must specify at least one identifier
        if (!params.channelId && !params.forUsername && !params.mine) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Must specify channelId, forUsername, or mine=true",
                    retryable: false
                }
            };
        }

        const response = await client.getChannels({
            id: params.channelId,
            forUsername: params.forUsername,
            mine: params.mine,
            part: params.part || ["snippet", "statistics"]
        });

        if (!response.items || response.items.length === 0) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Channel not found",
                    retryable: false
                }
            };
        }

        const channel = response.items[0];

        return {
            success: true,
            data: {
                id: channel.id,
                title: channel.snippet?.title,
                description: channel.snippet?.description,
                customUrl: channel.snippet?.customUrl,
                publishedAt: channel.snippet?.publishedAt,
                thumbnails: channel.snippet?.thumbnails,
                country: channel.snippet?.country,
                viewCount: channel.statistics?.viewCount,
                subscriberCount: channel.statistics?.subscriberCount,
                hiddenSubscriberCount: channel.statistics?.hiddenSubscriberCount,
                videoCount: channel.statistics?.videoCount
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get channel",
                retryable: true
            }
        };
    }
}
