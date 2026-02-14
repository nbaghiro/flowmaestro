/**
 * Google Base Client
 *
 * Base class for all Google API clients. Provides:
 * - Bearer token authentication
 * - Standardized error handling (401, 403, 404, 429)
 * - Connection pooling and retry logic
 *
 * Used by: Calendar, Docs, Drive, Forms, Sheets, Slides, Cloud Storage
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../BaseAPIClient";
import { parseGoogleErrorMessage, getGoogleErrorReason } from "./error-types";

export interface GoogleClientConfig {
    /**
     * OAuth2 access token
     */
    accessToken: string;

    /**
     * Base URL for the specific Google API
     * Examples:
     * - https://www.googleapis.com/calendar/v3
     * - https://www.googleapis.com/drive/v3
     * - https://docs.googleapis.com
     * - https://sheets.googleapis.com
     */
    baseURL: string;

    /**
     * Service name for error messages (e.g., "Google Drive", "Google Calendar")
     */
    serviceName: string;

    /**
     * Optional connection ID for token refresh tracking
     */
    connectionId?: string;

    /**
     * Custom timeout in milliseconds (default: 30000)
     */
    timeout?: number;
}

/**
 * Base Google API Client with Bearer token authentication and standardized error handling
 */
export abstract class GoogleBaseClient extends BaseAPIClient {
    protected accessToken: string;
    protected serviceName: string;

    constructor(config: GoogleClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: config.baseURL,
            timeout: config.timeout || 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
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
        this.serviceName = config.serviceName;

        // Add request interceptor for Bearer auth
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Handle Google API-specific errors with standardized messages
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;
            const errorMessage = parseGoogleErrorMessage(data);
            const errorReason = getGoogleErrorReason(data);

            // 401 - Authentication failed
            if (status === 401) {
                throw new Error(`${this.serviceName} authentication failed. Please reconnect.`);
            }

            // 403 - Permission denied (may also be rate limit in some cases)
            if (status === 403) {
                // Check if it's actually a rate limit error
                if (
                    errorReason === "rateLimitExceeded" ||
                    errorReason === "userRateLimitExceeded"
                ) {
                    throw new Error(
                        `${this.serviceName} rate limit exceeded. Please try again later.`
                    );
                }

                throw new Error(
                    `Permission denied: ${errorMessage || "You don't have permission to access this resource."}`
                );
            }

            // 404 - Resource not found
            if (status === 404) {
                throw new Error(this.getNotFoundMessage());
            }

            // 429 - Rate limit exceeded
            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                throw new Error(
                    `${this.serviceName} rate limit exceeded. Retry after ${retryAfter || "60"} seconds.`
                );
            }

            // 400 - Bad request
            if (status === 400) {
                throw new Error(`Invalid request: ${errorMessage || "Bad request"}`);
            }

            // Other structured error response
            if (errorMessage) {
                throw new Error(`${this.serviceName} API error: ${errorMessage}`);
            }
        }

        throw error;
    }

    /**
     * Override in subclasses to provide service-specific not found messages
     */
    protected getNotFoundMessage(): string {
        return "Resource not found.";
    }
}
