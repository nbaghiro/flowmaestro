import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * Remove from playlist input schema
 */
export const removeFromPlaylistSchema = z.object({
    playlistItemId: z.string().min(1).describe("The playlist item ID to remove (not the video ID)")
});

export type RemoveFromPlaylistParams = z.infer<typeof removeFromPlaylistSchema>;

/**
 * Remove from playlist operation definition
 */
export const removeFromPlaylistOperation: OperationDefinition = {
    id: "removeFromPlaylist",
    name: "Remove Video from Playlist",
    description:
        "Remove a video from a YouTube playlist by its playlist item ID (use listPlaylistItems to get the ID)",
    category: "playlists",
    retryable: false,
    inputSchema: removeFromPlaylistSchema
};

/**
 * Execute remove from playlist operation
 */
export async function executeRemoveFromPlaylist(
    client: YouTubeClient,
    params: RemoveFromPlaylistParams
): Promise<OperationResult> {
    try {
        await client.removeFromPlaylist(params.playlistItemId);

        return {
            success: true,
            data: {
                playlistItemId: params.playlistItemId,
                removed: true,
                message: "Video removed from playlist successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to remove video from playlist",
                retryable: false
            }
        };
    }
}
