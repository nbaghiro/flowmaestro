import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";
import type { RequestConfig } from "../../../core/types";

export interface BufferClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * Buffer API response format
 */
interface BufferResponse {
    success?: boolean;
    error?: string;
    message?: string;
    [key: string]: unknown;
}

/**
 * Buffer API Client with connection pooling and error handling
 *
 * Note: Buffer API uses form-urlencoded for most requests and returns JSON
 * Access token is passed as a query parameter
 */
export class BufferClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: BufferClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.bufferapp.com/1",
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

        // Add request interceptor to add access_token to requests
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }

            // Add access token to query params
            if (!reqConfig.params) {
                reqConfig.params = {};
            }
            reqConfig.params["access_token"] = this.accessToken;

            return reqConfig;
        });
    }

    /**
     * Override request to handle Buffer-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        const response = await super.request<BufferResponse>(config);

        // Buffer may return { success: false, error: "..." } for errors
        if ("success" in response && response.success === false) {
            throw new Error(response.error || response.message || "Buffer API error");
        }

        return response as T;
    }

    /**
     * Handle Buffer-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as BufferResponse;

            // Map common Buffer errors
            if (data.error === "invalid_token" || data.message?.includes("Unauthorized")) {
                throw new Error("Buffer authentication failed. Please reconnect.");
            }

            if (data.error === "invalid_profile_id") {
                throw new Error("Invalid profile ID. Please check the profile ID.");
            }

            if (data.error) {
                throw new Error(`Buffer API error: ${data.error}`);
            }

            if (data.message) {
                throw new Error(`Buffer API error: ${data.message}`);
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                throw new Error("Rate limited. Please try again later.");
            }
        }

        throw error;
    }

    /**
     * Get user info
     */
    async getUser(): Promise<unknown> {
        return this.get("/user.json");
    }

    /**
     * List all profiles
     */
    async listProfiles(): Promise<unknown> {
        return this.get("/profiles.json");
    }

    /**
     * Get a specific profile
     */
    async getProfile(profileId: string): Promise<unknown> {
        return this.get(`/profiles/${profileId}.json`);
    }

    /**
     * Create a new update/post
     */
    async createUpdate(params: {
        profile_ids: string[];
        text: string;
        media?: {
            link?: string;
            photo?: string;
            thumbnail?: string;
        };
        scheduled_at?: string;
        now?: boolean;
        top?: boolean;
    }): Promise<unknown> {
        // Buffer expects form-urlencoded data
        const formData = new URLSearchParams();

        // Add profile IDs (can be multiple)
        for (const profileId of params.profile_ids) {
            formData.append("profile_ids[]", profileId);
        }

        formData.append("text", params.text);

        if (params.media?.link) {
            formData.append("media[link]", params.media.link);
        }
        if (params.media?.photo) {
            formData.append("media[photo]", params.media.photo);
        }
        if (params.media?.thumbnail) {
            formData.append("media[thumbnail]", params.media.thumbnail);
        }

        if (params.scheduled_at) {
            formData.append("scheduled_at", params.scheduled_at);
        }

        if (params.now !== undefined) {
            formData.append("now", String(params.now));
        }

        if (params.top !== undefined) {
            formData.append("top", String(params.top));
        }

        return this.request({
            method: "POST",
            url: "/updates/create.json",
            data: formData.toString(),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
    }

    /**
     * Get a specific update
     */
    async getUpdate(updateId: string): Promise<unknown> {
        return this.get(`/updates/${updateId}.json`);
    }

    /**
     * Get pending updates for a profile
     */
    async getPendingUpdates(
        profileId: string,
        params?: { page?: number; count?: number }
    ): Promise<unknown> {
        return this.get(`/profiles/${profileId}/updates/pending.json`, params);
    }

    /**
     * Delete/destroy an update
     */
    async deleteUpdate(updateId: string): Promise<unknown> {
        return this.post(`/updates/${updateId}/destroy.json`);
    }
}
