import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { TwitterClient } from "../client/TwitterClient";
import { SearchQuerySchema, MaxResultsSchema, PaginationTokenSchema } from "../schemas";
import type { TweetsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Search Tweets operation schema
 */
export const searchTweetsSchema = z.object({
    query: SearchQuerySchema.describe(
        "Search query. Supports operators like 'from:username', 'to:username', '#hashtag', etc."
    ),
    max_results: MaxResultsSchema.default(10),
    next_token: PaginationTokenSchema.describe("Token for getting the next page of results")
});

export type SearchTweetsParams = z.infer<typeof searchTweetsSchema>;

/**
 * Search Tweets operation definition
 */
export const searchTweetsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "searchTweets",
            name: "Search Tweets",
            description:
                "Search for tweets from the last 7 days. Supports advanced search operators.",
            category: "tweets",
            inputSchema: searchTweetsSchema,
            inputSchemaJSON: toJSONSchema(searchTweetsSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Twitter", err: error },
            "Failed to create searchTweetsOperation"
        );
        throw new Error(
            `Failed to create searchTweets operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute search tweets operation
 */
export async function executeSearchTweets(
    client: TwitterClient,
    params: SearchTweetsParams
): Promise<OperationResult> {
    try {
        const response = (await client.searchRecentTweets({
            query: params.query,
            max_results: params.max_results || 10,
            next_token: params.next_token,
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
                message: error instanceof Error ? error.message : "Failed to search tweets",
                retryable: true
            }
        };
    }
}
