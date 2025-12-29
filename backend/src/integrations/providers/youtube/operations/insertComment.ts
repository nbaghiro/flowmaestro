import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * Insert comment input schema
 */
export const insertCommentSchema = z.object({
    videoId: z.string().min(1).describe("Video ID to comment on"),
    text: z.string().min(1).max(10000).describe("Comment text")
});

export type InsertCommentParams = z.infer<typeof insertCommentSchema>;

/**
 * Insert comment operation definition
 */
export const insertCommentOperation: OperationDefinition = {
    id: "insertComment",
    name: "Post Comment",
    description: "Post a new comment on a YouTube video",
    category: "comments",
    retryable: false,
    inputSchema: insertCommentSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            videoId: {
                type: "string",
                description: "Video ID to comment on"
            },
            text: {
                type: "string",
                description: "Comment text",
                maxLength: 10000
            }
        },
        required: ["videoId", "text"]
    }
};

/**
 * Execute insert comment operation
 */
export async function executeInsertComment(
    client: YouTubeClient,
    params: InsertCommentParams
): Promise<OperationResult> {
    try {
        const thread = await client.insertComment({
            videoId: params.videoId,
            text: params.text
        });

        return {
            success: true,
            data: {
                threadId: thread.id,
                commentId: thread.snippet.topLevelComment.id,
                videoId: thread.snippet.videoId,
                text: thread.snippet.topLevelComment.snippet.textDisplay,
                authorDisplayName: thread.snippet.topLevelComment.snippet.authorDisplayName,
                publishedAt: thread.snippet.topLevelComment.snippet.publishedAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to post comment",
                retryable: false
            }
        };
    }
}
