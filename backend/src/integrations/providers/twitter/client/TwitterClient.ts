import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";
import type { RequestConfig } from "../../../core/types";
import type { XAPIResponse, XAPIError } from "../operations/types";

export interface TwitterClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * X (Twitter) API v2 Client with connection pooling and error handling
 *
 * Key features:
 * - Handles X API v2 response format ({ data: ..., errors: ... })
 * - Automatic retry with exponential backoff for rate limits
 * - Connection pooling for efficient HTTP connections
 */
export class TwitterClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: TwitterClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.x.com/2",
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503],
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

        // Add request interceptor for auth header
        this.client.addRequestInterceptor((config) => {
            if (!config.headers) {
                config.headers = {};
            }
            config.headers["Authorization"] = `Bearer ${this.accessToken}`;
            config.headers["Content-Type"] = "application/json";
            return config;
        });
    }

    /**
     * Override request to handle X API v2 response format
     * X API wraps responses in { data: ..., errors: ... }
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        const response = await super.request<XAPIResponse<T>>(config);

        // Check for errors in response
        if (response.errors && response.errors.length > 0) {
            const error = response.errors[0];
            throw new Error(error.message || error.detail || "X API error");
        }

        // Return the full response for operations that need meta/pagination
        return response as T;
    }

    /**
     * Handle X API-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as XAPIResponse<unknown>;

            // Handle X API errors
            if (data.errors && data.errors.length > 0) {
                const apiError = data.errors[0] as XAPIError;

                // Map common X API errors
                if (
                    apiError.title === "Unauthorized" ||
                    apiError.type ===
                        "https://api.twitter.com/2/problems/not-authorized-for-resource"
                ) {
                    throw new Error("X authentication failed. Please reconnect your account.");
                }

                if (apiError.type === "https://api.twitter.com/2/problems/resource-not-found") {
                    throw new Error(apiError.detail || "Resource not found.");
                }

                if (apiError.type === "https://api.twitter.com/2/problems/duplicate-content") {
                    throw new Error("Duplicate tweet. You cannot post the same content twice.");
                }

                throw new Error(apiError.message || apiError.detail || "X API error");
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                const resetTime = error.response.headers["x-rate-limit-reset"];
                const remaining = error.response.headers["x-rate-limit-remaining"];
                throw new Error(
                    `Rate limited. Remaining: ${remaining || 0}. Reset at: ${resetTime || "unknown"}`
                );
            }

            // Handle forbidden (often scope issues)
            if (error.response.status === 403) {
                throw new Error(
                    "Access forbidden. Check that your app has the required permissions."
                );
            }
        }

        throw error;
    }

    /**
     * Post a new tweet
     */
    async postTweet(params: {
        text: string;
        reply?: { in_reply_to_tweet_id: string };
        quote_tweet_id?: string;
    }): Promise<unknown> {
        return this.post("/tweets", params);
    }

    /**
     * Delete a tweet
     */
    async deleteTweet(tweetId: string): Promise<unknown> {
        return this.delete(`/tweets/${tweetId}`);
    }

    /**
     * Get authenticated user info
     */
    async getMe(fields?: string[]): Promise<unknown> {
        const params: Record<string, string> = {};
        if (fields && fields.length > 0) {
            params["user.fields"] = fields.join(",");
        }
        return this.get("/users/me", params);
    }

    /**
     * Get user by username
     */
    async getUserByUsername(username: string, fields?: string[]): Promise<unknown> {
        const params: Record<string, string> = {};
        if (fields && fields.length > 0) {
            params["user.fields"] = fields.join(",");
        }
        return this.get(`/users/by/username/${username}`, params);
    }

    /**
     * Get user's tweets (timeline)
     */
    async getUserTweets(
        userId: string,
        params?: {
            max_results?: number;
            pagination_token?: string;
            "tweet.fields"?: string;
        }
    ): Promise<unknown> {
        return this.get(`/users/${userId}/tweets`, params);
    }

    /**
     * Search recent tweets (last 7 days)
     */
    async searchRecentTweets(params: {
        query: string;
        max_results?: number;
        next_token?: string;
        "tweet.fields"?: string;
    }): Promise<unknown> {
        return this.get("/tweets/search/recent", params);
    }
}
