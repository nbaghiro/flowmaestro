import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface RampClientConfig {
    accessToken: string;
    sandbox?: boolean;
}

/**
 * Ramp API Client
 *
 * Ramp uses OAuth2 client credentials flow with Bearer token authentication.
 * Token expires after 10 days.
 *
 * Rate limit: 100 requests/minute
 */
export class RampClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: RampClientConfig) {
        const baseURL = config.sandbox
            ? "https://demo-api.ramp.com/developer/v1"
            : "https://api.ramp.com/developer/v1";

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

        this.accessToken = config.accessToken;

        // Add request interceptor for Bearer auth
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Handle Ramp-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as {
                error_message?: string;
                error?: string;
            };

            if (error.response.status === 401) {
                throw new Error(
                    "Ramp access token is invalid or expired. Please reconnect your Ramp account."
                );
            }

            if (error.response.status === 403) {
                throw new Error("Permission denied. Check OAuth scopes for your Ramp connection.");
            }

            if (error.response.status === 404) {
                throw new Error("Resource not found in Ramp.");
            }

            if (error.response.status === 400) {
                const errorMessage = data.error_message || data.error || "Validation failed";
                throw new Error(`Ramp validation error: ${errorMessage}`);
            }

            if (error.response.status === 429) {
                throw new Error("Ramp rate limit exceeded. Please try again later.");
            }

            if (data.error_message || data.error) {
                throw new Error(`Ramp API error: ${data.error_message || data.error}`);
            }
        }

        throw error;
    }
}
