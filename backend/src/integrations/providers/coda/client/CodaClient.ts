import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface CodaClientConfig {
    apiKey: string;
}

/**
 * Coda API Client with connection pooling and error handling
 */
export class CodaClient extends BaseAPIClient {
    private apiKey: string;

    constructor(config: CodaClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://coda.io/apis/v1",
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

        // Add request interceptor for auth header
        this.client.addRequestInterceptor((config) => {
            if (!config.headers) {
                config.headers = {};
            }
            config.headers["Authorization"] = `Bearer ${this.apiKey}`;
            return config;
        });
    }

    /**
     * Handle Coda-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as { error?: string; message?: string };

            // Map common Coda errors
            if (error.response.status === 401) {
                throw new Error("Coda API key is invalid or expired. Please reconnect.");
            }

            if (error.response.status === 403) {
                throw new Error("Permission denied. Check API key permissions.");
            }

            if (error.response.status === 404) {
                throw new Error("Resource not found. Check document or table ID.");
            }

            if (data.message) {
                throw new Error(`Coda API error: ${data.message}`);
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                throw new Error("Rate limited. Please try again later.");
            }
        }

        throw error;
    }
}
