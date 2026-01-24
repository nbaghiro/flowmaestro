import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";

export interface TrelloClientConfig {
    apiKey: string;
    token: string;
}

/**
 * Trello API Client
 *
 * Trello uses query parameter authentication (key & token) instead of headers.
 * This client overrides the request method to inject auth params.
 */
export class TrelloClient extends BaseAPIClient {
    private apiKey: string;
    private token: string;

    constructor(config: TrelloClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.trello.com/1",
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

        this.apiKey = config.apiKey;
        this.token = config.token;
    }

    /**
     * Override request to inject auth as query params
     * Trello requires key and token as query parameters, not headers
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        // Merge auth params with any existing params
        const params = {
            key: this.apiKey,
            token: this.token,
            ...(config.params || {})
        };

        return super.request<T>({
            ...config,
            params
        });
    }

    /**
     * Handle Trello-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as { error?: string; message?: string };

            // Map common Trello errors
            if (status === 401) {
                throw new Error("Trello API key or token is invalid. Please reconnect.");
            }

            if (status === 403) {
                throw new Error("Permission denied. Check your API key permissions.");
            }

            if (status === 404) {
                throw new Error("Resource not found. Check board, list, or card ID.");
            }

            if (status === 429) {
                throw new Error(
                    "Rate limited. Please try again later (100 requests per 10 seconds)."
                );
            }

            if (data.message || data.error) {
                throw new Error(`Trello API error: ${data.message || data.error}`);
            }
        }

        throw error;
    }
}
