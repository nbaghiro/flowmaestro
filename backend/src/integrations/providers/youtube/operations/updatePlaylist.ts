import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * Update playlist input schema
 */
export const updatePlaylistSchema = z.object({
    playlistId: z.string().min(1).describe("The playlist ID to update"),
    title: z.string().min(1).max(150).optional().describe("New playlist title"),
    description: z.string().max(5000).optional().describe("New playlist description"),
    privacyStatus: z
        .enum(["private", "public", "unlisted"])
        .optional()
        .describe("New privacy status"),
    defaultLanguage: z.string().optional().describe("New default language (BCP-47 code)")
});

export type UpdatePlaylistParams = z.infer<typeof updatePlaylistSchema>;

/**
 * Update playlist operation definition
 */
export const updatePlaylistOperation: OperationDefinition = {
    id: "updatePlaylist",
    name: "Update Playlist",
    description: "Update an existing YouTube playlist's title, description, or privacy",
    category: "playlists",
    retryable: false,
    inputSchema: updatePlaylistSchema
};

/**
 * Execute update playlist operation
 */
export async function executeUpdatePlaylist(
    client: YouTubeClient,
    params: UpdatePlaylistParams
): Promise<OperationResult> {
    try {
        const playlist = await client.updatePlaylist(params.playlistId, {
            title: params.title,
            description: params.description,
            privacyStatus: params.privacyStatus,
            defaultLanguage: params.defaultLanguage
        });

        return {
            success: true,
            data: {
                id: playlist.id,
                title: playlist.snippet?.title,
                description: playlist.snippet?.description,
                privacyStatus: playlist.status?.privacyStatus
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update playlist",
                retryable: false
            }
        };
    }
}
