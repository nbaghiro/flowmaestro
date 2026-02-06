import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";

export interface SquarespaceClientConfig {
    accessToken: string;
    siteId?: string;
    connectionId?: string;
}

/**
 * Squarespace API Client with connection pooling, rate limiting, and error handling
 *
 * Features:
 * - Automatic rate limit handling (300 req/min, 5 req/sec)
 * - Required User-Agent header for API compliance
 * - Cursor-based pagination support
 * - Site ID management for multi-site support
 *
 * API Versions:
 * - Products: v2 (/1.0/commerce/products)
 * - Orders: v1 (/1.0/commerce/orders)
 * - Inventory: v1 (/1.0/commerce/inventory)
 * - Transactions: v1 (/1.0/commerce/transactions)
 */
export class SquarespaceClient extends BaseAPIClient {
    private accessToken: string;
    private siteId: string | undefined;

    constructor(config: SquarespaceClientConfig) {
        const baseURL = "https://api.squarespace.com";

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
            // User-Agent required by Squarespace API for better rate limiting
            requestConfig.headers["User-Agent"] = "FlowMaestro/1.0 (integration-platform)";
            return requestConfig;
        });
    }

    /**
     * Override request to handle Squarespace-specific errors
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
     * Handle Squarespace-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as Record<string, unknown>;

            // Handle rate limiting
            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                const delay = retryAfter ? parseInt(retryAfter as string, 10) * 1000 : 2000;
                throw new Error(`Rate limited. Retry after ${delay / 1000} seconds.`);
            }

            // Handle authentication errors
            if (status === 401) {
                throw new Error("Squarespace authentication failed. Please reconnect your store.");
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
                const message =
                    typeof data.message === "string"
                        ? data.message
                        : typeof data.error === "string"
                          ? data.error
                          : "Invalid request";
                throw new Error(`Validation error: ${message}`);
            }

            // Handle general API errors
            if (data.message) {
                throw new Error(
                    `Squarespace API error: ${typeof data.message === "string" ? data.message : JSON.stringify(data.message)}`
                );
            }

            if (data.error) {
                throw new Error(
                    `Squarespace API error: ${typeof data.error === "string" ? data.error : JSON.stringify(data.error)}`
                );
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
    // Product Operations (v2)
    // ==========================================

    /**
     * List products with optional filters
     */
    async listProducts(params?: {
        type?: "PHYSICAL" | "SERVICE" | "GIFT_CARD";
        cursor?: string;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.type) queryParams.type = params.type;
        if (params?.cursor) queryParams.cursor = params.cursor;

        return this.get(
            "/1.0/commerce/products",
            Object.keys(queryParams).length > 0 ? queryParams : undefined
        );
    }

    /**
     * Get a single product by ID
     */
    async getProduct(productId: string): Promise<unknown> {
        return this.get(`/1.0/commerce/products/${productId}`);
    }

    /**
     * Create a new product
     */
    async createProduct(product: {
        type?: "PHYSICAL" | "SERVICE" | "GIFT_CARD";
        storePageId: string;
        name: string;
        description?: string;
        tags?: string[];
        isVisible?: boolean;
        variants?: Array<{
            sku?: string;
            pricing?: {
                basePrice?: { currency: string; value: string };
                salePrice?: { currency: string; value: string };
                onSale?: boolean;
            };
            stock?: { quantity?: number; unlimited?: boolean };
            attributes?: Record<string, string>;
        }>;
    }): Promise<unknown> {
        return this.post("/1.0/commerce/products", product);
    }

    /**
     * Update a product (Squarespace uses POST for updates, not PATCH)
     */
    async updateProduct(
        productId: string,
        product: {
            name?: string;
            description?: string;
            tags?: string[];
            isVisible?: boolean;
            variants?: Array<{
                sku?: string;
                pricing?: {
                    basePrice?: { currency: string; value: string };
                    salePrice?: { currency: string; value: string };
                    onSale?: boolean;
                };
                stock?: { quantity?: number; unlimited?: boolean };
                attributes?: Record<string, string>;
            }>;
        }
    ): Promise<unknown> {
        return this.post(`/1.0/commerce/products/${productId}`, product);
    }

    /**
     * Delete a product
     */
    async deleteProduct(productId: string): Promise<unknown> {
        return this.delete(`/1.0/commerce/products/${productId}`);
    }

    // ==========================================
    // Order Operations (v1)
    // ==========================================

    /**
     * List orders with optional filters
     */
    async listOrders(params?: {
        fulfillmentStatus?: "PENDING" | "FULFILLED" | "CANCELED";
        modifiedAfter?: string;
        modifiedBefore?: string;
        cursor?: string;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.fulfillmentStatus) queryParams.fulfillmentStatus = params.fulfillmentStatus;
        if (params?.modifiedAfter) queryParams.modifiedAfter = params.modifiedAfter;
        if (params?.modifiedBefore) queryParams.modifiedBefore = params.modifiedBefore;
        if (params?.cursor) queryParams.cursor = params.cursor;

        return this.get(
            "/1.0/commerce/orders",
            Object.keys(queryParams).length > 0 ? queryParams : undefined
        );
    }

    /**
     * Get a single order by ID
     */
    async getOrder(orderId: string): Promise<unknown> {
        return this.get(`/1.0/commerce/orders/${orderId}`);
    }

    /**
     * Fulfill an order
     */
    async fulfillOrder(
        orderId: string,
        fulfillment: {
            shipments: Array<{
                shipDate?: string;
                carrierName?: string;
                service?: string;
                trackingNumber?: string;
                trackingUrl?: string;
            }>;
            sendNotification?: boolean;
        }
    ): Promise<unknown> {
        return this.post(`/1.0/commerce/orders/${orderId}/fulfillments`, fulfillment);
    }

    // ==========================================
    // Inventory Operations (v1)
    // ==========================================

    /**
     * List inventory for all products
     */
    async listInventory(params?: { cursor?: string }): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.cursor) queryParams.cursor = params.cursor;

        return this.get(
            "/1.0/commerce/inventory",
            Object.keys(queryParams).length > 0 ? queryParams : undefined
        );
    }

    /**
     * Get inventory for a specific variant
     */
    async getInventoryItem(variantId: string): Promise<unknown> {
        return this.get(`/1.0/commerce/inventory/${variantId}`);
    }

    /**
     * Adjust inventory quantity for a variant
     */
    async adjustInventory(
        variantId: string,
        adjustment: {
            quantity: number;
        }
    ): Promise<unknown> {
        return this.post(`/1.0/commerce/inventory/${variantId}/adjustments`, adjustment);
    }

    // ==========================================
    // Transaction Operations (v1)
    // ==========================================

    /**
     * List financial transactions
     */
    async listTransactions(params?: {
        modifiedAfter?: string;
        modifiedBefore?: string;
        cursor?: string;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.modifiedAfter) queryParams.modifiedAfter = params.modifiedAfter;
        if (params?.modifiedBefore) queryParams.modifiedBefore = params.modifiedBefore;
        if (params?.cursor) queryParams.cursor = params.cursor;

        return this.get(
            "/1.0/commerce/transactions",
            Object.keys(queryParams).length > 0 ? queryParams : undefined
        );
    }

    // ==========================================
    // Site Operations
    // ==========================================

    /**
     * Get site information (useful for testing connection)
     */
    async getSiteInfo(): Promise<unknown> {
        // If we have a site ID, get specific site info
        if (this.siteId) {
            return this.get(`/1.0/authorization/website/${this.siteId}`);
        }
        // Otherwise, get the authorized website info
        return this.get("/1.0/authorization/website");
    }
}
