import { z } from "zod";
import { createServiceLogger } from "../../../../core/logging";
import { RedditClient } from "../client/RedditClient";
import { SubredditNameSchema, PostTitleSchema, PostTextSchema, LinkUrlSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = createServiceLogger("Reddit");

/**
 * Submit Text Post operation schema
 */
export const submitTextPostSchema = z.object({
    subreddit: SubredditNameSchema,
    title: PostTitleSchema,
    text: PostTextSchema,
    flairId: z.string().optional().describe("Flair ID to apply to the post"),
    flairText: z.string().optional().describe("Flair text to apply to the post"),
    nsfw: z.boolean().optional().describe("Mark post as NSFW"),
    spoiler: z.boolean().optional().describe("Mark post as spoiler"),
    sendReplies: z.boolean().optional().describe("Send inbox replies for post comments")
});

export type SubmitTextPostParams = z.infer<typeof submitTextPostSchema>;

/**
 * Submit Link Post operation schema
 */
export const submitLinkPostSchema = z.object({
    subreddit: SubredditNameSchema,
    title: PostTitleSchema,
    url: LinkUrlSchema,
    flairId: z.string().optional().describe("Flair ID to apply to the post"),
    flairText: z.string().optional().describe("Flair text to apply to the post"),
    nsfw: z.boolean().optional().describe("Mark post as NSFW"),
    spoiler: z.boolean().optional().describe("Mark post as spoiler"),
    sendReplies: z.boolean().optional().describe("Send inbox replies for post comments"),
    resubmit: z.boolean().optional().describe("Allow resubmitting the same URL")
});

export type SubmitLinkPostParams = z.infer<typeof submitLinkPostSchema>;

/**
 * Submit Text Post operation definition
 */
export const submitTextPostOperation: OperationDefinition = (() => {
    try {
        return {
            id: "submitTextPost",
            name: "Submit Text Post",
            description: "Submit a new text (self) post to a subreddit.",
            category: "posts",
            inputSchema: submitTextPostSchema,
            retryable: false, // Don't retry to avoid duplicate posts
            timeout: 15000
        };
    } catch (error) {
        logger.error({ err: error }, "Failed to create submitTextPostOperation");
        throw new Error(
            `Failed to create submitTextPost operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Submit Link Post operation definition
 */
export const submitLinkPostOperation: OperationDefinition = (() => {
    try {
        return {
            id: "submitLinkPost",
            name: "Submit Link Post",
            description: "Submit a new link post to a subreddit.",
            category: "posts",
            inputSchema: submitLinkPostSchema,
            retryable: false, // Don't retry to avoid duplicate posts
            timeout: 15000
        };
    } catch (error) {
        logger.error({ err: error }, "Failed to create submitLinkPostOperation");
        throw new Error(
            `Failed to create submitLinkPost operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute submit text post operation
 */
export async function executeSubmitTextPost(
    client: RedditClient,
    params: SubmitTextPostParams
): Promise<OperationResult> {
    try {
        const response = await client.submitTextPost({
            subreddit: params.subreddit,
            title: params.title,
            text: params.text,
            flair_id: params.flairId,
            flair_text: params.flairText,
            nsfw: params.nsfw,
            spoiler: params.spoiler,
            sendreplies: params.sendReplies
        });

        // Check for Reddit API errors
        if (response.json.errors && response.json.errors.length > 0) {
            const errorMessages = response.json.errors.map((e) => e.join(": ")).join(", ");
            return {
                success: false,
                error: {
                    type: "validation",
                    message: `Reddit API error: ${errorMessages}`,
                    retryable: false
                }
            };
        }

        const data = response.json.data;
        if (!data) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "No data returned from Reddit API",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: {
                postId: data.id,
                fullname: data.name,
                url: data.url,
                permalink: data.url
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to submit text post",
                retryable: false
            }
        };
    }
}

/**
 * Execute submit link post operation
 */
export async function executeSubmitLinkPost(
    client: RedditClient,
    params: SubmitLinkPostParams
): Promise<OperationResult> {
    try {
        const response = await client.submitLinkPost({
            subreddit: params.subreddit,
            title: params.title,
            url: params.url,
            flair_id: params.flairId,
            flair_text: params.flairText,
            nsfw: params.nsfw,
            spoiler: params.spoiler,
            sendreplies: params.sendReplies,
            resubmit: params.resubmit
        });

        // Check for Reddit API errors
        if (response.json.errors && response.json.errors.length > 0) {
            const errorMessages = response.json.errors.map((e) => e.join(": ")).join(", ");
            return {
                success: false,
                error: {
                    type: "validation",
                    message: `Reddit API error: ${errorMessages}`,
                    retryable: false
                }
            };
        }

        const data = response.json.data;
        if (!data) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "No data returned from Reddit API",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: {
                postId: data.id,
                fullname: data.name,
                url: data.url,
                permalink: data.url
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to submit link post",
                retryable: false
            }
        };
    }
}
