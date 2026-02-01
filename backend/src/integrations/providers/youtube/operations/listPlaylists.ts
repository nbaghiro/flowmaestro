import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * List playlists input schema
 */
export const listPlaylistsSchema = z.object({
    ids: z.array(z.string()).optional().describe("Playlist IDs to retrieve"),
    channelId: z.string().optional().describe("Get playlists for a specific channel"),
    mine: z.boolean().optional().default(false).describe("Get the authenticated user's playlists"),
    maxResults: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .default(25)
        .describe("Maximum number of results"),
    pageToken: z.string().optional().describe("Token for pagination"),
    part: z
        .array(z.enum(["snippet", "status", "contentDetails", "player", "localizations"]))
        .optional()
        .default(["snippet", "status", "contentDetails"])
        .describe("Playlist resource parts to include")
});

export type ListPlaylistsParams = z.infer<typeof listPlaylistsSchema>;

/**
 * List playlists operation definition
 */
export const listPlaylistsOperation: OperationDefinition = {
    id: "listPlaylists",
    name: "List Playlists",
    description: "List playlists by IDs, channel, or authenticated user",
    category: "playlists",
    retryable: true,
    inputSchema: listPlaylistsSchema
};

/**
 * Execute list playlists operation
 */
export async function executeListPlaylists(
    client: YouTubeClient,
    params: ListPlaylistsParams
): Promise<OperationResult> {
    try {
        const response = await client.getPlaylists({
            id: params.ids,
            channelId: params.channelId,
            mine: params.mine,
            maxResults: params.maxResults || 25,
            pageToken: params.pageToken,
            part: params.part || ["snippet", "status", "contentDetails"]
        });

        const playlists = response.items.map((playlist) => ({
            id: playlist.id,
            title: playlist.snippet?.title,
            description: playlist.snippet?.description,
            channelId: playlist.snippet?.channelId,
            channelTitle: playlist.snippet?.channelTitle,
            publishedAt: playlist.snippet?.publishedAt,
            thumbnails: playlist.snippet?.thumbnails,
            privacyStatus: playlist.status?.privacyStatus,
            itemCount: playlist.contentDetails?.itemCount
        }));

        return {
            success: true,
            data: {
                playlists,
                nextPageToken: response.nextPageToken,
                pageInfo: response.pageInfo
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list playlists",
                retryable: true
            }
        };
    }
}
