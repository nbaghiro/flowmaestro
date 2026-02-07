import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface ChargebeeClientConfig {
    apiKey: string;
    site: string;
}

/**
 * Chargebee API Client
 *
 * Chargebee uses HTTP Basic Auth with API key as username (empty password).
 * Base URL is constructed from site: https://{site}.chargebee.com/api/v2
 *
 * Rate limit: 150 requests/minute
 */
export class ChargebeeClient extends BaseAPIClient {
    private apiKey: string;

    constructor(config: ChargebeeClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: `https://${config.site}.chargebee.com/api/v2`,
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

        // Add request interceptor for Basic Auth
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            // Basic Auth: API key as username, empty password
            const credentials = Buffer.from(`${this.apiKey}:`).toString("base64");
            requestConfig.headers["Authorization"] = `Basic ${credentials}`;
            requestConfig.headers["Content-Type"] = "application/x-www-form-urlencoded";
            return requestConfig;
        });
    }

    /**
     * Handle Chargebee-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as {
                message?: string;
                error_code?: string;
                api_error_code?: string;
            };

            if (error.response.status === 401) {
                throw new Error("Chargebee API key is invalid. Please check your credentials.");
            }

            if (error.response.status === 403) {
                throw new Error("Permission denied. Check API key permissions in Chargebee.");
            }

            if (error.response.status === 404) {
                throw new Error("Resource not found in Chargebee.");
            }

            if (error.response.status === 400) {
                const errorMessage = data.message || "Validation failed";
                throw new Error(`Chargebee validation error: ${errorMessage}`);
            }

            if (error.response.status === 429) {
                throw new Error("Chargebee rate limit exceeded. Please try again later.");
            }

            if (data.message) {
                throw new Error(`Chargebee API error: ${data.message}`);
            }
        }

        throw error;
    }

    /**
     * Convert object to URL-encoded form data (Chargebee uses form-encoded POST)
     */
    toFormData(params: Record<string, unknown>): string {
        const formData: string[] = [];

        const encodeValue = (key: string, value: unknown): void => {
            if (value === null || value === undefined) {
                return;
            }

            if (typeof value === "object" && !Array.isArray(value)) {
                // Nested object: use bracket notation
                for (const [nestedKey, nestedValue] of Object.entries(
                    value as Record<string, unknown>
                )) {
                    encodeValue(`${key}[${nestedKey}]`, nestedValue);
                }
            } else if (Array.isArray(value)) {
                // Array: use indexed bracket notation
                value.forEach((item, index) => {
                    if (typeof item === "object") {
                        for (const [nestedKey, nestedValue] of Object.entries(
                            item as Record<string, unknown>
                        )) {
                            encodeValue(`${key}[${index}][${nestedKey}]`, nestedValue);
                        }
                    } else {
                        encodeValue(`${key}[${index}]`, item);
                    }
                });
            } else {
                formData.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
            }
        };

        for (const [key, value] of Object.entries(params)) {
            encodeValue(key, value);
        }

        return formData.join("&");
    }
}
