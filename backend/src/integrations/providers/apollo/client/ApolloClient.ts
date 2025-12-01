import { BaseAPIClient } from "../../../core/BaseAPIClient";

export interface ApolloClientConfig {
    accessToken: string;
    connectionId: string;
}

/**
 * Apollo.io API Client
 * Handles authentication, request formatting, and error handling
 */
export class ApolloClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: ApolloClientConfig) {
        super({
            baseURL: "https://api.apollo.io",
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential"
            }
        });

        this.accessToken = config.accessToken;

        // Add request interceptor for authentication
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
     * Override handleError to map Apollo-specific errors
     */
    protected handleError(error: unknown): never {
        if (error && typeof error === "object") {
            const err = error as {
                response?: {
                    status?: number;
                    data?: {
                        error?: string;
                        message?: string;
                    };
                };
                message?: string;
            };

            const status = err.response?.status;
            const errorData = err.response?.data;

            // Map Apollo errors to standard error types
            if (status === 401) {
                throw new Error("Invalid or expired Apollo credentials");
            } else if (status === 403) {
                throw new Error("Insufficient permissions for this Apollo operation");
            } else if (status === 404) {
                throw new Error("Resource not found in Apollo");
            } else if (status === 429) {
                throw new Error("Apollo rate limit exceeded. Please try again later.");
            } else if (errorData?.message) {
                throw new Error(errorData.message);
            } else if (err.message) {
                throw new Error(err.message);
            }
        }

        throw new Error("Unknown Apollo API error");
    }
}
