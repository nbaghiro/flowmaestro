import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * Create playlist input schema
 */
export const createPlaylistSchema = z.object({
    title: z.string().min(1).max(150).describe("Playlist title"),
    description: z.string().max(5000).optional().describe("Playlist description"),
    privacyStatus: z
        .enum(["private", "public", "unlisted"])
        .optional()
        .default("private")
        .describe("Privacy status of the playlist"),
    defaultLanguage: z.string().optional().describe("Default language (BCP-47 code)"),
    tags: z.array(z.string()).optional().describe("Tags for the playlist")
});

export type CreatePlaylistParams = z.infer<typeof createPlaylistSchema>;

/**
 * Create playlist operation definition
 */
export const createPlaylistOperation: OperationDefinition = {
    id: "createPlaylist",
    name: "Create Playlist",
    description: "Create a new YouTube playlist",
    category: "playlists",
    retryable: false,
    inputSchema: createPlaylistSchema
};

/**
 * Execute create playlist operation
 */
export async function executeCreatePlaylist(
    client: YouTubeClient,
    params: CreatePlaylistParams
): Promise<OperationResult> {
    try {
        const playlist = await client.createPlaylist({
            title: params.title,
            description: params.description,
            privacyStatus: params.privacyStatus || "private",
            defaultLanguage: params.defaultLanguage,
            tags: params.tags
        });

        return {
            success: true,
            data: {
                id: playlist.id,
                title: playlist.snippet?.title,
                description: playlist.snippet?.description,
                channelId: playlist.snippet?.channelId,
                channelTitle: playlist.snippet?.channelTitle,
                privacyStatus: playlist.status?.privacyStatus,
                publishedAt: playlist.snippet?.publishedAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create playlist",
                retryable: false
            }
        };
    }
}
