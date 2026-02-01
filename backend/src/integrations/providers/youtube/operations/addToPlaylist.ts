import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * Add to playlist input schema
 */
export const addToPlaylistSchema = z.object({
    playlistId: z.string().min(1).describe("The playlist ID to add the video to"),
    videoId: z.string().min(1).describe("The video ID to add"),
    position: z.number().min(0).optional().describe("Position in the playlist (0-based)")
});

export type AddToPlaylistParams = z.infer<typeof addToPlaylistSchema>;

/**
 * Add to playlist operation definition
 */
export const addToPlaylistOperation: OperationDefinition = {
    id: "addToPlaylist",
    name: "Add Video to Playlist",
    description: "Add a video to a YouTube playlist at an optional position",
    category: "playlists",
    retryable: false,
    inputSchema: addToPlaylistSchema
};

/**
 * Execute add to playlist operation
 */
export async function executeAddToPlaylist(
    client: YouTubeClient,
    params: AddToPlaylistParams
): Promise<OperationResult> {
    try {
        const item = await client.addToPlaylist({
            playlistId: params.playlistId,
            videoId: params.videoId,
            position: params.position
        });

        return {
            success: true,
            data: {
                playlistItemId: item.id,
                playlistId: params.playlistId,
                videoId: params.videoId,
                position: item.snippet?.position,
                title: item.snippet?.title
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add video to playlist",
                retryable: false
            }
        };
    }
}
