import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { DriftError } from "../operations/types";

export interface DriftClientConfig {
    accessToken: string;
}

/**
 * Drift API Client
 *
 * Drift uses JSON bodies and Bearer token auth.
 * Base URL: https://driftapi.com
 */
export class DriftClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: DriftClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://driftapi.com",
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

        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    protected override async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as DriftError | undefined;

            if (error.response.status === 401) {
                throw new Error("Drift access token is invalid. Please reconnect.");
            }

            if (error.response.status === 403) {
                throw new Error("Permission denied. Check your Drift OAuth scopes.");
            }

            if (error.response.status === 429) {
                throw new Error("Rate limited by Drift. Please try again later.");
            }

            if (data?.error?.message) {
                throw new Error(`Drift API error: ${data.error.type} - ${data.error.message}`);
            }
        }

        throw error;
    }
}
