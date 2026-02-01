import { z } from "zod";
import { createServiceLogger } from "../../../../core/logging";
import { RedditClient } from "../client/RedditClient";
import {
    SubredditNameSchema,
    PostSortSchema,
    TimeFilterSchema,
    LimitSchema,
    PaginationCursorSchema
} from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = createServiceLogger("Reddit");

/**
 * Get Posts operation schema
 */
export const getPostsSchema = z.object({
    subreddit: SubredditNameSchema,
    sort: PostSortSchema.optional(),
    time: TimeFilterSchema.optional(),
    limit: LimitSchema.optional(),
    after: PaginationCursorSchema.optional()
});

export type GetPostsParams = z.infer<typeof getPostsSchema>;

/**
 * Get Posts operation definition
 */
export const getPostsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getPosts",
            name: "Get Subreddit Posts",
            description:
                "Get posts from a subreddit. Supports sorting by hot, new, top, rising, or controversial.",
            category: "posts",
            inputSchema: getPostsSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ err: error }, "Failed to create getPostsOperation");
        throw new Error(
            `Failed to create getPosts operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get posts operation
 */
export async function executeGetPosts(
    client: RedditClient,
    params: GetPostsParams
): Promise<OperationResult> {
    try {
        const response = await client.getPosts(params.subreddit, params.sort || "hot", {
            limit: params.limit,
            after: params.after,
            t: params.time
        });

        const posts = response.data.children.map((child) => ({
            id: child.data.id,
            fullname: child.data.name,
            title: child.data.title,
            author: child.data.author,
            subreddit: child.data.subreddit,
            score: child.data.score,
            numComments: child.data.num_comments,
            url: child.data.url,
            permalink: `https://reddit.com${child.data.permalink}`,
            isSelf: child.data.is_self,
            selftext: child.data.selftext || undefined,
            thumbnail: child.data.thumbnail,
            createdUtc: child.data.created_utc,
            upvoteRatio: child.data.upvote_ratio,
            isNsfw: child.data.over_18,
            isSpoiler: child.data.spoiler,
            isStickied: child.data.stickied,
            flair: child.data.link_flair_text
        }));

        return {
            success: true,
            data: {
                posts,
                after: response.data.after,
                before: response.data.before,
                count: posts.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get posts",
                retryable: true
            }
        };
    }
}
