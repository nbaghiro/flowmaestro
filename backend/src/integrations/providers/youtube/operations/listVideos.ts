import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * List videos input schema
 */
export const listVideosSchema = z.object({
    ids: z.array(z.string()).optional().describe("Video IDs to retrieve (up to 50)"),
    chart: z.enum(["mostPopular"]).optional().describe("Chart to retrieve (mostPopular)"),
    myRating: z.enum(["like", "dislike"]).optional().describe("Filter by user's rating"),
    maxResults: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .default(25)
        .describe("Maximum number of results"),
    pageToken: z.string().optional().describe("Token for pagination"),
    regionCode: z.string().length(2).optional().describe("ISO 3166-1 alpha-2 country code"),
    videoCategoryId: z.string().optional().describe("Filter by video category ID"),
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
        .default(["snippet", "contentDetails", "statistics"])
        .describe("Video resource parts to include")
});

export type ListVideosParams = z.infer<typeof listVideosSchema>;

/**
 * List videos operation definition
 */
export const listVideosOperation: OperationDefinition = {
    id: "listVideos",
    name: "List Videos",
    description: "List videos by IDs, popular chart, or user rating with optional filters",
    category: "videos",
    retryable: true,
    inputSchema: listVideosSchema
};

/**
 * Execute list videos operation
 */
export async function executeListVideos(
    client: YouTubeClient,
    params: ListVideosParams
): Promise<OperationResult> {
    try {
        const response = await client.getVideos({
            id: params.ids,
            chart: params.chart,
            myRating: params.myRating,
            maxResults: params.maxResults || 25,
            pageToken: params.pageToken,
            regionCode: params.regionCode,
            videoCategoryId: params.videoCategoryId,
            part: params.part || ["snippet", "contentDetails", "statistics"]
        });

        const videos = response.items.map((video) => ({
            id: video.id,
            title: video.snippet?.title,
            description: video.snippet?.description,
            channelId: video.snippet?.channelId,
            channelTitle: video.snippet?.channelTitle,
            publishedAt: video.snippet?.publishedAt,
            thumbnails: video.snippet?.thumbnails,
            duration: video.contentDetails?.duration,
            definition: video.contentDetails?.definition,
            viewCount: video.statistics?.viewCount,
            likeCount: video.statistics?.likeCount,
            commentCount: video.statistics?.commentCount
        }));

        return {
            success: true,
            data: {
                videos,
                nextPageToken: response.nextPageToken,
                pageInfo: response.pageInfo
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list videos",
                retryable: true
            }
        };
    }
}
