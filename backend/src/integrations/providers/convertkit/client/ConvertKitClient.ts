/**
 * ConvertKit HTTP Client
 *
 * Handles all HTTP communication with ConvertKit API.
 * Uses API Key authentication via api_secret query parameter.
 *
 * Base URL: https://api.convertkit.com/v3
 *
 * Rate Limits: 120 requests per rolling 60-second period
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface ConvertKitClientConfig {
    apiKey: string; // API Key for read operations
    apiSecret: string; // API Secret for write operations
    connectionId?: string;
}

// ============================================
// ConvertKit API Types
// ============================================

export interface ConvertKitSubscriber {
    id: number;
    first_name?: string;
    email_address: string;
    state: string;
    created_at: string;
    fields: Record<string, string>;
}

export interface ConvertKitTag {
    id: number;
    name: string;
    created_at?: string;
}

export interface ConvertKitSequence {
    id: number;
    name: string;
    created_at?: string;
}

export interface ConvertKitForm {
    id: number;
    name: string;
    type: string;
    format?: string;
    embed_js?: string;
    embed_url?: string;
    archived: boolean;
    uid: string;
}

export interface ConvertKitBroadcast {
    id: number;
    subject: string;
    description?: string;
    content?: string;
    public: boolean;
    published_at?: string;
    send_at?: string;
    thumbnail_url?: string;
    created_at: string;
}

interface ConvertKitErrorResponse {
    error?: string;
    message?: string;
}

export class ConvertKitClient extends BaseAPIClient {
    private apiKey: string;
    private apiSecret: string;

    constructor(config: ConvertKitClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.convertkit.com/v3",
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
                maxSockets: 5,
                maxFreeSockets: 2,
                keepAliveMsecs: 60000
            }
        };

        super(clientConfig);

        this.apiKey = config.apiKey;
        this.apiSecret = config.apiSecret;

        // Add Content-Type header
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override request to handle ConvertKit-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: ConvertKitErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data) {
                const ckError = response.data;
                const errorMessage = ckError.error || ckError.message || "Unknown ConvertKit error";
                throw new Error(`ConvertKit API error: ${errorMessage}`);
            }

            if (response?.status === 401) {
                throw new Error(
                    "ConvertKit authentication failed. Please check your API key/secret."
                );
            }

            if (response?.status === 403) {
                throw new Error(
                    "ConvertKit permission denied. Your account may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in ConvertKit.");
            }

            if (response?.status === 429) {
                throw new Error("ConvertKit rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Subscriber Operations
    // ============================================

    /**
     * Get all subscribers
     */
    async getSubscribers(params?: {
        page?: number;
        sort_order?: string;
        sort_field?: string;
    }): Promise<{
        total_subscribers: number;
        page: number;
        total_pages: number;
        subscribers: ConvertKitSubscriber[];
    }> {
        const queryParams: Record<string, unknown> = {
            api_secret: this.apiSecret
        };
        if (params?.page) queryParams.page = params.page;
        if (params?.sort_order) queryParams.sort_order = params.sort_order;
        if (params?.sort_field) queryParams.sort_field = params.sort_field;

        return this.get("/subscribers", queryParams);
    }

    /**
     * Get a single subscriber by ID
     */
    async getSubscriber(subscriberId: string): Promise<{
        subscriber: ConvertKitSubscriber;
    }> {
        return this.get(`/subscribers/${subscriberId}`, { api_secret: this.apiSecret });
    }

    /**
     * Create/update a subscriber (upsert)
     */
    async createSubscriber(subscriber: {
        email: string;
        first_name?: string;
        fields?: Record<string, string>;
        tags?: number[];
    }): Promise<{
        subscription: {
            id: number;
            subscriber: ConvertKitSubscriber;
        };
    }> {
        return this.post("/subscribers", {
            api_secret: this.apiSecret,
            email: subscriber.email,
            first_name: subscriber.first_name,
            fields: subscriber.fields,
            tags: subscriber.tags
        });
    }

    /**
     * Update a subscriber
     */
    async updateSubscriber(
        subscriberId: string,
        updates: {
            first_name?: string;
            email_address?: string;
            fields?: Record<string, string>;
        }
    ): Promise<{
        subscriber: ConvertKitSubscriber;
    }> {
        return this.put(`/subscribers/${subscriberId}`, {
            api_secret: this.apiSecret,
            ...updates
        });
    }

    /**
     * Unsubscribe a subscriber
     */
    async unsubscribeSubscriber(email: string): Promise<{
        subscriber: ConvertKitSubscriber;
    }> {
        return this.put("/unsubscribe", {
            api_secret: this.apiSecret,
            email
        });
    }

    // ============================================
    // Tag Operations
    // ============================================

    /**
     * Get all tags
     */
    async getTags(): Promise<{
        tags: ConvertKitTag[];
    }> {
        return this.get("/tags", { api_key: this.apiKey });
    }

    /**
     * Create a tag
     */
    async createTag(tagName: string): Promise<{
        tag: ConvertKitTag;
    }> {
        return this.post("/tags", {
            api_secret: this.apiSecret,
            tag: { name: tagName }
        });
    }

    /**
     * Add a tag to a subscriber
     */
    async addTagToSubscriber(
        tagId: string,
        subscriberEmail: string
    ): Promise<{
        subscription: {
            id: number;
            subscriber: ConvertKitSubscriber;
        };
    }> {
        return this.post(`/tags/${tagId}/subscribe`, {
            api_secret: this.apiSecret,
            email: subscriberEmail
        });
    }

    /**
     * Remove a tag from a subscriber
     */
    async removeTagFromSubscriber(tagId: string, subscriberId: string): Promise<void> {
        await this.delete(
            `/subscribers/${subscriberId}/tags/${tagId}?api_secret=${this.apiSecret}`
        );
    }

    // ============================================
    // Sequence Operations
    // ============================================

    /**
     * Get all sequences
     */
    async getSequences(): Promise<{
        courses: ConvertKitSequence[];
    }> {
        return this.get("/sequences", { api_key: this.apiKey });
    }

    /**
     * Add a subscriber to a sequence
     */
    async addSubscriberToSequence(
        sequenceId: string,
        subscriberEmail: string,
        firstName?: string
    ): Promise<{
        subscription: {
            id: number;
            subscriber: ConvertKitSubscriber;
        };
    }> {
        return this.post(`/sequences/${sequenceId}/subscribe`, {
            api_secret: this.apiSecret,
            email: subscriberEmail,
            first_name: firstName
        });
    }

    // ============================================
    // Form Operations
    // ============================================

    /**
     * Get all forms
     */
    async getForms(): Promise<{
        forms: ConvertKitForm[];
    }> {
        return this.get("/forms", { api_key: this.apiKey });
    }

    /**
     * Add a subscriber to a form
     */
    async addSubscriberToForm(
        formId: string,
        subscriberEmail: string,
        firstName?: string
    ): Promise<{
        subscription: {
            id: number;
            subscriber: ConvertKitSubscriber;
        };
    }> {
        return this.post(`/forms/${formId}/subscribe`, {
            api_secret: this.apiSecret,
            email: subscriberEmail,
            first_name: firstName
        });
    }

    // ============================================
    // Broadcast Operations
    // ============================================

    /**
     * Get all broadcasts
     */
    async getBroadcasts(params?: { page?: number }): Promise<{
        broadcasts: ConvertKitBroadcast[];
    }> {
        const queryParams: Record<string, unknown> = {
            api_secret: this.apiSecret
        };
        if (params?.page) queryParams.page = params.page;

        return this.get("/broadcasts", queryParams);
    }

    /**
     * Get a single broadcast
     */
    async getBroadcast(broadcastId: string): Promise<{
        broadcast: ConvertKitBroadcast;
    }> {
        return this.get(`/broadcasts/${broadcastId}`, { api_secret: this.apiSecret });
    }
}
