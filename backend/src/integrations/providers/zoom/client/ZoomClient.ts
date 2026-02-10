import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { ZoomError } from "../operations/types";

export interface ZoomClientConfig {
    accessToken: string;
}

/**
 * Zoom API Client
 *
 * Zoom uses JSON bodies and Bearer token auth.
 * Base URL points to the Zoom API v2 endpoint.
 */
export class ZoomClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: ZoomClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.zoom.us/v2",
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
     * Handle Zoom-specific errors
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as ZoomError | undefined;

            if (error.response.status === 401) {
                throw new Error("Zoom access token is invalid. Please reconnect.");
            }

            if (error.response.status === 403) {
                throw new Error("Permission denied. Check your Zoom OAuth scopes.");
            }

            if (error.response.status === 404) {
                throw new Error(
                    data?.message ? `Zoom API error: ${data.message}` : "Resource not found."
                );
            }

            if (error.response.status === 429) {
                throw new Error("Rate limited by Zoom. Please try again later.");
            }

            if (data?.code && data?.message) {
                throw new Error(`Zoom API error (${data.code}): ${data.message}`);
            }
        }

        throw error;
    }
}
