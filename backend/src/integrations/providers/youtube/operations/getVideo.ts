import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * Get video input schema
 */
export const getVideoSchema = z.object({
    videoId: z.string().min(1).describe("The YouTube video ID"),
    part: z
        .array(
            z.enum([
                "snippet",
                "contentDetails",
                "status",
                "statistics",
                "player",
                "topicDetails",
                "recordingDetails",
                "liveStreamingDetails"
            ])
        )
        .optional()
        .default(["snippet", "contentDetails", "statistics", "status"])
        .describe("Video resource parts to include")
});

export type GetVideoParams = z.infer<typeof getVideoSchema>;

/**
 * Get video operation definition
 */
export const getVideoOperation: OperationDefinition = {
    id: "getVideo",
    name: "Get Video Details",
    description: "Get detailed information about a specific YouTube video by ID",
    category: "videos",
    retryable: true,
    inputSchema: getVideoSchema
};

/**
 * Execute get video operation
 */
export async function executeGetVideo(
    client: YouTubeClient,
    params: GetVideoParams
): Promise<OperationResult> {
    try {
        const response = await client.getVideos({
            id: params.videoId,
            part: params.part || ["snippet", "contentDetails", "statistics", "status"]
        });

        if (!response.items || response.items.length === 0) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Video not found or is private",
                    retryable: false
                }
            };
        }

        const video = response.items[0];

        return {
            success: true,
            data: {
                id: video.id,
                title: video.snippet?.title,
                description: video.snippet?.description,
                channelId: video.snippet?.channelId,
                channelTitle: video.snippet?.channelTitle,
                publishedAt: video.snippet?.publishedAt,
                thumbnails: video.snippet?.thumbnails,
                tags: video.snippet?.tags,
                categoryId: video.snippet?.categoryId,
                duration: video.contentDetails?.duration,
                dimension: video.contentDetails?.dimension,
                definition: video.contentDetails?.definition,
                caption: video.contentDetails?.caption,
                viewCount: video.statistics?.viewCount,
                likeCount: video.statistics?.likeCount,
                commentCount: video.statistics?.commentCount,
                privacyStatus: video.status?.privacyStatus,
                uploadStatus: video.status?.uploadStatus,
                embeddable: video.status?.embeddable,
                madeForKids: video.status?.madeForKids
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get video",
                retryable: true
            }
        };
    }
}
