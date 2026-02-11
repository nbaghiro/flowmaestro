import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface HiBobClientConfig {
    serviceUserId: string;
    token: string;
}

/**
 * HiBob API Client with connection pooling and error handling
 *
 * Authentication uses Service User credentials in the format:
 * Authorization: {serviceUserId}
 * with API key passed as a separate header
 *
 * API Docs: https://apidocs.hibob.com/
 */
export class HiBobClient extends BaseAPIClient {
    private serviceUserId: string;
    private token: string;

    constructor(config: HiBobClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.hibob.com/v1",
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

        this.serviceUserId = config.serviceUserId;
        this.token = config.token;

        // Add request interceptor for auth headers
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            // HiBob uses Basic Auth with service user ID and token
            const credentials = Buffer.from(`${this.serviceUserId}:${this.token}`).toString(
                "base64"
            );
            reqConfig.headers["Authorization"] = `Basic ${credentials}`;
            return reqConfig;
        });
    }

    /**
     * Handle HiBob-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as { error?: string; message?: string };

            // Map common HiBob errors
            if (error.response.status === 401) {
                throw new Error(
                    "HiBob credentials are invalid or expired. Please check your Service User ID and Token."
                );
            }

            if (error.response.status === 403) {
                throw new Error("Permission denied. Check Service User permissions in HiBob.");
            }

            if (error.response.status === 404) {
                throw new Error("Resource not found. Check employee ID or endpoint.");
            }

            if (data.message) {
                throw new Error(`HiBob API error: ${data.message}`);
            }

            if (data.error) {
                throw new Error(`HiBob API error: ${data.error}`);
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                throw new Error("Rate limited by HiBob. Please try again later.");
            }
        }

        throw error;
    }
}
