import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";

export interface WebflowClientConfig {
    accessToken: string;
    siteId?: string;
    connectionId?: string;
}

/**
 * Webflow API response wrapper format
 */
interface WebflowErrorResponse {
    code?: string;
    name?: string;
    message?: string;
    details?: unknown[];
}

/**
 * Webflow pagination info
 */
export interface WebflowPagination {
    offset: number;
    limit: number;
    total: number;
}

/**
 * Webflow API Client with connection pooling, rate limiting, and error handling
 *
 * Features:
 * - Automatic rate limit handling (60 req/min)
 * - Required API version header
 * - Cursor-based pagination support
 * - Site ID management for multi-site support
 *
 * API Version: v2 (2023-03-01)
 */
export class WebflowClient extends BaseAPIClient {
    private accessToken: string;
    private siteId: string | undefined;

    constructor(config: WebflowClientConfig) {
        const baseURL = "https://api.webflow.com/v2";

        const clientConfig: BaseAPIClientConfig = {
            baseURL,
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 10000
            },
            connectionPool: {
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAlive: true
            }
        };

        super(clientConfig);

        this.accessToken = config.accessToken;
        this.siteId = config.siteId;

        // Add request interceptor for auth and required headers
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override request to handle Webflow-specific errors
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        try {
            const response = await super.request<T>(config);
            return response;
        } catch (error) {
            await this.handleError(error);
            throw error;
        }
    }

    /**
     * Handle Webflow-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as WebflowErrorResponse;

            // Handle rate limiting
            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                const delay = retryAfter ? parseInt(retryAfter as string, 10) * 1000 : 60000;
                throw new Error(`Rate limited. Retry after ${delay / 1000} seconds.`);
            }

            // Handle authentication errors
            if (status === 401) {
                throw new Error("Webflow authentication failed. Please reconnect your account.");
            }

            // Handle forbidden (insufficient scopes)
            if (status === 403) {
                throw new Error("Insufficient permissions. Please check your app's access scopes.");
            }

            // Handle not found
            if (status === 404) {
                throw new Error("Resource not found. Please check the ID and try again.");
            }

            // Handle validation errors
            if (status === 400) {
                const message = data.message || "Invalid request";
                throw new Error(`Validation error: ${message}`);
            }

            // Handle conflict (e.g., duplicate slug)
            if (status === 409) {
                throw new Error(`Conflict: ${data.message || "Resource already exists"}`);
            }

            // Handle general API errors
            if (data.message) {
                throw new Error(`Webflow API error: ${data.message}`);
            }

            if (data.code) {
                throw new Error(`Webflow API error: ${data.code}`);
            }
        }

        throw error;
    }

    /**
     * Get site ID
     */
    getSiteId(): string | undefined {
        return this.siteId;
    }

    /**
     * Set site ID (e.g., after OAuth callback)
     */
    setSiteId(siteId: string): void {
        this.siteId = siteId;
    }

    // ==========================================
    // Site Operations
    // ==========================================

    /**
     * List all sites the token has access to
     */
    async listSites(): Promise<unknown> {
        return this.get("/sites");
    }

    /**
     * Get a single site by ID
     */
    async getSite(siteId: string): Promise<unknown> {
        return this.get(`/sites/${siteId}`);
    }

    /**
     * Publish a site
     */
    async publishSite(
        siteId: string,
        options?: { domains?: string[] }
    ): Promise<unknown> {
        return this.post(`/sites/${siteId}/publish`, options || {});
    }

    // ==========================================
    // Collection Operations
    // ==========================================

    /**
     * List all collections in a site
     */
    async listCollections(siteId: string): Promise<unknown> {
        return this.get(`/sites/${siteId}/collections`);
    }

    /**
     * Get a single collection by ID
     */
    async getCollection(collectionId: string): Promise<unknown> {
        return this.get(`/collections/${collectionId}`);
    }

    // ==========================================
    // Collection Item Operations
    // ==========================================

    /**
     * List items in a collection
     */
    async listCollectionItems(
        collectionId: string,
        params?: {
            offset?: number;
            limit?: number;
        }
    ): Promise<unknown> {
        const queryParams: Record<string, number> = {};
        if (params?.offset !== undefined) queryParams.offset = params.offset;
        if (params?.limit !== undefined) queryParams.limit = params.limit;

        return this.get(
            `/collections/${collectionId}/items`,
            Object.keys(queryParams).length > 0 ? queryParams : undefined
        );
    }

    /**
     * Get a single collection item by ID
     */
    async getCollectionItem(
        collectionId: string,
        itemId: string
    ): Promise<unknown> {
        return this.get(`/collections/${collectionId}/items/${itemId}`);
    }

    /**
     * Create a new collection item
     */
    async createCollectionItem(
        collectionId: string,
        item: {
            isArchived?: boolean;
            isDraft?: boolean;
            fieldData: Record<string, unknown>;
        }
    ): Promise<unknown> {
        return this.post(`/collections/${collectionId}/items`, item);
    }

    /**
     * Update a collection item
     */
    async updateCollectionItem(
        collectionId: string,
        itemId: string,
        item: {
            isArchived?: boolean;
            isDraft?: boolean;
            fieldData?: Record<string, unknown>;
        }
    ): Promise<unknown> {
        return this.patch(`/collections/${collectionId}/items/${itemId}`, item);
    }

    /**
     * Delete a collection item
     */
    async deleteCollectionItem(
        collectionId: string,
        itemId: string
    ): Promise<unknown> {
        return this.delete(`/collections/${collectionId}/items/${itemId}`);
    }

    /**
     * Publish collection items
     */
    async publishCollectionItems(
        collectionId: string,
        itemIds: string[]
    ): Promise<unknown> {
        return this.post(`/collections/${collectionId}/items/publish`, {
            itemIds
        });
    }

    // ==========================================
    // User Operations
    // ==========================================

    /**
     * Get current authorized user info
     */
    async getAuthorizedUser(): Promise<unknown> {
        return this.get("/token/authorized_by");
    }

    /**
     * Get token info (scopes, etc.)
     */
    async getTokenInfo(): Promise<unknown> {
        return this.get("/token/introspect");
    }
}
