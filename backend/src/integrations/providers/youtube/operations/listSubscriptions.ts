import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * List subscriptions input schema
 */
export const listSubscriptionsSchema = z.object({
    mine: z
        .boolean()
        .optional()
        .default(true)
        .describe("Get the authenticated user's subscriptions"),
    channelId: z.string().optional().describe("Get subscriptions for a specific channel"),
    forChannelId: z.string().optional().describe("Check if subscribed to a specific channel"),
    maxResults: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .default(25)
        .describe("Maximum number of results"),
    pageToken: z.string().optional().describe("Token for pagination"),
    order: z
        .enum(["alphabetical", "relevance", "unread"])
        .optional()
        .describe("Sort order for results")
});

export type ListSubscriptionsParams = z.infer<typeof listSubscriptionsSchema>;

/**
 * List subscriptions operation definition
 */
export const listSubscriptionsOperation: OperationDefinition = {
    id: "listSubscriptions",
    name: "List Subscriptions",
    description: "List the authenticated user's YouTube channel subscriptions",
    category: "subscriptions",
    retryable: true,
    inputSchema: listSubscriptionsSchema
};

/**
 * Execute list subscriptions operation
 */
export async function executeListSubscriptions(
    client: YouTubeClient,
    params: ListSubscriptionsParams
): Promise<OperationResult> {
    try {
        const response = await client.getSubscriptions({
            mine: params.mine ?? true,
            channelId: params.channelId,
            forChannelId: params.forChannelId,
            maxResults: params.maxResults || 25,
            pageToken: params.pageToken,
            order: params.order
        });

        const subscriptions = response.items.map((sub) => ({
            id: sub.id,
            channelId: sub.snippet?.resourceId?.channelId,
            title: sub.snippet?.title,
            description: sub.snippet?.description,
            thumbnails: sub.snippet?.thumbnails,
            publishedAt: sub.snippet?.publishedAt,
            totalItemCount: sub.contentDetails?.totalItemCount,
            newItemCount: sub.contentDetails?.newItemCount
        }));

        return {
            success: true,
            data: {
                subscriptions,
                nextPageToken: response.nextPageToken,
                pageInfo: response.pageInfo
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list subscriptions",
                retryable: true
            }
        };
    }
}
