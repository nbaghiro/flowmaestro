import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { TwitterClient } from "../client/TwitterClient";
import { UserIdSchema, MaxResultsSchema, PaginationTokenSchema } from "../schemas";
import type { TweetsResponse, XAPIResponse, XUser } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get User Timeline operation schema
 */
export const getUserTimelineSchema = z.object({
    user_id: UserIdSchema.optional().describe(
        "User ID to get tweets for. If not provided, uses the authenticated user."
    ),
    max_results: MaxResultsSchema,
    pagination_token: PaginationTokenSchema
});

export type GetUserTimelineParams = z.infer<typeof getUserTimelineSchema>;

/**
 * Get User Timeline operation definition
 */
export const getUserTimelineOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getUserTimeline",
            name: "Get User Timeline",
            description:
                "Get recent tweets from a user. Returns the authenticated user's tweets if no user_id is provided.",
            category: "tweets",
            inputSchema: getUserTimelineSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Twitter", err: error },
            "Failed to create getUserTimelineOperation"
        );
        throw new Error(
            `Failed to create getUserTimeline operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get user timeline operation
 */
export async function executeGetUserTimeline(
    client: TwitterClient,
    params: GetUserTimelineParams
): Promise<OperationResult> {
    try {
        let userId = params.user_id;

        // If no user_id provided, get the authenticated user's ID
        if (!userId) {
            const meResponse = (await client.getMe(["id"])) as XAPIResponse<XUser>;
            if (!meResponse.data?.id) {
                return {
                    success: false,
                    error: {
                        type: "server_error",
                        message: "Unable to get authenticated user ID",
                        retryable: true
                    }
                };
            }
            userId = meResponse.data.id;
        }

        const response = (await client.getUserTweets(userId, {
            max_results: params.max_results || 10,
            pagination_token: params.pagination_token,
            "tweet.fields": "id,text,author_id,created_at,public_metrics,conversation_id"
        })) as TweetsResponse;

        const tweets = response.data || [];

        return {
            success: true,
            data: {
                tweets: tweets.map((tweet) => ({
                    id: tweet.id,
                    text: tweet.text,
                    authorId: tweet.author_id,
                    createdAt: tweet.created_at,
                    conversationId: tweet.conversation_id,
                    metrics: tweet.public_metrics
                })),
                meta: {
                    resultCount: response.meta?.result_count || tweets.length,
                    nextToken: response.meta?.next_token,
                    newestId: response.meta?.newest_id,
                    oldestId: response.meta?.oldest_id
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get user timeline",
                retryable: true
            }
        };
    }
}
