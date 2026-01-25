/**
 * Marketo HTTP Client
 *
 * Handles all HTTP communication with Marketo REST API.
 * Implements automatic token acquisition and refresh using 2-legged OAuth (client credentials).
 *
 * Base URLs:
 * - REST API: https://{instanceUrl}/rest/v1
 * - Identity: https://{instanceUrl}/identity/oauth/token
 *
 * Rate Limits: 100 requests per 20 seconds
 */

import { createServiceLogger } from "../../../../core/logging";
import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

const logger = createServiceLogger("MarketoClient");

export interface MarketoClientConfig {
    instanceUrl: string; // e.g., "123-ABC-456.mktorest.com"
    clientId: string;
    clientSecret: string;
    connectionId?: string;
}

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}

interface MarketoErrorResponse {
    requestId?: string;
    success: boolean;
    errors?: Array<{
        code: string;
        message: string;
    }>;
}

export class MarketoClient extends BaseAPIClient {
    private instanceUrl: string;
    private clientId: string;
    private clientSecret: string;
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;
    private tokenRefreshPromise: Promise<void> | null = null;

    constructor(config: MarketoClientConfig) {
        // Ensure instanceUrl doesn't have protocol
        const cleanInstanceUrl = config.instanceUrl.replace(/^https?:\/\//, "");

        const clientConfig: BaseAPIClientConfig = {
            baseURL: `https://${cleanInstanceUrl}/rest`,
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 30000
            },
            connectionPool: {
                keepAlive: true,
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAliveMsecs: 60000
            }
        };

        super(clientConfig);

        this.instanceUrl = cleanInstanceUrl;
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;

        // Add authorization header to all requests
        this.client.addRequestInterceptor(async (requestConfig) => {
            // Ensure we have a valid token
            await this.ensureValidToken();

            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Ensure we have a valid access token, refreshing if necessary
     */
    private async ensureValidToken(): Promise<void> {
        // Check if current token is still valid (with 60-second buffer)
        if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
            return;
        }

        // If a refresh is already in progress, wait for it
        if (this.tokenRefreshPromise) {
            await this.tokenRefreshPromise;
            return;
        }

        // Start a new token refresh
        this.tokenRefreshPromise = this.refreshToken();

        try {
            await this.tokenRefreshPromise;
        } finally {
            this.tokenRefreshPromise = null;
        }
    }

    /**
     * Refresh the access token using client credentials
     */
    private async refreshToken(): Promise<void> {
        const tokenUrl = `https://${this.instanceUrl}/identity/oauth/token`;

        logger.info({ instanceUrl: this.instanceUrl }, "Refreshing Marketo access token");

        try {
            const params = new URLSearchParams({
                grant_type: "client_credentials",
                client_id: this.clientId,
                client_secret: this.clientSecret
            });

            const response = await fetch(`${tokenUrl}?${params.toString()}`, {
                method: "GET",
                headers: {
                    Accept: "application/json"
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Token request failed: ${response.status} ${errorText}`);
            }

            const data = (await response.json()) as TokenResponse;

            this.accessToken = data.access_token;
            // expires_in is in seconds, convert to milliseconds
            this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

            logger.info(
                { expiresIn: data.expires_in },
                "Successfully refreshed Marketo access token"
            );
        } catch (error) {
            logger.error({ err: error }, "Failed to refresh Marketo access token");
            throw new Error(
                `Failed to authenticate with Marketo: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    /**
     * Override request to handle Marketo-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: MarketoErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.errors && response.data.errors.length > 0) {
                const marketoError = response.data.errors[0];

                // Check for token expiry error
                if (marketoError.code === "601" || marketoError.code === "602") {
                    // Token expired or invalid, clear it and retry will get a new one
                    this.accessToken = null;
                    this.tokenExpiresAt = 0;
                    throw new Error(
                        `Marketo authentication error (${marketoError.code}): ${marketoError.message}`
                    );
                }

                throw new Error(
                    `Marketo API error (${marketoError.code}): ${marketoError.message}`
                );
            }

            if (response?.status === 401) {
                this.accessToken = null;
                this.tokenExpiresAt = 0;
                throw new Error("Marketo authentication failed. Please check your credentials.");
            }

            if (response?.status === 403) {
                throw new Error(
                    "Marketo permission denied. Your API user may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Marketo.");
            }

            if (response?.status === 429) {
                throw new Error("Marketo rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    /**
     * Get the instance URL
     */
    getInstanceUrl(): string {
        return this.instanceUrl;
    }

    // ============================================
    // Lead Operations
    // ============================================

    /**
     * Get a lead by ID
     */
    async getLead(
        leadId: number,
        fields?: string[]
    ): Promise<{
        success: boolean;
        result?: unknown[];
        errors?: Array<{ code: string; message: string }>;
    }> {
        const params: Record<string, string> = {};
        if (fields && fields.length > 0) {
            params.fields = fields.join(",");
        }

        return this.get(`/v1/lead/${leadId}.json`, params);
    }

    /**
     * Get multiple leads by filter type
     */
    async getLeads(
        filterType: string,
        filterValues: string[],
        fields?: string[],
        nextPageToken?: string
    ): Promise<{
        success: boolean;
        result?: unknown[];
        nextPageToken?: string;
        errors?: Array<{ code: string; message: string }>;
    }> {
        const params: Record<string, string> = {
            filterType,
            filterValues: filterValues.join(",")
        };

        if (fields && fields.length > 0) {
            params.fields = fields.join(",");
        }

        if (nextPageToken) {
            params.nextPageToken = nextPageToken;
        }

        return this.get("/v1/leads.json", params);
    }

    /**
     * Create or update leads (upsert)
     */
    async createOrUpdateLeads(
        input: Array<Record<string, unknown>>,
        action?: "createOnly" | "updateOnly" | "createOrUpdate",
        lookupField?: string,
        partitionName?: string
    ): Promise<{
        success: boolean;
        result?: Array<{
            id: number;
            status: string;
            reasons?: Array<{ code: string; message: string }>;
        }>;
        errors?: Array<{ code: string; message: string }>;
    }> {
        const body: Record<string, unknown> = {
            input
        };

        if (action) {
            body.action = action;
        }

        if (lookupField) {
            body.lookupField = lookupField;
        }

        if (partitionName) {
            body.partitionName = partitionName;
        }

        return this.post("/v1/leads.json", body);
    }

    // ============================================
    // List Operations
    // ============================================

    /**
     * Get all static lists
     */
    async getLists(nextPageToken?: string): Promise<{
        success: boolean;
        result?: unknown[];
        nextPageToken?: string;
        errors?: Array<{ code: string; message: string }>;
    }> {
        const params: Record<string, string> = {};
        if (nextPageToken) {
            params.nextPageToken = nextPageToken;
        }

        return this.get("/asset/v1/staticLists.json", params);
    }

    /**
     * Get leads in a list
     */
    async getListMembers(
        listId: number,
        fields?: string[],
        nextPageToken?: string
    ): Promise<{
        success: boolean;
        result?: unknown[];
        nextPageToken?: string;
        errors?: Array<{ code: string; message: string }>;
    }> {
        const params: Record<string, string> = {};

        if (fields && fields.length > 0) {
            params.fields = fields.join(",");
        }

        if (nextPageToken) {
            params.nextPageToken = nextPageToken;
        }

        return this.get(`/v1/lists/${listId}/leads.json`, params);
    }

    /**
     * Add leads to a list
     */
    async addToList(
        listId: number,
        leadIds: number[]
    ): Promise<{
        success: boolean;
        result?: Array<{ id: number; status: string }>;
        errors?: Array<{ code: string; message: string }>;
    }> {
        const input = leadIds.map((id) => ({ id }));
        return this.post(`/v1/lists/${listId}/leads.json`, { input });
    }

    /**
     * Remove leads from a list
     */
    async removeFromList(
        listId: number,
        leadIds: number[]
    ): Promise<{
        success: boolean;
        result?: Array<{ id: number; status: string }>;
        errors?: Array<{ code: string; message: string }>;
    }> {
        const params = {
            id: leadIds.join(",")
        };
        return this.delete(`/v1/lists/${listId}/leads.json?${new URLSearchParams(params)}`);
    }

    // ============================================
    // Campaign Operations
    // ============================================

    /**
     * Get all campaigns
     */
    async getCampaigns(
        isTriggerable?: boolean,
        nextPageToken?: string
    ): Promise<{
        success: boolean;
        result?: unknown[];
        nextPageToken?: string;
        errors?: Array<{ code: string; message: string }>;
    }> {
        const params: Record<string, string> = {};

        if (isTriggerable !== undefined) {
            params.isTriggerable = isTriggerable.toString();
        }

        if (nextPageToken) {
            params.nextPageToken = nextPageToken;
        }

        return this.get("/v1/campaigns.json", params);
    }

    /**
     * Request (trigger) a smart campaign
     */
    async requestCampaign(
        campaignId: number,
        input: Array<{ id: number }>,
        tokens?: Array<{ name: string; value: string }>
    ): Promise<{
        success: boolean;
        result?: Array<{ id: number; status: string }>;
        errors?: Array<{ code: string; message: string }>;
    }> {
        const body: Record<string, unknown> = {
            input
        };

        if (tokens && tokens.length > 0) {
            body.tokens = tokens;
        }

        return this.post(`/v1/campaigns/${campaignId}/trigger.json`, body);
    }
}
