import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { TwitterClient } from "../client/TwitterClient";
import { TweetTextSchema, TweetIdSchema } from "../schemas";
import type { CreateTweetResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Reply to Tweet operation schema
 */
export const replyToTweetSchema = z.object({
    tweet_id: TweetIdSchema.describe("The ID of the tweet to reply to"),
    text: TweetTextSchema.describe("The reply text (max 280 characters)")
});

export type ReplyToTweetParams = z.infer<typeof replyToTweetSchema>;

/**
 * Reply to Tweet operation definition
 */
export const replyToTweetOperation: OperationDefinition = (() => {
    try {
        return {
            id: "replyToTweet",
            name: "Reply to Tweet",
            description: "Post a reply to an existing tweet.",
            category: "tweets",
            inputSchema: replyToTweetSchema,
            retryable: false, // Don't retry to avoid duplicate replies
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Twitter", err: error },
            "Failed to create replyToTweetOperation"
        );
        throw new Error(
            `Failed to create replyToTweet operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute reply to tweet operation
 */
export async function executeReplyToTweet(
    client: TwitterClient,
    params: ReplyToTweetParams
): Promise<OperationResult> {
    try {
        const response = (await client.postTweet({
            text: params.text,
            reply: { in_reply_to_tweet_id: params.tweet_id }
        })) as CreateTweetResponse;

        return {
            success: true,
            data: {
                replyId: response.data.id,
                text: response.data.text,
                inReplyToTweetId: params.tweet_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to reply to tweet",
                retryable: false // Don't retry replies to avoid duplicates
            }
        };
    }
}
