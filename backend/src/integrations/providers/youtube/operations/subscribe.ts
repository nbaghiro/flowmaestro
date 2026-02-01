import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * Subscribe input schema
 */
export const subscribeSchema = z.object({
    channelId: z.string().min(1).describe("The channel ID to subscribe to")
});

export type SubscribeParams = z.infer<typeof subscribeSchema>;

/**
 * Subscribe operation definition
 */
export const subscribeOperation: OperationDefinition = {
    id: "subscribe",
    name: "Subscribe to Channel",
    description: "Subscribe to a YouTube channel",
    category: "subscriptions",
    retryable: false,
    inputSchema: subscribeSchema
};

/**
 * Execute subscribe operation
 */
export async function executeSubscribe(
    client: YouTubeClient,
    params: SubscribeParams
): Promise<OperationResult> {
    try {
        const subscription = await client.subscribe(params.channelId);

        return {
            success: true,
            data: {
                subscriptionId: subscription.id,
                channelId: subscription.snippet?.resourceId?.channelId,
                channelTitle: subscription.snippet?.title,
                subscribedAt: subscription.snippet?.publishedAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to subscribe to channel",
                retryable: false
            }
        };
    }
}
