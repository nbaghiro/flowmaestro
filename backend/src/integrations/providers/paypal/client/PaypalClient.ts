import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { PaypalError } from "../operations/types";

export interface PaypalClientConfig {
    accessToken: string;
}

/**
 * PayPal API Client
 *
 * PayPal uses JSON bodies and Bearer token auth.
 * Base URL points to the production API (api-m.paypal.com) without version suffix
 * since different endpoints use different API versions (/v1 vs /v2).
 */
export class PaypalClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: PaypalClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api-m.paypal.com",
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

        // Add request interceptor for auth header
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Handle PayPal-specific errors
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as PaypalError | undefined;

            if (error.response.status === 401) {
                throw new Error("PayPal access token is invalid. Please reconnect.");
            }

            if (error.response.status === 403) {
                throw new Error("Permission denied. Check your PayPal OAuth scopes.");
            }

            if (error.response.status === 429) {
                throw new Error("Rate limited by PayPal. Please try again later.");
            }

            if (data?.name && data?.message) {
                const detail = data.details?.[0]?.description || data.details?.[0]?.issue;
                const msg = detail
                    ? `PayPal API error: ${data.name} - ${detail}`
                    : `PayPal API error: ${data.name} - ${data.message}`;
                throw new Error(msg);
            }
        }

        throw error;
    }
}
