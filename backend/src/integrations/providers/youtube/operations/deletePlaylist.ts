import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * Delete playlist input schema
 */
export const deletePlaylistSchema = z.object({
    playlistId: z.string().min(1).describe("The playlist ID to delete")
});

export type DeletePlaylistParams = z.infer<typeof deletePlaylistSchema>;

/**
 * Delete playlist operation definition
 */
export const deletePlaylistOperation: OperationDefinition = {
    id: "deletePlaylist",
    name: "Delete Playlist",
    description: "Delete a YouTube playlist permanently",
    category: "playlists",
    retryable: false,
    inputSchema: deletePlaylistSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            playlistId: {
                type: "string",
                description: "The playlist ID to delete"
            }
        },
        required: ["playlistId"]
    }
};

/**
 * Execute delete playlist operation
 */
export async function executeDeletePlaylist(
    client: YouTubeClient,
    params: DeletePlaylistParams
): Promise<OperationResult> {
    try {
        await client.deletePlaylist(params.playlistId);

        return {
            success: true,
            data: {
                playlistId: params.playlistId,
                deleted: true,
                message: "Playlist deleted successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete playlist",
                retryable: false
            }
        };
    }
}
