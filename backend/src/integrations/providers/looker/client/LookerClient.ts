import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { LookerAccessToken } from "../operations/types";

export interface LookerClientConfig {
    instanceUrl: string;
    clientId: string;
    clientSecret: string;
}

/**
 * Looker API Client
 *
 * Uses OAuth2 client credentials flow to obtain access token.
 * The client automatically handles token refresh when needed.
 */
export class LookerClient extends BaseAPIClient {
    private clientId: string;
    private clientSecret: string;
    private instanceUrl: string;
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;

    constructor(config: LookerClientConfig) {
        // Normalize instance URL (remove trailing slash)
        const normalizedUrl = config.instanceUrl.replace(/\/$/, "");

        const clientConfig: BaseAPIClientConfig = {
            baseURL: `${normalizedUrl}/api/4.0`,
            timeout: 60000,
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
        this.instanceUrl = normalizedUrl;

        // Add request interceptor for auth header
        this.client.addRequestInterceptor(async (reqConfig) => {
            // Skip auth for login endpoint
            if (reqConfig.url?.includes("/login")) {
                return reqConfig;
            }

            // Ensure we have a valid token
            await this.ensureValidToken();

            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Ensure we have a valid access token
     */
    private async ensureValidToken(): Promise<void> {
        // If token exists and won't expire in the next 60 seconds, use it
        if (this.accessToken && this.tokenExpiresAt > Date.now() + 60000) {
            return;
        }

        // Get new token
        await this.login();
    }

    /**
     * Authenticate with Looker API to get access token
     */
    private async login(): Promise<void> {
        const loginUrl = `${this.instanceUrl}/api/4.0/login`;

        const response = await fetch(loginUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Looker authentication failed: ${response.status} ${response.statusText} - ${errorText}`
            );
        }

        const data = (await response.json()) as LookerAccessToken;
        this.accessToken = data.access_token;
        // Set expiration with a small buffer (expires_in is in seconds)
        this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    }

    /**
     * Handle Looker-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as {
                message?: string;
                documentation_url?: string;
            };

            // Map common Looker errors
            if (error.response.status === 401) {
                // Clear cached token so next request will re-authenticate
                this.accessToken = null;
                this.tokenExpiresAt = 0;
                throw new Error(
                    "Looker authentication failed. Please check your Client ID and Secret."
                );
            }

            if (error.response.status === 403) {
                throw new Error(
                    `Looker permission denied: ${data.message || "Insufficient permissions for this operation"}`
                );
            }

            if (error.response.status === 404) {
                throw new Error(
                    `Looker resource not found: ${data.message || "Resource not found"}`
                );
            }

            if (error.response.status === 429) {
                throw new Error("Rate limited by Looker. Please try again later.");
            }

            if (data.message) {
                throw new Error(`Looker API error: ${data.message}`);
            }
        }

        throw error;
    }
}
