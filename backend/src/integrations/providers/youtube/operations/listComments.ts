import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * List comments input schema
 */
export const listCommentsSchema = z.object({
    videoId: z.string().optional().describe("Get comments for a specific video"),
    channelId: z.string().optional().describe("Get comments for a channel's videos"),
    maxResults: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe("Maximum number of comment threads to return"),
    pageToken: z.string().optional().describe("Token for pagination"),
    order: z
        .enum(["time", "relevance"])
        .optional()
        .default("time")
        .describe("Sort order (time or relevance)"),
    searchTerms: z.string().optional().describe("Search for comments containing specific terms"),
    textFormat: z
        .enum(["html", "plainText"])
        .optional()
        .default("plainText")
        .describe("Format of the comment text")
});

export type ListCommentsParams = z.infer<typeof listCommentsSchema>;

/**
 * List comments operation definition
 */
export const listCommentsOperation: OperationDefinition = {
    id: "listComments",
    name: "List Comments",
    description: "List comment threads for a video or channel with optional search and sorting",
    category: "comments",
    retryable: true,
    inputSchema: listCommentsSchema
};

/**
 * Execute list comments operation
 */
export async function executeListComments(
    client: YouTubeClient,
    params: ListCommentsParams
): Promise<OperationResult> {
    try {
        if (!params.videoId && !params.channelId) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Must specify either videoId or channelId",
                    retryable: false
                }
            };
        }

        const response = await client.getCommentThreads({
            videoId: params.videoId,
            channelId: params.channelId,
            maxResults: params.maxResults || 25,
            pageToken: params.pageToken,
            order: params.order || "time",
            searchTerms: params.searchTerms,
            textFormat: params.textFormat || "plainText"
        });

        const comments = response.items.map((thread) => ({
            threadId: thread.id,
            videoId: thread.snippet.videoId,
            channelId: thread.snippet.channelId,
            topLevelComment: {
                id: thread.snippet.topLevelComment.id,
                authorDisplayName: thread.snippet.topLevelComment.snippet.authorDisplayName,
                authorProfileImageUrl: thread.snippet.topLevelComment.snippet.authorProfileImageUrl,
                authorChannelUrl: thread.snippet.topLevelComment.snippet.authorChannelUrl,
                text: thread.snippet.topLevelComment.snippet.textDisplay,
                likeCount: thread.snippet.topLevelComment.snippet.likeCount,
                publishedAt: thread.snippet.topLevelComment.snippet.publishedAt,
                updatedAt: thread.snippet.topLevelComment.snippet.updatedAt
            },
            totalReplyCount: thread.snippet.totalReplyCount,
            canReply: thread.snippet.canReply,
            isPublic: thread.snippet.isPublic,
            replies: thread.replies?.comments?.map((reply) => ({
                id: reply.id,
                authorDisplayName: reply.snippet.authorDisplayName,
                authorProfileImageUrl: reply.snippet.authorProfileImageUrl,
                text: reply.snippet.textDisplay,
                likeCount: reply.snippet.likeCount,
                publishedAt: reply.snippet.publishedAt
            }))
        }));

        return {
            success: true,
            data: {
                comments,
                nextPageToken: response.nextPageToken,
                pageInfo: response.pageInfo
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list comments",
                retryable: true
            }
        };
    }
}
