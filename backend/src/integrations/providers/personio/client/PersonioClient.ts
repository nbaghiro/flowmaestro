import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface PersonioClientConfig {
    clientId: string;
    clientSecret: string;
}

interface TokenResponse {
    success: boolean;
    data: {
        token: string;
    };
}

/**
 * Personio API Client with connection pooling and automatic token management
 *
 * Authentication uses OAuth 2.0 Client Credentials flow:
 * 1. POST to /v2/auth/token with client_id and client_secret
 * 2. Receive a bearer token (valid for 24 hours)
 * 3. Use token in Authorization header for subsequent requests
 *
 * API Documentation: https://developer.personio.de/
 */
export class PersonioClient extends BaseAPIClient {
    private clientId: string;
    private clientSecret: string;
    private accessToken: string | null = null;
    private tokenExpiresAt: Date | null = null;

    constructor(config: PersonioClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.personio.de/v1",
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

        // Add request interceptor for auth header
        this.client.addRequestInterceptor(async (reqConfig) => {
            // Ensure we have a valid token before each request
            await this.ensureValidToken();

            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            return reqConfig;
        });
    }

    /**
     * Ensure we have a valid access token
     * Tokens are valid for 24 hours, so we refresh when within 5 minutes of expiry
     */
    private async ensureValidToken(): Promise<void> {
        // Check if we have a valid token
        if (this.accessToken && this.tokenExpiresAt) {
            const now = new Date();
            const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

            if (this.tokenExpiresAt > fiveMinutesFromNow) {
                // Token is still valid
                return;
            }
        }

        // Need to get a new token
        await this.refreshToken();
    }

    /**
     * Get a new access token from Personio
     */
    private async refreshToken(): Promise<void> {
        try {
            // Use native fetch for the token endpoint since it's a different base URL
            const response = await fetch("https://api.personio.de/v1/auth", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    (errorData as { error?: { message?: string } }).error?.message ||
                        `Token request failed with status ${response.status}`
                );
            }

            const data = (await response.json()) as TokenResponse;

            if (!data.success || !data.data?.token) {
                throw new Error("Invalid token response from Personio");
            }

            this.accessToken = data.data.token;
            // Token is valid for 24 hours
            this.tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        } catch (error) {
            if (error instanceof Error) {
                if (
                    error.message.includes("401") ||
                    error.message.includes("invalid") ||
                    error.message.includes("unauthorized")
                ) {
                    throw new Error(
                        "Invalid Personio credentials. Please check your Client ID and Client Secret."
                    );
                }
            }
            throw error;
        }
    }

    /**
     * Handle Personio-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as {
                error?: { message?: string };
                message?: string;
            };

            // Map common Personio errors
            if (error.response.status === 401) {
                // Invalidate the token so it will be refreshed on next request
                this.accessToken = null;
                this.tokenExpiresAt = null;
                throw new Error("Personio authentication failed. Please check your credentials.");
            }

            if (error.response.status === 403) {
                throw new Error(
                    "Permission denied. Check API credentials permissions in Personio."
                );
            }

            if (error.response.status === 404) {
                throw new Error("Resource not found. Check employee ID or endpoint.");
            }

            if (data.error?.message) {
                throw new Error(`Personio API error: ${data.error.message}`);
            }

            if (data.message) {
                throw new Error(`Personio API error: ${data.message}`);
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                throw new Error("Rate limited by Personio. Please try again later.");
            }
        }

        throw error;
    }
}
