import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface PostHogClientConfig {
    apiKey: string;
    host?: string; // Optional: defaults to US Cloud
}

/**
 * PostHog API Client
 *
 * PostHog uses Project API Key passed in the request body.
 * No rate limits on capture endpoints.
 *
 * Hosts:
 * - US Cloud: https://us.i.posthog.com (default)
 * - EU Cloud: https://eu.i.posthog.com
 * - Self-hosted: Custom URL
 */
export class PostHogClient extends BaseAPIClient {
    private apiKey: string;

    constructor(config: PostHogClientConfig) {
        const baseURL = config.host || "https://us.i.posthog.com";

        const clientConfig: BaseAPIClientConfig = {
            baseURL,
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

        // Add request interceptor for content type
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Content-Type"] = "application/json";
            reqConfig.headers["Accept"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Get the API key for use in operations
     */
    getApiKey(): string {
        return this.apiKey;
    }

    /**
     * Handle PostHog-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as {
                type?: string;
                code?: string;
                detail?: string;
                attr?: string;
            };

            // Map common PostHog errors
            if (status === 401 || status === 403) {
                throw new Error("PostHog Project API Key is invalid. Please reconnect.");
            }

            if (status === 400) {
                const message = data.detail || "Bad request";
                throw new Error(`PostHog API error: ${message}`);
            }

            if (status === 429) {
                throw new Error("Rate limited by PostHog. Please try again later.");
            }

            if (data.detail) {
                throw new Error(`PostHog API error: ${data.detail}`);
            }
        }

        throw error;
    }
}
