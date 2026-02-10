import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { HelpScoutError } from "../operations/types";

export interface HelpScoutClientConfig {
    accessToken: string;
}

/**
 * Help Scout API Client
 *
 * Help Scout uses JSON bodies and Bearer token auth.
 * Base URL: https://api.helpscout.net/v2
 */
export class HelpScoutClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: HelpScoutClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.helpscout.net/v2",
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
            const data = error.response.data as HelpScoutError | undefined;

            if (error.response.status === 401) {
                throw new Error("Help Scout access token is invalid. Please reconnect.");
            }

            if (error.response.status === 403) {
                throw new Error("Permission denied. Check your Help Scout OAuth scopes.");
            }

            if (error.response.status === 429) {
                throw new Error("Rate limited by Help Scout. Please try again later.");
            }

            if (data?.message) {
                const detail = data._embedded?.errors?.[0]?.message;
                const msg = detail
                    ? `Help Scout API error: ${data.message} - ${detail}`
                    : `Help Scout API error: ${data.message}`;
                throw new Error(msg);
            }
        }

        throw error;
    }
}
