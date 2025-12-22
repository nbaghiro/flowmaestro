import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";
import type { RequestConfig } from "../../../core/types";
import type { LinkedInAPIResponse, LinkedInAPIError } from "../operations/types";

export interface LinkedInClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * LinkedIn API Client with connection pooling and error handling
 *
 * Key features:
 * - Uses LinkedIn REST API with versioned headers
 * - Automatic retry with exponential backoff for rate limits
 * - Connection pooling for efficient HTTP connections
 * - Supports Posts API v2 format
 */
export class LinkedInClient extends BaseAPIClient {
    private static readonly API_VERSION = "202501";
    private accessToken: string;

    constructor(config: LinkedInClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.linkedin.com",
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

        // Add request interceptor for LinkedIn-specific headers
        this.client.addRequestInterceptor((config) => {
            if (!config.headers) {
                config.headers = {};
            }
            config.headers["Authorization"] = `Bearer ${this.accessToken}`;
            config.headers["LinkedIn-Version"] = LinkedInClient.API_VERSION;
            config.headers["X-Restli-Protocol-Version"] = "2.0.0";
            config.headers["Content-Type"] = "application/json";
            return config;
        });
    }

    /**
     * Override request to handle LinkedIn API response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        const response = await super.request<LinkedInAPIResponse<T> | T>(config);

        // Check for errors in response
        const apiResponse = response as LinkedInAPIResponse<T>;
        if (apiResponse.errors && apiResponse.errors.length > 0) {
            const error = apiResponse.errors[0];
            throw new Error(error.message || "LinkedIn API error");
        }

        // Return the response as-is (LinkedIn doesn't always wrap in data)
        return response as T;
    }

    /**
     * Handle LinkedIn API-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as LinkedInAPIResponse<unknown>;

            // Handle LinkedIn API errors
            if (data.errors && data.errors.length > 0) {
                const apiError = data.errors[0] as LinkedInAPIError;

                // Map common LinkedIn API errors
                if (error.response.status === 401) {
                    throw new Error(
                        "LinkedIn authentication failed. Please reconnect your account."
                    );
                }

                if (error.response.status === 403) {
                    throw new Error(
                        "Access forbidden. Check that your app has the required LinkedIn permissions."
                    );
                }

                throw new Error(apiError.message || "LinkedIn API error");
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                throw new Error("Rate limited by LinkedIn. Please try again later.");
            }
        }

        throw error;
    }

    /**
     * Get authenticated user profile via OpenID Connect
     */
    async getProfile(): Promise<unknown> {
        return this.get("/v2/userinfo");
    }

    /**
     * Get organizations the user can post to
     */
    async getOrganizations(): Promise<unknown> {
        return this.get("/rest/organizationAcls", {
            q: "roleAssignee",
            role: "ADMINISTRATOR",
            state: "APPROVED"
        });
    }

    /**
     * Create a text post
     */
    async createPost(params: {
        author: string;
        commentary: string;
        visibility: "PUBLIC" | "CONNECTIONS" | "LOGGED_IN";
    }): Promise<unknown> {
        return this.post("/rest/posts", {
            author: params.author,
            commentary: params.commentary,
            visibility: params.visibility,
            distribution: {
                feedDistribution: "MAIN_FEED",
                targetEntities: [],
                thirdPartyDistributionChannels: []
            },
            lifecycleState: "PUBLISHED"
        });
    }

    /**
     * Create an article post (post with URL)
     */
    async createArticlePost(params: {
        author: string;
        commentary: string;
        visibility: "PUBLIC" | "CONNECTIONS" | "LOGGED_IN";
        articleUrl: string;
        articleTitle?: string;
        articleDescription?: string;
    }): Promise<unknown> {
        return this.post("/rest/posts", {
            author: params.author,
            commentary: params.commentary,
            visibility: params.visibility,
            distribution: {
                feedDistribution: "MAIN_FEED",
                targetEntities: [],
                thirdPartyDistributionChannels: []
            },
            content: {
                article: {
                    source: params.articleUrl,
                    title: params.articleTitle,
                    description: params.articleDescription
                }
            },
            lifecycleState: "PUBLISHED"
        });
    }

    /**
     * Get a post by ID
     */
    async getPost(postUrn: string): Promise<unknown> {
        // URL encode the URN
        const encodedUrn = encodeURIComponent(postUrn);
        return this.get(`/rest/posts/${encodedUrn}`);
    }

    /**
     * Delete a post
     */
    async deletePost(postUrn: string): Promise<unknown> {
        const encodedUrn = encodeURIComponent(postUrn);
        return this.delete(`/rest/posts/${encodedUrn}`);
    }

    /**
     * Initialize image upload
     */
    async initializeImageUpload(owner: string): Promise<unknown> {
        return this.post("/rest/images?action=initializeUpload", {
            initializeUploadRequest: {
                owner
            }
        });
    }

    /**
     * Initialize video upload
     */
    async initializeVideoUpload(owner: string, fileSizeBytes: number): Promise<unknown> {
        return this.post("/rest/videos?action=initializeUpload", {
            initializeUploadRequest: {
                owner,
                fileSizeBytes
            }
        });
    }

    /**
     * Create a media post (image or video)
     */
    async createMediaPost(params: {
        author: string;
        commentary: string;
        visibility: "PUBLIC" | "CONNECTIONS" | "LOGGED_IN";
        mediaUrn: string;
        mediaTitle?: string;
    }): Promise<unknown> {
        return this.post("/rest/posts", {
            author: params.author,
            commentary: params.commentary,
            visibility: params.visibility,
            distribution: {
                feedDistribution: "MAIN_FEED",
                targetEntities: [],
                thirdPartyDistributionChannels: []
            },
            content: {
                media: {
                    id: params.mediaUrn,
                    title: params.mediaTitle
                }
            },
            lifecycleState: "PUBLISHED"
        });
    }

    /**
     * Add a comment to a post
     */
    async addComment(postUrn: string, actor: string, text: string): Promise<unknown> {
        // Social actions use a different format
        const activityUrn = postUrn
            .replace("urn:li:share:", "urn:li:activity:")
            .replace("urn:li:ugcPost:", "urn:li:activity:");
        return this.post("/rest/socialActions/" + encodeURIComponent(activityUrn) + "/comments", {
            actor,
            message: {
                text
            }
        });
    }

    /**
     * Get comments on a post
     */
    async getComments(
        postUrn: string,
        params?: { start?: number; count?: number }
    ): Promise<unknown> {
        const activityUrn = postUrn
            .replace("urn:li:share:", "urn:li:activity:")
            .replace("urn:li:ugcPost:", "urn:li:activity:");
        return this.get(
            "/rest/socialActions/" + encodeURIComponent(activityUrn) + "/comments",
            params
        );
    }

    /**
     * Add a reaction (like) to a post
     */
    async addReaction(
        postUrn: string,
        actor: string,
        reactionType: "LIKE" | "CELEBRATE" | "SUPPORT" | "LOVE" | "INSIGHTFUL" | "FUNNY"
    ): Promise<unknown> {
        const activityUrn = postUrn
            .replace("urn:li:share:", "urn:li:activity:")
            .replace("urn:li:ugcPost:", "urn:li:activity:");
        return this.post("/rest/socialActions/" + encodeURIComponent(activityUrn) + "/likes", {
            actor,
            reactionType
        });
    }

    /**
     * Upload binary data to LinkedIn's upload URL
     * Note: This uses a separate fetch call since it goes to a different host
     */
    async uploadMedia(uploadUrl: string, data: Buffer, contentType: string): Promise<void> {
        const response = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
                "Content-Type": contentType,
                Authorization: `Bearer ${this.accessToken}`
            },
            body: data
        });

        if (!response.ok) {
            throw new Error(`Failed to upload media: ${response.status} ${response.statusText}`);
        }
    }
}
