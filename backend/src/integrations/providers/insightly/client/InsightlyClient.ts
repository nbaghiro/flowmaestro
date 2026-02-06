import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface InsightlyClientConfig {
    apiKey: string;
    pod: string; // na1, eu1, au1, etc.
}

/**
 * Insightly CRM API Client
 *
 * Insightly uses HTTP Basic Auth with the API key as username and empty password
 * Base URL varies by pod: https://api.{pod}.insightly.com/v3.1
 */
export class InsightlyClient extends BaseAPIClient {
    private apiKey: string;

    constructor(config: InsightlyClientConfig) {
        // Validate pod - defaults to na1 if not specified
        const pod = config.pod || "na1";

        const clientConfig: BaseAPIClientConfig = {
            baseURL: `https://api.${pod}.insightly.com/v3.1`,
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

        // Create Basic Auth header (API key as username, empty password)
        const credentials = Buffer.from(`${this.apiKey}:`).toString("base64");

        // Add request interceptor for Basic Auth header
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Basic ${credentials}`;
            requestConfig.headers["Content-Type"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Handle Insightly-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as { Message?: string; message?: string };

            if (error.response.status === 401) {
                throw new Error(
                    "Insightly API key is invalid. Please check your credentials and pod setting."
                );
            }

            if (error.response.status === 403) {
                throw new Error("Permission denied. Check API key permissions in Insightly.");
            }

            if (error.response.status === 404) {
                throw new Error("Resource not found in Insightly.");
            }

            if (error.response.status === 400) {
                const errorMessage = data.Message || data.message || "Bad request";
                throw new Error(`Insightly validation error: ${errorMessage}`);
            }

            if (error.response.status === 429) {
                throw new Error("Insightly rate limit exceeded. Please try again later.");
            }

            if (data.Message || data.message) {
                throw new Error(`Insightly API error: ${data.Message || data.message}`);
            }
        }

        throw error;
    }
}
