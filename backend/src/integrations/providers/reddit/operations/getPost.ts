import { z } from "zod";
import { createServiceLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { RedditClient } from "../client/RedditClient";
import { SubredditNameSchema, PostIdSchema, CommentSortSchema, LimitSchema } from "../schemas";
import type { RedditComment } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = createServiceLogger("Reddit");

/**
 * Get Post operation schema
 */
export const getPostSchema = z.object({
    subreddit: SubredditNameSchema,
    postId: PostIdSchema,
    commentSort: CommentSortSchema.optional(),
    commentLimit: LimitSchema.optional(),
    commentDepth: z.number().int().min(0).max(10).optional().describe("Maximum comment depth")
});

export type GetPostParams = z.infer<typeof getPostSchema>;

/**
 * Get Post operation definition
 */
export const getPostOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getPost",
            name: "Get Post with Comments",
            description: "Get a single post with its comments from a subreddit.",
            category: "posts",
            inputSchema: getPostSchema,
            inputSchemaJSON: toJSONSchema(getPostSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ err: error }, "Failed to create getPostOperation");
        throw new Error(
            `Failed to create getPost operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Flatten comments tree into array
 */
function flattenComments(
    comments: Array<{ kind: string; data: RedditComment }>,
    depth = 0
): Array<{
    id: string;
    fullname: string;
    body: string;
    author: string;
    score: number;
    createdUtc: number;
    parentId: string;
    depth: number;
    isSubmitter: boolean;
}> {
    const result: Array<{
        id: string;
        fullname: string;
        body: string;
        author: string;
        score: number;
        createdUtc: number;
        parentId: string;
        depth: number;
        isSubmitter: boolean;
    }> = [];

    for (const child of comments) {
        if (child.kind !== "t1") continue; // Skip non-comment items (like "more" links)

        const comment = child.data;
        result.push({
            id: comment.id,
            fullname: comment.name,
            body: comment.body,
            author: comment.author,
            score: comment.score,
            createdUtc: comment.created_utc,
            parentId: comment.parent_id,
            depth,
            isSubmitter: comment.is_submitter
        });

        // Recursively flatten replies
        if (comment.replies && typeof comment.replies === "object" && comment.replies.data) {
            result.push(...flattenComments(comment.replies.data.children, depth + 1));
        }
    }

    return result;
}

/**
 * Execute get post operation
 */
export async function executeGetPost(
    client: RedditClient,
    params: GetPostParams
): Promise<OperationResult> {
    try {
        const [postListing, commentsListing] = await client.getPost(
            params.subreddit,
            params.postId,
            {
                sort: params.commentSort,
                limit: params.commentLimit,
                depth: params.commentDepth
            }
        );

        const postData = postListing.data.children[0]?.data;
        if (!postData) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Post not found",
                    retryable: false
                }
            };
        }

        const post = {
            id: postData.id,
            fullname: postData.name,
            title: postData.title,
            author: postData.author,
            subreddit: postData.subreddit,
            score: postData.score,
            numComments: postData.num_comments,
            url: postData.url,
            permalink: `https://reddit.com${postData.permalink}`,
            isSelf: postData.is_self,
            selftext: postData.selftext || undefined,
            selftextHtml: postData.selftext_html || undefined,
            createdUtc: postData.created_utc,
            upvoteRatio: postData.upvote_ratio,
            isNsfw: postData.over_18,
            isSpoiler: postData.spoiler,
            isStickied: postData.stickied,
            isLocked: postData.locked,
            isArchived: postData.archived,
            flair: postData.link_flair_text
        };

        const comments = flattenComments(commentsListing.data.children);

        return {
            success: true,
            data: {
                post,
                comments,
                commentCount: comments.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get post",
                retryable: true
            }
        };
    }
}
