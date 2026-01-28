import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface StripeClientConfig {
    apiKey: string;
}

/**
 * Stripe API Client
 *
 * Stripe uses form-encoded bodies for POST requests and Bearer token auth.
 */
export class StripeClient extends BaseAPIClient {
    private apiKey: string;

    constructor(config: StripeClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.stripe.com/v1",
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
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = `Bearer ${this.apiKey}`;
            return reqConfig;
        });
    }

    /**
     * Make a POST request with form-encoded body (Stripe's format)
     */
    async postForm<T = unknown>(url: string, data?: Record<string, unknown>): Promise<T> {
        const formBody = this.toFormEncoded(data || {});

        return this.request<T>({
            method: "POST",
            url,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data: formBody
        });
    }

    /**
     * Convert object to form-encoded string
     * Handles nested objects with bracket notation
     */
    private toFormEncoded(obj: Record<string, unknown>, prefix = ""): string {
        const params: string[] = [];

        for (const [key, value] of Object.entries(obj)) {
            if (value === undefined || value === null) {
                continue;
            }

            const fullKey = prefix ? `${prefix}[${key}]` : key;

            if (typeof value === "object" && !Array.isArray(value)) {
                params.push(this.toFormEncoded(value as Record<string, unknown>, fullKey));
            } else if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    if (typeof item === "object") {
                        params.push(
                            this.toFormEncoded(
                                item as Record<string, unknown>,
                                `${fullKey}[${index}]`
                            )
                        );
                    } else {
                        params.push(
                            `${encodeURIComponent(`${fullKey}[${index}]`)}=${encodeURIComponent(String(item))}`
                        );
                    }
                });
            } else {
                params.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`);
            }
        }

        return params.filter(Boolean).join("&");
    }

    /**
     * Handle Stripe-specific errors
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as {
                error?: {
                    type?: string;
                    code?: string;
                    message?: string;
                    param?: string;
                };
            };

            // Map common Stripe errors
            if (error.response.status === 401) {
                throw new Error("Stripe API key is invalid. Please check your credentials.");
            }

            if (error.response.status === 403) {
                throw new Error("Permission denied. Check your API key permissions.");
            }

            if (data.error?.message) {
                throw new Error(`Stripe API error: ${data.error.message}`);
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                throw new Error("Rate limited by Stripe. Please try again later.");
            }
        }

        throw error;
    }
}
