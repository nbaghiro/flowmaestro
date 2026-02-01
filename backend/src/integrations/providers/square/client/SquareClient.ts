import crypto from "crypto";
import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { SquareError } from "../operations/types";

export interface SquareClientConfig {
    accessToken: string;
}

/**
 * Square API Client
 *
 * Square uses JSON bodies and Bearer token auth.
 * Supports idempotency keys for write operations.
 */
export class SquareClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: SquareClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://connect.squareup.com/v2",
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
            reqConfig.headers["Square-Version"] = "2025-01-23";
            return reqConfig;
        });
    }

    /**
     * Make a POST request with automatic idempotency key
     */
    async postWithIdempotency<T = unknown>(
        url: string,
        data?: Record<string, unknown>,
        idempotencyKey?: string
    ): Promise<T> {
        const key = idempotencyKey || this.generateIdempotencyKey();

        return this.request<T>({
            method: "POST",
            url,
            headers: {
                "Idempotency-Key": key
            },
            data
        });
    }

    /**
     * Generate a unique idempotency key
     */
    private generateIdempotencyKey(): string {
        return crypto.randomUUID();
    }

    /**
     * Handle Square-specific errors
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as {
                errors?: SquareError[];
            };

            // Map common Square errors
            if (error.response.status === 401) {
                throw new Error("Square access token is invalid. Please reconnect.");
            }

            if (error.response.status === 403) {
                throw new Error("Permission denied. Check your OAuth scopes.");
            }

            if (data.errors && data.errors.length > 0) {
                const firstError = data.errors[0];
                throw new Error(`Square API error: ${firstError.detail || firstError.code}`);
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                throw new Error("Rate limited by Square. Please try again later.");
            }
        }

        throw error;
    }
}
