import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface HotjarClientConfig {
    clientId: string;
    clientSecret: string;
}

/**
 * Hotjar API Client
 *
 * Uses OAuth client credentials flow to exchange Client ID + Client Secret
 * for a Bearer token. The token is cached and refreshed on 401 responses.
 *
 * Token endpoint: POST /v1/oauth/token (form-urlencoded)
 * Rate limit: 3,000 req/min (50 req/sec)
 */
export class HotjarClient extends BaseAPIClient {
    private clientId: string;
    private clientSecret: string;
    private accessToken: string | null = null;

    constructor(config: HotjarClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.hotjar.io",
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

        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;

        // Add request interceptor to inject Bearer token
        this.client.addRequestInterceptor(async (reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }

            // Get access token (cached or freshly fetched)
            const token = await this.getAccessToken();
            reqConfig.headers["Authorization"] = `Bearer ${token}`;
            reqConfig.headers["Content-Type"] = "application/json";
            reqConfig.headers["Accept"] = "application/json";

            return reqConfig;
        });
    }

    /**
     * Get a valid access token, fetching a new one if needed
     */
    private async getAccessToken(): Promise<string> {
        if (this.accessToken) {
            return this.accessToken;
        }

        return this.fetchAccessToken();
    }

    /**
     * Exchange client credentials for an access token
     */
    private async fetchAccessToken(): Promise<string> {
        const body = new URLSearchParams({
            grant_type: "client_credentials",
            client_id: this.clientId,
            client_secret: this.clientSecret
        });

        const response = await fetch("https://api.hotjar.io/v1/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString()
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            if (response.status === 401 || response.status === 403) {
                throw new Error(
                    "Hotjar client credentials are invalid. Please check your Client ID and Client Secret."
                );
            }
            throw new Error(
                `Failed to obtain Hotjar access token: HTTP ${response.status} ${errorText}`
            );
        }

        const data = (await response.json()) as { access_token: string };
        this.accessToken = data.access_token;
        return this.accessToken;
    }

    /**
     * Clear the cached access token (forces re-authentication on next request)
     */
    clearAccessToken(): void {
        this.accessToken = null;
    }

    /**
     * Handle Hotjar-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as {
                error?: string;
                message?: string;
            };

            // Token expired - clear cache and retry
            if (error.response.status === 401) {
                this.clearAccessToken();
                throw new Error(
                    "Hotjar credentials are invalid or token has expired. Please reconnect."
                );
            }

            if (error.response.status === 403) {
                throw new Error(
                    "Insufficient permissions. Please check your Hotjar API key scopes."
                );
            }

            if (error.response.status === 429) {
                throw new Error("Rate limited by Hotjar. Please try again later.");
            }

            if (data.error || data.message) {
                throw new Error(`Hotjar API error: ${data.error || data.message}`);
            }
        }

        throw error;
    }
}
