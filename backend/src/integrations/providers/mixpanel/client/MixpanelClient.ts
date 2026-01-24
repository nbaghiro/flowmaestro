import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";

export interface MixpanelClientConfig {
    projectToken: string;
}

/**
 * Mixpanel API Client
 *
 * Mixpanel uses token-based authentication passed in the request payload,
 * not in headers. Different endpoints use the token differently:
 * - /track: token in properties object
 * - /import: token as query parameter
 * - /engage, /groups: $token in payload
 */
export class MixpanelClient extends BaseAPIClient {
    private projectToken: string;

    constructor(config: MixpanelClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.mixpanel.com",
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

        this.projectToken = config.projectToken;

        // Add request interceptor for content type
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Accept"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Get the project token for use in operations
     */
    getProjectToken(): string {
        return this.projectToken;
    }

    /**
     * Make request with token in query params (for /import endpoint)
     */
    async requestWithTokenParam<T = unknown>(config: RequestConfig): Promise<T> {
        const params = {
            ...(config.params || {}),
            token: this.projectToken
        };

        return super.request<T>({
            ...config,
            params
        });
    }

    /**
     * Handle Mixpanel-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as { error?: string; status?: number };

            // Map common Mixpanel errors
            if (status === 401 || status === 403) {
                throw new Error("Mixpanel project token is invalid. Please reconnect.");
            }

            if (status === 400) {
                throw new Error(`Mixpanel API error: ${data.error || "Bad request"}`);
            }

            if (status === 429) {
                throw new Error("Rate limited by Mixpanel. Please try again later.");
            }

            if (data.error) {
                throw new Error(`Mixpanel API error: ${data.error}`);
            }
        }

        throw error;
    }
}
