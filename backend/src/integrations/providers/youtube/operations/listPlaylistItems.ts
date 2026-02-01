import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * List playlist items input schema
 */
export const listPlaylistItemsSchema = z.object({
    playlistId: z.string().min(1).describe("The playlist ID to get items from"),
    maxResults: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .default(25)
        .describe("Maximum number of results"),
    pageToken: z.string().optional().describe("Token for pagination"),
    videoId: z.string().optional().describe("Filter by specific video ID in the playlist"),
    part: z
        .array(z.enum(["snippet", "contentDetails", "status"]))
        .optional()
        .default(["snippet", "contentDetails"])
        .describe("Playlist item resource parts to include")
});

export type ListPlaylistItemsParams = z.infer<typeof listPlaylistItemsSchema>;

/**
 * List playlist items operation definition
 */
export const listPlaylistItemsOperation: OperationDefinition = {
    id: "listPlaylistItems",
    name: "List Playlist Items",
    description: "List videos in a YouTube playlist with pagination support",
    category: "playlists",
    retryable: true,
    inputSchema: listPlaylistItemsSchema
};

/**
 * Execute list playlist items operation
 */
export async function executeListPlaylistItems(
    client: YouTubeClient,
    params: ListPlaylistItemsParams
): Promise<OperationResult> {
    try {
        const response = await client.getPlaylistItems({
            playlistId: params.playlistId,
            maxResults: params.maxResults || 25,
            pageToken: params.pageToken,
            videoId: params.videoId,
            part: params.part || ["snippet", "contentDetails"]
        });

        const items = response.items.map((item) => ({
            id: item.id,
            videoId: item.snippet?.resourceId?.videoId || item.contentDetails?.videoId,
            title: item.snippet?.title,
            description: item.snippet?.description,
            position: item.snippet?.position,
            channelId: item.snippet?.channelId,
            channelTitle: item.snippet?.channelTitle,
            thumbnails: item.snippet?.thumbnails,
            videoOwnerChannelTitle: item.snippet?.videoOwnerChannelTitle,
            videoOwnerChannelId: item.snippet?.videoOwnerChannelId,
            publishedAt: item.snippet?.publishedAt,
            videoPublishedAt: item.contentDetails?.videoPublishedAt,
            privacyStatus: item.status?.privacyStatus
        }));

        return {
            success: true,
            data: {
                items,
                nextPageToken: response.nextPageToken,
                pageInfo: response.pageInfo
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list playlist items",
                retryable: true
            }
        };
    }
}
