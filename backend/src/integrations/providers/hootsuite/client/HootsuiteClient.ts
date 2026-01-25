import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";
import type { RequestConfig } from "../../../core/types";

export interface HootsuiteClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * Hootsuite API response format
 */
interface HootsuiteResponse {
    data?: unknown;
    errors?: Array<{
        code?: string;
        message?: string;
    }>;
    [key: string]: unknown;
}

/**
 * Hootsuite API Client with connection pooling and error handling
 *
 * Note: Hootsuite uses Bearer token authentication
 * Tokens expire in ~1 hour, so refresh is important
 */
export class HootsuiteClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: HootsuiteClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://platform.hootsuite.com/v1",
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
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Override request to handle Hootsuite-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        const response = await super.request<HootsuiteResponse>(config);

        // Hootsuite returns errors in an array
        if (response.errors && response.errors.length > 0) {
            const firstError = response.errors[0];
            throw new Error(firstError.message || firstError.code || "Hootsuite API error");
        }

        // Return data if present, otherwise return the full response
        return (response.data !== undefined ? response.data : response) as T;
    }

    /**
     * Handle Hootsuite-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as HootsuiteResponse;

            // Check for errors array
            if (data.errors && data.errors.length > 0) {
                const firstError = data.errors[0];

                if (firstError.code === "UNAUTHORIZED" || firstError.code === "INVALID_TOKEN") {
                    throw new Error("Hootsuite authentication failed. Please reconnect.");
                }

                if (firstError.code === "NOT_FOUND") {
                    throw new Error("Resource not found.");
                }

                throw new Error(`Hootsuite API error: ${firstError.message || firstError.code}`);
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                const retryAfter = error.response.headers["retry-after"];
                throw new Error(`Rate limited. Retry after ${retryAfter || "unknown"} seconds.`);
            }
        }

        throw error;
    }

    /**
     * Get current user info
     */
    async getMe(): Promise<unknown> {
        return this.get("/me");
    }

    /**
     * List all social profiles
     */
    async listSocialProfiles(): Promise<unknown> {
        return this.get("/socialProfiles");
    }

    /**
     * Schedule a message
     */
    async scheduleMessage(params: {
        text: string;
        socialProfileIds: string[];
        scheduledSendTime?: string;
        mediaUrls?: string[];
        state?: "SCHEDULED" | "DRAFT" | "SEND_NOW";
    }): Promise<unknown> {
        const body: Record<string, unknown> = {
            text: params.text,
            socialProfileIds: params.socialProfileIds
        };

        if (params.scheduledSendTime) {
            body.scheduledSendTime = params.scheduledSendTime;
        }

        if (params.mediaUrls && params.mediaUrls.length > 0) {
            body.mediaUrls = params.mediaUrls;
        }

        if (params.state) {
            body.state = params.state;
        }

        return this.post("/messages", body);
    }

    /**
     * Get a specific message
     */
    async getMessage(messageId: string): Promise<unknown> {
        return this.get(`/messages/${messageId}`);
    }

    /**
     * Delete a message
     */
    async deleteMessage(messageId: string): Promise<unknown> {
        return this.delete(`/messages/${messageId}`);
    }

    /**
     * Upload media
     * Note: Hootsuite media upload is a two-step process:
     * 1. Create upload URL
     * 2. Upload to that URL
     * This method handles the first step
     */
    async createMediaUpload(params: { sizeBytes: number; mimeType: string }): Promise<unknown> {
        return this.post("/media", {
            sizeBytes: params.sizeBytes,
            mimeType: params.mimeType
        });
    }

    /**
     * Get media status
     */
    async getMediaStatus(mediaId: string): Promise<unknown> {
        return this.get(`/media/${mediaId}`);
    }
}
