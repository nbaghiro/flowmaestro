import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { TableauSignInResponse, TableauCredentials } from "../operations/types";

export interface TableauClientConfig {
    serverUrl: string;
    site?: string; // Content URL for the site (empty for default site)
    tokenName: string;
    tokenSecret: string;
}

/**
 * Tableau REST API Client
 *
 * Uses Personal Access Token (PAT) authentication.
 * The client signs in to obtain a credentials token which is used for subsequent requests.
 */
export class TableauClient extends BaseAPIClient {
    private serverUrl: string;
    private site: string;
    private tokenName: string;
    private tokenSecret: string;
    private credentials: TableauCredentials | null = null;
    private tokenExpiresAt: number = 0;

    constructor(config: TableauClientConfig) {
        // Normalize server URL (remove trailing slash)
        const normalizedUrl = config.serverUrl.replace(/\/$/, "");

        const clientConfig: BaseAPIClientConfig = {
            baseURL: `${normalizedUrl}/api/3.21`, // Tableau REST API version
            timeout: 60000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503],
                backoffStrategy: "exponential"
            },
            connectionPool: {
                maxSockets: 20,
                maxFreeSockets: 5,
                keepAlive: true
            }
        };

        super(clientConfig);

        this.serverUrl = normalizedUrl;
        this.site = config.site || "";
        this.tokenName = config.tokenName;
        this.tokenSecret = config.tokenSecret;

        // Add request interceptor for auth header
        this.client.addRequestInterceptor(async (reqConfig) => {
            // Skip auth for sign-in endpoint
            if (reqConfig.url?.includes("/auth/signin")) {
                return reqConfig;
            }

            // Ensure we have a valid token
            await this.ensureValidToken();

            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["X-Tableau-Auth"] = this.credentials!.token;
            reqConfig.headers["Content-Type"] = "application/json";
            reqConfig.headers["Accept"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Get the current site ID after authentication
     */
    getSiteId(): string {
        if (!this.credentials) {
            throw new Error("Not authenticated. Call signIn first.");
        }
        return this.credentials.site.id;
    }

    /**
     * Ensure we have a valid authentication token
     */
    private async ensureValidToken(): Promise<void> {
        // If token exists and won't expire in the next 5 minutes, use it
        if (this.credentials && this.tokenExpiresAt > Date.now() + 300000) {
            return;
        }

        // Get new token
        await this.signIn();
    }

    /**
     * Sign in to Tableau Server using Personal Access Token
     */
    async signIn(): Promise<TableauCredentials> {
        const signInUrl = `${this.serverUrl}/api/3.21/auth/signin`;

        const response = await fetch(signInUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                credentials: {
                    personalAccessTokenName: this.tokenName,
                    personalAccessTokenSecret: this.tokenSecret,
                    site: {
                        contentUrl: this.site
                    }
                }
            })
        });

        if (!response.ok) {
            let errorMessage = `Tableau authentication failed: ${response.status} ${response.statusText}`;
            try {
                const errorData = (await response.json()) as { error?: { detail?: string } };
                if (errorData.error?.detail) {
                    errorMessage = `Tableau authentication failed: ${errorData.error.detail}`;
                }
            } catch {
                // Use default error message
            }
            throw new Error(errorMessage);
        }

        const data = (await response.json()) as TableauSignInResponse;
        this.credentials = data.credentials;

        // Default token expiration is 240 minutes, set with buffer
        this.tokenExpiresAt = Date.now() + 230 * 60 * 1000;

        return this.credentials;
    }

    /**
     * Make API path with site ID
     */
    makeSitePath(path: string): string {
        if (!this.credentials) {
            throw new Error("Not authenticated. Call signIn first.");
        }
        return `/sites/${this.credentials.site.id}${path}`;
    }

    /**
     * Handle Tableau-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as {
                error?: {
                    summary?: string;
                    detail?: string;
                    code?: string;
                };
            };

            // Map common Tableau errors
            if (error.response.status === 401) {
                // Clear cached credentials so next request will re-authenticate
                this.credentials = null;
                this.tokenExpiresAt = 0;
                throw new Error(
                    "Tableau authentication failed. Please check your Personal Access Token."
                );
            }

            if (error.response.status === 403) {
                throw new Error(
                    `Tableau permission denied: ${data.error?.detail || "Insufficient permissions for this operation"}`
                );
            }

            if (error.response.status === 404) {
                throw new Error(
                    `Tableau resource not found: ${data.error?.detail || "Resource not found"}`
                );
            }

            if (error.response.status === 429) {
                throw new Error("Rate limited by Tableau. Please try again later.");
            }

            if (data.error?.detail) {
                throw new Error(`Tableau API error: ${data.error.detail}`);
            }
        }

        throw error;
    }
}
