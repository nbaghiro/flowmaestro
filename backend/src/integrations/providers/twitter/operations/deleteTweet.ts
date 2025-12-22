import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { TwitterClient } from "../client/TwitterClient";
import { TweetIdSchema } from "../schemas";
import type { DeleteTweetResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Delete Tweet operation schema
 */
export const deleteTweetSchema = z.object({
    tweet_id: TweetIdSchema.describe("The ID of the tweet to delete")
});

export type DeleteTweetParams = z.infer<typeof deleteTweetSchema>;

/**
 * Delete Tweet operation definition
 */
export const deleteTweetOperation: OperationDefinition = (() => {
    try {
        return {
            id: "deleteTweet",
            name: "Delete Tweet",
            description: "Delete a tweet by its ID. Only the author can delete their own tweets.",
            category: "tweets",
            inputSchema: deleteTweetSchema,
            inputSchemaJSON: toJSONSchema(deleteTweetSchema),
            retryable: false, // Don't retry deletes
            timeout: 10000
        };
    } catch (error) {
        console.error("[Twitter] Failed to create deleteTweetOperation:", error);
        throw new Error(
            `Failed to create deleteTweet operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute delete tweet operation
 */
export async function executeDeleteTweet(
    client: TwitterClient,
    params: DeleteTweetParams
): Promise<OperationResult> {
    try {
        const response = (await client.deleteTweet(params.tweet_id)) as DeleteTweetResponse;

        return {
            success: true,
            data: {
                deleted: response.data.deleted,
                tweetId: params.tweet_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete tweet",
                retryable: false
            }
        };
    }
}
