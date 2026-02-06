import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface CopperClientConfig {
    apiKey: string;
    userEmail: string;
}

/**
 * Copper CRM API Client
 *
 * Copper uses custom headers for authentication:
 * - X-PW-AccessToken: API key
 * - X-PW-Application: developer_api
 * - X-PW-UserEmail: User's email address
 */
export class CopperClient extends BaseAPIClient {
    private apiKey: string;
    private userEmail: string;

    constructor(config: CopperClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.copper.com/developer_api/v1",
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
        this.userEmail = config.userEmail;

        // Add request interceptor for Copper auth headers
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["X-PW-AccessToken"] = this.apiKey;
            requestConfig.headers["X-PW-Application"] = "developer_api";
            requestConfig.headers["X-PW-UserEmail"] = this.userEmail;
            requestConfig.headers["Content-Type"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Handle Copper-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as { error?: string; message?: string };

            if (error.response.status === 401) {
                throw new Error(
                    "Copper API key or email is invalid. Please check your credentials."
                );
            }

            if (error.response.status === 403) {
                throw new Error("Permission denied. Check API key permissions in Copper.");
            }

            if (error.response.status === 404) {
                throw new Error("Resource not found in Copper.");
            }

            if (error.response.status === 422) {
                const errorMessage = data.message || data.error || "Validation failed";
                throw new Error(`Copper validation error: ${errorMessage}`);
            }

            if (error.response.status === 429) {
                throw new Error("Copper rate limit exceeded. Please try again later.");
            }

            if (data.message) {
                throw new Error(`Copper API error: ${data.message}`);
            }
        }

        throw error;
    }
}
