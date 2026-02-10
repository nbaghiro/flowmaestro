import { BaseAPIClient } from "../../../core/BaseAPIClient";

export interface ConfluenceClientConfig {
    accessToken: string;
    cloudId: string;
    connectionId: string;
}

/**
 * Confluence Cloud API Client
 * Handles authentication, cloudId-based routing, and error handling
 */
export class ConfluenceClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: ConfluenceClientConfig) {
        super({
            baseURL: `https://api.atlassian.com/ex/confluence/${config.cloudId}`,
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
            requestConfig.headers["Accept"] = "application/json";

            // Set Content-Type only for JSON payloads
            if (
                requestConfig.data &&
                !(requestConfig.data instanceof FormData) &&
                typeof requestConfig.data === "object"
            ) {
                requestConfig.headers["Content-Type"] = "application/json";
            }

            return requestConfig;
        });
    }

    /**
     * Override handleError to map Confluence-specific errors
     */
    protected handleError(error: unknown): never {
        if (error && typeof error === "object") {
            const err = error as {
                response?: {
                    status?: number;
                    data?: {
                        errors?: Array<{ title?: string; detail?: string }>;
                        message?: string;
                    };
                };
                message?: string;
            };

            const status = err.response?.status;
            const errorData = err.response?.data;

            if (status === 401) {
                throw new Error("Invalid or expired Confluence credentials");
            } else if (status === 403) {
                throw new Error("Insufficient permissions for this Confluence operation");
            } else if (status === 404) {
                throw new Error("Resource not found in Confluence");
            } else if (status === 429) {
                throw new Error("Confluence rate limit exceeded. Please try again later.");
            } else if (errorData?.errors && errorData.errors.length > 0) {
                const messages = errorData.errors
                    .map((e) => e.detail || e.title || "Unknown error")
                    .join(", ");
                throw new Error(messages);
            } else if (errorData?.message) {
                throw new Error(errorData.message);
            } else if (err.message) {
                throw new Error(err.message);
            }
        }

        throw new Error("Unknown Confluence API error");
    }
}
