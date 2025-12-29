import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";
import type {
    RedditListingResponse,
    RedditPost,
    RedditComment,
    RedditUser,
    SubmitPostResponse,
    SubmitCommentResponse,
    PostSortType,
    TimeFilter,
    VoteDirection
} from "../operations/types";

export interface RedditClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * Reddit API Client with connection pooling and error handling
 *
 * Key features:
 * - Handles Reddit API response format (Listing wrapper)
 * - Required User-Agent header for Reddit API
 * - Automatic retry with exponential backoff for rate limits
 * - Connection pooling for efficient HTTP connections
 *
 * Note: All requests must go to oauth.reddit.com (not www.reddit.com)
 */
export class RedditClient extends BaseAPIClient {
    private accessToken: string;
    private static readonly USER_AGENT = "FlowMaestro/1.0 (by /u/flowmaestro)";

    constructor(config: RedditClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://oauth.reddit.com",
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential"
            },
            connectionPool: {
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAlive: true
            }
        };

        super(clientConfig);

        this.accessToken = config.accessToken;

        // Add request interceptor for auth header and User-Agent
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            reqConfig.headers["User-Agent"] = RedditClient.USER_AGENT;
            return reqConfig;
        });
    }

    /**
     * Handle Reddit API-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as Record<string, unknown>;

            // Handle authentication errors
            if (status === 401) {
                throw new Error("Reddit authentication failed. Please reconnect your account.");
            }

            // Handle forbidden (scope issues)
            if (status === 403) {
                throw new Error(
                    "Access forbidden. Check that your Reddit app has the required permissions."
                );
            }

            // Handle rate limiting
            if (status === 429) {
                const resetAfter = error.response.headers["x-ratelimit-reset"];
                throw new Error(
                    `Rate limited by Reddit. ${resetAfter ? `Try again in ${resetAfter} seconds.` : "Please wait before retrying."}`
                );
            }

            // Handle Reddit API errors
            if (data.error) {
                const errorCode = data.error as number;
                const message = (data.message as string) || "Reddit API error";
                throw new Error(`Reddit API error ${errorCode}: ${message}`);
            }
        }

        throw error;
    }

    /**
     * Get posts from a subreddit
     */
    async getPosts(
        subreddit: string,
        sort: PostSortType = "hot",
        options?: {
            limit?: number;
            after?: string;
            before?: string;
            t?: TimeFilter; // For top/controversial
        }
    ): Promise<RedditListingResponse<RedditPost>> {
        const params: Record<string, unknown> = {
            limit: options?.limit || 25,
            raw_json: 1 // Get unescaped HTML
        };

        if (options?.after) params.after = options.after;
        if (options?.before) params.before = options.before;
        if (options?.t && (sort === "top" || sort === "controversial")) {
            params.t = options.t;
        }

        return this.get(`/r/${subreddit}/${sort}`, params);
    }

    /**
     * Get a single post with comments
     */
    async getPost(
        subreddit: string,
        postId: string,
        options?: {
            sort?: "confidence" | "top" | "new" | "controversial" | "old" | "qa";
            limit?: number;
            depth?: number;
        }
    ): Promise<[RedditListingResponse<RedditPost>, RedditListingResponse<RedditComment>]> {
        const params: Record<string, unknown> = {
            raw_json: 1
        };

        if (options?.sort) params.sort = options.sort;
        if (options?.limit) params.limit = options.limit;
        if (options?.depth) params.depth = options.depth;

        // Reddit returns an array: [post listing, comments listing]
        return this.get(`/r/${subreddit}/comments/${postId}`, params);
    }

    /**
     * Submit a new text post (self post)
     */
    async submitTextPost(params: {
        subreddit: string;
        title: string;
        text: string;
        flair_id?: string;
        flair_text?: string;
        nsfw?: boolean;
        spoiler?: boolean;
        sendreplies?: boolean;
    }): Promise<SubmitPostResponse> {
        const formData = new URLSearchParams();
        formData.append("api_type", "json");
        formData.append("kind", "self");
        formData.append("sr", params.subreddit);
        formData.append("title", params.title);
        formData.append("text", params.text);

        if (params.flair_id) formData.append("flair_id", params.flair_id);
        if (params.flair_text) formData.append("flair_text", params.flair_text);
        if (params.nsfw) formData.append("nsfw", "true");
        if (params.spoiler) formData.append("spoiler", "true");
        if (params.sendreplies !== undefined) {
            formData.append("sendreplies", params.sendreplies.toString());
        }

        return this.request<SubmitPostResponse>({
            method: "POST",
            url: "/api/submit",
            data: formData.toString(),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
    }

    /**
     * Submit a new link post
     */
    async submitLinkPost(params: {
        subreddit: string;
        title: string;
        url: string;
        flair_id?: string;
        flair_text?: string;
        nsfw?: boolean;
        spoiler?: boolean;
        sendreplies?: boolean;
        resubmit?: boolean;
    }): Promise<SubmitPostResponse> {
        const formData = new URLSearchParams();
        formData.append("api_type", "json");
        formData.append("kind", "link");
        formData.append("sr", params.subreddit);
        formData.append("title", params.title);
        formData.append("url", params.url);

        if (params.flair_id) formData.append("flair_id", params.flair_id);
        if (params.flair_text) formData.append("flair_text", params.flair_text);
        if (params.nsfw) formData.append("nsfw", "true");
        if (params.spoiler) formData.append("spoiler", "true");
        if (params.resubmit) formData.append("resubmit", "true");
        if (params.sendreplies !== undefined) {
            formData.append("sendreplies", params.sendreplies.toString());
        }

        return this.request<SubmitPostResponse>({
            method: "POST",
            url: "/api/submit",
            data: formData.toString(),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
    }

    /**
     * Submit a comment on a post or reply to a comment
     */
    async submitComment(params: {
        parentFullname: string; // t3_xxx for post, t1_xxx for comment
        text: string;
    }): Promise<SubmitCommentResponse> {
        const formData = new URLSearchParams();
        formData.append("api_type", "json");
        formData.append("thing_id", params.parentFullname);
        formData.append("text", params.text);

        return this.request<SubmitCommentResponse>({
            method: "POST",
            url: "/api/comment",
            data: formData.toString(),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
    }

    /**
     * Vote on a post or comment
     * @param fullname - The fullname of the thing to vote on (t3_xxx or t1_xxx)
     * @param direction - 1 = upvote, 0 = remove vote, -1 = downvote
     */
    async vote(fullname: string, direction: VoteDirection): Promise<void> {
        const formData = new URLSearchParams();
        formData.append("id", fullname);
        formData.append("dir", direction.toString());

        await this.request({
            method: "POST",
            url: "/api/vote",
            data: formData.toString(),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
    }

    /**
     * Save a post or comment
     */
    async save(fullname: string, category?: string): Promise<void> {
        const formData = new URLSearchParams();
        formData.append("id", fullname);
        if (category) formData.append("category", category);

        await this.request({
            method: "POST",
            url: "/api/save",
            data: formData.toString(),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
    }

    /**
     * Unsave a post or comment
     */
    async unsave(fullname: string): Promise<void> {
        const formData = new URLSearchParams();
        formData.append("id", fullname);

        await this.request({
            method: "POST",
            url: "/api/unsave",
            data: formData.toString(),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
    }

    /**
     * Get authenticated user info
     */
    async getMe(): Promise<RedditUser> {
        return this.get("/api/v1/me");
    }

    /**
     * Search posts
     */
    async search(params: {
        query: string;
        subreddit?: string;
        sort?: "relevance" | "hot" | "top" | "new" | "comments";
        t?: TimeFilter;
        limit?: number;
        after?: string;
        type?: "link" | "sr" | "user";
        restrict_sr?: boolean;
    }): Promise<RedditListingResponse<RedditPost>> {
        const searchParams: Record<string, unknown> = {
            q: params.query,
            limit: params.limit || 25,
            raw_json: 1
        };

        if (params.sort) searchParams.sort = params.sort;
        if (params.t) searchParams.t = params.t;
        if (params.after) searchParams.after = params.after;
        if (params.type) searchParams.type = params.type;
        if (params.restrict_sr !== undefined) {
            searchParams.restrict_sr = params.restrict_sr;
        }

        const endpoint = params.subreddit ? `/r/${params.subreddit}/search` : "/search";

        return this.get(endpoint, searchParams);
    }
}
