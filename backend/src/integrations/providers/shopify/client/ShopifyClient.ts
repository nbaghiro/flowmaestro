import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";

export interface ShopifyClientConfig {
    accessToken: string;
    shop: string; // e.g., "my-store" (without .myshopify.com)
    apiVersion?: string; // Default: "2025-01"
    connectionId?: string;
}

/**
 * Shopify API response format for rate limit tracking
 */
interface ShopifyRateLimitInfo {
    used: number;
    max: number;
    percentUsed: number;
}

/**
 * Shopify API Client with connection pooling, rate limiting, and error handling
 *
 * Features:
 * - Automatic rate limit handling (40 req/min, 2 req/sec refill)
 * - Exponential backoff on 429 errors
 * - Connection pooling for performance
 * - Cursor-based pagination support
 */
export class ShopifyClient extends BaseAPIClient {
    private accessToken: string;
    private shop: string;
    private apiVersion: string;
    private lastRateLimitInfo: ShopifyRateLimitInfo | null = null;

    constructor(config: ShopifyClientConfig) {
        const apiVersion = config.apiVersion || "2025-01";
        const baseURL = `https://${config.shop}.myshopify.com/admin/api/${apiVersion}`;

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
        this.shop = config.shop;
        this.apiVersion = apiVersion;

        // Add request interceptor for auth header
        this.client.addRequestInterceptor((config) => {
            if (!config.headers) {
                config.headers = {};
            }
            config.headers["X-Shopify-Access-Token"] = this.accessToken;
            config.headers["Content-Type"] = "application/json";
            return config;
        });
    }

    /**
     * Override request to handle Shopify-specific rate limiting
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        // Pre-emptive rate limiting: if approaching limit, add delay
        await this.preemptiveRateLimitDelay();

        try {
            const response = await super.request<T>(config);
            return response;
        } catch (error) {
            await this.handleError(error);
            throw error;
        }
    }

    /**
     * Pre-emptive rate limit delay if approaching limit
     */
    private async preemptiveRateLimitDelay(): Promise<void> {
        if (this.lastRateLimitInfo && this.lastRateLimitInfo.percentUsed >= 0.9) {
            // Approaching limit (90%+), add 500ms delay
            await this.sleep(500);
        }
    }

    /**
     * Parse rate limit header from response
     * Header format: "X-Shopify-Shop-Api-Call-Limit: 32/40"
     */
    private parseRateLimitHeader(header: string | null): ShopifyRateLimitInfo | null {
        if (!header) return null;

        const match = header.match(/(\d+)\/(\d+)/);
        if (!match) return null;

        const used = parseInt(match[1], 10);
        const max = parseInt(match[2], 10);

        return {
            used,
            max,
            percentUsed: used / max
        };
    }

    /**
     * Handle Shopify-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as Record<string, unknown>;

            // Parse rate limit header if present
            const rateLimitHeader = error.response.headers?.["x-shopify-shop-api-call-limit"];
            if (rateLimitHeader) {
                this.lastRateLimitInfo = this.parseRateLimitHeader(rateLimitHeader as string);
            }

            // Handle rate limiting
            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                const delay = retryAfter ? parseInt(retryAfter as string, 10) * 1000 : 2000;
                throw new Error(`Rate limited. Retry after ${delay / 1000} seconds.`);
            }

            // Handle authentication errors
            if (status === 401) {
                throw new Error("Shopify authentication failed. Please reconnect your store.");
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
            if (status === 422) {
                const errors = data.errors;
                if (typeof errors === "object" && errors !== null) {
                    const errorMessages = Object.entries(errors)
                        .map(
                            ([field, msgs]) =>
                                `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`
                        )
                        .join("; ");
                    throw new Error(`Validation error: ${errorMessages}`);
                }
                throw new Error("Validation error. Please check your input.");
            }

            // Handle general API errors
            if (data.errors) {
                const errorMsg =
                    typeof data.errors === "string" ? data.errors : JSON.stringify(data.errors);
                throw new Error(`Shopify API error: ${errorMsg}`);
            }
        }

        throw error;
    }

    /**
     * Get shop name
     */
    getShop(): string {
        return this.shop;
    }

    /**
     * Get API version
     */
    getApiVersion(): string {
        return this.apiVersion;
    }

    /**
     * Get current rate limit info
     */
    getRateLimitInfo(): ShopifyRateLimitInfo | null {
        return this.lastRateLimitInfo;
    }

    // ==========================================
    // Order Operations
    // ==========================================

    /**
     * List orders with optional filters
     */
    async listOrders(params?: {
        status?: "open" | "closed" | "cancelled" | "any";
        financial_status?: string;
        fulfillment_status?: string;
        created_at_min?: string;
        created_at_max?: string;
        updated_at_min?: string;
        updated_at_max?: string;
        limit?: number;
        since_id?: string;
        fields?: string;
    }): Promise<unknown> {
        return this.get("/orders.json", params);
    }

    /**
     * Get a single order by ID
     */
    async getOrder(orderId: string, fields?: string): Promise<unknown> {
        return this.get(`/orders/${orderId}.json`, fields ? { fields } : undefined);
    }

    /**
     * Update an order
     */
    async updateOrder(
        orderId: string,
        order: {
            note?: string;
            tags?: string;
            email?: string;
            phone?: string;
            buyer_accepts_marketing?: boolean;
            shipping_address?: Record<string, unknown>;
        }
    ): Promise<unknown> {
        return this.put(`/orders/${orderId}.json`, { order });
    }

    /**
     * Close an order
     */
    async closeOrder(orderId: string): Promise<unknown> {
        return this.post(`/orders/${orderId}/close.json`);
    }

    /**
     * Cancel an order
     */
    async cancelOrder(
        orderId: string,
        params?: {
            reason?: "customer" | "fraud" | "inventory" | "declined" | "other";
            email?: boolean;
            restock?: boolean;
        }
    ): Promise<unknown> {
        return this.post(`/orders/${orderId}/cancel.json`, params);
    }

    // ==========================================
    // Product Operations
    // ==========================================

    /**
     * List products with optional filters
     */
    async listProducts(params?: {
        ids?: string;
        limit?: number;
        since_id?: string;
        title?: string;
        vendor?: string;
        product_type?: string;
        status?: "active" | "archived" | "draft";
        created_at_min?: string;
        created_at_max?: string;
        updated_at_min?: string;
        updated_at_max?: string;
        fields?: string;
    }): Promise<unknown> {
        return this.get("/products.json", params);
    }

    /**
     * Get a single product by ID
     */
    async getProduct(productId: string, fields?: string): Promise<unknown> {
        return this.get(`/products/${productId}.json`, fields ? { fields } : undefined);
    }

    /**
     * Create a new product
     */
    async createProduct(product: {
        title: string;
        body_html?: string;
        vendor?: string;
        product_type?: string;
        tags?: string;
        status?: "active" | "archived" | "draft";
        variants?: Array<{
            option1?: string;
            price?: string;
            sku?: string;
            inventory_quantity?: number;
        }>;
        images?: Array<{
            src?: string;
            alt?: string;
        }>;
    }): Promise<unknown> {
        return this.post("/products.json", { product });
    }

    /**
     * Update a product
     */
    async updateProduct(
        productId: string,
        product: {
            title?: string;
            body_html?: string;
            vendor?: string;
            product_type?: string;
            tags?: string;
            status?: "active" | "archived" | "draft";
        }
    ): Promise<unknown> {
        return this.put(`/products/${productId}.json`, { product });
    }

    /**
     * Delete a product
     */
    async deleteProduct(productId: string): Promise<unknown> {
        return this.delete(`/products/${productId}.json`);
    }

    // ==========================================
    // Inventory Operations
    // ==========================================

    /**
     * List inventory levels
     */
    async listInventoryLevels(params: {
        inventory_item_ids?: string;
        location_ids?: string;
        limit?: number;
        updated_at_min?: string;
    }): Promise<unknown> {
        return this.get("/inventory_levels.json", params);
    }

    /**
     * Adjust inventory level by a relative amount
     */
    async adjustInventory(params: {
        inventory_item_id: string;
        location_id: string;
        available_adjustment: number;
    }): Promise<unknown> {
        return this.post("/inventory_levels/adjust.json", params);
    }

    /**
     * Set inventory level to an absolute value
     */
    async setInventory(params: {
        inventory_item_id: string;
        location_id: string;
        available: number;
    }): Promise<unknown> {
        return this.post("/inventory_levels/set.json", params);
    }

    /**
     * List inventory locations
     */
    async listLocations(): Promise<unknown> {
        return this.get("/locations.json");
    }

    // ==========================================
    // Customer Operations
    // ==========================================

    /**
     * List customers with optional filters
     */
    async listCustomers(params?: {
        ids?: string;
        limit?: number;
        since_id?: string;
        created_at_min?: string;
        created_at_max?: string;
        updated_at_min?: string;
        updated_at_max?: string;
        fields?: string;
    }): Promise<unknown> {
        return this.get("/customers.json", params);
    }

    /**
     * Get a single customer by ID
     */
    async getCustomer(customerId: string, fields?: string): Promise<unknown> {
        return this.get(`/customers/${customerId}.json`, fields ? { fields } : undefined);
    }

    /**
     * Search customers
     */
    async searchCustomers(query: string): Promise<unknown> {
        return this.get("/customers/search.json", { query });
    }

    /**
     * Create a new customer
     */
    async createCustomer(customer: {
        email?: string;
        first_name?: string;
        last_name?: string;
        phone?: string;
        tags?: string;
        accepts_marketing?: boolean;
        addresses?: Array<{
            address1?: string;
            city?: string;
            province?: string;
            country?: string;
            zip?: string;
        }>;
    }): Promise<unknown> {
        return this.post("/customers.json", { customer });
    }

    /**
     * Update a customer
     */
    async updateCustomer(
        customerId: string,
        customer: {
            email?: string;
            first_name?: string;
            last_name?: string;
            phone?: string;
            tags?: string;
            accepts_marketing?: boolean;
        }
    ): Promise<unknown> {
        return this.put(`/customers/${customerId}.json`, { customer });
    }

    // ==========================================
    // Webhook Operations
    // ==========================================

    /**
     * List webhooks
     */
    async listWebhooks(params?: {
        address?: string;
        topic?: string;
        limit?: number;
        since_id?: string;
    }): Promise<unknown> {
        return this.get("/webhooks.json", params);
    }

    /**
     * Create a webhook
     */
    async createWebhook(webhook: {
        topic: string;
        address: string;
        format?: "json" | "xml";
    }): Promise<unknown> {
        return this.post("/webhooks.json", {
            webhook: { ...webhook, format: webhook.format || "json" }
        });
    }

    /**
     * Get a webhook by ID
     */
    async getWebhook(webhookId: string): Promise<unknown> {
        return this.get(`/webhooks/${webhookId}.json`);
    }

    /**
     * Delete a webhook
     */
    async deleteWebhook(webhookId: string): Promise<unknown> {
        return this.delete(`/webhooks/${webhookId}.json`);
    }

    // ==========================================
    // Shop Operations
    // ==========================================

    /**
     * Get shop information (useful for testing connection)
     */
    async getShopInfo(): Promise<unknown> {
        return this.get("/shop.json");
    }
}
