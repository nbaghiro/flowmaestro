import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface HeapClientConfig {
    appId: string;
    region?: "us" | "eu";
}

/**
 * Heap API Client
 *
 * Heap uses App ID passed in the request body for authentication.
 * Rate limit: 30 requests per 30 seconds per identity.
 *
 * Regions:
 * - US: https://heapanalytics.com
 * - EU: https://c.eu.heap-api.com
 */
export class HeapClient extends BaseAPIClient {
    private appId: string;

    constructor(config: HeapClientConfig) {
        const baseURL =
            config.region === "eu" ? "https://c.eu.heap-api.com" : "https://heapanalytics.com";

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

        this.appId = config.appId;

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
     * Get the App ID for use in operations
     */
    getAppId(): string {
        return this.appId;
    }

    /**
     * Handle Heap-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as { error?: string; message?: string };

            // Map common Heap errors
            if (status === 401 || status === 403) {
                throw new Error("Heap App ID is invalid. Please reconnect.");
            }

            if (status === 400) {
                const message = data.error || data.message || "Bad request";
                throw new Error(`Heap API error: ${message}`);
            }

            if (status === 429) {
                throw new Error(
                    "Rate limited by Heap (30 requests per 30 seconds per identity). Please try again later."
                );
            }

            if (data.error || data.message) {
                throw new Error(`Heap API error: ${data.error || data.message}`);
            }
        }

        throw error;
    }
}
