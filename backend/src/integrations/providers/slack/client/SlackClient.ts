import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";
import type { RequestConfig } from "../../../core/types";

export interface SlackClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * Slack API response format
 */
interface SlackResponse {
    ok: boolean;
    error?: string;
    [key: string]: unknown;
}

/**
 * Slack API Client with connection pooling and error handling
 */
export class SlackClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: SlackClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://slack.com/api",
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
     * Override request to handle Slack-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        const response = await super.request<SlackResponse>(config);

        // Slack wraps responses in { ok: true/false, ... }
        if ("ok" in response && !response.ok) {
            throw new Error(response.error || "Slack API error");
        }

        return response as T;
    }

    /**
     * Handle Slack-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as SlackResponse;

            // Map common Slack errors
            if (data.error === "invalid_auth" || data.error === "token_expired") {
                throw new Error("Slack authentication failed. Please reconnect.");
            }

            if (data.error === "channel_not_found") {
                throw new Error("Channel not found. Please check the channel ID or name.");
            }

            if (data.error === "not_in_channel") {
                throw new Error("Bot is not a member of this channel.");
            }

            if (data.error) {
                throw new Error(`Slack API error: ${data.error}`);
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
     * Helper method for chat.postMessage
     */
    async postMessage(params: {
        channel: string;
        text?: string;
        blocks?: unknown[];
        thread_ts?: string;
    }): Promise<unknown> {
        return this.post("/chat.postMessage", params);
    }

    /**
     * Helper method for conversations.list
     */
    async listConversations(params?: {
        types?: string;
        exclude_archived?: boolean;
        limit?: number;
    }): Promise<unknown> {
        return this.get("/conversations.list", params);
    }

    /**
     * Helper method for users.info
     */
    async getUserInfo(userId: string): Promise<unknown> {
        return this.get("/users.info", { user: userId });
    }
}
