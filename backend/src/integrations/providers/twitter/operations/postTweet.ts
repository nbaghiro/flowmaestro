import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { TwitterClient } from "../client/TwitterClient";
import { TweetTextSchema, TweetIdSchema } from "../schemas";
import type { CreateTweetResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Post Tweet operation schema
 */
export const postTweetSchema = z.object({
    text: TweetTextSchema,
    reply_to_tweet_id: TweetIdSchema.optional().describe("Tweet ID to reply to (optional)"),
    quote_tweet_id: TweetIdSchema.optional().describe("Tweet ID to quote (optional)")
});

export type PostTweetParams = z.infer<typeof postTweetSchema>;

/**
 * Post Tweet operation definition
 */
export const postTweetOperation: OperationDefinition = (() => {
    try {
        return {
            id: "postTweet",
            name: "Post Tweet",
            description: "Create a new tweet on X. Can optionally reply to or quote another tweet.",
            category: "tweets",
            inputSchema: postTweetSchema,
            retryable: false, // Don't retry to avoid duplicate tweets
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Twitter", err: error }, "Failed to create postTweetOperation");
        throw new Error(
            `Failed to create postTweet operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute post tweet operation
 */
export async function executePostTweet(
    client: TwitterClient,
    params: PostTweetParams
): Promise<OperationResult> {
    try {
        const requestBody: {
            text: string;
            reply?: { in_reply_to_tweet_id: string };
            quote_tweet_id?: string;
        } = {
            text: params.text
        };

        if (params.reply_to_tweet_id) {
            requestBody.reply = { in_reply_to_tweet_id: params.reply_to_tweet_id };
        }

        if (params.quote_tweet_id) {
            requestBody.quote_tweet_id = params.quote_tweet_id;
        }

        const response = (await client.postTweet(requestBody)) as CreateTweetResponse;

        return {
            success: true,
            data: {
                tweetId: response.data.id,
                text: response.data.text
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to post tweet",
                retryable: false // Don't retry tweets to avoid duplicates
            }
        };
    }
}
