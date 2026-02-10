import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface WiseClientConfig {
    apiToken: string;
    sandbox?: boolean;
}

/**
 * Wise API Client
 *
 * Wise uses Bearer token authentication.
 * API token is generated from Wise account settings.
 *
 * Rate limit: 100 requests/minute
 */
export class WiseClient extends BaseAPIClient {
    private apiToken: string;

    constructor(config: WiseClientConfig) {
        const baseURL = config.sandbox
            ? "https://api.sandbox.transferwise.tech"
            : "https://api.wise.com";

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

        this.apiToken = config.apiToken;

        // Add request interceptor for Bearer auth
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${this.apiToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Handle Wise-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as {
                message?: string;
                errors?: Array<{ message: string }>;
            };

            if (error.response.status === 401) {
                throw new Error("Wise API token is invalid. Please check your credentials.");
            }

            if (error.response.status === 403) {
                throw new Error("Permission denied. Check API token permissions in Wise.");
            }

            if (error.response.status === 404) {
                throw new Error("Resource not found in Wise.");
            }

            if (error.response.status === 400) {
                const errorMessage =
                    data.errors?.[0]?.message || data.message || "Validation failed";
                throw new Error(`Wise validation error: ${errorMessage}`);
            }

            if (error.response.status === 429) {
                throw new Error("Wise rate limit exceeded. Please try again later.");
            }

            if (data.message) {
                throw new Error(`Wise API error: ${data.message}`);
            }
        }

        throw error;
    }
}
